const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const WORKSPACE_SITE_DIR = path.join(ROOT, 'workspace', 'site');
const WORKSPACE_CONFIG_PATH = path.join(WORKSPACE_SITE_DIR, 'config', 'blog.config.yml');
const ROOT_CONFIG_PATH = path.join(ROOT, 'config', 'blog.config.yml');
const LEGACY_SITE_DIR = path.join(ROOT, 'legacy', 'site');
const LEGACY_SITE_CONFIG_PATH = path.join(LEGACY_SITE_DIR, 'conf', 'config.yml');
const ROOT_LEGACY_CONFIG_PATH = path.join(ROOT, 'conf', 'config.yml');
const BUILTIN_THEMES_DIR = path.join(ROOT, 'themes');
const STATIC_FILES = [
  'index.html',
  'post.html',
  'page.html',
  'moments.html',
  'links.html',
  'gallery.html',
  '404.html',
  'disclaimer.html',
  'blog.js',
  'blog.core.js',
  'blog.render.js',
  'blog.ui.js',
  'index.page.js',
  '404.page.js',
  'moments.page.js',
  'links.page.js',
  'gallery.page.js',
  'disclaimer.page.js',
  'favicon.ico'
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function cleanDir(dirPath) {
  if (fs.existsSync(dirPath)) fs.rmSync(dirPath, { recursive: true, force: true });
  ensureDir(dirPath);
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
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

function generateId(value) {
  return crypto.createHash('md5').update(value).digest('hex').slice(0, 8);
}

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

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const indent = line.search(/\S/);

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

function resolveFirstExisting(paths) {
  for (const target of paths) {
    if (target && fs.existsSync(target)) return target;
  }
  return null;
}

function normalizePageRecords(pageRecords) {
  if (Array.isArray(pageRecords)) return pageRecords;
  if (pageRecords && typeof pageRecords === 'object') return Object.values(pageRecords);
  return [];
}

function getLegacyMode() {
  return process.env.BLOG_ENABLE_LEGACY === '1';
}

function resolveConfigInput() {
  if (fs.existsSync(WORKSPACE_CONFIG_PATH)) {
    return {
      mode: 'workspace',
      siteRoot: WORKSPACE_SITE_DIR,
      filePath: WORKSPACE_CONFIG_PATH,
      raw: parseYaml(readText(WORKSPACE_CONFIG_PATH))
    };
  }

  if (fs.existsSync(ROOT_CONFIG_PATH)) {
    return {
      mode: 'root',
      siteRoot: ROOT,
      filePath: ROOT_CONFIG_PATH,
      raw: parseYaml(readText(ROOT_CONFIG_PATH))
    };
  }

  if (getLegacyMode()) {
    const legacyConfigPath = resolveFirstExisting([LEGACY_SITE_CONFIG_PATH, ROOT_LEGACY_CONFIG_PATH]);
    if (legacyConfigPath) {
      const legacySiteRoot = legacyConfigPath === LEGACY_SITE_CONFIG_PATH ? LEGACY_SITE_DIR : ROOT;
      return {
        mode: 'legacy',
        siteRoot: legacySiteRoot,
        filePath: legacyConfigPath,
        raw: parseYaml(readText(legacyConfigPath))
      };
    }
  }

  throw new Error('No config found. Expected workspace/site/config/blog.config.yml or config/blog.config.yml');
}

function mapLegacyTheme(themeId) {
  const map = {
    default: 'graphite',
    'dark-pro': 'graphite',
    vercel: 'mono',
    stripe: 'aurora',
    notion: 'paper',
    medium: 'paper',
    minimal: 'mono',
    github: 'mono',
    retro: 'mono',
    acid: 'graphite',
    glass: 'aurora'
  };
  return map[themeId] || 'graphite';
}

function scanThemeDirectory(baseDir, pathPrefix) {
  if (!fs.existsSync(baseDir)) return [];
  return fs.readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const themeDir = path.join(baseDir, entry.name);
      const metaPath = path.join(themeDir, 'theme.yml');
      const meta = fs.existsSync(metaPath) ? parseYaml(readText(metaPath)) : {};
      return {
        id: entry.name,
        name: meta.name || entry.name,
        version: meta.version || '1.0.0',
        author: meta.author || 'Unknown',
        description: meta.description || '',
        path: `${pathPrefix}/${entry.name}`
      };
    });
}

