const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseFrontMatter } = require('./config');
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
      const parsed = parseFrontMatter(readText(fullPath));
      if (parsed.meta.draft === true && !includeDrafts) continue;

      const id = generateId(`${category.id}:${relative}`);
      const groupPath = path.dirname(relative) === '.' ? null : path.dirname(relative).replace(/\\/g, '/');
      const outputPath = `posts/${category.id}/${relative.replace(/\.md$/, '.html')}`;
      const distHtmlPath = path.join(distDir, 'posts', category.id, relative.replace(/\.md$/, '.html'));
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
        category: category.id,
        categoryName: category.name || category.id,
        categoryIcon: category.icon || '',
        sourcePath: fullPath,
        sourceRelative: relative,
        draft: parsed.meta.draft === true,
        html: isCached ? null : renderMarkdown(parsed.body),
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
  result.posts.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  return result;
}

function scanContent(config, options) {
  const { includeDrafts = false, manifest = null, distDir } = options;
  const categories = {};
  const pathMap = {};

  const siteRoot = config.siteRoot || config._siteRoot;
  for (const category of config.categories) {
    if (!category.id || !category.path) continue;
    const scanned = scanCategoryPosts(
      category, config.display?.summaryLength || 140,
      siteRoot, distDir, includeDrafts, manifest
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
      pathMap[post.id] = {
        category: category.id,
        file: post.sourceRelative,
        outputPath: post._outputPath,
        rendered: true
      };
    }
  }

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

  const posts = [];
  for (const catData of Object.values(categories)) {
    posts.push(...(catData.posts || []));
  }
  posts.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  return { posts, categories, pathMap };
}

module.exports = { scanContent, generateId, fileHash, makeSummary };
