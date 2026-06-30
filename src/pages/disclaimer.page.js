(() => {
  Blog.runPage({
    needIndex: false,
    needPathMap: false,
    task: async () => {
      Blog.setPageTitle(Blog.t('disclaimer.title'));
      Blog.setNavSiteName();
    }
  });
})();
