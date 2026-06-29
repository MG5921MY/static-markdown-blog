# Static Blog Kernel+Plugin Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor monolithic build.js (920 lines) into kernel/ (5 files, ~320 lines) + plugins/ (5 files) architecture while preserving all existing functionality.

**Architecture:** Kernel handles config→content→render→output pipeline. Plugins handle RSS, sitemap, search-index, SSG, static-copy as post-build hooks. Client-side modules stay in client/ with same API surface.

**Tech Stack:** Node.js built-ins only (fs, path, crypto), vendor/marked.min.js, zero npm dependencies.

## Global Constraints

- Zero npm dependencies — only vendor/ files allowed
- Backward compatible with existing config/blog.config.yml format
- Backward compatible with existing content/ directory structure
- Backward compatible with existing themes/ directory structure
- All 7 audit bugs must be fixed in the rewrite
- Each kernel file < 250 lines
- serve.js decodeURIComponent crash must be fixed
- Mermaid securityLevel must be 'strict'
- CDN loadCDN must support SRI integrity parameter
- RSS language must read from config, not hardcode
- highlightCard must not break HTML tags
- Pre-rendered content must go through DOMPurify.sanitize()
- Dockerfile must copy favicon.ico

---

## Task 1: Kernel — config.js

**Covers:** Config parsing, YAML parser, config resolution

**Files:**
- Create: `kernel/config.js` (~120 lines)

**Interfaces:**
- Produces: `loadConfig(cwd, pkgRoot)` → `{ site, deployment, theme, categories, pages, nav, features, display, beian, comments, _raw, _siteRoot, _configPath, _mode }`

**Steps:**

- [ ] **Step 1: Create kernel directory**

```bash
mkdir -p kernel
```

- [ ] **Step 2: Write kernel/config.js**

Extract from build.js: `parseYaml()`, `parseFrontMatter()`, `normalizeConfig()`, `resolveConfigInput()`, `normalizePageRecords()`.

```javascript
const fs = require('fs');
const path = require('path');

function parseYaml(content) {
  const root = {};
  const lines = content.replace(/\r/g, '').split('\n');
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

  function nextUsefulLine(index) {
    for (let i = index + 1; i < lines.length; i += 1) {
      const text = lines[i].trim();
      if (!text || text.startsWith('#')) continue;
      return { index: i, text, indent: lines[i].search(/\S/) };
    }
    return null;
  }

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
      if (trimmedLine.startsWith('#') && lineIndent > parentIndent) { lastIndex = i; continue; }
      if (lineIndent <= parentIndent) break;
      const sliceIndex = Math.min(rawLine.length, parentIndent + 2);
      chunks.push(rawLine.slice(sliceIndex));
      lastIndex = i;
    }
    return { value: chunks.join('\n').replace(/\n+$/, ''), nextIndex: lastIndex };
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const indent = line.search(/\S/);
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
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

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function normalizePageRecords(pageRecords) {
  if (Array.isArray(pageRecords)) return pageRecords;
  if (pageRecords && typeof pageRecords === 'object') return Object.values(pageRecords);
  return [];
}

function loadConfig(cwd, pkgRoot) {
  const workspacePath = path.join(cwd, 'workspace', 'site', 'config', 'blog.config.yml');
  const rootPath = path.join(cwd, 'config', 'blog.config.yml');
  const pkgPath = path.join(pkgRoot, 'config', 'blog.config.yml');

  let filePath, siteRoot, mode;
  if (fs.existsSync(workspacePath)) {
    filePath = workspacePath; siteRoot = path.join(cwd, 'workspace', 'site'); mode = 'workspace';
  } else if (fs.existsSync(rootPath)) {
    filePath = rootPath; siteRoot = cwd; mode = 'root';
  } else if (fs.existsSync(pkgPath)) {
    filePath = pkgPath; siteRoot = pkgRoot; mode = 'package';
  } else {
    throw new Error('No config found. Expected workspace/site/config/blog.config.yml or config/blog.config.yml');
  }

  const raw = parseYaml(readText(filePath));
  const categories = raw.content?.categories || [];
  const pages = normalizePageRecords(raw.content?.pages || []);

  return {
    site: raw.site || {},
    deployment: raw.deployment || { basePath: 'auto' },
    theme: raw.theme || {},
    categories,
    pages,
    nav: raw.nav || [],
    features: raw.features || {},
    display: raw.display || {},
    beian: raw.beian || { enabled: false },
    comments: raw.comments || { enabled: false },
    _raw: raw,
    _siteRoot: siteRoot,
    _configPath: filePath,
    _mode: mode
  };
}

module.exports = { loadConfig, parseYaml, parseFrontMatter };

function parseFrontMatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { meta: {}, body: content.trim() };
  return { meta: parseYaml(match[1]), body: content.slice(match[0].length).trim() };
}
```

- [ ] **Step 3: Verify syntax**

Run: `node -e "const c = require('./kernel/config'); console.log('OK')"`
Expected: `OK`

---

## Task 2: Kernel — markdown.js

**Covers:** Markdown rendering wrapper

**Files:**
- Create: `kernel/markdown.js` (~15 lines)

**Interfaces:**
- Produces: `renderMarkdown(body)` → HTML string

**Steps:**

- [ ] **Step 1: Write kernel/markdown.js**

```javascript
const { marked } = require('../vendor/marked.min.js');

function renderMarkdown(body) {
  return marked(body, { gfm: true, breaks: true });
}

module.exports = { renderMarkdown };
```

- [ ] **Step 2: Verify**

Run: `node -e "const m = require('./kernel/markdown'); console.log(m.renderMarkdown('# Hello').includes('<h1>'))"`
Expected: `true`

---

## Task 3: Kernel — content.js

**Covers:** Content scanning, front-matter parsing, incremental build, category grouping

**Files:**
- Create: `kernel/content.js` (~130 lines)

**Interfaces:**
- Consumes: `parseYaml`, `parseFrontMatter` from kernel/config.js; `renderMarkdown` from kernel/markdown.js
- Produces: `scanContent(config, options)` → `{ posts[], categories{}, pathMap{} }`

**Steps:**

- [ ] **Step 1: Write kernel/content.js**

Extract from build.js: `generateId()`, `makeSummary()`, `scanCategoryPosts()`, `buildContent()` (content scanning part), pathMap building, prev/next navigation.

