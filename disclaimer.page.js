(() => {
  Blog.runPage({
    needIndex: false,
    needPathMap: false,
    task: async () => {
      Blog.setPageTitle('免责声明');
      Blog.setNavSiteName();
    }
  });
})();
