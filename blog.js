const Blog = {
  config: null,
  index: null,
  pathMap: null,
  posts: [],
  themeLoaded: false,
  _cdnLoaded: {},
  onInit() {},
  onPageLoad() {},
  onThemeChange(newThemeId) {}
};

if (!window.BlogCore || !window.BlogRender || !window.BlogUI) {
  console.error('Blog modules not loaded. Please include blog.core.js, blog.render.js, blog.ui.js before blog.js');
}

Object.assign(
  Blog,
  window.BlogCore || {},
  window.BlogRender || {},
  window.BlogUI || {}
);

window.Blog = Blog;
