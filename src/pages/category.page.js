(() => {
  /**
   * 分类独立页：category.html?id=<分类ID>
   *
   * - 有效分类：标题/副标题填充分类名与计数，卡片列表展示该分类全部文章
   *   （排序沿用全站口径：日期降序 + 同日期 id 升序）
   * - 无效/缺失分类：显示"分类不存在"空态，并提供返回首页入口
   */
  Blog.runPage({
    needIndex: true,
    needPathMap: false,
    task: async () => {
      const params = new URLSearchParams(window.location.search);
      const categoryId = (params.get('id') || '').trim();
      const category = Blog.index?.categories?.[categoryId];
      const listEl = document.getElementById('category-list');
      const titleEl = document.getElementById('category-title');
      const subtitleEl = document.getElementById('category-subtitle');

      if (!category) {
        const notFound = Blog.t('category.notFound');
        Blog.setPageTitle(notFound);
        Blog.setNavSiteName();
        if (titleEl) titleEl.textContent = notFound;
        if (subtitleEl) subtitleEl.textContent = Blog.t('category.notFoundHint');
        if (listEl) {
          listEl.className = '';
          listEl.innerHTML = `<div class="empty-state"><p>${Blog.t('category.notFoundHint')}</p>
            <a class="btn" href="./index.html">${Blog.t('nav.home')}</a></div>`;
        }
        return;
      }

      const categoryName = category.name || categoryId;
      const posts = Blog.getAllPosts().filter((post) => post.category === categoryId);

      Blog.setPageTitle(categoryName);
      Blog.setNavSiteName();
      document.title = `${categoryName} | ${Blog.config?.site?.name || ''}`;

      if (titleEl) titleEl.textContent = categoryName;
      if (subtitleEl) {
        const countText = Blog.t('category.postsCount').replace('{count}', String(posts.length));
        subtitleEl.textContent = category.description
          ? `${category.description} · ${countText}`
          : countText;
      }

      if (!listEl) return;
      if (posts.length === 0) {
        listEl.className = '';
        listEl.innerHTML = `<div class="empty-state"><p>${Blog.t('index.noPostsInDir')}</p></div>`;
        return;
      }

      listEl.className = 'posts-grid';
      listEl.innerHTML = posts.map((post) => Blog.renderPostCard(post)).join('');
      Blog.setupCardAnimations();
    }
  });
})();
