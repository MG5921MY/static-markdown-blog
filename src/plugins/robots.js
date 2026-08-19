const fs = require('fs');
const path = require('path');

module.exports = function robotsPlugin(buildResult) {
  const { config, distDir } = buildResult;

  // ── 认证模式联动 ──────────────────────────────────────────
  // 认证站点不应被搜索引擎收录（爬虫无法通过密码门，收录只会得到无内容的壳页）。
  // auth.enabled 时一律 Disallow: /，与 seo.allowIndex 无关。
  const auth = config.auth || {};
  if (auth.enabled) {
    fs.writeFileSync(path.join(distDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8');
    return { file: 'robots.txt', count: 0 };
  }

  const seo = config.seo || {};
  const allowIndex = seo.allowIndex !== false;

  const deployment = config.deployment || {};
  const siteUrl = (deployment.siteUrl || '').replace(/\/+$/, '');

  let content;
  if (allowIndex) {
    content = `User-agent: *
Allow: /

${siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml` : '# Sitemap: https://your-domain.com/sitemap.xml'}
`;
  } else {
    content = `User-agent: *
Disallow: /
`;
  }

  fs.writeFileSync(path.join(distDir, 'robots.txt'), content, 'utf8');
  return { file: 'robots.txt', count: allowIndex ? 1 : 0 };
};
