const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseFrontMatter, SORT_FIELDS, SORT_ORDERS } = require('./config');
const { renderMarkdown } = require('./markdown');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function generateId(value) {
  return crypto.createHash('md5').update(value).digest('hex').slice(0, 8);
}

function fileHash(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 12);
}

function makeSummary(body, maxLength) {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1 ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1 ')
    .replace(/^#+\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

/**
 * 排序字段取值器：文章对象 → 参与排序的字符串值。
 * 取值字段与 config.js 的 SORT_FIELDS 保持一致（单一来源校验）。
 *
 * - category 使用「分类定义序」（config.yml 中 categories 的排列顺序，
 *   零填充后字符串比较）——符合"配置顺序即预期顺序"的直觉，而非 id 字母序
 * - file 使用文件相对路径（含子目录）——01-xxx.md 这类序号文件名自然有序
 */
const SORT_FIELD_GETTERS = {
  date: (post) => String(post.date || ''),
  title: (post) => String(post.title || ''),
  category: (post) => String(post.categoryOrder ?? 999).padStart(3, '0'),
  file: (post) => String(post.file || ''),
  id: (post) => String(post.id || ''),
};

/**
 * 默认排序：日期降序（新的在前）+ 文件名升序打平局。
 *
 * 文件名（file）作为打平局键：同日期文章按文件路径稳定排序，
 * 人类可读、跨平台确定（先前的 id 哈希序虽确定但不可读）。
 */
const DEFAULT_SORT = [
  { by: 'date', order: 'desc' },
  { by: 'file', order: 'asc' },
];

/**
 * 归一化排序配置（content.sort）：
 * 过滤非法字段/方向的条目并输出警告；全部非法或未配置时回退默认排序。
 *
 * @param {Array<{ by?: string, order?: string }>|null|undefined} rawSort
 * @returns {{ rules: Array<{ by: string, order: string }>, warnings: string[] }}
 */
function normalizeSortConfig(rawSort) {
  if (!Array.isArray(rawSort)) return { rules: DEFAULT_SORT, warnings: [] };
  const warnings = [];
  const rules = [];
  rawSort.forEach((item, index) => {
    if (!item || typeof item !== 'object' || !SORT_FIELDS.includes(item.by)) {
      warnings.push(`content.sort[${index}] 的 by=${JSON.stringify(item && item.by)} 无法识别，已忽略`);
      return;
    }
    if (item.order !== undefined && !SORT_ORDERS.includes(item.order)) {
      warnings.push(`content.sort[${index}] 的 order=${JSON.stringify(item.order)} 无法识别，已按 desc 处理`);
    }
    rules.push({
      by: item.by,
      order: SORT_ORDERS.includes(item.order) ? item.order : 'desc',
    });
  });
  return { rules: rules.length > 0 ? rules : DEFAULT_SORT, warnings };
}

/**
 * 构建多级文章比较器：按规则顺序依次比较，首个非零结果即返回；
 * 全部字段相等时返回 0（保留稳定排序的原始顺序）。
 *
 * 比较使用 numeric 自然序（"2" < "10"）：日期非零填充与序号文件名均可正确排序。
 * 大小写敏感度由 caseSensitive 控制（content.sortCaseSensitive）：
 *   true  → 'variant'（大小写敏感，a 与 A 分开排序——默认，与历史行为一致）
 *   false → 'base'（大小写不敏感，a 与 A 视为相同——接近文件管理器直觉）
 *
 * @param {Array<{ by: string, order: string }>|null|undefined} sortConfig - 来自 config.content.sort
 * @param {string[]} [warnings] - 可选，接收配置归一化警告（供构建输出）
 * @param {boolean} [caseSensitive=true] - 大小写敏感度（content.sortCaseSensitive）
 * @returns {(a: object, b: object) => number} Array.prototype.sort 兼容比较器
 */
function buildPostComparator(sortConfig, warnings, caseSensitive = true) {
  const normalized = normalizeSortConfig(sortConfig);
  if (Array.isArray(warnings)) warnings.push(...normalized.warnings);
  const rules = normalized.rules;
  const sensitivity = caseSensitive === false ? 'base' : 'variant';
  return (a, b) => {
    for (const rule of rules) {
      const getter = SORT_FIELD_GETTERS[rule.by];
      const cmp = getter(a).localeCompare(getter(b), undefined, { numeric: true, sensitivity });
      if (cmp !== 0) return rule.order === 'asc' ? cmp : -cmp;
    }
    return 0;
  };
}

/**
 * 扫描单个分类下的所有文章，支持增量缓存。
 * 通过对比源文件 MD5 与 manifest 中的缓存哈希，跳过未变更文件的重新渲染。
 *
 * @param {object} category - 分类配置（id、path、name 等）
 * @param {number} summaryLength - 摘要截断长度
 * @param {string} siteRoot - 站点根目录
 * @param {string} distDir - 输出目录
 * @param {boolean} includeDrafts - 是否包含草稿
 * @param {object|null} manifest - 构建清单，用于增量判断
 * @param {Function} comparator - 文章排序比较器（由 scanContent 依 config.content.sort 构建）
 * @returns {{ posts: object[], groups: object }} 文章列表和分组映射
 */
function scanCategoryPosts(category, summaryLength, siteRoot, distDir, includeDrafts, manifest, security, comparator) {
  const sourceDir = path.join(siteRoot, category.path);
  const result = { posts: [], groups: {} };
  if (!fs.existsSync(sourceDir)) return result;

  const allowHtml = security?.markdownHtmlFilter === false;

  function walk(currentDir) {
    // 显式按名称排序：readdir 顺序依赖文件系统（跨平台不一致），
    // 排序后同日期文章的处理顺序确定，构建结果可复现
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) { walk(fullPath); continue; }
      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.md') continue;

      const relative = path.relative(sourceDir, fullPath).replace(/\\/g, '/');
      const parsed = parseFrontMatter(readText(fullPath));
      if (parsed.meta.draft === true && !includeDrafts) continue;

      const id = generateId(`${category.id}:${relative}`);
      // 分组路径：子目录结构，根目录文件为 null
      const groupPath = path.dirname(relative) === '.' ? null : path.dirname(relative).replace(/\\/g, '/');
      // 输出路径格式：posts/{分类ID}/{相对路径}.html
      const outputPath = `posts/${category.id}/${relative.replace(/\.md$/, '.html')}`;
      const distHtmlPath = path.join(distDir, 'posts', category.id, relative.replace(/\.md$/, '.html'));
      // 增量缓存：对比源文件哈希与 manifest 记录，且目标 HTML 已存在则跳过渲染
      const currentHash = fileHash(fullPath);
      const cachedHash = manifest?.files?.[id];
      const isCached = !!(manifest && cachedHash === currentHash && fs.existsSync(distHtmlPath));

      const post = {
        id,
        title: parsed.meta.title || path.basename(relative, '.md'),
        date: parsed.meta.date || '',
        tags: Array.isArray(parsed.meta.tags) ? parsed.meta.tags : [],
        summary: parsed.meta.summary || makeSummary(parsed.body, summaryLength),
        groupPath,
        file: relative,
        category: category.id,
        categoryName: category.name || category.id,
        categoryIcon: category.icon || '',
        sourcePath: fullPath,
        sourceRelative: relative,
        draft: parsed.meta.draft === true,
        html: isCached ? null : renderMarkdown(parsed.body, { allowHtml }),
        _outputPath: outputPath,
        _needsWrite: !isCached,
        _cached: isCached
      };
      result.posts.push(post);
      if (groupPath) {
        if (!result.groups[groupPath]) result.groups[groupPath] = { posts: [] };
        result.groups[groupPath].posts.push(post);
      }
    }
  }

  walk(sourceDir);
  result.posts.sort(comparator);
  return result;
}

