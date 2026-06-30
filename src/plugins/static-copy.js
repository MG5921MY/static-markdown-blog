const fs = require('fs');
const path = require('path');

const STATIC_FILES = [
  { src: 'src/pages/index.html', dest: 'index.html' },
  { src: 'src/pages/post.html', dest: 'post.html' },
  { src: 'src/pages/page.html', dest: 'page.html' },
  { src: 'src/pages/moments.html', dest: 'moments.html' },
  { src: 'src/pages/links.html', dest: 'links.html' },
  { src: 'src/pages/gallery.html', dest: 'gallery.html' },
  { src: 'src/pages/404.html', dest: '404.html' },
  { src: 'src/pages/disclaimer.html', dest: 'disclaimer.html' },
  { src: 'src/pages/about.html', dest: 'about.html' },
  { src: 'src/client/core.js', dest: 'client/core.js' },
  { src: 'src/client/nav.js', dest: 'client/nav.js' },
  { src: 'src/client/render.js', dest: 'client/render.js' },
  { src: 'src/client/ui.js', dest: 'client/ui.js' },
  { src: 'src/client/i18n.js', dest: 'client/i18n.js' },
  { src: 'src/client/blog.js', dest: 'client/blog.js' },
  { src: 'src/pages/index.page.js', dest: 'index.page.js' },
  { src: 'src/pages/404.page.js', dest: '404.page.js' },
  { src: 'src/pages/moments.page.js', dest: 'moments.page.js' },
  { src: 'src/pages/links.page.js', dest: 'links.page.js' },
  { src: 'src/pages/gallery.page.js', dest: 'gallery.page.js' },
  { src: 'src/pages/disclaimer.page.js', dest: 'disclaimer.page.js' },
  { src: 'src/pages/favicon.ico', dest: 'favicon.ico' }
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

  for (const f of STATIC_FILES) {
    if (copyFileSafe(path.join(pkgRoot, f.src), path.join(distDir, f.dest))) count++;
  }

  for (const d of ['locales', 'vendor']) {
    count += copyDirRecursive(path.join(pkgRoot, 'res', d), path.join(distDir, d));
  }
  count += copyDirRecursive(path.join(pkgRoot, 'res', 'themes'), path.join(distDir, 'themes'));

  if (siteRoot) {
    const wsAssets = path.join(siteRoot, 'assets');
    if (fs.existsSync(wsAssets)) count += copyDirRecursive(wsAssets, path.join(distDir, 'assets'));
    const wsThemes = path.join(siteRoot, 'themes', 'custom');
    if (fs.existsSync(wsThemes)) count += copyDirRecursive(wsThemes, path.join(distDir, 'themes', 'custom'));
  }

  return { file: 'static-copy', count };
};
