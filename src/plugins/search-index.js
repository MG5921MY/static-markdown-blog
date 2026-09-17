const fs = require('fs');
const path = require('path');

/**
 * 搜索索引插件：生成 dist/search-index.json（前端 lunr 搜索数据源）。
 *
 * 认证联动（auth.enabled）：与 RSS / Sitemap / robots 同一安全策略——
 * 加密文章中包含标题、摘要、标签与文件路径，若保留索引会明文泄露这些元数据。
 * 因此认证模式下不生成索引，并清理增量构建遗留的旧产物。
 */
module.exports = function searchIndexPlugin(buildResult) {
  const { categories, pathMap, distDir, config } = buildResult;
  const auth = (config && config.auth) || {};
  const indexPath = path.join(distDir, 'search-index.json');

  if (auth.enabled) {
    // 清理旧产物（增量构建场景需主动删除，避免残留索引继续泄露）
    if (fs.existsSync(indexPath)) fs.rmSync(indexPath, { force: true });
    console.log('  Search index: skipped (auth enabled).');
    return { file: 'search-index.json', count: 0, skipped: true };
  }

  const docs = [];
  for (const [categoryId, category] of Object.entries(categories)) {
    for (const post of (category.posts || [])) {
      const mapping = pathMap[post.id];
      if (!mapping) continue;
      docs.push({
        id: post.id,
        title: post.title || '',
        summary: post.summary || '',
        tags: (post.tags || []).join(' '),
        category: category.name || categoryId,
        url: mapping.outputPath
      });
    }
  }

  fs.writeFileSync(indexPath, JSON.stringify(docs), 'utf8');
  return { file: 'search-index.json', count: docs.length };
};
