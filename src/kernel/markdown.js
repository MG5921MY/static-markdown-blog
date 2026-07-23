const { marked } = require('../../res/vendor/marked.min.js');

// 禁用原始 HTML，防止 <script> 等注入
marked.use({
  renderer: {
    html() { return ''; }
  }
});

function renderMarkdown(body) {
  return marked(body, { gfm: true, breaks: true });
}

module.exports = { renderMarkdown };
