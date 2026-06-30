---
title: 开源 | 静态 Markdown 博客平台 v1.0.0
date: 2026-06-30
category: guide
tags: [开源, 静态博客, Markdown, 主题]
summary: 零依赖、Token 驱动主题、支持任意子路径部署的静态博客平台正式开源。
---

# 静态 Markdown 博客平台 v1.0.0

今天把我的静态博客平台开源了。

## 这是什么

一个零依赖的静态博客平台，用 Markdown 写内容，构建时渲染为 HTML，产物是一个完整的静态站点，可以部署到任何地方。

**GitHub：** [MG5921MY/static-markdown-blog](https://github.com/MG5921MY/static-markdown-blog)

**在线演示：** [mg5921my.github.io/static-markdown-blog](https://mg5921my.github.io/static-markdown-blog/)

## 为什么做这个

市面上的静态博客方案要么主题过时，要么依赖太多，要么不支持现代部署方式（容器化、子路径）。

我希望有一个：

- **零依赖** — 不引入 npm 运行时依赖，vendored 库除外
- **精品主题** — 5 个原创主题，45+ CSS Token，三态亮暗切换
- **即开即用** — 构建产物自包含，可部署到任意静态托管

## 核心特性

### 构建系统

- Markdown 构建时渲染（marked.js）
- RSS、Sitemap、搜索索引（lunr.js + CJK 分词）
- SSG（noscript fallback + JSON 嵌入）
- 增量构建、草稿系统

### 主题引擎

5 个原创主题，每个都有独特的设计语言：

| 主题 | 风格 | 设计参考 |
|------|------|----------|
| graphite | 工业蓝图 | Linear + Vercel |
| aurora | 品牌展示 | Stripe |
| paper | 阅读优先 | Notion + Claude |
| mono | 黑白极简 | Vercel |
| terminal | CRT 赛博 | DiskScope |

主题系统基于 CSS Token（45+），支持布局 Token、theme.js 生命周期、模板覆盖、主题自动发现。

### 自定义页面

支持四种页面类型：
- **Markdown** — 构建时渲染
- **HTML** — 自定义 HTML 内容
- **Category** — 分类文章列表
- **Custom** — 支持 JS 执行、数据嵌入、standalone 模式（iframe 沙盒隔离）

在线演示中的 **技能**、**作品**、**工具** 页面就是自定义页面的演示。

### 国际化

- 中英双语，语言自动发现
- `data-i18n` 属性 + `Blog.t()` 双轨翻译
- 支持 `aria-label`、`alt` 属性国际化

### 部署

- GitHub Pages（自动构建）
- Docker（本地构建 + ghcr.io 远程拉取双模式）
- 通用静态托管（Vercel / Netlify / Cloudflare Pages / Nginx）
- 子路径自动适应

## 快速开始

### 源码构建

```bash
git clone https://github.com/MG5921MY/static-markdown-blog.git
cd static-blog
node init.js          # 初始化 site/ 工作区
node build.js         # 构建到 dist/
node serve.js         # 预览 http://localhost:8080
```

### Docker

```bash
cd deploy/docker
docker compose up -d --build
# 或从 GitHub Container Registry 拉取
docker compose --profile pull up -d
```

### npm

```bash
npm install -g https://github.com/MG5921MY/static-markdown-blog/releases/download/v1.0.0/static-markdown-blog-1.0.0.tgz
blog init
blog build
blog serve
```

## 技术细节

- **语言：** JavaScript（Node.js）
- **许可证：** Apache-2.0
- **测试：** 221 项自动化测试
- **依赖：** 运行时零依赖（vendored: marked.js, lunr.js, katex）
- **CDN：** 可选增强（highlight.js, Mermaid, DOMPurify），全部非阻塞加载

## 目录结构

```
src/                    平台代码（用户不碰）
  kernel/               构建引擎
  plugins/              构建时插件
  client/               运行时模块
  pages/                页面模板 + 逻辑

site/                   用户工作区（唯一需要碰的目录）
  config.yml            站点配置
  content/              内容
  assets/               资源
  themes/custom/        自定义主题

res/                    平台资源
  themes/               5 个内置主题
  locales/              中英双语
  vendor/               第三方库
```

## 后续计划

- npm 正式发布（需要解决验证码问题）
- 更多主题
- 插件市场
- 英文文档完善

## 最后

这是一个面向所有人的静态博客平台。如果你也想要一个简洁、可控、不被平台绑架的博客，可以试试。

GitHub：[MG5921MY/static-markdown-blog](https://github.com/MG5921MY/static-markdown-blog)

欢迎 Star、Issue、PR。
