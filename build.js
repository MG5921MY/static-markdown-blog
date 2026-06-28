const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { marked } = require('./vendor/marked.min.js');

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const INCLUDE_DRAFTS = process.argv.includes('--include-drafts');
const INCREMENTAL = process.argv.includes('--incremental');
const MANIFEST_PATH = path.join(DIST_DIR, '.build-manifest.json');
const WORKSPACE_SITE_DIR = path.join(ROOT, 'workspace', 'site');
const WORKSPACE_CONFIG_PATH = path.join(WORKSPACE_SITE_DIR, 'config', 'blog.config.yml');
const ROOT_CONFIG_PATH = path.join(ROOT, 'config', 'blog.config.yml');
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
  'about.html',
  'blog.js',
  'blog.core.js',
  'blog.render.js',
  'blog.ui.js',
  'blog.i18n.js',
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

function fileHash(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 12);
}

function loadManifest() {
  if (!INCREMENTAL) return null;
  try {
    if (!fs.existsSync(MANIFEST_PATH)) return null;
    return JSON.parse(readText(MANIFEST_PATH));
  } catch (_) { return null; }
}

function saveManifest(manifest) {
  writeJson(MANIFEST_PATH, manifest);
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

function renderMarkdownToHtml(body) {
  return marked(body, { gfm: true, breaks: true });
}

function normalizePageRecords(pageRecords) {
  if (Array.isArray(pageRecords)) return pageRecords;
  if (pageRecords && typeof pageRecords === 'object') return Object.values(pageRecords);
  return [];
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

  throw new Error('No config found. Expected workspace/site/config/blog.config.yml or config/blog.config.yml');
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
  const { raw, siteRoot } = input;
  const categories = raw.content?.categories || [];
  const pages = normalizePageRecords(raw.content?.pages || []);
  return {
    siteRoot,
    site: raw.site || {},
    deployment: raw.deployment || { basePath: 'auto' },
    theme: raw.theme || {},
    categories,
    pages,
    nav: raw.nav || [],
    features: raw.features || {},
    display: raw.display || {},
    beian: raw.beian || { enabled: false },
    comments: raw.comments || { enabled: false }
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
    page.content = renderMarkdownToHtml(parsed.body);
    page.renderedToHtml = true;
  }
}

function copyStaticFiles() {
  for (const fileName of STATIC_FILES) {
    copyFileSafe(path.join(ROOT, fileName), path.join(DIST_DIR, fileName));
  }
}

function scanCategoryPosts(category, summaryLength, siteRoot, manifest) {
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

      if (parsed.meta.draft === true && !INCLUDE_DRAFTS) continue;

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

      // Incremental: skip rendering if file unchanged
      const distHtmlPath = path.join(DIST_DIR, 'posts', category.id, relative.replace(/\.md$/, '.html'));
      const currentHash = fileHash(fullPath);
      const cachedHash = manifest?.files?.[id];
      if (manifest && cachedHash === currentHash && fs.existsSync(distHtmlPath)) {
        continue; // File unchanged, skip rendering
      }

      const renderedHtml = renderMarkdownToHtml(parsed.body);
      writeText(distHtmlPath, renderedHtml);
    }
  }

  walk(sourceDir);
  result.posts.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  return result;
}

function buildContent(normalized, availableThemes, manifest) {
  const pagesMap = buildPagesMap(normalized.pages);
  buildPagesContent(pagesMap, normalized.display.summaryLength || 140, normalized.siteRoot);

  const categories = {};
  const pathMap = {};

  for (const category of normalized.categories) {
    if (!category.id || !category.path) continue;
    const scanned = scanCategoryPosts(category, normalized.display.summaryLength || 140, normalized.siteRoot, manifest);
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
        const fileContent = readText(fullPath);
        const fm = parseFrontMatter(fileContent);
        if (fm.meta.draft === true && !INCLUDE_DRAFTS) continue;
        const id = generateId(`${category.id}:${relative}`);
        pathMap[id] = {
          category: category.id,
          file: relative,
          outputPath: `posts/${category.id}/${relative.replace(/\.md$/, '.html')}`,
          rendered: true
        };
      }
    }
    walk(sourceDir);
  }

  // Generate prev/next navigation for all posts
  const allPosts = [];
  for (const [catId, catData] of Object.entries(categories)) {
    for (const post of (catData.posts || [])) {
      allPosts.push({ id: post.id, title: post.title, date: post.date, category: catId });
    }
  }
  allPosts.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  for (let i = 0; i < allPosts.length; i++) {
    const entry = pathMap[allPosts[i].id];
    if (!entry) continue;
    entry.prev = i < allPosts.length - 1 ? { id: allPosts[i + 1].id, title: allPosts[i + 1].title } : null;
    entry.next = i > 0 ? { id: allPosts[i - 1].id, title: allPosts[i - 1].title } : null;
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
    beian: normalized.beian,
    comments: normalized.comments
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

  const localesDir = path.join(ROOT, 'locales');
  if (fs.existsSync(localesDir)) copyDirRecursive(localesDir, path.join(DIST_DIR, 'locales'));
}

