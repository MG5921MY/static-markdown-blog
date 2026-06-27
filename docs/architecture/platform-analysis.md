# 平台产品分析文档

> 本文档基于项目全量代码的逐文件分析生成，定位本项目作为**面向所有人的静态博客平台**的产品状态、竞争定位、差距清单和演进方向。

---

## 1. 产品定位

### 1.1 为什么做这个项目

市面上的 Markdown 静态博客方案普遍存在三个问题：

| 痛点 | 典型表现 |
|------|----------|
| **丑** | 默认主题停留在 2015 年审美，换色即换主题 |
| **停更** | 大量小众 SSG 已无人维护，依赖链脆弱 |
| **过时** | 不支持现代 CSS、不支持子路径部署、不支持容器化 |

本项目的目标是：**做一个零依赖、精品主题、即开即用的静态博客平台**，让任何人都能快速部署自己的博客。

### 1.2 核心设计原则

```
Markdown First    — Markdown 是唯一正文来源
Theme Driven      — 视觉由主题 token 系统驱动，不改页面结构
Base-path Agnostic — 可部署到任意子路径，无需手动配置 baseURL
Zero Dependencies — 不依赖任何 npm 包，纯 Node.js 内置模块
```

### 1.3 目标用户

- 需要快速搭建个人博客的开发者
- 不想折腾框架但希望默认效果好看的写作者
- 需要 Docker 自托管的团队
- 从 Hexo/Hugo/Jekyll 迁移的用户

---

## 2. 当前架构总览

### 2.1 目录模型

```text
config/blog.config.yml              ← 仓库内置默认配置
content/posts/**/*.md               ← 仓库内置默认内容
content/pages/*.md
content/data/{moments,links,gallery}.yml
themes/<theme-id>/theme.yml         ← 内置主题
  theme.css
docs/architecture/*.md              ← 架构文档
workspace/site/                     ← 用户真正的工作区（挂载、编辑、备份）
  config/blog.config.yml
  content/posts/**/*.md
  content/pages/*.md
  content/data/{moments,links,gallery}.yml
  assets/
  themes/custom/<theme-id>/         ← 用户自定义主题
dist/                               ← 构建产物
```

### 2.2 构建流程

```
node build.js
  → 解析配置（workspace > root > legacy）
  → 扫描 Markdown + 解析 front-matter
  → 生成 content-index.json（分类、文章列表）
  → 生成 pathmap.json（路径映射）
  → 复制 Markdown 原文到 dist/posts/
  → 复制静态资源、主题文件
  → 输出 site-config.json
```

### 2.3 运行时流程

```
浏览器加载 HTML
  → blog.core.js: 加载 site-config.json + content-index.json
  → blog.core.js: 动态注入主题 CSS
  → blog.render.js: CDN 加载 marked.js + DOMPurify + highlight.js
  → blog.render.js: 客户端渲染 Markdown → HTML
  → blog.ui.js: 交互组件（TOC、进度条、返回顶部、移动菜单）
  → *.page.js: 页面逻辑（首页 feed、文章详情、瞬间、友链、图库）
```

### 2.4 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 内容 | Markdown + YAML front-matter | 唯一正文来源 |
| 配置 | YAML（自研解析器） | build.js 内置，无外部依赖 |
| 构建 | Node.js（fs/path/crypto） | 零 npm 依赖 |
| 前端 | 原生 HTML/CSS/JS | 无框架，无打包工具 |
| Markdown 渲染 | marked.js + DOMPurify（CDN） | 客户端渲染 |
| 代码高亮 | highlight.js（CDN） | 客户端渲染 |
| 部署 | GitHub Pages / Docker / 任意静态托管 | dist/ 目录即产物 |

---

## 3. 竞争定位

### 3.1 与主流方案对比

