const { marked } = require('../../res/vendor/marked.min.js');

// 默认禁用原始 HTML，防止 <script> 等注入
// 可通过 security.markdownHtmlFilter: false 关闭
const defaultRenderer = { html() { return ''; } };
marked.use({ renderer: defaultRenderer });

/**
 * 渲染 Markdown 为 HTML
 * @param {string} body - Markdown 文本
 * @param {object} options - 可选配置
 * @param {boolean} options.allowHtml - 是否允许原始 HTML（默认 false）
 * @returns {string} HTML 字符串
 */
function renderMarkdown(body, options = {}) {
  if (options.allowHtml) {
    // 临时移除 HTML 过滤
    marked.use({ renderer: { html(token) { return token.raw; } } });
    const result = marked(body, { gfm: true, breaks: true });
    // 恢复默认过滤
    marked.use({ renderer: defaultRenderer });
    return result;
  }
  return marked(body, { gfm: true, breaks: true });
}

module.exports = { renderMarkdown };
