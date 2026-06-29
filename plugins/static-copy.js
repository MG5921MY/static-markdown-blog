const fs = require('fs');
const path = require('path');

const STATIC_FILES = [
  'index.html', 'post.html', 'page.html', 'moments.html', 'links.html',
  'gallery.html', '404.html', 'disclaimer.html', 'about.html',
  'client/core.js', 'client/nav.js', 'client/render.js', 'client/ui.js', 'client/i18n.js', 'client/blog.js',
  'index.page.js', '404.page.js', 'moments.page.js', 'links.page.js',
  'gallery.page.js', 'disclaimer.page.js', 'favicon.ico'
];

function copyFileSafe(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return 0;
  fs.mkdirSync(dest, { recursive: true });
  let count = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) count += copyDirRecursive(s, d);
    else { fs.copyFileSync(s, d); count++; }
  }
  return count;
}

module.exports = function staticCopyPlugin(buildResult) {
  const { pkgRoot, distDir, siteRoot } = buildResult;
  let count = 0;

  // Copy static files (HTML templates, client JS, page JS, favicon)
  for (const f of STATIC_FILES) {
    if (copyFileSafe(path.join(pkgRoot, f), path.join(distDir, f))) count++;
  }

  // Copy directories (assets, locales, vendor, themes)
  for (const d of ['assets', 'locales', 'vendor']) {
    count += copyDirRecursive(path.join(pkgRoot, d), path.join(distDir, d));
  }
  count += copyDirRecursive(path.join(pkgRoot, 'themes'), path.join(distDir, 'themes'));

  // Copy workspace assets (overlay)
  if (siteRoot) {
    const wsAssets = path.join(siteRoot, 'assets');
    if (fs.existsSync(wsAssets)) count += copyDirRecursive(wsAssets, path.join(distDir, 'assets'));
    const wsThemes = path.join(siteRoot, 'themes', 'custom');
    if (fs.existsSync(wsThemes)) count += copyDirRecursive(wsThemes, path.join(distDir, 'themes', 'custom'));
  }

  return { file: 'static-copy', count };
};
