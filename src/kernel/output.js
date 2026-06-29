const fs = require('fs');
const path = require('path');

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

function resolveNav(navItems, pagesMap) {
  return (navItems || []).map((item) => {
    if (item.page === 'index') return { name: item.name || 'Home', url: './index.html' };
    if (item.page && pagesMap[item.page]) return { name: item.name || pagesMap[item.page].name || item.page, url: `./page.html?id=${item.page}` };
    if (item.url) return { name: item.name || item.url, url: item.url };
    return null;
  }).filter(Boolean);
}

function buildFeatures(config, siteRoot) {
  const features = {};
  const feats = config.features || {};
  const read = (p) => { try { return fs.existsSync(p) ? require('./config').parseYaml(fs.readFileSync(p, 'utf8')) : null; } catch (_) { return null; } };

  if (feats.moments?.enabled) {
    const data = feats.moments.source ? read(path.join(siteRoot, feats.moments.source)) : null;
    features.moments = { enabled: true, ...feats.moments, ...(data || { moments: [] }) };
  }
  if (feats.links?.enabled) {
    const data = feats.links.source ? read(path.join(siteRoot, feats.links.source)) : null;
    features.links = { enabled: true, ...feats.links, ...(data || { groups: [], links: [] }) };
  }
  if (feats.gallery?.enabled) {
    const data = feats.gallery.source ? read(path.join(siteRoot, feats.gallery.source)) : null;
    features.gallery = { enabled: true, ...feats.gallery, ...(data || { groups: [], images: {}, settings: {} }) };
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

module.exports = { writeBuildOutputs, cleanDir, ensureDir, writeText, writeJson, buildPagesMap, resolveNav, buildFeatures };
