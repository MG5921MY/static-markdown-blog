const fs = require('fs');
const path = require('path');
const { marked } = require('../../res/vendor/marked.min.js');

function ensureDir(dirPath) { fs.mkdirSync(dirPath, { recursive: true }); }

function cleanDir(dirPath) {
  if (fs.existsSync(dirPath)) fs.rmSync(dirPath, { recursive: true, force: true });
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

function scanGalleryDir(dirPath, formats, maxDepth, currentDepth, basePath) {
  if (currentDepth > maxDepth) return null;
  if (!fs.existsSync(dirPath)) return null;

  const result = { images: [], subfolders: {} };
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase().replace('.', '');
      if (formats.includes(ext)) {
        result.images.push(relativePath);
      }
    } else if (entry.isDirectory() && currentDepth < maxDepth) {
      const sub = scanGalleryDir(fullPath, formats, maxDepth, currentDepth + 1, relativePath);
      if (sub) result.subfolders[entry.name] = sub;
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
    // Scan gallery directories to build images map
    const formats = (galleryData.settings?.formats || ['jpg', 'png', 'svg']).map(f => f.toLowerCase());
    const images = {};
    for (const group of (galleryData.groups || [])) {
      const groupDir = path.join(siteRoot, group.path);
      const maxDepth = group.maxDepth || galleryData.settings?.maxDepth || 2;
      const scanned = scanGalleryDir(groupDir, formats, maxDepth, 0, group.path);
      if (scanned) images[group.id] = scanned;
    }
    galleryData.images = images;
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

module.exports = { writeBuildOutputs, cleanDir, ensureDir, writeText, writeJson, buildPagesMap, buildPagesContent, resolveNav, buildFeatures, scanAvailableThemes, generateLocaleIndex };
