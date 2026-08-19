# 关于这个博客

这是一个以 Markdown 为唯一正文来源的静态博客平台。

## 设计理念

- **少量配置** — 一个 `site/config.yml` 管理所有设置
- **高度自定义** — Token 驱动主题，45+ CSS 变量，覆盖即生效
- **可扩展** — 插件架构，theme.js 生命周期，模板覆盖
- **美观** — 5 个内置主题，每个风格完全不同
- **高性能** — 零依赖构建，增量构建，SSG
- **Markdown 优先** — 内容只写 Markdown，构建时渲染为 HTML

## 快速上手

1. 编辑 `site/config.yml` 修改站点信息
2. 在 `site/content/posts/` 下写 Markdown 文章
3. 运行 `node build.js` 构建
4. 运行 `node serve.js` 预览

## 内置主题

| 主题 | 风格 | 设计参考 |
|------|------|----------|
| graphite | 工业蓝图 | Linear + Vercel |
| aurora | 品牌展示 | Stripe |
| paper | 阅读优先 | Notion + Claude |
| mono | 黑白极简 | Vercel |
| terminal | CRT 赛博 | DiskScope |

切换主题：修改 `site/config.yml` 中的 `theme.active`。

## 高级功能

- **自定义页面** — 支持 HTML/CSS/JS，可嵌入数据文件
- **独立页面** — `standalone: true` 隐藏平台导航栏
- **数学公式** — `$E=mc^2$` 或 `$$\int_0^1$$`
- **流程图** — ` ```mermaid ` 代码块
- **评论** — Giscus 可选集成
- **备案** — ICP + 公安备案支持

## 更多信息

- 主题开发：`docs/architecture/theme-engine-reference.md`
- 使用教程：首页「快速开始」分类下的文章
