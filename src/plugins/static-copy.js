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
  { src: 'src/client/auth.js', dest: 'client/auth.js' },
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
  const { pkgRoot, distDir, siteRoot, config } = buildResult;
  const seo = config?.seo || {};
  const robotsContent = seo.allowIndex === false ? 'noindex, nofollow' : 'index, follow';
  const auth = buildResult._auth || {};
  let count = 0;

  // 生成 auth-config 注入脚本
  let authScript = '';
  if (auth.enabled) {
    const authConfig = {
      enabled: true,
      passwordHash: auth.passwordHash,
      siteName: config?.site?.name || 'Blog',
      sessionTtl: auth.sessionTtl
    };
    // 备案信息（登录页面显示）
    const beian = config?.beian;
    if (beian?.enabled && auth.showBeian !== false) {
      authConfig.beian = beian;
    }
    authScript = `\n<script type="application/json" id="auth-config">${JSON.stringify(authConfig)}</script>`;
  }

  for (const f of STATIC_FILES) {
    const srcPath = path.join(pkgRoot, f.src);
    const destPath = path.join(distDir, f.dest);
    if (!fs.existsSync(srcPath)) continue;
    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    // HTML 文件注入 meta + auth config
    if (f.dest.endsWith('.html')) {
      let html = fs.readFileSync(srcPath, 'utf8');
      if (!html.includes('name="robots"')) {
        html = html.replace('</head>', `  <meta name="robots" content="${robotsContent}" />\n</head>`);
      }
      if (authScript && !html.includes('id="auth-config"')) {
        html = html.replace('</head>', `  ${authScript}\n</head>`);
      }
      fs.writeFileSync(destPath, html, 'utf8');
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
    count++;
  }

  for (const d of ['locales', 'vendor']) {
    count += copyDirRecursive(path.join(pkgRoot, 'res', d), path.join(distDir, d));
  }
  count += copyDirRecursive(path.join(pkgRoot, 'res', 'themes'), path.join(distDir, 'themes'));

  if (siteRoot) {
    const wsAssets = path.join(siteRoot, 'assets');
    if (fs.existsSync(wsAssets)) count += copyDirRecursive(wsAssets, path.join(distDir, 'assets'));
    const wsThemes = path.join(siteRoot, 'themes');
    if (fs.existsSync(wsThemes)) count += copyDirRecursive(wsThemes, path.join(distDir, 'themes'));
  }

  return { file: 'static-copy', count };
};
