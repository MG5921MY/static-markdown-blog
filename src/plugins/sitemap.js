const fs = require('fs');
const path = require('path');

function escapeXml(value) {
  return String(value || '').replace(/&/g, '\x26amp;').replace(/</g, '\x26lt;').replace(/>/g, '\x26gt;').replace(/"/g, '\x26quot;');
}

module.exports = function sitemapPlugin(buildResult) {
  const { config, pathMap, distDir } = buildResult;
  const deployment = config.deployment || {};
  const siteUrl = (deployment.siteUrl || '').replace(/\/+$/, '');
  const rawBase = String(deployment.basePath || '').trim();
  const basePath = (rawBase && rawBase !== 'auto') ? rawBase.replace(/\/+$/, '').replace(/^\//, '') : '';
  const prefix = siteUrl || (basePath ? `/${basePath}` : '');
  const today = new Date().toISOString().split('T')[0];

  if (!siteUrl) {
    console.warn('  Sitemap: deployment.siteUrl is empty. Sitemap URLs may not work under sub-path deployment.');
  }

  const urls = [];
  urls.push({ loc: siteUrl || (prefix || '/'), lastmod: today, priority: '1.0' });

  const pages = Array.isArray(config.pages) ? config.pages : Object.values(config.pages || {});
  for (const page of pages) {
    const pageId = page.id || page;
    urls.push({ loc: `${prefix}/page.html?id=${pageId}`, lastmod: today, priority: '0.8' });
  }

  urls.push({ loc: `${prefix}/moments.html`, lastmod: today, priority: '0.6' });
  urls.push({ loc: `${prefix}/links.html`, lastmod: today, priority: '0.6' });
  urls.push({ loc: `${prefix}/gallery.html`, lastmod: today, priority: '0.6' });

  for (const [, mapping] of Object.entries(pathMap)) {
    urls.push({ loc: `${prefix}/${mapping.outputPath}`, lastmod: today, priority: '0.7' });
  }

  const urlEntries = urls.map((u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8');
  return { file: 'sitemap.xml', count: urls.length };
};
