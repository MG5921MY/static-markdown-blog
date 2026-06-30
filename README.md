# Static Markdown Blog

零依赖、Token 驱动主题、支持任意子路径部署的静态博客平台。

## 为什么做这个

市面上的 Markdown 静态博客方案普遍存在三个问题：**丑**（默认主题过时）、**停更**（小众 SSG 无人维护）、**过时**（不支持现代 CSS/容器化/子路径部署）。

本项目的目标：**零依赖、精品主题、即开即用**。

## 特性

| 类别 | 功能 |
|------|------|
| **构建** | Markdown → HTML 构建时渲染、RSS、Sitemap、搜索索引、SSG、增量构建、草稿系统 |
| **主题** | 5 个内置主题、45+ CSS Token、布局 Token、三态亮暗切换、Google Fonts、theme.js、模板覆盖 |
| **内容** | 博客文章、自定义页面（HTML/CSS/JS）、瞬间、友链、图库、数学公式（KaTeX）、流程图（Mermaid） |
| **开发** | 零依赖、热重载（SSE）、CLI（i18n 支持）、自动化测试（221 项） |
| **部署** | GitHub Pages、Docker、通用静态托管、子路径自动适应 |
| **扩展** | 插件架构、自定义主题、自定义页面（standalone/嵌入）、评论集成（Giscus） |

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
  kernel/               构建引擎
  plugins/              构建时插件
  client/               运行时模块
  pages/                页面模板 + 页面逻辑

site/                   用户工作区（用户唯一需要碰的目录）
  config.yml            站点配置
  content/              内容（posts/, pages/, data/）
  assets/               资源文件
  themes/custom/        自定义主题

res/                    平台资源（构建时复制到 dist/）
  themes/               5 个内置主题
  locales/              中英双语
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
