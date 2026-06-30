# Static Markdown Blog

零依赖、Token 驱动主题、支持任意子路径部署的静态博客平台。

## 为什么做这个

本项目的目标是提供一个**零依赖、精品主题、即开即用**的静态博客平台。

设计原则：
- **零依赖** — 不引入 npm 运行时依赖，vendored 库除外
- **精品主题** — 5 个原创主题，45+ CSS Token，三态亮暗切换
- **即开即用** — 构建产物自包含，可部署到任意静态托管

## 特性

| 类别 | 功能 |
|------|------|
| **构建** | Markdown → HTML 构建时渲染、RSS、Sitemap、搜索索引（CJK 分词）、SSG、增量构建、草稿系统 |
| **主题** | 5 个内置主题、45+ CSS Token、布局 Token、三态亮暗切换、Google Fonts、theme.js、模板覆盖、主题自动发现 |
| **内容** | 博客文章、自定义页面（HTML/CSS/JS standalone/嵌入）、瞬间、友链、图库、数学公式（KaTeX）、流程图（Mermaid） |
| **代码** | 语法高亮（highlight.js）、行号显示、代码复制按钮 |
| **开发** | 零依赖、热重载（SSE）、CLI（i18n 支持）、增量构建、自动化测试（221 项） |
| **部署** | GitHub Pages、Docker、通用静态托管、子路径自动适应 |
| **扩展** | 插件架构、自定义主题、自定义页面（standalone/嵌入）、评论集成（Giscus）、语言切换（自动发现） |

## 快速开始

### 源码构建

```bash
git clone <repo>
cd 静态博客
node init.js          # 初始化 site/ 工作区
node build.js         # 构建到 dist/
node serve.js         # 预览 http://localhost:8080
```

### Docker

```bash
docker compose -f deploy/docker/docker-compose.yml up -d --build
```

### npm（开发中）

```bash
npm install -g static-markdown-blog
mkdir my-blog && cd my-blog
blog init
blog build
blog serve
```

### 通用静态托管

`dist/` 目录即完整产物，可直接部署到 Vercel / Netlify / Cloudflare Pages / GitHub Pages / Nginx。

## dist/ 设计理念

`dist/` 是一个**完整的、自包含的静态站点**。不依赖 Node.js，不依赖构建工具，不依赖 serve.js。

```text
dist/
├── *.html              页面（自包含，可直接部署）
├── client/             平台运行时模块
├── themes/             主题 CSS（自动发现，用户自定义主题也会复制到这里）
├── vendor/             第三方库（lunr, katex, marked）
├── locales/            i18n 翻译 + index.json（自动发现可用语言）
├── assets/             用户资源
├── posts/              预渲染的文章 HTML + SSG 页面
├── site-config.json    站点配置（含 theme.available 自动发现列表）
├── content-index.json  内容索引
├── feed.xml            RSS
├── sitemap.xml         Sitemap
└── search-index.json   搜索索引
```

**核心资源全部本地化。** CDN 只用于可选增强（代码高亮、XSS 过滤），全部非阻塞加载，CDN 不可用时优雅降级。

## CLI

```bash
blog init                  # 初始化工作区
blog build                 # 构建
blog build --incremental   # 增量构建
blog serve [port]          # 开发服务器
blog serve --no-live       # 禁用热重载
blog --help                # 帮助（自动检测语言）
blog --help --lang en      # 英文帮助
blog --version             # 版本号
```

## 目录结构

```text
src/                    平台代码（用户不碰）
  kernel/               构建引擎（config, content, markdown, output, paths）
  plugins/              构建时插件（static-copy, rss, sitemap, search-index, ssg）
  client/               运行时模块（core, nav, render, ui, i18n, blog）
  pages/                页面模板 + 页面逻辑

site/                   用户工作区（用户唯一需要碰的目录）
  config.yml            站点配置
  content/              内容（posts/, pages/, data/）
  assets/               资源文件
  themes/custom/        自定义主题

res/                    平台资源（构建时复制到 dist/）
  themes/               5 个内置主题（自动发现）
  locales/              中英双语（自动发现）
  vendor/               第三方库

deploy/                 部署配置
  docker/               Dockerfile + compose

bin/                    CLI + 初始化脚本
build.js                构建入口
serve.js                开发服务器（热重载）
test.js                 自动化测试
```

## 内置主题

| 主题 | 风格 | 设计参考 |
|------|------|----------|
| graphite | 工业蓝图 | Linear + Vercel |
| aurora | 品牌展示 | Stripe |
| paper | 阅读优先 | Notion + Claude |
| mono | 黑白极简 | Vercel |
| terminal | CRT 赛博 | DiskScope |

主题自动发现：构建时扫描 `res/themes/`（系统）和 `site/themes/custom/`（用户），写入 `site-config.json` 的 `theme.available`。用户添加自定义主题后无需额外配置。

## 构建选项

```bash
node build.js                    # 全量构建
node build.js --incremental      # 增量构建（跳过未变化文件）
node build.js --include-drafts   # 包含草稿
```

## 测试

```bash
node test.js                     # 运行 221 项自动化测试
```

## 文档

- `docs/architecture/theme-engine-reference.md` — 主题引擎完整参考