function scanAvailableThemes() {
  const builtins = scanThemeDirectory(BUILTIN_THEMES_DIR, 'themes');
  const workspaceCustomDir = path.join(WORKSPACE_SITE_DIR, 'themes', 'custom');
  const customThemes = scanThemeDirectory(workspaceCustomDir, 'themes/custom');
  const merged = new Map();

  for (const theme of builtins) merged.set(theme.id, theme);
  for (const theme of customThemes) merged.set(theme.id, theme);

  return Array.from(merged.values()).sort((a, b) => a.id.localeCompare(b.id));
}

function normalizeConfig(input) {
  const { mode, raw, siteRoot } = input;
  if (mode !== 'legacy') {
    const categories = raw.content?.categories || [];
    const pages = normalizePageRecords(raw.content?.pages || []);
    return {
      mode,
      siteRoot,
      site: raw.site || {},
      deployment: raw.deployment || { basePath: 'auto' },
      theme: raw.theme || {},
      categories,
      pages,
      nav: raw.nav || [],
      features: raw.features || {},
      display: raw.display || {},
      beian: raw.beian || { enabled: false }
    };
  }

  return {
    mode,
    siteRoot,
    site: raw.site || {},
    deployment: { basePath: 'auto' },
    theme: {
      active: mapLegacyTheme(raw.theme?.active || 'default')
    },
    categories: raw.categories || [],
    pages: normalizePageRecords(raw.pages || []),
    nav: raw.nav || [],
    features: raw.features || {},
    display: raw.display || {},
    beian: raw.beian || { enabled: false }
  };
}

function resolveSitePath(siteRoot, relativePath = '') {
  return path.join(siteRoot, relativePath);
}

function readOptionalYaml(sourcePath) {
  if (!sourcePath || !fs.existsSync(sourcePath)) return null;
  return parseYaml(readText(sourcePath));
}

function loadFeatureData(sourcePath, kind) {
  const parsed = readOptionalYaml(sourcePath);
  if (!parsed) {
    if (kind === 'moments') return { moments: [] };
    if (kind === 'links') return { groups: [], links: [] };
    if (kind === 'gallery') return { enabled: false, groups: [], images: {}, settings: {} };
    return {};
  }
  return parsed;
}