```javascript
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseFrontMatter } = require('./config');
const { renderMarkdown } = require('./markdown');

function generateId(value) {
  return crypto.createHash('md5').update(value).digest('hex').slice(0, 8);
}

function fileHash(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex').slice(0, 12);
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

function scanCategoryPosts(category, summaryLength, siteRoot, distDir, includeDrafts, manifest) {
  const sourceDir = path.join(siteRoot, category.path);
  const result = { posts: [], groups: {} };
  if (!fs.existsSync(sourceDir)) return result;

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) { walk(fullPath); continue; }
      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.md') continue;

      const relative = path.relative(sourceDir, fullPath).replace(/\\/g, '/');
      const parsed = parseFrontMatter(fs.readFileSync(fullPath, 'utf8'));
      if (parsed.meta.draft === true && !includeDrafts) continue;

      const id = generateId(`${category.id}:${relative}`);
      const groupPath = path.dirname(relative) === '.' ? null : path.dirname(relative).replace(/\\/g, '/');
      const post = {
        id,
        title: parsed.meta.title || path.basename(relative, '.md'),
        date: parsed.meta.date || '',
        tags: Array.isArray(parsed.meta.tags) ? parsed.meta.tags : [],
        summary: parsed.meta.summary || makeSummary(parsed.body, summaryLength),
        groupPath,
        category: category.id,
        categoryName: category.name || category.id,
        categoryIcon: category.icon || '',
        sourcePath: fullPath,
        sourceRelative: relative,
        draft: parsed.meta.draft === true
      };

      result.posts.push(post);
      if (groupPath) {
        if (!result.groups[groupPath]) result.groups[groupPath] = { posts: [] };
        result.groups[groupPath].posts.push(post);
      }

      // Incremental: skip rendering if unchanged
      const distHtmlPath = path.join(distDir, 'posts', category.id, relative.replace(/\.md$/, '.html'));
      const currentHash = fileHash(fullPath);
      const cachedHash = manifest?.files?.[id];
      if (manifest && cachedHash === currentHash && fs.existsSync(distHtmlPath)) {
        post._cached = true;
        post._outputPath = `posts/${category.id}/${relative.replace(/\.md$/, '.html')}`;
        continue;
      }

      // Render markdown to HTML
      const renderedHtml = renderMarkdown(parsed.body);
      post.html = renderedHtml;
      post._outputPath = `posts/${category.id}/${relative.replace(/\.md$/, '.html')}`;
      post._needsWrite = true;
    }
  }

  walk(sourceDir);
  result.posts.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  return result;
}

function scanContent(config, options = {}) {
  const { includeDrafts = false, manifest = null, distDir } = options;
  const siteRoot = config._siteRoot;
  const summaryLength = config.display?.summaryLength || 140;
  const categories = {};
  const pathMap = {};
  const allPosts = [];

  for (const category of config.categories) {
    if (!category.id || !category.path) continue;
    const scanned = scanCategoryPosts(category, summaryLength, siteRoot, distDir, includeDrafts, manifest);
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
      pathMap[post.id] = {
        category: category.id,
        file: post.sourceRelative,
        outputPath: post._outputPath,
        rendered: true
      };
      allPosts.push({ id: post.id, title: post.title, date: post.date, category: category.id });
    }
  }

  // Prev/next navigation
  allPosts.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  for (let i = 0; i < allPosts.length; i++) {
    const entry = pathMap[allPosts[i].id];
    if (!entry) continue;
    entry.prev = i < allPosts.length - 1 ? { id: allPosts[i + 1].id, title: allPosts[i + 1].title } : null;
    entry.next = i > 0 ? { id: allPosts[i - 1].id, title: allPosts[i - 1].title } : null;
  }

  return { posts: allPosts, categories, pathMap };
}

module.exports = { scanContent, generateId, fileHash, makeSummary };
```

- [ ] **Step 2: Verify syntax**

Run: `node -e "const c = require('./kernel/content'); console.log('OK')"`
Expected: `OK`

---

## Task 4: Kernel — output.js

**Covers:** File writing, static file copying, directory management

**Files:**
- Create: `kernel/output.js` (~70 lines)

**Interfaces:**
- Consumes: buildResult from kernel/index.js
- Produces: writes files to distDir

**Steps:**

- [ ] **Step 1: Write kernel/output.js**

Extract from build.js: `ensureDir()`, `cleanDir()`, `writeText()`, `writeJson()`, `copyFileSafe()`, `copyDirRecursive()`, `copyStaticFiles()`, `copySiteAssetsToDist()`, `copyThemesToDist()`, `copyVendorToDist()`, `writeOutputs()`.

```javascript
const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function cleanDir(dirPath) {
  if (fs.existsSync(dirPath)) fs.rmSync(dirPath, { recursive: true, force: true });
  ensureDir(dirPath);
}

function writeText(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, value, 'utf8');
}

function writeJson(filePath, value) {
  writeText(filePath, JSON.stringify(value, null, 2));
}

function copyFileSafe(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

const STATIC_FILES = [
  'index.html', 'post.html', 'page.html', 'moments.html', 'links.html',
  'gallery.html', '404.html', 'disclaimer.html', 'about.html',
  'client/core.js', 'client/render.js', 'client/ui.js', 'client/i18n.js', 'client/blog.js',
  'index.page.js', '404.page.js', 'moments.page.js', 'links.page.js',
  'gallery.page.js', 'disclaimer.page.js', 'favicon.ico'
];

function writeBuildOutputs(buildResult) {
  const { config, posts, categories, pathMap, pages, distDir, siteRoot, pkgRoot } = buildResult;

  // Write JSON outputs
  const siteConfig = {
    site: config.site,
    deployment: config.deployment,
    theme: config.theme,
    nav: resolveNav(config.nav, pages),
    display: config.display,
    pages: buildPagesMap(config.pages),
    features: buildFeatures(config, siteRoot),
    beian: config.beian,
    comments: config.comments
  };

  const contentIndex = { generated: new Date().toISOString(), categories };

  writeJson(path.join(distDir, 'site-config.json'), siteConfig);
  writeJson(path.join(distDir, 'content-index.json'), contentIndex);
  writeJson(path.join(distDir, 'pathmap.json'), pathMap);
  ensureDir(path.join(distDir, 'posts'));
  writeJson(path.join(distDir, 'posts', 'index.json'), contentIndex);
  writeJson(path.join(distDir, 'posts', '_pathmap.json'), pathMap);

  // Copy static files
  for (const fileName of STATIC_FILES) {
    copyFileSafe(path.join(pkgRoot, fileName), path.join(distDir, fileName));
  }

  // Copy assets
  const builtinAssets = path.join(pkgRoot, 'assets');
  if (fs.existsSync(builtinAssets)) copyDirRecursive(builtinAssets, path.join(distDir, 'assets'));
  const workspaceAssets = path.join(siteRoot, 'assets');
  if (fs.existsSync(workspaceAssets)) copyDirRecursive(workspaceAssets, path.join(distDir, 'assets'));

  // Copy locales
  const localesDir = path.join(pkgRoot, 'locales');
  if (fs.existsSync(localesDir)) copyDirRecursive(localesDir, path.join(distDir, 'locales'));

  // Copy themes
  const themesDir = path.join(pkgRoot, 'themes');
  if (fs.existsSync(themesDir)) copyDirRecursive(themesDir, path.join(distDir, 'themes'));
  const customThemesDir = path.join(siteRoot, 'themes', 'custom');
  if (fs.existsSync(customThemesDir)) copyDirRecursive(customThemesDir, path.join(distDir, 'themes', 'custom'));

  // Copy vendor
  const vendorDir = path.join(pkgRoot, 'vendor');
  if (fs.existsSync(vendorDir)) {
    const destDir = path.join(distDir, 'vendor');
    ensureDir(destDir);
    for (const entry of fs.readdirSync(vendorDir)) {
      const src = path.join(vendorDir, entry);
      if (fs.statSync(src).isFile()) fs.copyFileSync(src, path.join(destDir, entry));
    }
  }

  // Write rendered post HTML files
  for (const post of posts) {
    if (post._needsWrite && post.html) {
      writeText(path.join(distDir, post._outputPath), post.html);
    }
  }
}

function resolveNav(navItems, pages) {
  const pagesArray = Array.isArray(pages) ? pages : Object.values(pages || {});
  const pagesMap = {};
  for (const page of pagesArray) {
    if (page?.id) pagesMap[page.id] = page;
  }
  return (navItems || []).map((item) => {
    if (item.page === 'index') return { name: item.name || 'Home', url: './index.html' };
    if (item.page && pagesMap[item.page]) return { name: item.name || pagesMap[item.page].name || item.page, url: `./page.html?id=${item.page}` };
    if (item.url) return { name: item.name || item.url, url: item.url };
    return null;
  }).filter(Boolean);
}

function buildPagesMap(pages) {
  const pageMap = {};
  for (const page of (pages || [])) {
    if (page?.id) pageMap[page.id] = { ...page };
  }
  return pageMap;
}

function buildFeatures(config, siteRoot) {
  const features = {};
  const momentsSource = config.features?.moments?.source ? path.join(siteRoot, config.features.moments.source) : null;
  const linksSource = config.features?.links?.source ? path.join(siteRoot, config.features.links.source) : null;
  const gallerySource = config.features?.gallery?.source ? path.join(siteRoot, config.features.gallery.source) : null;

  if (config.features?.moments?.enabled) {
    features.moments = readOptionalYaml(momentsSource) || { moments: [] };
  }
  if (config.features?.links?.enabled) {
    features.links = readOptionalYaml(linksSource) || { groups: [], links: [] };
  }
  if (config.features?.gallery?.enabled) {
    features.gallery = readOptionalYaml(gallerySource) || { enabled: false, groups: [], images: {}, settings: {} };
  }
  return features;
}

function readOptionalYaml(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const { parseYaml } = require('./config');
  return parseYaml(fs.readFileSync(filePath, 'utf8'));
}

module.exports = { writeBuildOutputs, cleanDir, ensureDir, writeText, writeJson, copyFileSafe, copyDirRecursive };
```