| 维度 | 本项目 | Hugo | Jekyll | Hexo | Eleventy | Astro |
|------|--------|------|--------|------|----------|-------|
| 安装 | `node build.js` | 下载 Go 二进制 | Ruby + gem | npm（200+ 依赖） | npm | npm |
| 依赖数 | 0 | 0（二进制） | 10+ gems | 200+ | 30+ | 100+ |
| 主题模式 | Token CSS 变量 | 完整模板复制 | 完整模板复制 | 完整模板复制 | 模板 + 配置 | 组件 + 主题 |
| 主题切换成本 | 改一行配置 | 可能破坏模板 | 可能破坏模板 | 可能破坏模板 | 取决于主题 | 取决于主题 |
| 子路径部署 | 自动检测 | 手动 baseURL | 手动 baseurl | 手动 root | 手动 pathPrefix | 手动 base |
| 内置内容类型 | 博客+瞬间+友链+图库 | 博客 | 博客 | 博客 | 博客 | 博客 |
| Docker 支持 | 原生 | 需自建 | 需自建 | 需自建 | 需自建 | 需自建 |
| 构建时渲染 | ❌ 客户端 | ✅ | ✅ | ✅ | ✅ | ✅ |
| CLI 工具 | ❌ 无 | ✅ hugo | ✅ jekyll | ✅ hexo | ✅ eleventy | ✅ astro |

### 3.2 本项目的差异化优势

**A. 零依赖**

整个构建系统运行在 Node.js 内置模块上，没有 `node_modules`、没有 `package.json`、没有 npm install。这在静态站点生成器中是独一无二的。

**B. Token 驱动主题系统**

40+ CSS 自定义属性覆盖颜色、排版、间距、布局、阴影、圆角、代码块。主题只需覆盖 token，不需要复制模板。一个完整主题只需 50-100 行 CSS。

**C. 主题视觉差异度**

不是"换个主色调"的伪主题。每个内置主题有完全不同的设计语言：

| 主题 | 设计参考 | 视觉特征 |
|------|----------|----------|
| graphite | Linear + Vercel | 刻度线背景、左侧参考线、零圆角、1px 线框 |
| aurora | Stripe | 大衬线标题、巨大留白、14-18px 圆角、卡片悬停上浮 |
| paper | Notion + Claude | 横线纸底纹、红色装订线、手写体标题、段落缩进 |
| mono | Vercel 极简 | 纯黑白、8px 点阵背景、CSS 计数器编号、强制等宽 |
| terminal | DiskScope CRT | 霓虹绿、扫描线叠加、六边形 logo、脉冲状态点 |

**D. 内置内容类型**

大多数 SSG 只有 posts 和 pages。本项目内置：

- **瞬间（Moments）**：类微博短内容时间线
- **友链（Links）**：分组收藏链接
- **图库（Gallery）**：文件夹导航 + 灯箱查看器
- **自定义页面**：支持 Markdown / 分类列表 / 原生 HTML 三种类型

**E. 目录树导航**

分类支持 `type: tree` 模式，自动从文件夹结构生成可浏览的目录树、面包屑、目录面板。其他 SSG 通常需要插件实现。

**F. Docker 原生支持**

```yaml
volumes:
  - ../workspace/site:/app/workspace/site
```

挂载工作区 → 自动初始化 → 构建 → 启动预览。128MB 内存限制，内置健康检查。

### 3.3 本项目的劣势

| 劣势 | 说明 |
|------|------|
| 构建时不渲染 Markdown | SEO 致命缺陷，搜索引擎看到的是 `加载中...` |
| 无 CLI / npm 包 | 用户必须克隆仓库，无法 `npx create-blog` |
| 中文硬编码 | UI 字符串全部中文，无法国际化 |
| 无 RSS / sitemap | 博客平台标配缺失 |
| 无暗色模式 | 2026 年用户标配预期 |
| 字体加载未生效 | 主题引用了字体但 CSS 中未声明 @font-face / @import（策略已定义，见第 6 节） |

---

## 4. 差距清单（按优先级）

### P0 — 致命缺陷（不做就不是产品）

#### 4.1 构建时 Markdown → HTML 渲染

**现状**：build.js 只生成 JSON 索引，Markdown 在浏览器端通过 CDN 加载的 marked.js 渲染。

**影响**：
- Google 等搜索引擎无法索引文章内容
- 首屏有 `加载中...` 闪烁
- 断网时 CDN 加载失败导致页面不可用
- 无 RSS feed（需要构建时 HTML）

**建议**：在 build.js 中引入 marked.js 作为构建时依赖，将每篇文章预渲染为 HTML 写入 dist/。保持客户端渲染作为 fallback，但默认使用构建时产物。

#### 4.2 package.json + CLI 入口

**现状**：无 package.json，用户必须克隆整个仓库。

**影响**：
- 无法 `npm install` 或 `npx` 使用
- 无法版本管理
- 无法发布到 npm
- 无法声明 Node.js 版本要求

**建议**：创建 package.json，暴露 `blog init`、`blog build`、`blog serve` CLI 命令。

