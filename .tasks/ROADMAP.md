# ROADMAP

## 项目定位

面向所有人的静态博客平台，替代"丑/停更/过时"的现有方案。

核心约束：
- 零依赖（不引入 npm 包，vendored 除外）
- 安全第一（不暴露路径、不执行用户输入）
- 构建产物干净（dev-only 代码不进入 dist/）

---

## 已完成（2026-06-28）

### P0 — 致命缺陷
- ✅ 构建时 Markdown → HTML 渲染（vendor marked.js）
- ✅ package.json + CLI 入口（bin/blog.js）

### P1 — 严重缺失
- ✅ RSS feed 生成（dist/feed.xml）
- ✅ sitemap.xml 生成（dist/sitemap.xml）
- ✅ i18n 中英双语（locales/ + data-i18n + applyI18n() + 27 处硬编码替换）
- ✅ 暗色模式（5 主题三态切换：自动/亮色/暗色）
- ✅ 字体加载（4 主题 @import Google Fonts）
- ✅ 热重载（serve.js SSE + fs.watch）

### P2 — 开发体验
- ✅ 草稿系统（front-matter draft: true，--include-drafts 覆盖）
- ✅ 文章间导航（上一篇/下一篇）
- ✅ formatDate() 尊重 locale

### P2.5 — 主题引擎
- ✅ Phase 1: 布局 token（--card-columns, --card-direction, --hero-align 等 10+ token）
- ✅ Phase 2: 选择器文档化（theme-engine-reference.md，1096 行）
- ✅ Phase 3: theme.js 支持（onInit/onPageLoad/onThemeChange）
- ✅ Phase 4: 模板覆盖（data-template + templates/ 目录）

### P3 — 部署与安全
- ✅ .github/workflows/deploy.yml 修复（artifact path → ./dist）
- ✅ Dockerfile 修复（COPY locales）
- ✅ about.html 修复（加入 STATIC_FILES）
- ✅ Hero XSS 修复（innerHTML → escaped innerHTML）
- ✅ siteUrl 配置项
- ✅ 示例文章（4 篇）

### P3.5 — 发布前打磨
- ✅ terminal theme.yml 去掉多余 id
- ✅ site-config.json 加入 .gitignore
- ✅ 5 主题暗色模式全部修复（nav/body 硬编码颜色）
- ✅ 删除死代码（backup.js, OPTIMIZATION_PLAN.md, legacy/, migration script）
- ✅ i18n 硬编码字符串修复（index/links/moments/gallery.page.js）

### P4 — 功能扩展（已完成）
- ✅ 评论集成（Giscus 示例 + Cusdis 示例代码）
- ✅ Lunr.js 搜索索引（含 CJK 中文分词）
- ✅ 打印样式（@media print，80+ 行）
- ✅ 数学公式（KaTeX，$...$ 和 $$...$$ 支持）
- ✅ 流程图（Mermaid，```mermaid 代码块懒加载渲染）
- ✅ 增量构建（--incremental，内容哈希跳过未变化文件）
- ✅ OG / Twitter Card（8 个 HTML 模板）
- ✅ 代码块复制按钮
- ✅ reduced-motion 无障碍支持
- ✅ CDN 版本锁定（dompurify@3.1.6 / marked@12.0.2 / hljs@11.10.0）
- ✅ SSG 构建时生成完整 HTML（noscript fallback + JSON 数据嵌入）
- ✅ package.json files 字段
- ✅ Locale preload

---

### P7 — 代码清理（✅）
- ✅ 删除 output/playwright/（30+ 测试截图）
- ✅ 删除冗余文档（blog-rebuild-plan / hot-reload-analysis / platform-analysis / theme-design-baseline）
- ✅ 文档合并到 theme-engine-reference.md
- ✅ 更新 README.md（完整功能列表 + 快速开始）
- ✅ 更新 Dockerfile（添加 vendor/ bin/ package.json）
- ✅ 更新 .gitignore（添加 output/）
- ✅ build.js 删除 legacy 代码路径
- ✅ 删除 examples/starter-legacy/
- ✅ 删除 scripts/ 一次性工具
- ✅ 清理未使用 locale keys（19 个）

## 未完成（未来可选）

### P5 — 生态
- npm 发布（等项目完全做完、清理无用代码后）
- 英文文档（README + theme-engine-reference）
- 主题市场

### P6 — 扩展
- source maps（静态站点价值低）

### P8 — 内核+插件架构重写（✅ 2026-06-29）
- ✅ kernel/ — 5 个内核文件（config, content, markdown, output, index）
- ✅ plugins/ — 4 个构建时插件（rss, sitemap, search-index, ssg）
- ✅ client/ — 5 个运行时模块（core, render, ui, i18n, blog）
- ✅ build.js — 薄封装层调用 kernel/index.js
- ✅ 审计修复 — decodeURIComponent 崩溃、highlightCard HTML 安全、DOMPurify 纵深防御、Dockerfile 缺失文件、CDN SRI 支持、RSS 语言从配置读取

---

## 架构概览

```
kernel/             内核（config, content, markdown, output, index）
plugins/            构建时插件（rss, sitemap, search-index, ssg）
client/             运行时模块（core, render, ui, i18n, blog）
build.js            构建入口（调用 kernel/index.js）
serve.js            开发服务器（热重载、SSE）
bin/blog.js         CLI 入口
vendor/             第三方库（marked.js, lunr.js, katex）
themes/             5 个内置主题 + base.css
locales/            中英双语
config/             默认配置
content/            默认内容
workspace/site/     用户工作区
dist/               构建产物
```

## 当前就绪度：95%

| 维度 | 分数 |
|------|------|
| 核心功能 | 98% |
| 代码质量 | 96% |
| 文档 | 88% |
| 部署 | 95% |
| SEO | 75% |
| 无障碍 | 85% |
