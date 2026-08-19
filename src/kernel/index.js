const path = require('path');
const fs = require('fs');
const { loadConfig } = require('./config');
const { scanContent, fileHash } = require('./content');
const { writeBuildOutputs, cleanDir, writeJson, removeTree, buildFeatures, buildPagesContent, scanAvailableThemes, generateLocaleIndex } = require('./output');

function loadPlugins(names) {
  const plugins = [];
  for (const name of names) {
    try { plugins.push(require(`../plugins/${name}`)); }
    catch (_) {}
  }
  return plugins;
}

function loadManifest(distDir) {
  const p = path.join(distDir, '.build-manifest.json');
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (_) { return null; }
}

function saveManifest(distDir, files) {
  writeJson(path.join(distDir, '.build-manifest.json'), {
    timestamp: Date.now(),
    files
  });
}

/**
 * 从索引数据中剥离内部字段。
 * 索引（content-index.json）只应包含前端展示所需数据，
 * 不得携带渲染后的 HTML 全文、源文件路径等内部信息。
 */
function stripInternalFields(post) {
  const {
    html, sourcePath, sourceRelative,
    _outputPath, _needsWrite, _cached, _encrypted, _encryptedFile,
    ...rest
  } = post || {};
  return rest;
}

/**
 * 构建干净的 categories 索引（posts 与 groups 中的文章对象均剥离内部字段）。
 */
function buildCleanCategories(categories) {
  const clean = {};
  for (const [catId, catData] of Object.entries(categories)) {
    const cleanGroups = {};
    for (const [groupPath, groupData] of Object.entries(catData.groups || {})) {
      cleanGroups[groupPath] = { posts: (groupData.posts || []).map(stripInternalFields) };
    }
    clean[catId] = {
      ...catData,
      posts: (catData.posts || []).map(stripInternalFields),
      groups: cleanGroups
    };
  }
  return clean;
}

/**
 * 增量构建时清理孤儿产物：上次构建存在、本次扫描已不存在的文章，
 * 删除其平铺 HTML 与 SSG 目录（含目录内 index.html）。
 * 带路径逃逸防护，只允许删除 dist 内的 posts/ 产物。
 */
function cleanupOrphanPosts(distDir, pathMap) {
  const oldPathMapPath = path.join(distDir, 'pathmap.json');
  if (!fs.existsSync(oldPathMapPath)) return;
  let oldPathMap;
  try { oldPathMap = JSON.parse(fs.readFileSync(oldPathMapPath, 'utf8')); }
  catch (_) { return; }

  const distRoot = path.resolve(distDir);
  for (const [id, entry] of Object.entries(oldPathMap)) {
    if (pathMap[id]) continue; // 文章仍然存在
    const rel = entry && typeof entry.outputPath === 'string' ? entry.outputPath : '';
    if (!rel.startsWith('posts/') || !rel.endsWith('.html')) continue;

    const abs = path.resolve(distDir, rel);
    if (!abs.startsWith(distRoot + path.sep)) continue; // 防路径逃逸

    removeTree(abs);
    removeTree(abs.slice(0, -'.html'.length));
  }
}