### P1 — 严重缺失（影响采用率）

#### 4.3 国际化（i18n）

**现状**：所有 UI 字符串硬编码在 HTML 模板和 JS 文件中：

```html
<!-- index.html:24 -->
<span id="nav-site-name">加载中...</span>

<!-- index.html:74 -->
<p>正在加载内容...</p>
```

```javascript
// blog.render.js:198
html += '<button class="filter-btn active" data-category="all">全部</button>';

// blog.ui.js:54
btn.setAttribute('aria-label', '返回顶部');

// blog.ui.js:98
tocContainer.innerHTML = '<div class="toc-header"><span>目录</span>...'
```

**建议**：提取所有 UI 字符串到 `locales/` 文件，运行时根据配置或浏览器语言加载。至少支持中英双语。

#### 4.4 RSS / Atom Feed

**现状**：无 RSS 生成。

**建议**：构建时生成 `feed.xml`，包含最近 N 篇文章的标题、链接、摘要、日期。

#### 4.5 sitemap.xml

**现状**：无 sitemap 生成。

**建议**：构建时扫描所有页面和文章，生成 `sitemap.xml`。

#### 4.6 暗色模式

**现状**：base.css 默认暗色（`--bg-primary: #0b0d12`），但所有新主题（graphite/aurora/paper/mono/terminal）只有亮色模式。无 `prefers-color-scheme: dark` 媒体查询。

**建议**：
- 为每个内置主题添加暗色 token 集
- 在导航栏添加明暗切换按钮
- 跟随系统偏好作为默认值

#### 4.7 Web 字体加载

**现状**：主题 CSS 引用了 Inter、JetBrains Mono、Playfair Display、Orbitron、Caveat 等字体，但没有 `@font-face` 或 `@import` 声明。用户看到的是系统回退字体，主题效果大打折扣。

**建议**：见第 6 节「字体加载策略」。

### P2 — 中等缺失（开发体验）

#### 4.8 Watch 热重载

**现状**：serve.js 只提供静态文件服务，不监听文件变化。每次编辑需手动 `node build.js`。

**建议**：serve.js 添加 `fs.watch` 监听 workspace 变化，自动重建。

#### 4.9 草稿系统

**现状**：front-matter 只支持 `title`、`date`、`tags`、`summary`，无 `draft` 字段。

**建议**：支持 `draft: true`，构建时跳过草稿（可通过 `--include-drafts` 参数覆盖）。

#### 4.10 文章间导航

**现状**：文章详情页无上一篇/下一篇链接。

**建议**：根据发布日期排序，在文章底部渲染前后导航。

### P3 — 锦上添花

| 功能 | 说明 |
|------|------|
| Open Graph / Twitter Card | 社交分享时的预览卡片 |
| 评论系统 | Giscus / Disqus 集成 |
| 代码块复制按钮 | 一键复制代码 |
| 搜索索引优化 | 当前是前端字符串匹配，可改为 Lunr.js 离线索引 |
| 打印样式 | `@media print` 规则 |
| reduced-motion | `@media (prefers-reduced-motion: reduce)` 无障碍支持 |
| 数学公式 | KaTeX / MathJax 支持 |
| 流程图 | Mermaid 支持 |
| 多作者 | front-matter 支持 `author` 字段 |
| 部署助手 | GitHub Pages / Vercel / Netlify 一键部署脚本 |

---

## 5. 主题系统深度分析

### 5.1 架构

```text
themes/
  base.css              ← 1846 行，完整的结构骨架 + 40+ token 定义
  graphite/theme.css    ← 1017 行，@import base.css 后覆盖 token + 组件样式
  graphite/theme.yml    ← 主题元数据（名称、版本、作者、描述、参考）
  aurora/theme.css      ← 1013 行
  aurora/theme.yml
  paper/theme.css       ← 1058 行
  paper/theme.yml
  mono/theme.css        ← 551 行
  mono/theme.yml
  terminal/theme.css    ← 2378 行
  terminal/theme.yml
```

### 5.2 Token 体系

所有主题共享同一套 token 接口，主题只需覆盖值：

**基础 token：**