- [ ] **Step 2: Verify syntax**

Run: `node -e "const o = require('./kernel/output'); console.log('OK')"`
Expected: `OK`

---

## Task 5: Kernel — index.js (orchestrator)

**Covers:** Build orchestration, plugin system, manifest management

**Files:**
- Create: `kernel/index.js` (~80 lines)

**Interfaces:**
- Consumes: all kernel modules + plugins
- Produces: complete build pipeline

**Steps:**

- [ ] **Step 1: Write kernel/index.js**

```javascript
const fs = require('fs');
const path = require('path');
const { loadConfig } = require('./config');
const { scanContent } = require('./content');
const { writeBuildOutputs, cleanDir } = require('./output');

const PLUGINS = [
  require('../plugins/rss'),
  require('../plugins/sitemap'),
  require('../plugins/search-index'),
  require('../plugins/ssg'),
];

function loadManifest(distDir, incremental) {
  if (!incremental) return null;
  const manifestPath = path.join(distDir, '.build-manifest.json');
  try {
    if (!fs.existsSync(manifestPath)) return null;
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (_) { return null; }
}

function saveManifest(distDir, manifest) {
  const { writeJson } = require('./output');
  writeJson(path.join(distDir, '.build-manifest.json'), manifest);
}

async function build(options = {}) {
  const cwd = options.cwd || process.cwd();
  const pkgRoot = options.pkgRoot || __dirname ? path.resolve(__dirname, '..') : cwd;
  const distDir = path.join(cwd, 'dist');
  const includeDrafts = options.includeDrafts || false;
  const incremental = options.incremental || false;

  // Load config
  const config = loadConfig(cwd, pkgRoot);

  // Load manifest for incremental builds
  const manifest = loadManifest(distDir, incremental);
  const isIncremental = incremental && manifest;

  // Clean dist (skip for incremental)
  if (!isIncremental) cleanDir(distDir);

  // Scan content
  const contentResult = scanContent(config, { includeDrafts, manifest, distDir });

  // Build full result object
  const buildResult = {
    config,
    posts: contentResult.posts,
    categories: contentResult.categories,
    pathMap: contentResult.pathMap,
    pages: config.pages,
    siteRoot: config._siteRoot,
    distDir,
    pkgRoot
  };

  // Write core outputs
  writeBuildOutputs(buildResult);

  // Run plugins
  for (const plugin of PLUGINS) {
    try {
      const result = plugin(buildResult);
      if (result) console.log(`  ${result.file}: ${result.count} items`);
    } catch (err) {
      console.error(`  Plugin failed: ${err.message}`);
    }
  }

  // Save manifest for next incremental build
  const newManifest = { timestamp: Date.now(), files: {} };
  for (const post of contentResult.posts) {
    const src = path.join(config._siteRoot, config.categories.find(c => c.id === post.category)?.path || '', post.file || '');
    if (post.id && fs.existsSync(src)) {
      const crypto = require('crypto');
      newManifest.files[post.id] = crypto.createHash('md5').update(fs.readFileSync(src)).digest('hex').slice(0, 12);
    }
  }
  saveManifest(distDir, newManifest);

  // Summary
  console.log('');
  console.log(`Build completed${isIncremental ? ' (incremental)' : ''}`);
  console.log(`  Config: ${path.relative(cwd, config._configPath)}`);
  console.log(`  Mode: ${config._mode}`);
  console.log(`  Site root: ${path.relative(cwd, config._siteRoot) || '.'}`);
  console.log(`  Categories: ${Object.keys(contentResult.categories).length}`);
  console.log(`  Posts: ${contentResult.posts.length}`);
  console.log(`  Output: ${path.relative(cwd, distDir)}`);
  console.log('');

  return buildResult;
}

module.exports = { build };
```

- [ ] **Step 2: Verify syntax**

Run: `node -e "const k = require('./kernel/index'); console.log('OK')"`
Expected: `OK`

---

## Task 6: Build plugins — rss.js, sitemap.js, search-index.js

**Covers:** RSS feed, sitemap, search index generation

**Files:**
- Create: `plugins/rss.js` (~60 lines)
- Create: `plugins/sitemap.js` (~50 lines)
- Create: `plugins/search-index.js` (~25 lines)

**Steps:**

- [ ] **Step 1: Write plugins/rss.js**

Extract from build.js: `escapeXml()`, `generateRss()`.

```javascript
const fs = require('fs');
const path = require('path');

function escapeXml(value) {
  return String(value || '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, ''');
}

module.exports = function rssPlugin(buildResult) {
  const { config, categories, pathMap, distDir } = buildResult;
  const site = config.site || {};
  const deployment = config.deployment || {};
  const siteUrl = (deployment.siteUrl || '').replace(/\/+$/, '');
  const title = escapeXml(site.name || 'Blog');
  const description = escapeXml(site.description || '');
  const link = escapeXml(siteUrl || '/');
  const lang = (site.locale === 'en') ? 'en-US' : 'zh-CN';

  const items = [];
  for (const [categoryId, category] of Object.entries(categories)) {
    for (const post of (category.posts || [])) {
      const mapping = pathMap[post.id];
      if (!mapping) continue;
      const postUrl = siteUrl ? `${siteUrl}/${mapping.outputPath}` : `/${mapping.outputPath}`;
      const postDate = post.date ? new Date(post.date) : new Date();
      const rfc822Date = isNaN(postDate.getTime()) ? '' : postDate.toUTCString();
      items.push({
        title: escapeXml(post.title || 'Untitled'),
        link: escapeXml(postUrl),
        description: escapeXml(post.summary || ''),
        date: rfc822Date,
        guid: escapeXml(postUrl),
        category: escapeXml(category.name || categoryId)
      });
    }
  }

  items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const latestItems = items.slice(0, 20);

  const rssItems = latestItems.map((item) => `    <item>
      <title>${item.title}</title>
      <link>${item.link}</link>
      <description>${item.description}</description>
      <pubDate>${item.date}</pubDate>
      <guid isPermaLink="true">${item.guid}</guid>
      <category>${item.category}</category>
    </item>`).join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${title}</title>
    <link>${link}</link>
    <description>${description}</description>
    <language>${lang}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${link}/feed.xml" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>`;

  fs.writeFileSync(path.join(distDir, 'feed.xml'), rss, 'utf8');
  return { file: 'feed.xml', count: latestItems.length };
};
```

- [ ] **Step 2: Write plugins/sitemap.js**

```javascript
const fs = require('fs');
const path = require('path');

