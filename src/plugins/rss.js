const fs = require('fs');
const path = require('path');

function escapeXml(value) {
  return String(value || '').replace(/&/g, '\x26amp;').replace(/</g, '\x26lt;').replace(/>/g, '\x26gt;').replace(/"/g, '\x26quot;').replace(/'/g, '\x26apos;');
}

module.exports = function rssPlugin(buildResult) {
  const { config, categories, pathMap, distDir } = buildResult;
  const site = config.site || {};
  const deployment = config.deployment || {};
  const siteUrl = (deployment.siteUrl || '').replace(/\/+$/, '');
  const title = escapeXml(site.name || 'Blog');
  const description = escapeXml(site.description || '');
  const link = escapeXml(siteUrl || '/');
  const lang = (site.locale === 'en') ? 'en-US' : 'zh-CN';

  const items = [];
  for (const [categoryId, category] of Object.entries(categories)) {
    for (const post of (category.posts || [])) {
      const mapping = pathMap[post.id];
      if (!mapping) continue;
      const postUrl = siteUrl ? `${siteUrl}/${mapping.outputPath}` : `/${mapping.outputPath}`;
      const postDate = post.date ? new Date(post.date) : new Date();
      const rfc822Date = isNaN(postDate.getTime()) ? '' : postDate.toUTCString();
      items.push({
        title: escapeXml(post.title || 'Untitled'),
        link: escapeXml(postUrl),
        description: escapeXml(post.summary || ''),
        date: rfc822Date,
        guid: escapeXml(postUrl),
        category: escapeXml(category.name || categoryId)
      });
    }
  }

  items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const latestItems = items.slice(0, 20);

  const rssItems = latestItems.map((item) => `    <item>
      <title>${item.title}</title>
      <link>${item.link}</link>
      <description>${item.description}</description>
      <pubDate>${item.date}</pubDate>
      <guid isPermaLink="true">${item.guid}</guid>
      <category>${item.category}</category>
    </item>`).join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${title}</title>
    <link>${link}</link>
    <description>${description}</description>
    <language>${lang}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${link}/feed.xml" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>`;

  fs.writeFileSync(path.join(distDir, 'feed.xml'), rss, 'utf8');
  return { file: 'feed.xml', count: latestItems.length };
};
