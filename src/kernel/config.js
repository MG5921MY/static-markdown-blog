const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════
// 严格模式语法检测
// ═══════════════════════════════════════════════════════════

/**
 * 解析器不支持、但容易被误用的 YAML 语法模式。
 *
 * 宽松模式（frontmatter、data 文件）静默降级为字符串/垃圾数据；
 * 严格模式（site/config.yml）命中即报错并附行号，避免"半对配置"。
 */
const UNSUPPORTED_SYNTAX = [
  { pattern: /:\s*\{/, hint: '不支持流映射 {}，请改用缩进块（key: 换行后缩进子键）' },
  { pattern: /^\s*-\s*\{/, hint: '不支持数组项内的流映射 {}，请改用「- 键: 值」缩进块' },
  { pattern: /:\s*&[\w-]/, hint: '不支持锚点 &，请展开重复配置' },
  { pattern: /:\s*\*[\w-]/, hint: '不支持别名 *，请展开重复配置' },
  { pattern: /:\s*[|>][0-9+]/, hint: '不支持块标量指示符（如 |2、>+），仅支持 |、|-、>' },
  { pattern: /:\s*\[[^\]]*$/, hint: '不支持跨行流序列 []，请改用行内 [a, b] 或「- 项」列表' },
];

/**
 * 扫描文本中的不支持语法（严格模式用）。
 *
 * @param {string[]} lines - 已按行拆分的文本（\r 已移除）
 * @returns {Array<{ line: number, text: string, hint: string }>} 全部问题（含 1-based 行号）
 */
function collectUnsupportedSyntax(lines) {
  const issues = [];
  for (let i = 0; i < lines.length; i += 1) {
    const text = lines[i];
    const trimmed = text.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    for (const rule of UNSUPPORTED_SYNTAX) {
      if (rule.pattern.test(text)) {
        issues.push({ line: i + 1, text: trimmed, hint: rule.hint });
        break;
      }
    }
  }
  return issues;
}

/**
 * 轻量 YAML 解析器，基于缩进栈逐行解析
 *
 * 已支持：标量、块标量（|、|-、>）、数组、嵌套对象、引号字符串、行内数组
 * 不支持：流映射 {}、锚点 & / 别名 *、跨行流序列
 *
 * @param {string} content - YAML 文本内容
 * @param {{ strict?: boolean }} [options] - strict 为 true 时对不支持语法报错（含行号）
 * @returns {object} 解析后的 JS 对象
 * @throws {Error} strict 模式下存在不支持语法时抛出（错误信息含行号与修复提示）
 */
function parseYaml(content, options = {}) {
  const root = {};
  const lines = content.replace(/\r/g, '').split('\n');

  if (options.strict) {
    const issues = collectUnsupportedSyntax(lines);
    if (issues.length > 0) {
      const detail = issues
        .map((issue) => `  第 ${issue.line} 行: ${issue.text}\n    → ${issue.hint}`)
        .join('\n');
      throw new Error(`YAML 语法校验失败（${issues.length} 处不支持语法）：\n${detail}`);
    }
  }

  // 缩进栈：每层记录 { indent, value }，用于追踪当前嵌套层级
  const stack = [{ indent: -1, value: root }];

  function parseScalar(raw) {
    if (raw === undefined || raw === null) return '';
    let value = String(raw).trim();
    const commentIndex = value.indexOf(' #');
    if (commentIndex > 0) value = value.slice(0, commentIndex).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (/^-?\d+$/.test(value)) return Number(value);
    if (/^-?\d+\.\d+$/.test(value)) return Number(value);
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      if (!inner) return [];
      return inner.split(',').map((item) => parseScalar(item));
    }
    return value;
  }

  // 辅助函数：跳过空行和注释，找到下一个有效行（用于判断子节点类型）
  function nextUsefulLine(index) {
    for (let i = index + 1; i < lines.length; i += 1) {
      const text = lines[i].trim();
      if (!text || text.startsWith('#')) continue;
      return { index: i, text, indent: lines[i].search(/\S/) };
    }
    return null;
  }

  // 读取块标量（|、|-、>），收集父缩进以下的所有行直到遇到同级或更浅缩进
  function readBlockScalar(startIndex, parentIndent) {
    const chunks = [];
    let lastIndex = startIndex;

    for (let i = startIndex + 1; i < lines.length; i += 1) {
      const rawLine = lines[i];
      const trimmedLine = rawLine.trim();
      const lineIndent = rawLine.search(/\S/);

      if (!trimmedLine) {
        if (chunks.length > 0) chunks.push('');
        lastIndex = i;
        continue;
      }

      if (trimmedLine.startsWith('#') && lineIndent > parentIndent) {
        lastIndex = i;
        continue;
      }

      if (lineIndent <= parentIndent) break;

      const sliceIndex = Math.min(rawLine.length, parentIndent + 2);
      chunks.push(rawLine.slice(sliceIndex));
      lastIndex = i;
    }

    return {
      value: chunks.join('\n').replace(/\n+$/, ''),
      nextIndex: lastIndex
    };
  }

  // 主循环：逐行解析，遇到缩进回退时弹栈恢复父级上下文
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const indent = line.search(/\S/);

    // 缩进栈回退：当前行缩进 <= 栈顶缩进时，弹出已结束的层级
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].value;

    if (trimmed.startsWith('- ')) {
      if (!Array.isArray(parent)) continue;
      const itemText = trimmed.slice(2).trim();
      if (!itemText) {
        const next = nextUsefulLine(i);
        const child = next && next.indent > indent && next.text.startsWith('- ') ? [] : {};
        parent.push(child);
        stack.push({ indent, value: child });
        continue;
      }

      if (itemText.includes(':')) {
        const colonIndex = itemText.indexOf(':');
        const key = itemText.slice(0, colonIndex).trim();
        const rawValue = itemText.slice(colonIndex + 1).trim();
        const item = {};
        if (rawValue) {
          if (rawValue === '|' || rawValue === '|-' || rawValue === '>') {
            const block = readBlockScalar(i, indent);
            item[key] = block.value;
            i = block.nextIndex;
          } else {
            item[key] = parseScalar(rawValue);
          }
        } else {
          const next = nextUsefulLine(i);
          item[key] = next && next.indent > indent && next.text.startsWith('- ') ? [] : {};
          stack.push({ indent, value: item[key] });
        }
        parent.push(item);
        if (!rawValue) continue;
        stack.push({ indent, value: item });
        continue;
      }

      parent.push(parseScalar(itemText));
      continue;
    }

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex <= 0) continue;
    const key = trimmed.slice(0, colonIndex).trim();
    const rawValue = trimmed.slice(colonIndex + 1).trim();

    if (rawValue) {
      if (rawValue === '|' || rawValue === '|-' || rawValue === '>') {
        const block = readBlockScalar(i, indent);
        parent[key] = block.value;
        i = block.nextIndex;
        continue;
      }
      parent[key] = parseScalar(rawValue);
      continue;
    }

    const next = nextUsefulLine(i);
    const child = next && next.indent > indent && next.text.startsWith('- ') ? [] : {};
    parent[key] = child;
    stack.push({ indent, value: child });
  }

  return root;
}

function parseFrontMatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { meta: {}, body: content.trim() };
  return {
    meta: parseYaml(match[1]),
    body: content.slice(match[0].length).trim()
  };
}

// ═══════════════════════════════════════════════════════════
// 配置结构与类型校验
// ═══════════════════════════════════════════════════════════

/** 已知顶层配置键（未知键仅警告，保留向前兼容） */
const KNOWN_TOP_LEVEL_KEYS = [
  'site', 'deployment', 'seo', 'auth', 'security', 'theme', 'content',
  'nav', 'navActions', 'features', 'beian', 'comments', 'disclaimer',
  'error404', 'display', 'dev',
];

/**
 * 文章排序支持的字段与方向（校验与内容扫描共用，单一来源）。
 * 对应配置：content.sort[].by / content.sort[].order
 *
 * - date     文章 frontmatter 的日期（YYYY-MM-DD）
 * - title    标题（frontmatter，缺省为文件名）
 * - category 分类（按 config.yml 中 categories 的定义顺序）
 * - file     文件相对路径（适合 01-xxx.md 这类序号文件名）
 * - id       内容哈希序（仅适合强制确定性打平局，不推荐业务排序）
 */
const SORT_FIELDS = ['date', 'title', 'category', 'file', 'id'];
const SORT_ORDERS = ['asc', 'desc'];

/**
 * 关键字段类型规则：[路径, 期望类型]。
 * 仅在字段存在时校验（未设置视为使用默认值，不报错）。
 */
const CONFIG_TYPE_RULES = [
  ['site', 'object'],
  ['deployment', 'object'],
  ['seo', 'object'],
  ['auth', 'object'],
  ['security', 'object'],
  ['theme', 'object'],
  ['content', 'object'],
  ['nav', 'array'],
  ['navActions', 'array'],
  ['features', 'object'],
  ['beian', 'object'],
  ['comments', 'object'],
  ['disclaimer', 'object'],
  ['error404', 'object'],
  ['display', 'object'],
  ['dev', 'object'],
  ['theme.active', 'string'],
  ['site.name', 'string'],
  ['display.postsPerPage', 'number'],
  ['display.summaryLength', 'number'],
  ['security.autoLock', 'number'],
  ['content.categories', 'array'],
  ['content.pages', ['array', 'object']], // 兼容对象写法（normalizePageRecords 支持）
  ['content.sort', 'array'],
  ['content.sortCaseSensitive', 'boolean'],
  ['features.relatedPosts', 'object'],
  ['features.readingTime', 'object'],
  ['features.relatedPosts.enabled', 'boolean'],
  ['features.relatedPosts.max', 'number'],
  ['features.readingTime.enabled', 'boolean'],
  ['features.readingTime.speed', 'number'],
  ['display.paginationWindow', 'number'],
  ['display.searchShortcut', 'boolean'],
];

