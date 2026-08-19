const fs = require('fs');
const path = require('path');

function escapeXml(value) {
  return String(value || '').replace(/&/g, '\x26amp;').replace(/</g, '\x26lt;').replace(/>/g, '\x26gt;').replace(/"/g, '\x26quot;').replace(/'/g, '\x26apos;');
}

module.exports = function rssPlugin(buildResult) {
  const { config, categories, pathMap, distDir } = buildResult;

  // ── 认证模式联动 ──────────────────────────────────────────
  // RSS 是公开订阅出口：订阅器无法输入密码，保留 feed.xml 会明文泄露
  // 全部文章的标题/摘要/URL/更新节奏，与认证目标互斥。
  // auth.enabled 且未显式设置 auth.keepRss: true 时自动关闭，
  // 并清理旧产物（增量构建场景下 cleanDir 不会执行，需主动删除）。
  const auth = config.auth || {};
  if (auth.enabled && auth.keepRss !== true) {
    const { removeTree } = require('../kernel/output');
    removeTree(path.join(distDir, 'feed.xml'));
    console.log('  RSS: skipped (auth enabled). Set auth.keepRss: true to keep the feed.');
    return { file: 'feed.xml', count: 0 };
  }

  const site = config.site || {};
  const deployment = config.deployment || {};
  const siteUrl = (deployment.siteUrl || '').replace(/\/+$/, '');
  const rawBase = String(deployment.basePath || '').trim();
  const basePath = (rawBase && rawBase !== 'auto') ? rawBase.replace(/\/+$/, '').replace(/^\//, '') : '';
  const prefix = siteUrl || (basePath ? `/${basePath}` : '');
  const title = escapeXml(site.name || 'Blog');
  const description = escapeXml(site.description || '');
  const link = escapeXml(siteUrl || prefix || '/');
  const lang = (site.locale === 'en') ? 'en-US' : 'zh-CN';

  if (!siteUrl) {
    console.warn('  RSS: deployment.siteUrl is empty. RSS links may not work under sub-path deployment.');
  }

  const items = [];
  for (const [categoryId, category] of Object.entries(categories)) {
    for (const post of (category.posts || [])) {
      const mapping = pathMap[post.id];
      if (!mapping) continue;
      const postUrl = `${prefix}/${mapping.outputPath}`;
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