async function build(userOptions) {
  const options = {
    cwd: process.cwd(),
    pkgRoot: path.resolve(__dirname, '..', '..'),
    includeDrafts: false,
    incremental: false,
    ...userOptions
  };
  const { cwd, pkgRoot } = options;

  const config = loadConfig(cwd, pkgRoot);
  const distDir = path.join(cwd, 'dist');
  const manifest = options.incremental ? loadManifest(distDir) : null;

  if (!options.incremental) cleanDir(distDir);

  const { posts, categories, pathMap } = scanContent(config, {
    includeDrafts: options.includeDrafts,
    manifest,
    distDir
  });

  // 增量构建：清理上次构建中存在、本次已删除文章的残留产物
  if (options.incremental) {
    cleanupOrphanPosts(distDir, pathMap);
  }

  const pagesMap = buildPagesContent(config.pages, config._siteRoot);
  const availableThemes = scanAvailableThemes(config._pkgRoot, config._siteRoot);

  const siteConfig = {
    site: config.site,
    deployment: config.deployment,
    seo: config.seo,
    theme: { ...config.theme, available: availableThemes },
    pages: pagesMap,
    nav: config.nav,
    // 认证模式联动：auth 开启且未显式 auth.keepRss 时，RSS 已自动关闭，
    // 过滤指向 feed.xml 的导航按钮，避免界面出现死链
    navActions: (config.auth?.enabled && config.auth.keepRss !== true)
      ? (config.navActions || []).filter((a) => !/feed\.xml$/.test(String(a.url || '')))
      : config.navActions,
    features: { ...config.features, ...buildFeatures(config, config._siteRoot) },
    display: config.display,
    beian: config.beian,
    comments: config.comments,
    disclaimer: config.disclaimer,
    error404: config.error404,
    auth: config.auth ? {
      enabled: !!config.auth.enabled,
      session: { ttl: config.auth.session?.ttl ?? 7200 }
    } : { enabled: false },
    security: config.security || { csp: true, markdownHtmlFilter: true, autoLock: 900 }
  };

  // ── 认证插件（获取密码和哈希）────────────────────────
  const pluginResults = [];
  const buildResult = {
    config, posts, categories, pathMap,
    pages: config.pages,
    siteRoot: config._siteRoot,
    distDir, pkgRoot
  };
  // ssg 依赖文章 HTML 落盘产物，不在本列表，于 writeBuildOutputs 之后单独执行
  for (const plugin of loadPlugins(['auth', 'static-copy', 'rss', 'sitemap', 'search-index', 'robots'])) {
    pluginResults.push(await plugin(buildResult));
  }

  // ── 真加密：构建时 AES-256-GCM 加密文章内容 ──────────
  const authData = buildResult._auth || {};
  const encryptedDir = path.join(distDir, 'encrypted');

  // 清理旧的加密文件（无论是否开启加密）
  if (fs.existsSync(encryptedDir)) {
    fs.rmSync(encryptedDir, { recursive: true, force: true });
  }

  if (authData.enabled && authData.password) {
    const { encryptContent } = require('../plugins/encryption');
    fs.mkdirSync(encryptedDir, { recursive: true });

    for (const post of posts) {
      if (!post.html || !post._outputPath) continue;
      const encrypted = encryptContent(post.html, authData.password);
      const encFile = post.id + '.json';
      fs.writeFileSync(path.join(encryptedDir, encFile), JSON.stringify(encrypted));
      post._encrypted = true;
      post._encryptedFile = `encrypted/${encFile}`;
      // 写入 encrypted 标记：客户端据此走"解密分支"而非 fetch 明文
      // （明文 HTML 未落盘，缺此标记会导致 404 → Failed to load post content）
      if (pathMap[post.id]) pathMap[post.id].encrypted = true;
    }
    console.log(`[AUTH] 加密了 ${posts.length} 篇文章 → dist/encrypted/`);
  }

  // 索引只保留前端展示所需字段（剥离 html 全文、源路径等内部信息）
  const contentIndex = {
    categories: buildCleanCategories(categories),
    allPosts: posts.map(stripInternalFields)
  };

  writeBuildOutputs({ siteConfig, contentIndex, pathMap, posts, pkgRoot, distDir });

  // ── SSG：依赖文章 HTML 已落盘，必须在输出完成后执行 ──
  const ssgPlugin = require('../plugins/ssg');
  pluginResults.push(await ssgPlugin(buildResult));

  // Generate locale index for dynamic locale discovery
  const localeCount = generateLocaleIndex(distDir);

  const manifestFiles = {};
  for (const [id, entry] of Object.entries(pathMap)) {
    const src = path.join(config._siteRoot, config.categories.find(c => c.id === entry.category)?.path || '', entry.file);
    manifestFiles[id] = fileHash(src);
  }
  saveManifest(distDir, manifestFiles);

  const outputCount = fs.existsSync(distDir)
    ? fs.readdirSync(distDir, { withFileTypes: true }).length
    : 0;
  const cachedCount = posts.filter(p => p._cached).length;
  const writtenCount = posts.length - cachedCount;

  console.log(`\nBuild complete: ${posts.length} posts (${writtenCount} written, ${cachedCount} cached), ${outputCount} outputs`);
  for (const r of pluginResults) {
    if (r) console.log(`  ${r.file}: ${r.count}`);
  }

  return buildResult;
}

module.exports = { build };
