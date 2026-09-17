const fs = require('fs');
const path = require('path');
const { marked } = require('../../res/vendor/marked.min.js');

function ensureDir(dirPath) { fs.mkdirSync(dirPath, { recursive: true }); }

/**
 * 递归删除文件/目录（unlink + rmdir 组合）。
 * 不依赖 fs.rmSync 的 recursive 实现：跨平台行为一致，
 * 且对符号链接只删链接本身、不会跟随进入目标。
 * 仅静默忽略 ENOENT（文件可能刚被并发删除）。
 */
function removeTree(filePath) {
  let stat;
  try { stat = fs.lstatSync(filePath); }
  catch (err) { if (err.code === 'ENOENT') return; throw err; }
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(filePath)) {
      removeTree(path.join(filePath, entry));
    }
    try { fs.rmdirSync(filePath); }
    catch (err) { if (err.code !== 'ENOENT') throw err; }
  } else {
    try { fs.unlinkSync(filePath); }
    catch (err) { if (err.code !== 'ENOENT') throw err; }
  }
}

function cleanDir(dirPath) {
  removeTree(dirPath);
  ensureDir(dirPath);
}

function writeText(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, value, 'utf8');
}

function writeJson(filePath, value) { writeText(filePath, JSON.stringify(value, null, 2)); }

function buildPagesMap(pages) {
  const map = {};
  for (const p of (Array.isArray(pages) ? pages : Object.values(pages || {}))) {
    if (p?.id) map[p.id] = { ...p };
  }
  return map;
}

function readDataFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath, 'utf8');
  if (ext === '.json') {
    try { return JSON.parse(raw); } catch (_) { return null; }
  }
  if (ext === '.yml' || ext === '.yaml') {
    try { return require('./config').parseYaml(raw); } catch (_) { return null; }
  }
  return raw; // .md or other text
}

function filterScripts(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<!-- script removed -->');
}

function extractStyles(html) {
  const styles = [];
  html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (match, css) => {
    styles.push(css);
    return '';
  });
  return styles.join('\n');
}

function extractBody(html) {
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) return bodyMatch[1].trim();
  // If no <body> tag, return the whole thing (already a fragment)
  return html.replace(/<!DOCTYPE[^>]*>/gi, '').replace(/<\/?html[^>]*>/gi, '').replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '').trim();
}