function scanContent(config, options) {
  const { includeDrafts = false, manifest = null, distDir } = options;
  const categories = {};
  const pathMap = {};
  const warnings = [];
  // 排序比较器：列表顺序与「上一篇 / 下一篇」时间线共用同一规则（content.sort）
  const comparator = buildPostComparator(config.sort, warnings, config.sortCaseSensitive !== false);

  const siteRoot = config.siteRoot || config._siteRoot;
  config.categories.forEach((category, categoryIndex) => {
    if (!category.id || !category.path) return;
    const scanned = scanCategoryPosts(
      category, config.display?.summaryLength || 140,
      siteRoot, distDir, includeDrafts, manifest, config.security, comparator
    );
    categories[category.id] = {
      name: category.name || category.id,
      icon: category.icon || '',
      path: category.id,
      description: category.description || '',
      type: category.type || 'flat',
      posts: scanned.posts,
      groups: scanned.groups
    };
    for (const post of scanned.posts) {
      // 分类定义序（config.categories 的排列顺序）——供 by: category 按用户直觉排序
      post.categoryOrder = categoryIndex;
      pathMap[post.id] = {
        category: category.id,
        file: post.sourceRelative,
        outputPath: post._outputPath,
        rendered: true
      };
      // 日期体检：缺失/格式异常给出构建提示（不影响构建，仅提醒补齐）
      if (!post.date) {
        warnings.push(`文章「${post.title}」缺少 date 字段（将排在时间线末尾，建议补充 date: YYYY-MM-DD）`);
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(String(post.date))) {
        warnings.push(`文章「${post.title}」的 date="${post.date}" 非标准 YYYY-MM-DD 格式（排序可能不准确）`);
      }
    }
  });

  const allPosts = [];
  for (const [catId, catData] of Object.entries(categories)) {
    for (const post of (catData.posts || [])) {
      allPosts.push({
        id: post.id,
        title: post.title,
        date: post.date,
        category: catId,
        categoryOrder: post.categoryOrder,
        file: post.file,
        tags: post.tags || []
      });
    }
  }
  allPosts.sort(comparator);
  // prev/next 方向自适应：上一篇始终 = 「主排序键值更小」的一侧。
  // 主排序 asc（值小在前）→ 上一篇 = 数组前一个（i-1）；
  // 主排序 desc（值大在前）→ 上一篇 = 数组后一个（i+1）。
  // （此前实现硬编码 i+1/i-1，隐含假设"数组是时间倒序"，
  //   自定义排序下会把上一篇/下一篇指向错误的文章）
  const primaryOrder = normalizeSortConfig(config.sort).rules[0].order;
  const backIndex = primaryOrder === 'asc' ? -1 : 1;
  for (let i = 0; i < allPosts.length; i++) {
    const entry = pathMap[allPosts[i].id];
    if (!entry) continue;
    const prevPost = allPosts[i + backIndex] || null;
    const nextPost = allPosts[i - backIndex] || null;
    entry.prev = prevPost ? { id: prevPost.id, title: prevPost.title } : null;
    entry.next = nextPost ? { id: nextPost.id, title: nextPost.title } : null;
  }

  // 相关文章：构建期预计算（打分规则见 scoreRelatedPosts），写入 pathMap.related，
  // 供文章页直接渲染（前端零计算、无额外请求）。
  // 可通过 features.relatedPosts 关闭（enabled: false）或调整数量（max: 1-8）。
  const relatedCfg = config.features?.relatedPosts || {};
  const relatedEnabled = relatedCfg.enabled !== false;
  const relatedMaxRaw = Number(relatedCfg.max);
  const relatedMax = Number.isFinite(relatedMaxRaw) ? Math.max(1, Math.min(8, Math.round(relatedMaxRaw))) : 4;
  for (const post of allPosts) {
    const entry = pathMap[post.id];
    if (!entry) continue;
    entry.related = relatedEnabled ? scoreRelatedPosts(post, allPosts, relatedMax) : [];
  }

  const posts = [];
  for (const catData of Object.values(categories)) {
    posts.push(...(catData.posts || []));
  }
  posts.sort(comparator);

  // 内容体检提示（排序配置问题 / 日期缺失或格式异常）——仅提示，不阻断构建
  if (warnings.length > 0) {
    console.warn(`\n内容提示（${warnings.length} 条）：`);
    for (const warning of warnings) console.warn(`  ⚠ ${warning}`);
  }

  return { posts, categories, pathMap };
}