```css
--bg-primary          /* 主背景 */
--bg-secondary        /* 次背景（卡片、面板） */
--bg-elevated         /* 浮层背景 */
--text-primary        /* 主文字 */
--text-secondary      /* 次文字 */
--text-muted          /* 弱文字 */
--border              /* 边框 */
--accent              /* 强调色 */
--accent-soft         /* 强调色淡底 */
--accent-strong       /* 强调色加深 */
--shadow-sm/md/lg     /* 阴影 */
--radius-sm/md/lg/xl  /* 圆角 */
--space-xs/sm/md/lg/xl/* 间距 */
--font-display        /* 标题字体 */
--font-body           /* 正文字体 */
--font-mono           /* 等宽字体 */
--layout-width        /* 最大宽度 */
--layout-nav-height   /* 导航栏高度 */
--layout-hero         /* 首页 Hero 高度 */
--layout-prose        /* 正文最大宽度 */
```

**代码块 token：**

```css
--code-bg             /* 代码块背景 */
--code-border         /* 代码块边框 */
--code-text           /* 代码文字 */
--code-muted          /* 代码弱文字 */
--code-inline-bg      /* 行内代码背景 */
--code-inline-text    /* 行内代码文字 */
--code-selection      /* 代码选中色 */
--code-accent-1/2/3   /* 代码高亮色 */
```

### 5.3 主题扩展方式

**内置主题**：`themes/<theme-id>/theme.yml + theme.css`

**用户自定义主题**：`workspace/site/themes/custom/<theme-id>/theme.yml + theme.css`

构建时自动扫描并合并，用户主题可覆盖同名内置主题。

### 5.4 当前设计缺陷

| 缺陷 | 严重度 | 说明 |
|------|--------|------|
| 无暗色模式 | 高 | 所有新主题只有亮色 |
| 字体不加载 | 高 | 引用的字体没有 @font-face |
| 无 transition 统一 | 中 | 各主题 timing 不一致，无共享 --transition-* token |
| terminal 主题 !important 泛滥 | 中 | 30+ 处 !important，特异性冲突风险 |
| 无打印样式 | 低 | 无 @media print |
| 无 reduced-motion | 低 | 动画对前庭障碍用户不友好 |
| legacy 主题仍在打包 | 低 | 11 个旧主题不使用 token 系统，维护负担 |

---

## 6. 字体加载策略

### 6.1 目标

允许每个主题通过 `theme.css` 内部声明字体来源（本地打包或 Web 字体），用户自定义主题也能使用相同的字体加载机制。

### 6.2 设计方案

#### 方案 A：主题内 @import Google Fonts

最简单的方式，主题 CSS 顶部直接导入：

```css
@import "../base.css";

/* 主题自己的字体声明 */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --font-display: 'Inter', 'Segoe UI', 'PingFang SC', sans-serif;
  --font-body: 'Inter', 'Segoe UI', 'PingFang SC', sans-serif;
  --font-mono: 'JetBrains Mono', 'Consolas', monospace;
}
```

**优点**：零构建改动，纯 CSS 声明，用户主题也能用。
**缺点**：依赖 Google Fonts CDN 可用性；隐私合规问题（GDPR）。

#### 方案 B：本地打包字体 + @font-face

将字体文件放入主题目录，通过 @font-face 加载：

```text
themes/graphite/
  theme.yml
  theme.css
  fonts/
    inter-latin.woff2
    inter-latin-ext.woff2
    jetbrains-mono-latin.woff2
```

```css
@import "../base.css";

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url('./fonts/inter-latin.woff2') format('woff2');
}

:root {
  --font-display: 'Inter', 'Segoe UI', 'PingFang SC', sans-serif;
  --font-body: 'Inter', 'Segoe UI', 'PingFang SC', sans-serif;
  --font-mono: 'JetBrains Mono', 'Consolas', monospace;
}
```

**优点**：无外部依赖，完全离线可用，无隐私问题。
**缺点**：字体文件增大主题体积（Inter 全量约 300KB）。

#### 方案 C：混合模式（推荐）

允许两种方式共存：

1. **base.css** 定义一组 `--font-*` token 作为默认值（系统字体栈）
2. **主题 CSS** 可选择通过 `@import url(...)` 加载 Web 字体，或通过 `@font-face` 引用本地字体
3. **构建时** 将 `themes/*/fonts/` 目录复制到 `dist/themes/*/fonts/`
4. **theme.yml** 可声明 `fonts` 字段列出需要的字体，供文档和工具链使用