/**
 * 数组元素必填字段规则：[路径, 必填字段, 字段语义]。
 */
const ARRAY_ITEM_RULES = [
  ['content.categories', 'id', '分类 ID'],
  ['content.categories', 'path', '分类文章目录'],
  ['nav', 'name', '导航名称'],
];

/** 按点路径读取嵌套值（任一层缺失返回 undefined） */
function getByPath(obj, dotPath) {
  let cursor = obj;
  for (const key of dotPath.split('.')) {
    if (cursor === null || typeof cursor !== 'object') return undefined;
    cursor = cursor[key];
  }
  return cursor;
}

/** 实际类型名（用于错误信息；数组/对象为 'array'/'object'） */
function typeName(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

/** 在已知键中寻找与未知键最接近的建议（前缀/编辑距离 ≤ 2） */
function suggestKey(unknownKey) {
  const lower = unknownKey.toLowerCase();
  let best = null;
  for (const known of KNOWN_TOP_LEVEL_KEYS) {
    const k = known.toLowerCase();
    const nearPrefix = k.startsWith(lower) || lower.startsWith(k);
    let distance = Math.abs(k.length - lower.length);
    for (let i = 0; i < Math.min(k.length, lower.length); i += 1) {
      if (k[i] !== lower[i]) distance += 1;
    }
    if (nearPrefix || distance <= 2) {
      if (!best || distance < best.distance) best = { key: known, distance };
    }
  }
  return best ? best.key : null;
}

/**
 * 校验配置结构与类型（在解析后调用）。
 *
 * - errors（阻断构建）：类型不符、数组元素缺必填字段
 * - warnings（不阻断）：未知顶层键（附相似键建议）
 *
 * @param {object} raw - parseYaml 的原始解析结果
 * @returns {{ errors: string[], warnings: string[] }}
 */
function validateConfig(raw) {
  const errors = [];
  const warnings = [];

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push(`配置根节点应为对象，实际为 ${typeName(raw)}`);
    return { errors, warnings };
  }

  // L3：未知顶层键（警告 + 相似键建议）
  for (const key of Object.keys(raw)) {
    if (!KNOWN_TOP_LEVEL_KEYS.includes(key)) {
      const suggestion = suggestKey(key);
      const tip = suggestion ? `，是否想写 "${suggestion}"？` : '';
      warnings.push(`未知配置键 "${key}" 已忽略${tip}`);
    }
  }

  // L2：关键字段类型
  for (const [dotPath, expected] of CONFIG_TYPE_RULES) {
    const value = getByPath(raw, dotPath);
    if (value === undefined) continue;
    const actual = typeName(value);
    const expectedList = Array.isArray(expected) ? expected : [expected];
    if (!expectedList.includes(actual)) {
      errors.push(`"${dotPath}" 类型应为 ${expectedList.join(' 或 ')}，实际为 ${actual}`);
    }
  }

  // L2：数组元素必填字段
  for (const [dotPath, field, label] of ARRAY_ITEM_RULES) {
    const list = getByPath(raw, dotPath);
    if (!Array.isArray(list)) continue;
    list.forEach((item, index) => {
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        errors.push(`"${dotPath}[${index}]" 应为对象`);
        return;
      }
      if (item[field] === undefined || item[field] === '') {
        errors.push(`"${dotPath}[${index}]" 缺少必填字段 "${field}"（${label}）`);
      }
    });
  }

  // L2：文章排序规则（content.sort[] 的 by / order 枚举校验）
  const sortRules = getByPath(raw, 'content.sort');
  if (Array.isArray(sortRules)) {
    sortRules.forEach((item, index) => {
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        errors.push(`"content.sort[${index}]" 应为对象（如 { by: date, order: desc }）`);
        return;
      }
      if (!SORT_FIELDS.includes(item.by)) {
        errors.push(`"content.sort[${index}].by" 应为 ${SORT_FIELDS.join(' / ')}，实际为 ${JSON.stringify(item.by)}`);
      }
      if (item.order !== undefined && !SORT_ORDERS.includes(item.order)) {
        errors.push(`"content.sort[${index}].order" 应为 ${SORT_ORDERS.join(' / ')}，实际为 ${JSON.stringify(item.order)}`);
      }
      // id 为内容哈希序，仅适合强制确定性打平局——业务排序请改用 file
      if (item.by === 'id') {
        warnings.push(`"content.sort[${index}].by = id" 是内容哈希序（顺序无业务含义），建议改用 "file"（文件名序）`);
      }
    });
  }

  return { errors, warnings };
}