// 将 CSS 作用域限定到指定容器（保留 @font-face、@keyframes 和注释）
function scopeCss(css, scope) {
  // Step 1: Extract and preserve comments
  const comments = [];
  let processed = css.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    comments.push(match);
    return `__COMMENT_${comments.length - 1}__`;
  });

  // Step 2: Extract and preserve @font-face and @keyframes blocks
  const globals = [];
  processed = processed.replace(/@(font-face|keyframes)[^}]*\{[\s\S]*?\}\s*\}/g, (match) => {
    globals.push(match);
    return `__GLOBAL_${globals.length - 1}__`;
  });

  // Step 3: Scope @media blocks
  processed = processed.replace(/@media[^{]+\{([\s\S]*?\})\s*\}/g, (mediaBlock) => {
    return mediaBlock.replace(/([^{}@]+)\{/g, (rule) => {
      if (rule.trim().startsWith('@')) return rule;
      if (rule.includes('__COMMENT_') && !rule.includes('{')) return rule;
      return scopeRule(rule, scope);
    });
  });

  // Step 4: Scope top-level rules
  processed = processed.replace(/([^{}@]+)\{/g, (rule) => {
    if (rule.trim().startsWith('@')) return rule;
    if (rule.trim().startsWith(scope)) return rule;
    if (rule.includes('__COMMENT_') && !rule.includes('{')) return rule;
    return scopeRule(rule, scope);
  });

  // Step 5: Restore globals and comments
  let result = globals.reduce((acc, g, i) => acc.replace(`__GLOBAL_${i}__`, g), processed);
  result = comments.reduce((acc, c, i) => acc.replace(`__COMMENT_${i}__`, c), result);

  return result;
}

function scopeRule(rule, scope) {
  return rule.replace(/(^|,)\s*([^,{]+)/g, (match, sep, selector) => {
    selector = selector.trim();
    if (!selector || selector.startsWith('@')) return match;
    if (selector === 'body') return `${sep} ${scope}`;
    if (selector === '*') return `${sep} ${scope} *`;
    if (selector.startsWith(scope)) return match;
    return `${sep} ${scope} ${selector}`;
  });
}

function buildPagesContent(pagesMap, siteRoot) {
  for (const page of Object.values(pagesMap)) {
    if (page.type === 'markdown' && page.source) {
      const sourcePath = path.join(siteRoot, page.source);
      if (!fs.existsSync(sourcePath)) continue;
      const raw = fs.readFileSync(sourcePath, 'utf8');
      const body = raw.replace(/^---[\s\S]*?---\n?/, '').trim();
      page.content = marked(body, { gfm: true, breaks: true });
      page.renderedToHtml = true;
    }

    if (page.type === 'html' && page.source) {
      const sourcePath = path.join(siteRoot, page.source);
      if (!fs.existsSync(sourcePath)) continue;
      page.content = fs.readFileSync(sourcePath, 'utf8');
    }

    if (page.type === 'custom' && page.source) {
      const sourcePath = path.join(siteRoot, page.source);
      if (!fs.existsSync(sourcePath)) continue;
      let html = fs.readFileSync(sourcePath, 'utf8');

      // Filter user scripts (unless explicitly enabled)
      if (!page.scripts) {
        html = filterScripts(html);
        page._scriptsFiltered = true;
      }

      // Embed data files as JSON
      if (page.data && typeof page.data === 'object') {
        const dataEntries = {};
        for (const [key, relPath] of Object.entries(page.data)) {
          const dataPath = path.join(siteRoot, relPath);
          const data = readDataFile(dataPath);
          if (data !== null) dataEntries[key] = data;
        }
        const dataScript = Object.entries(dataEntries).map(([key, val]) =>
          `<script type="application/json" id="data-${key}">${JSON.stringify(val)}</script>`
        ).join('\n');
        if (dataScript) {
          if (html.includes('</body>')) {
            html = html.replace('</body>', `${dataScript}\n</body>`);
          } else {
            html += '\n' + dataScript;
          }
        }
      }

      if (page.standalone) {
        // Standalone: keep full HTML, platform chrome hidden at runtime
        page.content = html;
        page._isCustom = true;
        page._isStandalone = true;
      } else {
        // Embedded: extract body + scope CSS to #page-custom
        const rawStyles = extractStyles(html);
        const bodyContent = extractBody(html);

        // Scope CSS: @font-face and @keyframes stay global, other rules scoped
        let scopedCss = '';
        if (rawStyles) {
          // scopeCss 内部处理 @font-face/@keyframes 保留
          const globals = [];
          const localCss = rawStyles.replace(/@(font-face|keyframes)[^}]*\{[\s\S]*?\}\s*\}/g, (match) => {
            globals.push(match);
            return '';
          });
          const scoped = scopeCss(localCss.trim(), '#page-custom');
          scopedCss = globals.join('\n') + '\n' + scoped;
        }

        page.content = scopedCss
          ? `<style>${scopedCss}</style>\n<div class="custom-page">${bodyContent}</div>`
          : `<div class="custom-page">${bodyContent}</div>`;
        page._isCustom = true;
        page._isStandalone = false;
      }
    }
  }
  return pagesMap;
}

function resolveNav(navItems, pagesMap) {
  return (navItems || []).map((item) => {
    if (item.page === 'index') return { name: item.name || 'Home', url: './index.html' };
    if (item.page && pagesMap[item.page]) return { name: item.name || pagesMap[item.page].name || item.page, url: `./page.html?id=${item.page}` };
    if (item.url) return { name: item.name || item.url, url: item.url };
    return null;
  }).filter(Boolean);
}

// ═══════════════════════════════════════════════════════════
// 媒体库扫描（图库升级：image / video / audio / file 四类）
// ═══════════════════════════════════════════════════════════

/**
 * 媒体可播放性映射（单一来源）。
 *
 * 语义为「尝试内嵌播放」的保守判定：
 * 编码差异（如 mkv/mov 内部码流）无法静态确定，前端在 <video>/<audio>
 * 的 error 事件中兜底降级为下载提示；未列入的扩展名一律仅供下载。
 *
 * 依据：本机 Chromium canPlayType 实测（mp4/webm/m4v 稳定；
 * mkv/mov/ogv 视编码与浏览器而异 → 尝试；avi/wmv/flv 不可播）。
 */
