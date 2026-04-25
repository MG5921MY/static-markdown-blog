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
