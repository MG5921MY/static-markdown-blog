/* ═══════════════════════════════════════════════════════
   Sakura — theme.js
   展示 theme.js 生命周期钩子的用法
   ═══════════════════════════════════════════════════════ */

/**
 * Blog.onInit()
 * 博客初始化完成后调用。此时 config、index 等数据已加载完毕。
 */
Blog.onInit = function () {
  // 可以在这里初始化自定义组件
};

/**
 * Blog.onPageLoad()
 * 页面内容加载完成后调用。此时 DOM 已渲染完毕。
 */
Blog.onPageLoad = function () {
  // 示例：为文章添加阅读时间估算
  var postBody = document.querySelector('.post-body');
  if (postBody) {
    var text = postBody.textContent || '';
    var minutes = Math.ceil(text.length / 500);
    var meta = document.querySelector('.post-meta');
    if (meta) {
      var span = document.createElement('span');
      span.textContent = '约 ' + minutes + ' 分钟阅读';
      meta.appendChild(span);
    }
  }
};

/**
 * Blog.onThemeChange(newThemeId)
 * 用户切换主题时调用。
 */
Blog.onThemeChange = function (newThemeId) {
  // 可以在这里清理旧主题状态
};
