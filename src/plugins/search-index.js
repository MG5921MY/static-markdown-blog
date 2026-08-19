const fs = require('fs');
const path = require('path');

module.exports = function searchIndexPlugin(buildResult) {
  const { categories, pathMap, distDir } = buildResult;
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

  fs.writeFileSync(path.join(distDir, 'search-index.json'), JSON.stringify(docs), 'utf8');
  return { file: 'search-index.json', count: docs.length };
};
