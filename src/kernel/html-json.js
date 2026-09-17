/**
 * HTML 内嵌 JSON 序列化 — 唯一入口（路径单一）。
 *
 * 用于 `<script type="application/json">…</script>` 标签体。
 * HTML 解析器以字面量 `</script>`（不分大小写）结束脚本元素；
 * 仅 JSON.stringify 不足以安全嵌入：正文/标题/站点名等合法出现
 * `</script>` 时会截断标签并破坏页面。将 `<` 转义为 `<` 后，
 * JSON 字符串语义不变，前端 JSON.parse 结果与未转义时一致。
 *
 * @param {*} value - 可 JSON 序列化的值
 * @returns {string} 可直接作为 script 标签体的文本
 */
function jsonForHtmlScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

module.exports = { jsonForHtmlScript };
