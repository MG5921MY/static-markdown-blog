# ROADMAP

## 当前阶段：平台产品化（基本完成）

项目定位：面向所有人的静态博客平台，替代"丑/停更/过时"的现有方案。

## 已完成

### P0 — 致命缺陷（✅）
- ✅ 构建时 Markdown → HTML 渲染（vendor marked.js）
- ✅ package.json + CLI 入口（bin/blog.js）

### P1 — 严重缺失（✅）
- ✅ RSS feed 生成（dist/feed.xml）
- ✅ sitemap.xml 生成（dist/sitemap.xml）
- ✅ i18n 基础设施 + 模板集成（locales/ + data-i18n 属性 + applyI18n()）
- ✅ 暗色模式（5 主题三态切换：自动/亮色/暗色）
- ✅ 字体加载（build.js 自动复制 fonts/ 目录）
- ✅ 热重载（serve.js SSE + fs.watch）

### P2 — 开发体验（✅）
- ✅ 草稿系统（front-matter draft: true，--include-drafts 覆盖）
- ✅ 文章间导航（上一篇/下一篇）
- ✅ formatDate() 尊重 locale

### P2.5 — 主题引擎（✅）
- ✅ Phase 1: 布局 token（--card-columns, --card-direction, --hero-align 等）
- ✅ Phase 2: 选择器文档化（theme-engine-reference.md）
- ✅ Phase 3: theme.js 支持（onInit/onPageLoad/onThemeChange）
- ✅ Phase 4: 模板覆盖（data-template + templates/ 目录）

### P3 — 部署与安全（✅）
- ✅ GitHub Actions 修复（artifact path → ./dist）
- ✅ Dockerfile 修复（COPY locales）
- ✅ about.html 修复（加入 STATIC_FILES）
- ✅ Hero XSS 修复（innerHTML → escaped innerHTML）
- ✅ siteUrl 配置项
- ✅ 示例文章（4 篇，展示 Markdown/代码/目录树）

### P3.5 — 发布前打磨（✅）
- ✅ terminal theme.yml 去掉多余 id
- ✅ site-config.json 加入 .gitignore
- ✅ 5 主题暗色模式全部修复（nav/body 硬编码颜色）

## 未完成（未来可选）

### P4 — 功能扩展
- 评论集成（Giscus）
- 搜索索引优化（Lunr.js 离线索引）
- 打印样式（@media print）
- 数学公式（KaTeX）
- 流程图（Mermaid）

### P5 — 生态
- npm 发布
- 主题市场
- 文档站点（英文版）

## 核心约束

- 零依赖（不引入 npm 包，vendored 除外）
- 安全第一（不暴露路径、不执行用户输入）
- 构建产物干净（dev-only 代码不进入 dist/）