function copyThemesToDist() {
  if (fs.existsSync(BUILTIN_THEMES_DIR)) copyDirRecursive(BUILTIN_THEMES_DIR, path.join(DIST_DIR, 'themes'));

  const workspaceCustomDir = path.join(WORKSPACE_SITE_DIR, 'themes', 'custom');
  if (fs.existsSync(workspaceCustomDir)) copyDirRecursive(workspaceCustomDir, path.join(DIST_DIR, 'themes', 'custom'));
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveSiteUrl(deployment, requestPath) {
  const base = (deployment && deployment.siteUrl) ? deployment.siteUrl.replace(/\/+$/, '') : '';
  return base ? `${base}/${requestPath.replace(/^\/+/, '')}` : `/${requestPath.replace(/^\/+/, '')}`;
}

function generateRss(siteConfig, contentIndex, pathMap) {
  const site = siteConfig.site || {};
  const deployment = siteConfig.deployment || {};
  const siteUrl = (deployment.siteUrl || '').replace(/\/+$/, '');
  const title = escapeXml(site.name || 'Blog');
  const description = escapeXml(site.description || '');
  const link = escapeXml(siteUrl || '/');

  const items = [];
  for (const [categoryId, category] of Object.entries(contentIndex.categories || {})) {
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
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${link}/feed.xml" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>`;

  writeText(path.join(DIST_DIR, 'feed.xml'), rss);
  return latestItems.length;
}

function generateSitemap(siteConfig, contentIndex, pathMap) {
  const deployment = siteConfig.deployment || {};
  const siteUrl = (deployment.siteUrl || '').replace(/\/+$/, '');
  const today = new Date().toISOString().split('T')[0];

  const urls = [];
  urls.push({ loc: siteUrl || '/', lastmod: today, priority: '1.0' });

  for (const [pageId] of Object.entries(siteConfig.pages || {})) {
    const pageUrl = siteUrl ? `${siteUrl}/page.html?id=${pageId}` : `/page.html?id=${pageId}`;
    urls.push({ loc: pageUrl, lastmod: today, priority: '0.8' });
  }

  urls.push({ loc: siteUrl ? `${siteUrl}/moments.html` : '/moments.html', lastmod: today, priority: '0.6' });
  urls.push({ loc: siteUrl ? `${siteUrl}/links.html` : '/links.html', lastmod: today, priority: '0.6' });
  urls.push({ loc: siteUrl ? `${siteUrl}/gallery.html` : '/gallery.html', lastmod: today, priority: '0.6' });

  for (const [id, mapping] of Object.entries(pathMap || {})) {
    const postUrl = siteUrl ? `${siteUrl}/${mapping.outputPath}` : `/${mapping.outputPath}`;
    urls.push({ loc: postUrl, lastmod: today, priority: '0.7' });
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

  writeText(path.join(DIST_DIR, 'sitemap.xml'), sitemap);
  return urls.length;
}

function generateSearchIndex(siteConfig, contentIndex, pathMap) {
  const docs = [];
  for (const [categoryId, category] of Object.entries(contentIndex.categories || {})) {
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
  writeJson(path.join(DIST_DIR, 'search-index.json'), docs);
  return docs.length;
}

function copyVendorToDist() {
  const vendorDir = path.join(ROOT, 'vendor');
  if (!fs.existsSync(vendorDir)) return;
  const destDir = path.join(DIST_DIR, 'vendor');
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(vendorDir)) {
    const src = path.join(vendorDir, entry);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, path.join(destDir, entry));
    }
  }
}

function generateSSGPages(siteConfig, contentIndex, pathMap) {
  const templatePath = path.join(ROOT, 'post.html');
  if (!fs.existsSync(templatePath)) return 0;
  const template = readText(templatePath);
  const siteName = escapeHtml(siteConfig.site?.name || 'Blog');
  const siteDescription = escapeHtml(siteConfig.site?.description || '');
  let count = 0;

  for (const [id, mapping] of Object.entries(pathMap || {})) {
    const htmlPath = path.join(DIST_DIR, mapping.outputPath);
    if (!fs.existsSync(htmlPath)) continue;

    const category = contentIndex.categories?.[mapping.category];
    const postInfo = (category?.posts || []).find((p) => p.id === id);
    if (!postInfo) continue;

    const contentHtml = readText(htmlPath);
    const postTitle = escapeHtml(postInfo.title || 'Untitled');
    const postSummary = escapeHtml(postInfo.summary || '');
    const postDate = postInfo.date || '';
    const postTags = (postInfo.tags || []).map(escapeHtml).join(', ');
    const postUrl = `/${mapping.outputPath}`;

    // Inject metadata into template
    let page = template
      .replace(/<title>.*?<\/title>/, `<title>${postTitle} | ${siteName}</title>`)
      .replace(/content=""/, `content="${postSummary}"`)
      .replace(/property="og:title" content=""/, `property="og:title" content="${postTitle}"`)
      .replace(/property="og:description" content=""/, `property="og:description" content="${postSummary}"`)
      .replace(/property="og:url" content=""/, `property="og:url" content="${postUrl}"`)
      .replace(/property="og:site_name" content=""/, `property="og:site_name" content="${siteName}"`)
      .replace(/name="twitter:title" content=""/, `name="twitter:title" content="${postTitle}"`)
      .replace(/name="twitter:description" content=""/, `name="twitter:description" content="${postSummary}"`);

    // Embed post data as JSON for client-side hydration
    const postData = JSON.stringify({
      id, title: postInfo.title, date: postDate, tags: postInfo.tags || [],
      category: mapping.category, categoryName: category?.name || mapping.category,
      categoryIcon: category?.icon || '', summary: postSummary,
      content: contentHtml, rendered: true
    });

    // Insert noscript fallback + JSON data before closing </body>
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

    // Write as index.html for clean URLs (posts/guide/getting-started/index.html)
    const slug = path.basename(htmlPath, '.html');
    const postDir = path.join(path.dirname(htmlPath), slug);
    fs.mkdirSync(postDir, { recursive: true });
    writeText(path.join(postDir, 'index.html'), page);
    count++;
  }

  return count;
}

function main() {
  const configInput = resolveConfigInput();
  const normalized = normalizeConfig(configInput);
  const availableThemes = scanAvailableThemes();
  const manifest = loadManifest();
  const isIncremental = INCREMENTAL && manifest;

  if (!isIncremental) {
    cleanDir(DIST_DIR);
  }

  copyStaticFiles();
  copySiteAssetsToDist();
  copyThemesToDist();
  copyVendorToDist();

  const { siteConfig, contentIndex, pathMap } = buildContent(normalized, availableThemes, manifest);
  writeOutputs(siteConfig, contentIndex, pathMap);

  const rssCount = generateRss(siteConfig, contentIndex, pathMap);
  const sitemapCount = generateSitemap(siteConfig, contentIndex, pathMap);
  const searchCount = generateSearchIndex(siteConfig, contentIndex, pathMap);
  const ssgCount = generateSSGPages(siteConfig, contentIndex, pathMap);

  // Save build manifest for next incremental build
  const newManifest = { timestamp: Date.now(), files: {} };
  for (const [id, mapping] of Object.entries(pathMap || {})) {
    const catDir = normalized.categories?.find((c) => c.id === mapping.category);
    if (catDir) {
      const src = path.join(normalized.siteRoot, catDir.path, mapping.file);
      if (fs.existsSync(src)) newManifest.files[id] = fileHash(src);
    }
  }
  saveManifest(newManifest);

  console.log('');
  console.log(`Build completed${isIncremental ? ' (incremental)' : ''}`);
  console.log(`  Config: ${path.relative(ROOT, configInput.filePath)}`);
  console.log(`  Mode: ${configInput.mode}`);
  console.log(`  Site root: ${path.relative(ROOT, normalized.siteRoot) || '.'}`);
  console.log(`  Theme: ${siteConfig.theme.active}`);
  console.log(`  Categories: ${Object.keys(contentIndex.categories).length}`);
  console.log(`  Posts: ${Object.keys(pathMap).length}`);
  console.log(`  RSS: ${rssCount} items`);
  console.log(`  Sitemap: ${sitemapCount} urls`);
  console.log(`  Search: ${searchCount} docs`);
  console.log(`  SSG: ${ssgCount} pages`);
  console.log(`  Output: ${path.relative(ROOT, DIST_DIR)}`);
  console.log('');
}

main();