const PLAYABLE_MEDIA = {
  video: new Set(['mp4', 'webm', 'm4v', 'mkv', 'mov', 'ogv']),
  audio: new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus']),
};

/**
 * 归一化 gallery 配置的 formats 字段（兼容两种写法）。
 *
 *   formats: [jpg, png]                       → { image: [jpg, png], video: [], ... }
 *     （旧配置：平铺数组视为图片列表，升级后行为不变）
 *   formats: { image: [...], video: [...] }   → 按类型保留（新配置）
 *
 * @param {string[]|object|undefined} rawFormats - gallery.yml 的 settings.formats
 * @returns {{ image: string[], video: string[], audio: string[], file: string[] }} 各类型扩展名（小写、无点）
 */
function normalizeGalleryFormats(rawFormats) {
  const DEFAULTS = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    video: [],
    audio: [],
    file: [],
  };
  if (Array.isArray(rawFormats)) {
    return { ...DEFAULTS, image: rawFormats.map((f) => String(f).toLowerCase()) };
  }
  if (rawFormats && typeof rawFormats === 'object') {
    const pick = (key) =>
      Array.isArray(rawFormats[key])
        ? rawFormats[key].map((f) => String(f).toLowerCase())
        : DEFAULTS[key];
    return { image: pick('image'), video: pick('video'), audio: pick('audio'), file: pick('file') };
  }
  return DEFAULTS;
}

/**
 * 扫描媒体目录（按类型分流，返回同构树）。
 *
 * 返回结构：`{ [type]: { items: MediaItem[], subfolders: { [name]: 同结构 } } }`
 * —— 各类型键名与 formats 键一致（路径单一：前端按 type 取同构数据）。
 *
 * 确定性：目录项按名称自然序排序（与内容扫描口径一致，构建可复现）。
 * 归属规则：单文件只归入首个匹配的类型（formats 各类型应互斥；避免重复展示）。
 *
 * @param {string} dirPath - 绝对目录路径
 * @param {{ [type: string]: string[] }} formatsByType - 归一化格式表
 * @param {string[]} types - 本组扫描的媒体类型（如 ['image','video']）
 * @param {number} maxDepth - 最大递归深度
 * @param {number} currentDepth - 当前深度（0 起）
 * @param {string} basePath - 站点相对基础路径（用于生成引用路径）
 * @returns {{ [type: string]: { items: object[], subfolders: object } } | null}
 */
function scanMediaDir(dirPath, formatsByType, types, maxDepth, currentDepth, basePath) {
  if (currentDepth > maxDepth) return null;
  if (!fs.existsSync(dirPath)) return null;

  const result = {};
  for (const type of types) result[type] = { items: [], subfolders: {} };

  const entries = fs
    .readdirSync(dirPath, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase().replace('.', '');
      for (const type of types) {
        if (!formatsByType[type]?.includes(ext)) continue;
        result[type].items.push({
          path: relativePath,
          name: entry.name,
          type,
          ext,
          // 图片可直接内嵌；音视频按保守映射标记；file 仅下载
          playable: type === 'image' ? true : Boolean(PLAYABLE_MEDIA[type]?.has(ext)),
        });
        break;
      }
    } else if (entry.isDirectory() && currentDepth < maxDepth) {
      const sub = scanMediaDir(fullPath, formatsByType, types, maxDepth, currentDepth + 1, relativePath);
      if (sub) {
        for (const type of types) result[type].subfolders[entry.name] = sub[type];
      }
    }
  }
  return result;
}

