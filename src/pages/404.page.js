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
      // getAllPosts 返回的是 content.sort 配置顺序（可能是文件序/标题序），
      // 这里显式按日期降序取前 4 篇，保证区块语义始终是"最近更新"。
      // 同日期按标题升序打平局（前端产物不含源文件名——加密边界要求；
      // 与归档页同口径，结果可复现）
      const posts = [...Blog.getAllPosts()]
        .sort((a, b) => {
          const byDate = String(b.date || '').localeCompare(String(a.date || ''), undefined, { numeric: true });
          if (byDate !== 0) return byDate;
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
