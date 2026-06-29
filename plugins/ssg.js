const fs = require('fs');
const path = require('path');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '\x26amp;')
    .replace(/</g, '\x26lt;')
    .replace(/>/g, '\x26gt;')
    .replace(/"/g, '\x26quot;');
}

module.exports = function ssgPlugin(buildResult) {
  const { config, categories, pathMap, distDir, pkgRoot } = buildResult;
  const templatePath = path.join(pkgRoot, 'post.html');
  if (!fs.existsSync(templatePath)) return { file: 'ssg', count: 0 };

  const template = fs.readFileSync(templatePath, 'utf8');
  const siteName = escapeHtml(config.site?.name || 'Blog');
  const siteDescription = escapeHtml(config.site?.description || '');
  let count = 0;

  for (const [id, mapping] of Object.entries(pathMap || {})) {
    const htmlPath = path.join(distDir, mapping.outputPath);
    if (!fs.existsSync(htmlPath)) continue;

    const category = categories?.[mapping.category];
    const postInfo = (category?.posts || []).find((p) => p.id === id);
    if (!postInfo) continue;

    const contentHtml = fs.readFileSync(htmlPath, 'utf8');
    const postTitle = escapeHtml(postInfo.title || 'Untitled');
    const postSummary = escapeHtml(postInfo.summary || '');
    const postDate = postInfo.date || '';
    const postTags = (postInfo.tags || []).map(escapeHtml).join(', ');
    const postUrl = `/${mapping.outputPath}`;

    let page = template
      .replace(/<title>.*?<\/title>/, `<title>${postTitle} | ${siteName}</title>`)
      .replace(/content=""/, `content="${postSummary}"`)
      .replace(/property="og:title" content=""/, `property="og:title" content="${postTitle}"`)
      .replace(/property="og:description" content=""/, `property="og:description" content="${postSummary}"`)
      .replace(/property="og:url" content=""/, `property="og:url" content="${postUrl}"`)
      .replace(/property="og:site_name" content=""/, `property="og:site_name" content="${siteName}"`)
      .replace(/name="twitter:title" content=""/, `name="twitter:title" content="${postTitle}"`)
      .replace(/name="twitter:description" content=""/, `name="twitter:description" content="${postSummary}"`);

    const postData = JSON.stringify({
      id, title: postInfo.title, date: postDate, tags: postInfo.tags || [],
      category: mapping.category, categoryName: category?.name || mapping.category,
      categoryIcon: category?.icon || '', summary: postSummary,
      content: contentHtml, rendered: true
    });

    const ssgBlock = [
      '<noscript>',
      `<article class="post-article"><header class="post-header">`,
      `<h1 class="post-title">${postTitle}</h1>`,
      `<div class="post-meta"><span>${postDate}</span></div>`,
      `</header><div class="post-body markdown-body">${contentHtml}</div></article>`,
      '</noscript>',
      `<script type="application/json" id="ssg-post-data">${postData}</script>`
    ].join('\n');

    page = page.replace('</body>', `${ssgBlock}\n</body>`);

    const slug = path.basename(htmlPath, '.html');
    const postDir = path.join(path.dirname(htmlPath), slug);
    fs.mkdirSync(postDir, { recursive: true });
    fs.writeFileSync(path.join(postDir, 'index.html'), page, 'utf8');
    count++;
  }

  return { file: 'ssg', count };
};
