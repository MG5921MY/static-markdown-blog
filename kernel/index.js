const path = require('path');
const fs = require('fs');
const { loadConfig } = require('./config');
const { scanContent, fileHash } = require('./content');
const { writeBuildOutputs, cleanDir, writeJson, buildFeatures } = require('./output');

function loadPlugins() {
  const names = ['static-copy', 'rss', 'sitemap', 'search-index', 'ssg'];
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
    pkgRoot: path.resolve(__dirname, '..'),
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

  const siteConfig = {
    site: config.site,
    deployment: config.deployment,
    theme: config.theme,
    pages: config.pages,
    nav: config.nav,
    features: { ...config.features, ...buildFeatures(config, config._siteRoot) },
    display: config.display,
    beian: config.beian,
    comments: config.comments
  };
  const contentIndex = { categories, allPosts: posts.map(({ html, ...rest }) => rest) };

  writeBuildOutputs({ siteConfig, contentIndex, pathMap, posts, pkgRoot, distDir });

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
