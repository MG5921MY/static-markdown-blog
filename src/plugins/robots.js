const fs = require('fs');
const path = require('path');

module.exports = function robotsPlugin(buildResult) {
  const { config, distDir } = buildResult;
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