```yaml
# theme.yml
name: Graphite
version: 1.1.0
author: MijiaoGame
description: Default theme inspired by Linear and Vercel.
fonts:
  - name: Inter
    source: bundled          # bundled = 本地打包 | google = Google Fonts CDN | none = 仅系统字体
    weights: [400, 500, 600, 700]
  - name: JetBrains Mono
    source: google
    weights: [400, 500]
```

**theme.css 中的声明**：

```css
@import "../base.css";

/* 字体加载 —— 主题作者选择方式 */

/* 方式 1：Google Fonts（适合快速原型、不介意外部依赖） */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* 方式 2：本地打包（适合生产部署、离线环境） */
/*
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url('./fonts/inter-latin.woff2') format('woff2');
}
*/

:root {
  --font-display: 'Inter', 'Segoe UI', 'PingFang SC', sans-serif;
  --font-body: 'Inter', 'Segoe UI', 'PingFang SC', sans-serif;
  --font-mono: 'JetBrains Mono', 'Consolas', monospace;
}
```

### 6.3 构建时改动

build.js 的 `copyThemesToDist()` 函数需要增加字体目录复制逻辑：

```javascript
// 现有逻辑：复制 themes/ 到 dist/themes/
// 新增逻辑：递归复制 themes/*/fonts/ 到 dist/themes/*/fonts/
// 新增逻辑：递归复制 workspace/site/themes/custom/*/fonts/ 到 dist/themes/custom/*/fonts/
```

这不影响现有主题（没有 fonts 目录时跳过），向后兼容。

### 6.4 用户自定义主题的字体使用

用户在 `workspace/site/themes/custom/my-theme/` 中：

```text
my-theme/
  theme.yml
  theme.css
  fonts/
    my-custom-font.woff2
```

```css
@import "../base.css";

@font-face {
  font-family: 'MyCustomFont';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url('./fonts/my-custom-font.woff2') format('woff2');
}

:root {
  --font-display: 'MyCustomFont', sans-serif;
  --font-body: 'MyCustomFont', sans-serif;
}
```

构建时 `node build.js` 自动将 `fonts/` 复制到 `dist/themes/custom/my-theme/fonts/`，浏览器通过相对路径 `./fonts/my-custom-font.woff2` 加载。

### 6.5 base.css 的默认字体栈

当前 base.css 的字体定义：

```css
--font-display: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
--font-body: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
--font-mono: Consolas, "SFMono-Regular", monospace;
```

这是纯系统字体栈，作为零配置默认值是合理的。主题覆盖后即可使用自定义字体。

---

## 7. 内容创作体验分析

### 7.1 当前 Markdown 工作流

```text
用户写 Markdown
  ↓
build.js 解析 front-matter（title/date/tags/summary）
  ↓
生成 content-index.json + pathmap.json
  ↓
复制 Markdown 原文到 dist/posts/
  ↓
浏览器加载 JSON → CDN 加载 marked.js → 客户端渲染
```

### 7.2 支持的 front-matter 字段

```yaml
---
title: 文章标题
date: 2025-01-01
tags: [tag1, tag2]
summary: 自定义摘要（可选，不填则自动截取正文）
---
```

### 7.3 缺失的 front-matter 字段

| 字段 | 用途 | 优先级 |
|------|------|--------|
| `draft: true` | 标记草稿，构建时跳过 | P2 |
| `author` | 多作者支持 | P3 |
| `cover` / `thumbnail` | 文章封面图 | P2 |
| `slug` | 自定义 URL slug | P3 |
| `weight` / `order` | 排序权重 | P3 |
| `layout` | 自定义布局 | P3 |
| `description` | SEO 描述（区别于 summary） | P2 |

---

## 8. 开发体验分析

### 8.1 构建工作流

```bash
node build.js      # 构建 dist/
node serve.js      # 构建 + 启动预览（8080 端口）
node serve.js 8080 /blog/  # 子路径预览
```

### 8.2 优势

- 单命令构建，无需配置
- serve.js 自动执行 build.js
- 子路径预览开箱即用
- 构建输出报告（配置源、模式、主题、分类数、文章数）

### 8.3 痛点

| 痛点 | 说明 |
|------|------|
| 无 watch 模式 | 每次编辑需手动 build |
| 无增量构建 | 每次全量清理重建 |
| 无 source maps | 调试不便 |
| 无 package.json | 无 scripts 快捷命令 |

---

## 9. 部署能力

### 9.1 GitHub Pages

