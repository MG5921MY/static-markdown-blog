const path = require('path');
const fs = require('fs');
const { loadConfig } = require('./config');
const { scanContent, fileHash } = require('./content');
const { writeBuildOutputs, cleanDir, writeJson, buildFeatures, buildPagesContent, scanAvailableThemes, generateLocaleIndex } = require('./output');

function loadPlugins() {
  const names = ['auth', 'static-copy', 'rss', 'sitemap', 'search-index', 'ssg', 'robots'];
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

  const pagesMap = buildPagesContent(config.pages, config._siteRoot);
  const availableThemes = scanAvailableThemes(config._pkgRoot, config._siteRoot);

  const siteConfig = {
    site: config.site,
    deployment: config.deployment,
    seo: config.seo,
    theme: { ...config.theme, available: availableThemes },
    pages: pagesMap,
    nav: config.nav,
    navActions: config.navActions,
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
  for (const plugin of loadPlugins()) {
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
    }
    console.log(`[AUTH] 加密了 ${posts.length} 篇文章 → dist/encrypted/`);
  }

  const contentIndex = { categories, allPosts: posts.map(({ html, ...rest }) => rest) };

  writeBuildOutputs({ siteConfig, contentIndex, pathMap, posts, pkgRoot, distDir });

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