/**
 * 相关文章打分：共同标签 ×3 + 同分类 ×2 + 发布时间相近（≤30 天）×1。
 *
 * - 仅返回分数 > 0 的候选，最多取 max 篇（由 features.relatedPosts.max 控制）
 * - 同分按 id 升序（与全站排序口径一致，结果确定可复现）
 *
 * @param {{ id: string, category: string, tags?: string[], date?: string }} post - 当前文章
 * @param {Array<object>} allPosts - 全站文章（已排序）
 * @param {number} [max=4] - 最多返回条数
 * @returns {Array<{ id: string, title: string }>} 相关文章引用（id + 标题）
 */
function scoreRelatedPosts(post, allPosts, max = 4) {
  const SAME_WINDOW_DAYS = 30;
  const toTime = (date) => {
    const t = Date.parse(`${date || ''}T00:00:00Z`);
    return Number.isFinite(t) ? t : null;
  };
  const needleTags = new Set((post.tags || []).map((tag) => String(tag).toLowerCase()));
  const postTime = toTime(post.date);
  const scored = [];

  for (const other of allPosts) {
    if (other.id === post.id) continue;
    const sharedTags = (other.tags || []).filter((tag) => needleTags.has(String(tag).toLowerCase())).length;
    const sameCategory = other.category === post.category ? 1 : 0;
    let proximity = 0;
    const otherTime = toTime(other.date);
    if (postTime !== null && otherTime !== null) {
      const days = Math.abs(postTime - otherTime) / 86400000;
      if (days <= SAME_WINDOW_DAYS) proximity = 1;
    }
    const score = sharedTags * 3 + sameCategory * 2 + proximity;
    if (score > 0) scored.push({ id: other.id, title: other.title, file: other.file || '', score });
  }

  // 同分按文件路径升序打平局（可读、跨平台确定；与全站排序口径一致）
  scored.sort((a, b) => b.score - a.score
    || String(a.file).localeCompare(String(b.file), undefined, { numeric: true }));
  return scored.slice(0, max).map(({ id, title }) => ({ id, title }));
}

module.exports = { scanContent, generateId, fileHash, makeSummary, buildPostComparator };