`github/workflows/deploy.yml` 已配置：
- push 到 main 分支自动触发
- Node.js 20 环境
- `node build.js` 构建
- 自动上传 dist/ 到 GitHub Pages

### 9.2 Docker

```yaml
# docker/docker-compose.yml
services:
  blog:
    volumes:
      - ../workspace/site:/app/workspace/site
    ports:
      - "8080:8080"
    deploy:
      resources:
        limits:
          memory: 128M
```

- 自动种子：首次启动如果挂载目录为空，从 `examples/docker-seed/site/` 初始化
- 健康检查：每 30 秒检测 localhost:8080
- 资源限制：128MB 内存、0.5 CPU

### 9.3 通用静态托管

`dist/` 目录即完整产物，可直接部署到：
- Vercel
- Netlify
- Cloudflare Pages
- Nginx / Apache
- 任何支持静态文件的服务

---

## 10. 演进路线图

### 阶段一：产品化基础

| 任务 | 优先级 | 估工作量 | 说明 |
|------|--------|----------|------|
| 构建时 Markdown → HTML | P0 | 中 | 消除 SEO 致命缺陷 |
| package.json + CLI | P0 | 中 | 让用户能 npm install 使用 |
| RSS feed 生成 | P1 | 低 | build.js 中输出 feed.xml |
| sitemap.xml | P1 | 低 | build.js 中输出 sitemap.xml |

### 阶段二：体验补全

| 任务 | 优先级 | 估工作量 | 说明 |
|------|--------|----------|------|
| i18n 提取 | P1 | 中 | 至少中英双语 |
| 字体加载机制 | P1 | 低 | 支持 @font-face + @import（见第 6 节） |
| 暗色模式 | P1 | 高 | 每个主题需新增暗色 token 集 |
| Watch 模式 | P2 | 低 | serve.js 加入 fs.watch |
| 草稿系统 | P2 | 低 | front-matter 支持 draft: true |
| 文章间导航 | P2 | 低 | 上一篇/下一篇 |

### 阶段三：生态扩展

| 任务 | 优先级 | 估工作量 | 说明 |
|------|--------|----------|------|
| OG / Twitter Card | P3 | 低 | 社交分享预览 |
| 评论集成 | P3 | 中 | Giscus / Disqus |
| 搜索优化 | P3 | 中 | Lunr.js 离线索引 |
| 打印样式 | P3 | 低 | @media print |
| 数学公式 | P3 | 低 | KaTeX 支持 |
| 流程图 | P3 | 低 | Mermaid 支持 |

---

## 附录 A：主题字体清单

当前各主题引用的字体（未加载，仅声明）：

| 主题 | Display 字体 | Body 字体 | Mono 字体 |
|------|-------------|-----------|-----------|
| base.css | Segoe UI / PingFang SC | Segoe UI / PingFang SC | Consolas |
| graphite | Inter / PingFang SC | Inter / PingFang SC | JetBrains Mono |
| aurora | Playfair Display / Songti SC | Inter / PingFang SC | JetBrains Mono |
| paper | Caveat / STKaiti | Source Han Serif SC / Songti SC | JetBrains Mono |
| mono | Consolas / SFMono | Consolas / SFMono | Consolas / SFMono |
| terminal | Orbitron / PingFang SC | Inter / PingFang SC | JetBrains Mono |

## 附录 B：UI 字符串提取清单

需要提取到 i18n 文件的硬编码字符串：

| 文件 | 行 | 字符串 |
|------|-----|--------|
| index.html | 24 | `加载中...` |
| index.html | 74 | `正在加载内容...` |
| index.html | 78 | `还没有可展示的文章。` |
| index.html | 79 | `内容加载失败。` |
| post.html | 28 | `正在加载文章...` |
| post.html | 47 | `文章未找到` |
| post.html | 48 | `你访问的文章不存在，或者已经被移动。` |
| post.html | 49 | `返回首页` |
| blog.render.js | 198 | `全部` |
| blog.ui.js | 11 | `打开菜单` |
| blog.ui.js | 54 | `返回顶部` |
| blog.ui.js | 98 | `目录` / `收起` |
| blog.ui.js | 121 | `展开` / `收起` |
| index.page.js | 164 | `没有找到匹配的文章。` |
| index.page.js | 165 | `当前目录下还没有文章。` |
| index.page.js | 148 | `第 X / Y 页，共 Z 篇` |
| blog.core.js | 303 | `zh-CN` 日期格式 |