function buildGalleryData(rawGallery, siteRoot) {
  if (!rawGallery) return { enabled: false, groups: [], images: {}, settings: {} };
  const settings = rawGallery.settings || {};
  const groups = rawGallery.groups || [];
  const allowedFormats = new Set((settings.formats || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']).map((item) => String(item).toLowerCase()));

  function scanImages(basePath, maxDepth, depth = 0) {
    const node = { images: [], subfolders: {} };
    if (!fs.existsSync(basePath)) return node;
    for (const entry of fs.readdirSync(basePath, { withFileTypes: true })) {
      const fullPath = path.join(basePath, entry.name);
      if (entry.isDirectory()) {
        if (maxDepth !== -1 && depth >= maxDepth) continue;
        node.subfolders[entry.name] = scanImages(fullPath, maxDepth, depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).slice(1).toLowerCase();
        if (!allowedFormats.has(ext)) continue;
        node.images.push(path.relative(siteRoot, fullPath).replace(/\\/g, '/'));
      }
    }
    node.images.sort();
    return node;
  }

  const images = {};
  for (const group of groups) {
    const groupPath = group.path ? resolveSitePath(siteRoot, group.path) : null;
    const maxDepth = Number.isFinite(group.maxDepth) ? group.maxDepth : (Number.isFinite(settings.maxDepth) ? settings.maxDepth : 2);
    images[group.id] = groupPath ? scanImages(groupPath, maxDepth) : { images: [], subfolders: {} };
  }

  return { enabled: groups.length > 0, groups, images, settings };
}

function buildPagesMap(pages) {
  const pageMap = {};
  for (const page of pages) {
    if (!page?.id) continue;
    pageMap[page.id] = { ...page };
  }
  return pageMap;
}

function resolveNav(navItems, pagesMap) {
  return (navItems || []).map((item) => {
    if (item.page === 'index') {
      return { name: item.name || 'Home', url: './index.html' };
    }
    if (item.page && pagesMap[item.page]) {
      return { name: item.name || pagesMap[item.page].name || item.page, url: `./page.html?id=${item.page}` };
    }
    if (item.url) return { name: item.name || item.url, url: item.url };
    return null;
  }).filter(Boolean);
}

function buildPagesContent(pagesMap, summaryLength, siteRoot) {
  for (const page of Object.values(pagesMap)) {
    if (page.type !== 'markdown' || !page.source) continue;
    const sourcePath = resolveSitePath(siteRoot, page.source);
    if (!fs.existsSync(sourcePath)) continue;
    const parsed = parseFrontMatter(readText(sourcePath));
    page.title = parsed.meta.title || page.title || page.name;
    page.description = page.description || parsed.meta.description || makeSummary(parsed.body, summaryLength);
    page.content = parsed.body;
  }
}

function copyStaticFiles() {
  for (const fileName of STATIC_FILES) {
    copyFileSafe(path.join(ROOT, fileName), path.join(DIST_DIR, fileName));
  }
}

function scanCategoryPosts(category, summaryLength, siteRoot) {
  const sourceDir = resolveSitePath(siteRoot, category.path);
  const result = { posts: [], groups: {} };
  if (!fs.existsSync(sourceDir)) return result;

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.md') continue;

      const relative = path.relative(sourceDir, fullPath).replace(/\\/g, '/');
      const parsed = parseFrontMatter(readText(fullPath));
      const id = generateId(`${category.id}:${relative}`);
      const groupPath = path.dirname(relative) === '.' ? null : path.dirname(relative).replace(/\\/g, '/');
      const post = {
        id,
        title: parsed.meta.title || path.basename(relative, '.md'),
        date: parsed.meta.date || '',
        tags: Array.isArray(parsed.meta.tags) ? parsed.meta.tags : [],
        summary: parsed.meta.summary || makeSummary(parsed.body, summaryLength),
        groupPath
      };
      result.posts.push(post);
      if (groupPath) {
        if (!result.groups[groupPath]) result.groups[groupPath] = { posts: [] };
        result.groups[groupPath].posts.push(post);
      }

      const distMarkdownPath = path.join(DIST_DIR, 'posts', category.id, relative);
      writeText(distMarkdownPath, readText(fullPath));
    }
  }

  walk(sourceDir);
  result.posts.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  return result;
}

function buildContent(normalized, availableThemes) {
  const pagesMap = buildPagesMap(normalized.pages);
  buildPagesContent(pagesMap, normalized.display.summaryLength || 140, normalized.siteRoot);

  const categories = {};
  const pathMap = {};

  for (const category of normalized.categories) {
    if (!category.id || !category.path) continue;
    const scanned = scanCategoryPosts(category, normalized.display.summaryLength || 140, normalized.siteRoot);
    categories[category.id] = {
      name: category.name || category.id,
      icon: category.icon || '',
      path: category.id,
      description: category.description || '',
      type: category.type || 'flat',
      posts: scanned.posts,
      groups: scanned.groups
    };
  }

  for (const category of normalized.categories) {
    if (!category.id || !category.path) continue;
    const sourceDir = resolveSitePath(normalized.siteRoot, category.path);
    if (!fs.existsSync(sourceDir)) continue;
    function walk(currentDir) {
      for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          continue;
        }
        if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.md') continue;
        const relative = path.relative(sourceDir, fullPath).replace(/\\/g, '/');
        const id = generateId(`${category.id}:${relative}`);
        pathMap[id] = {
          category: category.id,
          file: relative,
          outputPath: `posts/${category.id}/${relative}`
        };
      }
    }
    walk(sourceDir);
  }

  const nav = resolveNav(normalized.nav, pagesMap);
  const features = {};

  const momentsSource = normalized.features?.moments?.source
    ? resolveSitePath(normalized.siteRoot, normalized.features.moments.source)
    : null;
  const linksSource = normalized.features?.links?.source
    ? resolveSitePath(normalized.siteRoot, normalized.features.links.source)
    : null;
  const gallerySource = normalized.features?.gallery?.source
    ? resolveSitePath(normalized.siteRoot, normalized.features.gallery.source)
    : null;

  if (normalized.features?.moments?.enabled) {
    features.moments = loadFeatureData(momentsSource, 'moments');
  }
  if (normalized.features?.links?.enabled) {
    features.links = loadFeatureData(linksSource, 'links');
  }
  if (normalized.features?.gallery?.enabled) {
    features.gallery = buildGalleryData(loadFeatureData(gallerySource, 'gallery'), normalized.siteRoot);
  }

  const requestedTheme = process.env.BLOG_THEME_OVERRIDE && /^[a-zA-Z0-9_-]+$/.test(process.env.BLOG_THEME_OVERRIDE)
    ? process.env.BLOG_THEME_OVERRIDE
    : normalized.theme.active;

  const activeTheme = availableThemes.some((theme) => theme.id === requestedTheme)
    ? requestedTheme
    : (availableThemes[0]?.id || 'graphite');

  const siteConfig = {
    site: normalized.site,
    deployment: normalized.deployment,
    theme: {
      active: activeTheme,
      available: availableThemes
    },
    nav,
    display: normalized.display,
    pages: pagesMap,
    features,
    beian: normalized.beian
  };

  const contentIndex = {
    generated: new Date().toISOString(),
    categories
  };

  return { siteConfig, contentIndex, pathMap };
}

