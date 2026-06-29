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

if (!window.BlogCore || !window.BlogRender || !window.BlogUI || !window.BlogNav) {
  console.error('Blog modules not loaded. Please include client/core.js, client/nav.js, client/render.js, client/ui.js before client/blog.js');
}

Object.assign(Blog, window.BlogCore || {}, window.BlogNav || {}, window.BlogRender || {}, window.BlogUI || {});
window.Blog = Blog;
