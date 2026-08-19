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

      const posts = Blog.getAllPosts().slice(0, 4);
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