function buildFeatures(config, siteRoot) {
  const features = {};
  const feats = config.features || {};
  const read = (p, name) => {
    if (!fs.existsSync(p)) { console.warn(`  Feature "${name}": source not found: ${p}`); return null; }
    try { return require('./config').parseYaml(fs.readFileSync(p, 'utf8')); }
    catch (e) { console.warn(`  Feature "${name}": failed to parse ${p}: ${e.message}`); return null; }
  };

  if (feats.moments?.enabled) {
    const data = feats.moments.source ? read(path.join(siteRoot, feats.moments.source), 'moments') : null;
    features.moments = { enabled: true, ...feats.moments, ...(data || { moments: [] }) };
  }
  if (feats.links?.enabled) {
    const data = feats.links.source ? read(path.join(siteRoot, feats.links.source), 'links') : null;
    features.links = { enabled: true, ...feats.links, ...(data || { groups: [], links: [] }) };
  }
  if (feats.gallery?.enabled) {
    const data = feats.gallery.source ? read(path.join(siteRoot, feats.gallery.source), 'gallery') : null;
    const galleryData = { enabled: true, ...feats.gallery, ...(data || { groups: [], settings: {} }) };
    // 媒体库扫描：formats 按类型归一化（兼容旧平铺数组），
    // 每组按 types 分流扫描（省略 types 时仅 image——保持旧站点行为）
    const formatsByType = normalizeGalleryFormats(galleryData.settings?.formats);
    const groups = [];
    for (const group of (galleryData.groups || [])) {
      const types = Array.isArray(group.types) && group.types.length > 0 ? group.types : ['image'];
      const maxDepth = group.maxDepth || galleryData.settings?.maxDepth || 2;
      const groupDir = path.join(siteRoot, group.path);
      const media = scanMediaDir(groupDir, formatsByType, types, maxDepth, 0, group.path);
      groups.push({ ...group, types, media });
    }
    galleryData.groups = groups;
    delete galleryData.images; // 旧产物键（结构升级为 group.media），避免双份数据
    features.gallery = galleryData;
  }
  return features;
}

function writeBuildOutputs({ siteConfig, contentIndex, pathMap, posts, distDir }) {
  writeJson(path.join(distDir, 'site-config.json'), siteConfig);
  writeJson(path.join(distDir, 'content-index.json'), contentIndex);
  writeJson(path.join(distDir, 'pathmap.json'), pathMap);
  ensureDir(path.join(distDir, 'posts'));
  writeJson(path.join(distDir, 'posts', 'index.json'), contentIndex);
  writeJson(path.join(distDir, 'posts', '_pathmap.json'), pathMap);

  if (posts) {
    for (const post of posts) {
      if (!post.html || !post._outputPath) continue;
      // 加密文章不写入明文 HTML，只写入 dist/encrypted/*.json
      if (post._encrypted) continue;
      writeText(path.join(distDir, post._outputPath), post.html);
    }
  }
}

function scanThemeDir(dirPath, source) {
  const themes = [];
  if (!fs.existsSync(dirPath)) return themes;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const themeDir = path.join(dirPath, entry.name);
    const ymlPath = path.join(themeDir, 'theme.yml');
    const cssPath = path.join(themeDir, 'theme.css');
    if (!fs.existsSync(cssPath)) continue;
    let meta = { id: entry.name, name: entry.name };
    if (fs.existsSync(ymlPath)) {
      try {
        const parsed = require('./config').parseYaml(fs.readFileSync(ymlPath, 'utf8'));
        if (parsed) meta = { ...meta, ...parsed };
      } catch (_) {}
    }
    if (!meta.id) meta.id = entry.name;
    meta.source = source;
    meta.path = `themes/${entry.name}`;
    themes.push(meta);
  }
  return themes;
}

function scanAvailableThemes(pkgRoot, siteRoot) {
  const systemThemes = scanThemeDir(path.join(pkgRoot, 'res', 'themes'), 'system');
  const userThemes = scanThemeDir(path.join(siteRoot, 'themes'), 'user');
  // User themes override system themes with same id
  const map = {};
  for (const t of systemThemes) map[t.id] = t;
  for (const t of userThemes) map[t.id] = t;
  return Object.values(map);
}

function generateLocaleIndex(distDir) {
  const localesDir = path.join(distDir, 'locales');
  if (!fs.existsSync(localesDir)) return 0;
  const index = [];
  for (const entry of fs.readdirSync(localesDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json') || entry.name === 'index.json') continue;
    const code = entry.name.replace('.json', '');
    try {
      const data = JSON.parse(fs.readFileSync(path.join(localesDir, entry.name), 'utf8'));
      const meta = data._meta || { code, name: code, nativeName: code };
      index.push(meta);
    } catch (_) {
      index.push({ code, name: code, nativeName: code });
    }
  }
  if (index.length > 0) writeJson(path.join(localesDir, 'index.json'), index);
  return index.length;
}

module.exports = { writeBuildOutputs, cleanDir, ensureDir, writeText, writeJson, removeTree, buildPagesMap, buildPagesContent, resolveNav, buildFeatures, scanAvailableThemes, generateLocaleIndex };