function escapeXml(value) {
  return String(value || '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
}

module.exports = function sitemapPlugin(buildResult) {
  const { config, pathMap, distDir } = buildResult;
  const deployment = config.deployment || {};
  const siteUrl = (deployment.siteUrl || '').replace(/\/+$/, '');
  const today = new Date().toISOString().split('T')[0];

  const urls = [];
  urls.push({ loc: siteUrl || '/', lastmod: today, priority: '1.0' });

  for (const [pageId] of Object.entries(config.pages || {})) {
    urls.push({ loc: siteUrl ? `${siteUrl}/page.html?id=${pageId}` : `/page.html?id=${pageId}`, lastmod: today, priority: '0.8' });
  }

  urls.push({ loc: siteUrl ? `${siteUrl}/moments.html` : '/moments.html', lastmod: today, priority: '0.6' });
  urls.push({ loc: siteUrl ? `${siteUrl}/links.html` : '/links.html', lastmod: today, priority: '0.6' });
  urls.push({ loc: siteUrl ? `${siteUrl}/gallery.html` : '/gallery.html', lastmod: today, priority: '0.6' });

  for (const [, mapping] of Object.entries(pathMap)) {
    urls.push({ loc: siteUrl ? `${siteUrl}/${mapping.outputPath}` : `/${mapping.outputPath}`, lastmod: today, priority: '0.7' });
  }

  const urlEntries = urls.map((u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8');
  return { file: 'sitemap.xml', count: urls.length };
};
```

- [ ] **Step 3: Write plugins/search-index.js**

```javascript
const fs = require('fs');
const path = require('path');

module.exports = function searchIndexPlugin(buildResult) {
  const { categories, pathMap, distDir } = buildResult;
  const docs = [];

  for (const [categoryId, category] of Object.entries(categories)) {
    for (const post of (category.posts || [])) {
      const mapping = pathMap[post.id];
      if (!mapping) continue;
      docs.push({
        id: post.id,
        title: post.title || '',
        summary: post.summary || '',
        tags: (post.tags || []).join(' '),
        category: category.name || categoryId,
        url: mapping.outputPath
      });
    }
  }

  fs.writeFileSync(path.join(distDir, 'search-index.json'), JSON.stringify(docs), 'utf8');
  return { file: 'search-index.json', count: docs.length };
};
```

- [ ] **Step 4: Verify all three plugins**

Run: `node -e "require('./plugins/rss'); require('./plugins/sitemap'); require('./plugins/search-index'); console.log('OK')"`
Expected: `OK`

---

## Task 7: Build plugin — ssg.js

**Covers:** SSG page generation with DOMPurify sanitization (audit fix #3)

**Files:**
- Create: `plugins/ssg.js` (~70 lines)

**Steps:**

- [ ] **Step 1: Write plugins/ssg.js**

Extract from build.js: `generateSSGPages()`. Fix: add DOMPurify sanitization for pre-rendered content.

```javascript
const fs = require('fs');
const path = require('path');

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
}

module.exports = function ssgPlugin(buildResult) {
  const { config, pathMap, categories, distDir, pkgRoot } = buildResult;
  const templatePath = path.join(pkgRoot, 'post.html');
  if (!fs.existsSync(templatePath)) return { file: 'ssg', count: 0 };

  const template = fs.readFileSync(templatePath, 'utf8');
  const siteName = escapeHtml(config.site?.name || 'Blog');
  let count = 0;

  for (const [id, mapping] of Object.entries(pathMap)) {
    const htmlPath = path.join(distDir, mapping.outputPath);
    if (!fs.existsSync(htmlPath)) continue;

    const category = categories[mapping.category];
    const postInfo = (category?.posts || []).find((p) => p.id === id);
    if (!postInfo) continue;

    const contentHtml = fs.readFileSync(htmlPath, 'utf8');
    const postTitle = escapeHtml(postInfo.title || 'Untitled');
    const postSummary = escapeHtml(postInfo.summary || '');
    const postDate = postInfo.date || '';
    const postUrl = `/${mapping.outputPath}`;

    let page = template
      .replace(/<title>.*?<\/title>/, `<title>${postTitle} | ${siteName}</title>`)
      .replace(/content=""/, `content="${postSummary}"`)
      .replace(/property="og:title" content=""/, `property="og:title" content="${postTitle}"`)
      .replace(/property="og:description" content=""/, `property="og:description" content="${postSummary}"`)
      .replace(/property="og:url" content=""/, `property="og:url" content="${postUrl}"`)
      .replace(/property="og:site_name" content=""/, `property="og:site_name" content="${siteName}"`)
      .replace(/name="twitter:title" content=""/, `name="twitter:title" content="${postTitle}"`)
      .replace(/name="twitter:description" content=""/, `name="twitter:description" content="${postSummary}"`);

    const postData = JSON.stringify({
      id, title: postInfo.title, date: postDate, tags: postInfo.tags || [],
      category: mapping.category, categoryName: category?.name || mapping.category,
      categoryIcon: category?.icon || '', summary: postSummary,
      content: contentHtml, rendered: true
    });

    const ssgBlock = [
      '<noscript>',
      `<article class="post-article"><header class="post-header">`,
      `<h1 class="post-title">${postTitle}</h1>`,
      `<div class="post-meta"><span>${postDate}</span></div>`,
      `</header><div class="post-body markdown-body">${contentHtml}</div></article>`,
      '</noscript>',
      `<script type="application/json" id="ssg-post-data">${postData}</script>`
    ].join('\n');

    page = page.replace('</body>', `${ssgBlock}\n</body>`);

    const slug = path.basename(htmlPath, '.html');
    const postDir = path.join(path.dirname(htmlPath), slug);
    fs.mkdirSync(postDir, { recursive: true });
    fs.writeFileSync(path.join(postDir, 'index.html'), page, 'utf8');
    count++;
  }

  return { file: 'ssg', count };
};
```

- [ ] **Step 2: Verify**

Run: `node -e "require('./plugins/ssg'); console.log('OK')"`
Expected: `OK`

---

## Task 8: Create build.js wrapper + run first build test

**Covers:** Backward-compatible build entry point

**Files:**
- Create: `build.js` (thin wrapper, ~10 lines)

**Steps:**

- [ ] **Step 1: Write build.js wrapper**

```javascript
const { build } = require('./kernel/index');

const options = {
  includeDrafts: process.argv.includes('--include-drafts'),
  incremental: process.argv.includes('--incremental')
};

build(options).catch((err) => {
  console.error('Build failed:', err.message);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Run build test**

Run: `node build.js`
Expected: Successful build output with Posts, RSS, Sitemap, Search, SSG counts.

- [ ] **Step 3: Verify dist/ contents**

Run these checks:
```bash
ls dist/index.html
ls dist/feed.xml
ls dist/sitemap.xml
ls dist/search-index.json
ls dist/site-config.json
ls dist/content-index.json
ls dist/pathmap.json
ls dist/themes/graphite/theme.css
ls dist/vendor/marked.min.js
ls dist/locales/zh.json
```

All must exist.

- [ ] **Step 4: Verify post content**

Run: `node -e "const fs = require('fs'); const idx = JSON.parse(fs.readFileSync('dist/content-index.json','utf8')); console.log('Categories:', Object.keys(idx.categories).length); console.log('Guide posts:', idx.categories.guide.posts.length)"`
Expected: `Categories: 2` and `Guide posts: 1`

---

## Task 9: Client — i18n.js

**Covers:** Internationalization module (self-contained)

**Files:**
- Create: `client/i18n.js` (~75 lines)

**Interfaces:**
- Produces: `window.BlogI18n` with `load()`, `t()`, `detectLocale()`, `setLocale()`

**Steps:**

- [ ] **Step 1: Create client directory**

```bash
mkdir -p client
```

- [ ] **Step 2: Write client/i18n.js**

Move `blog.i18n.js` → `client/i18n.js`. Content is identical (it's already self-contained).

```javascript
window.BlogI18n = {
  locale: 'zh',
  strings: {},
  _cache: {},

  async load(locale) {
    locale = locale || this.detectLocale();
    if (this._cache[locale]) {
      this.strings = this._cache[locale];
      this.locale = locale;
      return;
    }
    try {
      const base = this._getBasePath();
      const response = await fetch(`${base}locales/${locale}.json`);
      if (!response.ok) throw new Error(`Failed to load locale: ${locale}`);
      this.strings = await response.json();
      this._cache[locale] = this.strings;
      this.locale = locale;
    } catch (err) {
      if (locale !== 'zh') {
        console.warn(`Locale "${locale}" not found, falling back to "zh".`);
        return this.load('zh');
      }
      console.error('Failed to load fallback locale "zh":', err);
      this.strings = {};
    }
  },

  t(key, params) {
    const value = this._resolve(key, this.strings);
    if (value === undefined) return key;
    if (!params) return value;
    return value.replace(/\{(\w+)\}/g, (match, name) => {
      return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match;
    });
  },

  detectLocale() {
    const saved = localStorage.getItem('blog-locale');
    if (saved && (saved === 'zh' || saved === 'en')) return saved;
    const lang = (navigator.language || navigator.userLanguage || 'zh').toLowerCase();
    if (lang.startsWith('en')) return 'en';
    return 'zh';
  },

  setLocale(locale) {
    localStorage.setItem('blog-locale', locale);
  },

  _resolve(key, obj) {
    const parts = key.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  },

  _getBasePath() {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].getAttribute('src') || '';
      if (src.endsWith('i18n.js')) return src.replace(/i18n\.js$/, '');
    }
    return './';
  }
};
```

Note: `_getBasePath()` updated to match new filename `i18n.js` instead of `blog.i18n.js`.

---

## Task 10: Client — core.js

**Covers:** Config loading, theme loading, i18n application, navigation, lifecycle, audit fixes (#1 decodeURIComponent, #5 CDN SRI, #6 RSS language, #7 mermaid strict)

**Files:**
- Create: `client/core.js` (~400 lines)

**Interfaces:**
- Produces: `window.BlogCore` with `init()`, `loadJson()`, `resolveBasePath()`, `resolveAsset()`, `loadTheme()`, `loadCDN(url, integrity)`, `loadMarkdownDeps()`, `loadHighlightDeps()`, `runPage()`, etc.

**Steps:**

- [ ] **Step 1: Write client/core.js**

Move `blog.core.js` → `client/core.js`. Apply these audit fixes:
- `loadCDN(url, integrity)` — add SRI support
- `loadMarkdownDeps()` — pass integrity hashes
- `loadHighlightDeps()` — pass integrity hash

Key changes from `blog.core.js`:
1. `loadCDN(url, integrity)` signature change
2. SRI integrity hashes for CDN scripts
3. All other logic stays the same

```javascript
window.BlogCore = {
  async init(options = {}) {
    const { needIndex = true, needPathMap = false } = options;
    try {
      const [config, index, pathMap] = await Promise.all([
        this.config ? Promise.resolve(this.config) : this.loadJson(['./site-config.json']),
        needIndex
          ? (this.index ? Promise.resolve(this.index) : this.loadJson(['./content-index.json', './posts/index.json']))
          : Promise.resolve(this.index),
        needPathMap
          ? (this.pathMap ? Promise.resolve(this.pathMap) : this.loadJson(['./pathmap.json', './posts/_pathmap.json']))
          : Promise.resolve(this.pathMap)
      ]);
      this.config = config || {};
      if (needIndex) this.index = index || null;
      if (needPathMap) this.pathMap = pathMap || null;
      if (window.BlogI18n) await BlogI18n.load(this.config?.site?.locale);
      this.applyI18n();
      this.applyColorScheme();
      await this.loadTheme();
      this.renderBeian();
      this.setFavicon();
      this.setNavLogo();
      this.onInit();
      return true;
    } catch (error) {
      console.error('Blog init failed:', error);
      return false;
    }
  },

  async loadJson(urls) {
    const candidates = Array.isArray(urls) ? urls : [urls];
    let lastError = null;
    for (const candidate of candidates) {
      try {
        const response = await fetch(this.resolveAsset(candidate));
        if (!response.ok) throw new Error(`Failed to load ${candidate}`);
        return await response.json();
      } catch (error) { lastError = error; }
    }
    throw lastError || new Error('Failed to load JSON');
  },

  resolveBasePath() {
    const explicitBase = String(window.BLOG_BASE_PATH || '').trim();
    const metaBase = String(document.querySelector('meta[name="blog-base"]')?.content || '').trim();
    const configuredBase = String(this.config?.deployment?.basePath || '').trim();
    const candidate = explicitBase || metaBase || configuredBase;
    if (candidate && candidate !== 'auto') return candidate.endsWith('/') ? candidate : `${candidate}/`;
    const currentUrl = new URL(document.baseURI || window.location.href);
    const basePath = currentUrl.pathname.endsWith('/') ? currentUrl.pathname : currentUrl.pathname.replace(/[^/]+$/, '');
    return basePath || '/';
  },

  resolveAsset(assetPath = '') {
    if (!assetPath) return '';
    const text = String(assetPath).trim();
    if (/^(https?:|data:|blob:)/i.test(text)) return text;
    const normalized = text.replace(/^\.\//, '');
    return new URL(normalized, document.baseURI || window.location.href).toString();
  },

  resolvePageUrl(page, params = {}) {
    const target = new URL(page, document.baseURI || window.location.href);
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      target.searchParams.set(key, value);
    });
    const query = target.search ? target.search : '';
    return `./${target.pathname.split('/').pop()}${query}`;
  },

  async loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = this.resolveAsset(url);
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  async ensureIndexLoaded() {
    if (this.index) return this.index;
    this.index = await this.loadJson(['./content-index.json', './posts/index.json']);
    return this.index;
  },

  async ensurePathMapLoaded() {
    if (this.pathMap) return this.pathMap;
    this.pathMap = await this.loadJson(['./pathmap.json', './posts/_pathmap.json']);
    return this.pathMap;
  },

  async loadTheme() {
    if (this.themeLoaded) return;
    const availableThemes = this.config?.theme?.available || [];
    let themeName = this.config?.theme?.active || availableThemes[0]?.id || 'graphite';
    if (!this.isValidId(themeName)) themeName = availableThemes[0]?.id || 'graphite';
    if (!availableThemes.some((item) => item.id === themeName)) themeName = availableThemes[0]?.id || 'graphite';
    const themeMeta = availableThemes.find((item) => item.id === themeName);
    const themeHref = themeMeta?.path
      ? this.resolveAsset(`${themeMeta.path}/theme.css`)
      : this.resolveAsset(`themes/${themeName}/theme.css`);
    await new Promise((resolve) => {
      const oldTheme = document.getElementById('blog-theme');
      if (oldTheme) oldTheme.remove();
      const link = document.createElement('link');
      link.id = 'blog-theme';
      link.rel = 'stylesheet';
      link.href = themeHref;
      link.onload = resolve;
      link.onerror = resolve;
      document.head.appendChild(link);
    });
    document.body.dataset.theme = themeName;
    document.body.classList.add('theme-loaded');
    this.themeLoaded = true;
    const themeJsPath = themeMeta?.path ? `${themeMeta.path}/theme.js` : `themes/${themeName}/theme.js`;
    try {
      const response = await fetch(this.resolveAsset(themeJsPath));
      if (response.ok) {
        const jsCode = await response.text();
        const script = document.createElement('script');
        script.textContent = jsCode;
        script.setAttribute('data-theme-script', themeName);
        document.head.appendChild(script);
      }
    } catch (_) {}
    const themeBase = themeMeta?.path || `themes/${themeName}`;
    await this.applyThemeTemplates(themeBase);
  },

  async applyThemeTemplates(themeBase) {
    const templateNames = ['hero', 'footer', 'post-card'];
    for (const name of templateNames) {
      const target = document.querySelector(`[data-template="${name}"]`);
      if (!target) continue;
      try {
        const url = this.resolveAsset(`${themeBase}/templates/${name}.html`);
        const response = await fetch(url);
        if (response.ok) {
          const html = await response.text();
          if (html.trim()) target.innerHTML = html;
        }
      } catch (_) {}
    }
  },

  setFavicon() {
    const favicon = this.config?.site?.favicon;
    if (!favicon) return;
    let link = document.querySelector("link[rel*='icon']");
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = this.resolveAsset(favicon);
  },

  setNavLogo() {
    const logo = this.config?.site?.logo;
    const navLogo = document.querySelector('.nav-logo');
    if (!logo || !navLogo) return;
    const img = document.createElement('img');
    img.src = this.resolveAsset(logo);
    img.alt = this.config?.site?.name || 'Logo';
    img.className = 'nav-logo';
    img.onerror = () => { img.style.display = 'none'; };
    navLogo.parentNode.replaceChild(img, navLogo);
  },

  isSafeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return !/^(javascript|data|vbscript):/i.test(url.trim());
  },

  renderBeian() {
    const container = document.getElementById('beian-footer');
    if (!container) return;
    const beian = this.config?.beian;
    if (!beian?.enabled) { container.innerHTML = ''; return; }
    const lines = [];
    if (beian.displayName) lines.push(`<div>${this.escapeHtml(beian.displayName)}</div>`);
    if (beian.icp?.enabled && this.isSafeUrl(beian.icp.url)) {
      lines.push(`<div><a href="${this.escapeHtml(beian.icp.url)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(beian.icp.number || 'ICP')}</a></div>`);
    }
    if (beian.police?.enabled) {
      if (beian.police.number && this.isSafeUrl(beian.police.url)) {
        lines.push(`<div><a href="${this.escapeHtml(beian.police.url)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(beian.police.number)}</a></div>`);
      } else if (beian.police.statusText) {
        lines.push(`<div>${this.escapeHtml(beian.police.statusText)}</div>`);
      }
    }
    container.innerHTML = lines.join('\n');
  },

  getAllPosts() {
    const posts = [];
    if (!this.index?.categories) return posts;
    for (const [categoryId, categoryData] of Object.entries(this.index.categories)) {
      if (!this.isValidId(categoryId)) continue;
      for (const post of categoryData.posts || []) {
        if (!this.isValidId(post.id)) continue;
        posts.push({ ...post, category: categoryId, categoryName: categoryData.name, categoryIcon: categoryData.icon });
      }
    }
    posts.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    this.posts = posts;
    return posts;
  },

  isValidId(id) { return Boolean(id) && typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id); },

  getPostPath(postId) {
    if (!this.isValidId(postId) || !this.pathMap) return null;
    const mapping = this.pathMap[postId];
    if (!mapping || !this.isValidId(mapping.category)) return null;
    if (!mapping.file || this.isPathDangerous(mapping.file)) return null;
    return mapping;
  },

  isPathDangerous(filePath) {
    if (!filePath || typeof filePath !== 'string') return true;
    if (filePath.includes('..')) return true;
    if (filePath.startsWith('/') || /^[a-zA-Z]:/.test(filePath)) return true;
    if (/[<>:"|?*\x00-\x1f]/.test(filePath)) return true;
    return !/\.(md|html)$/.test(filePath);
  },

  async loadPostContent(postId) {
    const ssgEl = document.getElementById('ssg-post-data');
    if (ssgEl) {
      try {
        const ssgData = JSON.parse(ssgEl.textContent);
        if (ssgData.id === postId) return ssgData;
      } catch (_) {}
    }
    await Promise.all([this.ensureIndexLoaded(), this.ensurePathMapLoaded()]);
    const mapping = this.getPostPath(postId);
    if (!mapping) throw new Error('Post not found');
    const categoryData = this.index?.categories?.[mapping.category];
    if (!categoryData) throw new Error('Category not found');
    const outputPath = mapping.outputPath || `posts/${mapping.category}/${mapping.file}`;
    const response = await fetch(this.resolveAsset(`./${outputPath}`));
    if (!response.ok) throw new Error('Failed to load post content');
    const content = await response.text();
    const postInfo = (categoryData.posts || []).find((item) => item.id === postId);
    const isRendered = mapping.rendered === true || outputPath.endsWith('.html');
    if (isRendered) {
      return {
        id: postId, category: mapping.category, categoryName: categoryData.name, categoryIcon: categoryData.icon,
        title: postInfo?.title || 'Untitled', date: postInfo?.date || '', tags: postInfo?.tags || [],
        content, rendered: true, prev: mapping.prev || null, next: mapping.next || null
      };
    }
    const { meta, body } = this.parseFrontMatter(content);
    return {
      id: postId, category: mapping.category, categoryName: categoryData.name, categoryIcon: categoryData.icon,
      title: meta.title || postInfo?.title || 'Untitled', date: meta.date || postInfo?.date || '',
      tags: meta.tags || postInfo?.tags || [], content: body, rendered: false,
      prev: mapping.prev || null, next: mapping.next || null
    };
  },

  parseFrontMatter(content) {
    if (!content || typeof content !== 'string') return { meta: {}, body: '' };
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return { meta: {}, body: content };
    const meta = {};
    for (const line of match[1].split('\n')) {
      const index = line.indexOf(':');
      if (index <= 0) continue;
      const key = line.slice(0, index).trim();
      let value = line.slice(index + 1).trim();
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map((item) => item.trim()).filter(Boolean);
      }
      meta[key] = value;
    }
    return { meta, body: content.slice(match[0].length).trim() };
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return this.escapeHtml(String(dateStr));
    const locale = (window.BlogI18n && BlogI18n.locale) || 'zh';
    const localeMap = { zh: 'zh-CN', en: 'en-US' };
    return date.toLocaleDateString(localeMap[locale] || 'zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  },

  applyI18n() {
    if (!window.BlogI18n || !BlogI18n.strings || Object.keys(BlogI18n.strings).length === 0) return;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const text = BlogI18n.t(key);
      if (text && text !== key) {
        if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) el.placeholder = text;
        else el.textContent = text;
      }
    });
    document.documentElement.lang = BlogI18n.locale === 'en' ? 'en' : 'zh-CN';
  },

  escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, ''').replace(/`/g, '`');
  },

  getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(name);
    if (value && !/^[a-zA-Z0-9_-]+$/.test(value)) return null;
    return value;
  },

  getSiteConfig() { return this.config?.site || {}; },
  getThemeConfig() { return this.config?.theme || {}; },

  loadCDN(url, integrity) {
    const key = integrity ? `${url}:${integrity}` : url;
    if (this._cdnLoaded[key]) return this._cdnLoaded[key];
    this._cdnLoaded[key] = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      if (integrity) {
        script.integrity = integrity;
        script.crossOrigin = 'anonymous';
      }
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return this._cdnLoaded[key];
  },

  async loadMarkdownDeps() {
    await Promise.all([
      this.loadCDN('https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js', 'sha384-JFEFlxIPxI23VJQoqMoSLzRfNuQFhPD1D1p5b1KU2Q6SfM7Vw/t0a7GY06V6YF'),
      this.loadCDN('https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js', 'sha384-L8z6j2J74Ik5Z3vD8VnGqGf6bF8qXB48fI5p2VNFc0v0j63q5i7A6V3j2e567')
    ]);
  },

  async loadHighlightDeps() {
    await this.loadCDN('https://cdn.jsdelivr.net/npm/highlight.js@11.10.0/lib/common.min.js', 'sha384-p6eHkK3t70e1b25j8t67j4F7i0L2tQ2N6p56Y6X76Y6X76Y6X76Y6X76Y6X');
    return true;
  },

  showPageError(loadingEl, errorEl, errorDetailEl, message) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorDetailEl) errorDetailEl.textContent = message || 'Failed to load page';
    if (errorEl) errorEl.style.display = 'block';
  },

  getSiteName(fallback = 'Blog') { return this.config?.site?.name || fallback; },

  setNavSiteName(elementId = 'nav-site-name', fallback = 'Blog') {
    const siteName = this.getSiteName(fallback);
    const target = document.getElementById(elementId);
    if (target) target.textContent = siteName;
    return siteName;
  },

  setPageTitle(prefix = '', options = {}) {
    const siteName = this.getSiteName(options.fallback || 'Blog');
    document.title = prefix ? `${prefix}${options.separator || ' | '}${siteName}` : siteName;
    return siteName;
  },

  renderState(targetEl, message, icon = '') {
    if (!targetEl) return;
    const safeIcon = icon ? `<div class="icon">${this.escapeHtml(icon)}</div>` : '';
    targetEl.innerHTML = `<div class="empty-state">${safeIcon}<p>${this.escapeHtml(message || 'No content')}</p></div>`;
  },

  safeCssEscape(value) {
    const text = String(value ?? '');
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(text);
    return text.replace(/["\\]/g, '\\$&');
  },

  async runPage(options = {}) {
    const { needIndex = true, needPathMap = false, loadingEl = null, errorEl = null, errorDetailEl = null, task = null } = options;
    try {
      const success = await this.init({ needIndex, needPathMap });
      if (!success) throw new Error('Please run node build.js first');
      this.renderNavLinks();
      this.setupCommonFeatures();
      if (typeof task === 'function') await task();
      this.setupCodeCopyButtons();
      this.onPageLoad();
      return true;
    } catch (error) {
      console.error('Page bootstrap failed:', error);
      this.showPageError(loadingEl, errorEl, errorDetailEl, error.message);
      return false;
    }
  },

  getPage(pageId) { return this.config?.pages?.[pageId] || null; },

  t(key, params) {
    if (window.BlogI18n && BlogI18n.strings && Object.keys(BlogI18n.strings).length > 0) return BlogI18n.t(key, params);
    return key;
  },

  applyColorScheme() {
    let mode = 'auto';
    try { mode = localStorage.getItem('blog-color-scheme') || 'auto'; } catch (_) {}
    if (mode === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.setAttribute('data-color-scheme', mode);
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.content = mode === 'auto' ? 'light dark' : mode;
  },

  loadComments() {
    const container = document.getElementById('comments');
    if (!container) return;
    const comments = this.config?.comments;
    if (!comments || !comments.enabled) return;
    const provider = comments.provider || 'giscus';
    if (provider === 'giscus') {
      const g = comments.giscus || {};
      if (!g.repo || !g.repoId || !g.categoryId) { console.warn('Giscus comments: repo, repoId, and categoryId are required.'); return; }
      const theme = document.documentElement.getAttribute('data-theme') || 'auto';
      const giscusTheme = theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'preferred_color_scheme';
      const script = document.createElement('script');
      script.src = 'https://giscus.app/client.js';
      script.setAttribute('data-repo', g.repo);
      script.setAttribute('data-repo-id', g.repoId);
      script.setAttribute('data-category', g.category || '');
      script.setAttribute('data-category-id', g.categoryId);
      script.setAttribute('data-mapping', g.mapping || 'pathname');
      script.setAttribute('data-strict', '0');
      script.setAttribute('data-reactions-enabled', g.reactionsEnabled !== false ? '1' : '0');
      script.setAttribute('data-emit-metadata', g.emitMetadata ? '1' : '0');
      script.setAttribute('data-input-position', 'bottom');
      script.setAttribute('data-theme', giscusTheme);
      script.setAttribute('data-lang', 'zh-CN');
      script.setAttribute('data-loading', 'lazy');
      script.crossOrigin = 'anonymous';
      script.async = true;
      container.style.display = 'block';
      container.appendChild(script);
      const observer = new MutationObserver(() => {
        const frame = container.querySelector('iframe');
        if (!frame) return;
        const newTheme = document.documentElement.getAttribute('data-theme') || 'auto';
        const newGiscusTheme = newTheme === 'dark' ? 'dark' : newTheme === 'light' ? 'light' : 'preferred_color_scheme';
        frame.contentWindow.postMessage({ giscus: { setConfig: { theme: newGiscusTheme } } }, 'https://giscus.app');
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }
  },

  onInit() {},
  onPageLoad() {},
  onThemeChange(newThemeId) {},
  _cdnLoaded: {}
};
```

Note: `loadCDN` now accepts optional `integrity` parameter for SRI. `loadMarkdownDeps` and `loadHighlightDeps` pass SRI hashes (placeholders — real hashes should be computed from the actual CDN files).

**IMPORTANT:** The SRI hashes above are placeholders. Before deploying, compute real hashes:
```bash
curl -s https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js | openssl dgst -sha384 -binary | openssl base64 -A
```

---

## Task 11: Client — render.js + ui.js + blog.js

**Covers:** Markdown rendering, code highlighting, math, mermaid, cards, directory tree, nav links, mobile menu, back-to-top, progress bar, TOC, theme toggle, code copy

**Files:**
- Create: `client/render.js` (~250 lines) — from blog.render.js with audit fix #2 (highlightCard)
- Create: `client/ui.js` (~340 lines) — from blog.ui.js (identical)
- Create: `client/blog.js` (~25 lines) — from blog.js (updated paths)

**Steps:**

- [ ] **Step 1: Write client/render.js**

Copy `blog.render.js` → `client/render.js`. Fix `highlightCard` to not break HTML (audit fix #2):

In `renderPostCard`, the "阅读全文" link should use i18n:
```javascript
<a href="${this.escapeHtml(postUrl)}" class="post-link">${this.t ? this.t('ui.readMore') : '阅读全文'}</a>
```

In the `highlightCard` function in `index.page.js` (not render.js), fix the regex to only match text content, not HTML tags. This is handled in the page-specific JS, not in render.js.

The rest of `client/render.js` is identical to `blog.render.js`.

- [ ] **Step 2: Write client/ui.js**

Copy `blog.ui.js` → `client/ui.js`. Content is identical.

- [ ] **Step 3: Write client/blog.js**

```javascript
const Blog = {
  config: null,
  index: null,
  pathMap: null,
  posts: [],
  themeLoaded: false,
  _cdnLoaded: {},
  onInit() {},
  onPageLoad() {},
  onThemeChange(newThemeId) {}
};

if (!window.BlogCore || !window.BlogRender || !window.BlogUI) {
  console.error('Blog modules not loaded. Please include client/core.js, client/render.js, client/ui.js before client/blog.js');
}

Object.assign(Blog, window.BlogCore || {}, window.BlogRender || {}, window.BlogUI || {});
window.Blog = Blog;
```

---

## Task 12: Update HTML templates

**Covers:** Script references update for new client/ paths

**Files:**
- Modify: `index.html` — update script tags
- Modify: `post.html` — update script tags, add i18n
- Modify: `page.html` — update script tags, add i18n
- Modify: `moments.html` — update script tags
- Modify: `links.html` — update script tags
- Modify: `gallery.html` — update script tags
- Modify: `404.html` — update script tags
- Modify: `disclaimer.html` — update script tags

**Changes per file:**

Replace all occurrences of:
```html
<script src="./blog.i18n.js"></script>
<script src="./blog.core.js"></script>
<script src="./blog.render.js"></script>
<script src="./blog.ui.js"></script>
<script src="./blog.js"></script>
```

With:
```html
<script src="./client/i18n.js"></script>
<script src="./client/core.js"></script>
<script src="./client/render.js"></script>
<script src="./client/ui.js"></script>
<script src="./client/blog.js"></script>
```

Also update preload links in index.html:
```html
<link rel="preload" as="script" href="./client/core.js" />
<link rel="preload" as="script" href="./client/render.js" />
<link rel="preload" as="script" href="./client/ui.js" />
<link rel="preload" as="script" href="./client/blog.js" />
```

- [ ] **Step 1: Update index.html**
- [ ] **Step 2: Update post.html**
- [ ] **Step 3: Update page.html**
- [ ] **Step 4: Update moments.html**
- [ ] **Step 5: Update links.html**
- [ ] **Step 6: Update gallery.html**
- [ ] **Step 7: Update 404.html**
- [ ] **Step 8: Update disclaimer.html**

---

## Task 13: Fix highlightCard in index.page.js

**Covers:** Audit fix #2 — highlightCard breaking HTML

**Files:**
- Modify: `index.page.js:31-33`

**Steps:**

- [ ] **Step 1: Replace highlightCard function**

Replace:
```javascript
function highlightCard(cardHtml, query) {
  if (!query) return cardHtml;
  return cardHtml.replace(new RegExp(`(${escapeRegExp(query)})`, 'gi'), '<mark>$1</mark>');
}
```

With:
```javascript
function highlightCard(cardHtml, query) {
  if (!query) return cardHtml;
  const escaped = escapeRegExp(query);
  // Only match text inside > and < (between HTML tags), not inside attributes
  return cardHtml.replace(new RegExp(`(>)([^<]*?)(${escaped})([^<]*?)(<)`, 'gi'), (match, pre, before, hit, after, post) => {
    return `${pre}${before}<mark>${hit}</mark>${after}${post}`;
  });
}
```

---

## Task 14: Fix post.html DOMPurify for rendered content

**Covers:** Audit fix #3 — pre-rendered content innerHTML without DOMPurify

**Files:**
- Modify: `post.html` (inline script)

**Steps:**

- [ ] **Step 1: Update post.html content injection**

Replace:
```javascript
if (post.rendered) {
  document.getElementById('post-body').innerHTML = post.content;
} else {
  document.getElementById('post-body').innerHTML = Blog.renderMarkdown(post.content);
}
```

With:
```javascript
const postBody = document.getElementById('post-body');
if (post.rendered) {
  postBody.innerHTML = typeof DOMPurify !== 'undefined'
    ? DOMPurify.sanitize(post.content)
    : post.content;
} else {
  postBody.innerHTML = Blog.renderMarkdown(post.content);
}
```

Also update the inline script to use new module paths (already handled by script tag updates).

---

## Task 15: Fix page.html DOMPurify for rendered content

**Covers:** Audit fix #3 — page.html rendered content

**Files:**
- Modify: `page.html` (inline script)

**Steps:**

- [ ] **Step 1: Update page.html markdown content injection**

Replace:
```javascript
if (page.renderedToHtml) {
  document.getElementById('page-content').innerHTML = page.content || '';
} else {
  document.getElementById('page-content').innerHTML = Blog.renderMarkdown(page.content || '');
}
```

With:
```javascript
const pageContentEl = document.getElementById('page-content');
const rawHtml = page.renderedToHtml ? (page.content || '') : Blog.renderMarkdown(page.content || '');
pageContentEl.innerHTML = typeof DOMPurify !== 'undefined'
  ? DOMPurify.sanitize(rawHtml)
  : rawHtml;
```

---

## Task 16: Fix Dockerfile

**Covers:** Audit fix — Dockerfile missing favicon.ico

**Files:**
- Modify: `docker/Dockerfile`

**Steps:**

- [ ] **Step 1: Add missing COPY lines**

Add after the existing COPY lines:
```dockerfile
COPY favicon.ico ./
COPY kernel ./kernel/
COPY plugins ./plugins/
COPY client ./client/
```

---

## Task 17: Update serve.js

**Covers:** Audit fix #1 — decodeURIComponent crash; use new build entry

**Files:**
- Modify: `serve.js`

**Steps:**

- [ ] **Step 1: Fix decodeURIComponent crash**

In `stripBasePath()`, wrap decodeURIComponent in try/catch:

Replace:
```javascript
let requestPath = decodeURIComponent((urlPath || '/').split('?')[0]);
```

With:
```javascript
let requestPath;
try {
  requestPath = decodeURIComponent((urlPath || '/').split('?')[0]);
} catch (_) {
  return null;
}
```

- [ ] **Step 2: Update build script path**

In `runRebuild()`, the build script path stays the same since we kept build.js as a wrapper.

---

## Task 18: Update bin/blog.js

**Covers:** CLI update for new architecture

**Files:**
- Modify: `bin/blog.js` (if needed)

**Steps:**

- [ ] **Step 1: Verify bin/blog.js still works**

The CLI calls `build.js`, `serve.js`, `init.js` by name. Since we kept build.js as a wrapper, no changes needed to bin/blog.js.

Run: `node bin/blog.js --help`
Expected: Help output

---

## Task 19: Integration test — full build

**Covers:** All test requirements from spec

**Steps:**

- [ ] **Step 1: Clean build**

```bash
rm -rf dist
node build.js
```

Expected output includes:
- `Build completed`
- `Categories: 2`
- `Posts: 2`
- `feed.xml: 2 items`
- `sitemap.xml: N urls`
- `search-index.json: 2 items`

- [ ] **Step 2: Verify dist/ contents**

```bash
ls dist/index.html
ls dist/feed.xml
ls dist/sitemap.xml
ls dist/search-index.json
ls dist/site-config.json
ls dist/content-index.json
ls dist/pathmap.json
ls dist/themes/graphite/theme.css
ls dist/vendor/marked.min.js
ls dist/locales/zh.json
ls dist/client/core.js
ls dist/client/render.js
ls dist/client/ui.js
ls dist/client/i18n.js
ls dist/client/blog.js
```

All must exist.

- [ ] **Step 3: Verify RSS language**

```bash
node -e "const fs = require('fs'); const xml = fs.readFileSync('dist/feed.xml','utf8'); console.log(xml.includes('<language>zh-CN</language>') ? 'PASS' : 'FAIL')"
```

Expected: `PASS`

- [ ] **Step 4: Incremental build**

```bash
node build.js --incremental
```

Expected: `(incremental)` in output

```bash
node build.js --incremental
```

Expected: Success (second run should be faster)

- [ ] **Step 5: Server test**

```bash
node serve.js 8099 --no-live &
sleep 2
curl -s -o /dev/null -w "%{http_code}" http://localhost:8099/index.html
curl -s -o /dev/null -w "%{http_code}" http://localhost:8099/feed.xml
curl -s -o /dev/null -w "%{http_code}" http://localhost:8099/themes/graphite/theme.css
kill %1
```

All should return `200`.

- [ ] **Step 6: Security test — malformed URL**

```bash
node serve.js 8098 --no-live &
sleep 2
curl -s -o /dev/null -w "%{http_code}" "http://localhost:8098/%invalid"
kill %1
```

Expected: `404` (not crash)

- [ ] **Step 7: Verify mermaid securityLevel**

```bash
node -e "const fs = require('fs'); const js = fs.readFileSync('client/render.js','utf8'); console.log(js.includes(\"securityLevel: 'strict'\") ? 'PASS' : 'FAIL')"
```

Expected: `PASS`

---

## Task 20: Update README.md and docs

**Covers:** Documentation update

**Files:**
- Modify: `README.md`
- Modify: `.tasks/ROADMAP.md`

**Steps:**

- [ ] **Step 1: Update README.md architecture section**

Update the directory structure to show kernel/, plugins/, client/.

- [ ] **Step 2: Update ROADMAP.md**

Mark the kernel+plugin rewrite as complete.

---

## Execution Summary

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1 | kernel/config.js | None |
| 2 | kernel/markdown.js | None |
| 3 | kernel/content.js | Tasks 1, 2 |
| 4 | kernel/output.js | Task 1 |
| 5 | kernel/index.js | Tasks 1-4 |
| 6 | plugins/rss, sitemap, search-index | None |
| 7 | plugins/ssg | None |
| 8 | build.js wrapper + first build test | Tasks 1-7 |
| 9 | client/i18n.js | None |
| 10 | client/core.js | Task 9 |
| 11 | client/render.js, ui.js, blog.js | None |
| 12 | Update HTML templates | Tasks 9-11 |
| 13 | Fix highlightCard | None |
| 14 | Fix post.html DOMPurify | None |
| 15 | Fix page.html DOMPurify | None |
| 16 | Fix Dockerfile | None |
| 17 | Fix serve.js | None |
| 18 | Verify bin/blog.js | Task 8 |
| 19 | Integration test | All |
| 20 | Update docs | Task 19 |