/**
 * 组装配置诊断信息（错误/警告统一格式化，供加载与测试复用）。
 *
 * @param {{ errors: string[], warnings: string[] }} diagnostics
 * @param {string} filePath - 配置文件路径（用于定位）
 * @returns {{ errorText: string, warningText: string }}
 */
function formatConfigDiagnostics(diagnostics, filePath) {
  const { errors, warnings } = diagnostics;
  const errorText = errors.length > 0
    ? `配置校验失败（${filePath}）：\n${errors.map((e) => `  ✗ ${e}`).join('\n')}\n  提示：修正后重新构建。`
    : '';
  const warningText = warnings.length > 0
    ? `配置警告（${filePath}）：\n${warnings.map((w) => `  ⚠ ${w}`).join('\n')}`
    : '';
  return { errorText, warningText };
}

function normalizePageRecords(pageRecords) {
  if (Array.isArray(pageRecords)) return pageRecords;
  if (pageRecords && typeof pageRecords === 'object') return Object.values(pageRecords);
  return [];
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * 三级配置解析：site/config.yml → pkg/site/config.yml → config/blog.config.yml
 *
 * 优先使用 cwd/site/config.yml（site 模式），
 * 其次使用 pkgRoot/site/config.yml（package-site 模式），
 * 最后回退到 pkgRoot/config/blog.config.yml（legacy 模式）。
 *
 * 返回的配置对象包含 _mode（配置来源）、_siteRoot（站点根目录）、_pkgRoot（包根目录）等内部属性。
 *
 * @param {string} cwd - 当前工作目录
 * @param {string} pkgRoot - 博客包根目录
 * @returns {object} 标准化后的配置对象
 */
function loadConfig(cwd, pkgRoot) {
  const sitePath = path.join(cwd, 'site', 'config.yml');
  const pkgSitePath = path.join(pkgRoot, 'site', 'config.yml');
  const legacyPath = path.join(pkgRoot, 'config', 'blog.config.yml');

  let filePath, siteRoot, mode;

  if (fs.existsSync(sitePath)) {
    filePath = sitePath;
    siteRoot = path.join(cwd, 'site');
    mode = 'site';
  } else if (fs.existsSync(pkgSitePath)) {
    filePath = pkgSitePath;
    siteRoot = path.join(pkgRoot, 'site');
    mode = 'package-site';
  } else if (fs.existsSync(legacyPath)) {
    filePath = legacyPath;
    siteRoot = pkgRoot;
    mode = 'legacy';
  } else {
    throw new Error('No config found. Expected site/config.yml or config/blog.config.yml');
  }

  let raw;
  try {
    raw = parseYaml(readText(filePath), { strict: true });
  } catch (err) {
    throw new Error(`配置解析失败（${filePath}）：\n${err.message}`);
  }

  const diagnostics = validateConfig(raw);
  const { errorText, warningText } = formatConfigDiagnostics(diagnostics, filePath);
  if (errorText) throw new Error(errorText);
  if (warningText) console.warn(warningText);

  return {
    site: raw.site || {},
    deployment: raw.deployment || { basePath: 'auto' },
    seo: raw.seo || {},
    theme: raw.theme || {},
      categories: raw.content?.categories || [],
      pages: normalizePageRecords(raw.content?.pages || []),
      sort: Array.isArray(raw.content?.sort) ? raw.content.sort : null,
      // 排序大小写敏感度：默认 true（与历史行为一致）；false = a 与 A 视为相同
      sortCaseSensitive: raw.content?.sortCaseSensitive !== false,
    nav: raw.nav || [],
    navActions: raw.navActions || [],
    features: raw.features || {},
    display: raw.display || {},
    beian: raw.beian || { enabled: false },
    comments: raw.comments || { enabled: false },
    disclaimer: raw.disclaimer || {},
    error404: raw.error404 || {},
    auth: raw.auth || { enabled: false },
    security: raw.security || { csp: true, markdownHtmlFilter: true, autoLock: 900 },
    _raw: raw,
    _siteRoot: siteRoot,
    _pkgRoot: pkgRoot,
    _configPath: filePath,
    _mode: mode
  };
}

module.exports = { parseYaml, parseFrontMatter, loadConfig, validateConfig, collectUnsupportedSyntax, SORT_FIELDS, SORT_ORDERS };
