# ROADMAP

## 当前阶段：平台产品化

项目定位：面向所有人的静态博客平台，替代"丑/停更/过时"的现有方案。

## 已完成

### P0 — 致命缺陷（✅ 已解决）
- ✅ 构建时 Markdown → HTML 渲染（vendor marked.js）
- ✅ package.json + CLI 入口（bin/blog.js）

### P1 — 严重缺失（✅ 已解决）
- ✅ RSS feed 生成（dist/feed.xml）
- ✅ sitemap.xml 生成（dist/sitemap.xml）
- ✅ i18n 基础设施（locales/zh.json + en.json + blog.i18n.js）
- ✅ 暗色模式（5 个主题全部支持 prefers-color-scheme）
- ✅ 字体加载（build.js 自动复制 fonts/ 目录）
- ✅ 热重载（serve.js SSE + fs.watch）

### P2 — 开发体验（✅ 已解决）
- ✅ 草稿系统（front-matter draft: true，--include-drafts 覆盖）
- ✅ 文章间导航（上一篇/下一篇，pathMap 含 prev/next）
- ✅ i18n 模板集成（核心 UI 字符串已用 BlogI18n.t()）

## 剩余工作

### P3 — 锦上添花
- OG / Twitter Card
- 评论集成
- 搜索索引优化
- 打印样式
- 数学公式 / 流程图

## 核心约束

- 零依赖（不引入 npm 包，vendored 除外）
- 安全第一（不暴露路径、不执行用户输入）
- 构建产物干净（dev-only 代码不进入 dist/）
