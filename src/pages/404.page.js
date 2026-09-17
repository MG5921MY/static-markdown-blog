(() => {
  const postsListEl = document.getElementById('error-posts-list');
  const recentPostsEl = document.getElementById('error-recent-posts');
  const searchInputEl = document.getElementById('error-search-input');

  Blog.runPage({
    needIndex: true,
    needPathMap: false,
    task: async () => {
      Blog.setPageTitle('404');
      Blog.setNavSiteName();

      // 「最近的文章」：语义为时间最近，与全局排序配置解耦——
      // getAllPosts 返回 content.sort 展示序，这里显式按日期降序取前 4 篇。
      // 同日平局用 readingIndex（与 prev/next 阅读序同口径），缺字段回退标题。
      const posts = [...Blog.getAllPosts()]
        .sort((a, b) => {
          const byDate = String(b.date || '').localeCompare(String(a.date || ''), undefined, { numeric: true });
          if (byDate !== 0) return byDate;
          const ai = Number.isFinite(a.readingIndex) ? a.readingIndex : Number.MAX_SAFE_INTEGER;
          const bi = Number.isFinite(b.readingIndex) ? b.readingIndex : Number.MAX_SAFE_INTEGER;
          if (ai !== bi) return ai - bi;
          return String(a.title || '').localeCompare(String(b.title || ''), undefined, { numeric: true });
        })
        .slice(0, 4);
      if (posts.length > 0) {
        postsListEl.innerHTML = posts.map((post) => Blog.renderPostCard(post)).join('');
        recentPostsEl.style.display = 'block';
        Blog.setupCardAnimations();
      }

      const errorActionsEl = document.getElementById('error-actions');
      if (errorActionsEl) {
        const actions = Blog.config?.error404?.actions || [];
        if (actions.length > 0) {
          errorActionsEl.innerHTML = actions
            .filter(a => a && a.label && a.url)
            .map(a => `<a href="${Blog.escapeHtml(a.url)}" class="btn btn-${a.style === 'secondary' ? 'secondary' : 'primary'}">${Blog.escapeHtml(a.label)}</a>`)
            .join('');
        } else {
          errorActionsEl.innerHTML = `<a href="./index.html" class="btn btn-primary">${Blog.t('error404.backHome')}</a>`;
        }
      }

      searchInputEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && event.target.value.trim()) {
          window.location.href = Blog.resolvePageUrl('index.html', {
            search: event.target.value.trim()
          });
        }
      });
    }
  });
})();