function writeOutputs(siteConfig, contentIndex, pathMap) {
  writeJson(path.join(DIST_DIR, 'site-config.json'), siteConfig);
  writeJson(path.join(DIST_DIR, 'content-index.json'), contentIndex);
  writeJson(path.join(DIST_DIR, 'pathmap.json'), pathMap);

  ensureDir(path.join(DIST_DIR, 'posts'));
  writeJson(path.join(DIST_DIR, 'posts', 'index.json'), contentIndex);
  writeJson(path.join(DIST_DIR, 'posts', '_pathmap.json'), pathMap);
}

function copySiteAssetsToDist() {
  const builtinAssets = path.join(ROOT, 'assets');
  if (fs.existsSync(builtinAssets)) copyDirRecursive(builtinAssets, path.join(DIST_DIR, 'assets'));

  const workspaceAssets = path.join(WORKSPACE_SITE_DIR, 'assets');
  if (fs.existsSync(workspaceAssets)) copyDirRecursive(workspaceAssets, path.join(DIST_DIR, 'assets'));
}

function copyThemesToDist() {
  if (fs.existsSync(BUILTIN_THEMES_DIR)) copyDirRecursive(BUILTIN_THEMES_DIR, path.join(DIST_DIR, 'themes'));

  const workspaceCustomDir = path.join(WORKSPACE_SITE_DIR, 'themes', 'custom');
  if (fs.existsSync(workspaceCustomDir)) copyDirRecursive(workspaceCustomDir, path.join(DIST_DIR, 'themes', 'custom'));
}

function main() {
  const configInput = resolveConfigInput();
  const normalized = normalizeConfig(configInput);
  const availableThemes = scanAvailableThemes();

  cleanDir(DIST_DIR);
  copyStaticFiles();
  copySiteAssetsToDist();
  copyThemesToDist();

  const { siteConfig, contentIndex, pathMap } = buildContent(normalized, availableThemes);
  writeOutputs(siteConfig, contentIndex, pathMap);

  console.log('');
  console.log('Build completed');
  console.log(`  Config: ${path.relative(ROOT, configInput.filePath)}`);
  console.log(`  Mode: ${configInput.mode}`);
  console.log(`  Site root: ${path.relative(ROOT, normalized.siteRoot) || '.'}`);
  console.log(`  Theme: ${siteConfig.theme.active}`);
  console.log(`  Categories: ${Object.keys(contentIndex.categories).length}`);
  console.log(`  Posts: ${Object.keys(pathMap).length}`);
  console.log(`  Output: ${path.relative(ROOT, DIST_DIR)}`);
  console.log('');
}

main();
