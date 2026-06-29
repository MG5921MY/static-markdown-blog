const { marked } = require('../vendor/marked.min.js');

function renderMarkdown(body) {
  return marked(body, { gfm: true, breaks: true });
}

module.exports = { renderMarkdown };
