# Static Markdown Blog — AI Skill

AI 的知识锁在对话历史里，用户看不到、搜不到。这个平台让 AI 把知识写成 Markdown，构建为可搜索的网站。

本 Skill 指导 AI 如何自主管理博客：写文章、改配置、创建主题、添加语言包、构建、部署。

## 安全机制

**AI 自主维护博客时，必须遵守以下安全规则：**

### 绝对禁止

- ❌ 将 `config.yml` 中的 `email`、`repo`、`repoId`、`beian.number` 等信息写入公开内容（文章、页面、HTML）
- ❌ 将 `.env`、API Key、Token、密码等写入任何文件
- ❌ 将用户的服务器 IP、域名、端口、内部路径泄露到公开内容中
- ❌ 自动执行 `git push`、`docker compose up`、`npm publish` 等部署操作
- ❌ 读取或修改 `site/` 以外的目录（除非用户明确授权）
- ❌ 将用户的私人信息（姓名、地址、电话、身份证）写入公开内容

### 允许操作

- ✅ 读取和编辑 `site/` 目录下的所有文件
- ✅ 执行 `node build.js` 构建
- ✅ 执行 `node serve.js` 本地预览
- ✅ 执行 `node test.js` 运行测试
- ✅ 读取 `res/locales/` 参考翻译格式
- ✅ 读取 `res/themes/` 参考主题结构

### 部署确认流程

部署操作必须经过用户确认：
1. AI 完成内容编写和构建
2. AI 告知用户：已构建完成，共 N 篇文章，是否部署？
3. 用户确认后，AI 执行部署命令
4. AI 告知用户：已部署，访问地址为 xxx

## 启动前必须确认的信息

**在执行任何操作前，AI 必须向用户确认以下信息：**

### 1. 博客位置

询问用户：
- 博客项目在哪个目录？
- 是已有的项目还是需要新建？

### 2. 部署方式

询问用户选择：
- **GitHub Pages** — 推送到 GitHub，自动构建部署
- **Docker** — 容器化部署
- **静态托管** — Vercel / Netlify / Cloudflare Pages / Nginx
- **本地预览** — 只在本地查看

### 3. 内容类型

询问用户：
- 技术博客？
- 学习笔记？
- 项目文档？
- AI 知识库？

### 4. 工作区来源

**重要：如果用户已经部署好项目并指定了工作区目录，不要在没有用户明确要求的情况下自行部署新实例。**

用户可能只给你一个 skills 目录，让你管理已有的博客。此时直接操作 `site/` 目录即可，不需要重新 clone 或部署。

如果用户需要从零开始，提供以下选项：

**方式 A：用户已有项目**
- 直接操作用户指定的 `site/` 目录
- 不需要 clone，不需要部署

**方式 B：从 GitHub 克隆（需用户确认）**
```bash
git clone https://github.com/MG5921MY/static-markdown-blog.git
cd static-markdown-blog
node init.js
```

**方式 C：Docker 部署（需用户确认）**
```bash
git clone https://github.com/MG5921MY/static-markdown-blog.git
cd static-markdown-blog/deploy/docker
docker compose up -d --build
# 或从 GitHub Container Registry 拉取
docker compose --profile pull up -d
```

Docker 部署后访问 `http://localhost:8110`（端口可在 docker-compose.yml 中修改）。

## 目录结构

```
site/                       ← 用户工作区（AI 操作这个目录）
├── config.yml              站点配置
├── content/
│   ├── posts/              文章（按分类子目录组织）
│   │   ├── guide/          示例分类
│   │   └── themes/         示例分类
│   ├── pages/              自定义页面
│   │   ├── about.md        关于页面
│   │   └── *.html          自定义 HTML 页面
│   └── data/               数据文件
│       ├── moments.yml     瞬间
│       ├── links.yml       友链
│       ├── gallery.yml     图库
│       └── projects.yml    项目
├── assets/                 资源文件（图片、图标等）
└── themes/custom/          自定义主题
```

## 操作指南

### 写文章

**文件位置：** `site/content/posts/<分类>/<文件名>.md`

**格式：**
```markdown
---
title: 文章标题
date: 2026-07-23
category: 分类ID
tags: [标签1, 标签2]
summary: 文章摘要（可选，不写则自动截取前 140 字）
---

文章正文内容...
```

**规则：**
- `category` 必须是 `config.yml` 中 `content.categories` 里定义的 ID
- `date` 格式 `YYYY-MM-DD`
- `tags` 是数组，用逗号分隔
- 正文支持完整 Markdown 语法
- 代码块用 ` ```语言名 ` 标记（支持语法高亮）
- 数学公式用 `$$...$$`（块级）或 `$...$`（行内）
- 流程图用 ` ```mermaid ` 代码块

**示例：**
```markdown
---
title: Docker 部署指南
date: 2026-07-23
category: guide
tags: [Docker, 部署]
summary: 如何用 Docker 部署静态博客。
---

# Docker 部署指南

## 安装 Docker

```bash
docker --version
```

## 启动容器

```bash
cd deploy/docker
docker compose up -d --build
```
```

### 创建自定义页面

**Markdown 页面：**
```markdown
# site/content/pages/about.md
---
title: 关于
---

这是关于页面的内容...
```

**HTML 页面：**
```html
<!-- site/content/pages/skills.html -->
<div class="custom-page">
  <h1>技能展示</h1>
  <p>自定义 HTML 内容...</p>
</div>
```

**config.yml 中注册页面：**
```yaml
content:
  pages:
    - id: about
      name: 关于
      type: markdown
      source: content/pages/about.md
    - id: skills
      name: 技能
      type: custom
      source: content/pages/skills.html
      scripts: true  # 启用 JS 执行
```

### 切换主题

**修改 config.yml：**
```yaml
theme:
  active: graphite  # 可选: graphite / aurora / paper / mono / terminal
```

### 配置导航栏

```yaml
nav:
  - name: 首页
    page: index
  - name: 关于
    page: about
  - name: 图库
    url: ./gallery.html
```

### 配置功能模块

```yaml
features:
  moments:
    enabled: true        # 开关
    source: content/data/moments.yml
  links:
    enabled: true
    source: content/data/links.yml
  gallery:
    enabled: true
    source: content/data/gallery.yml
```

### 构建

```bash
node build.js                    # 全量构建
node build.js --incremental      # 增量构建（跳过未变化文件）
node build.js --include-drafts   # 包含草稿
```

### 本地预览

```bash
node serve.js         # 启动开发服务器 http://localhost:8080
node serve.js 3000    # 指定端口
```

### 运行测试

```bash
node test.js
```

## config.yml 完整参考

```yaml
# ── 站点信息 ──
site:
  name: 站点名称
  alias: 副标题
  description: 站点描述
  author: 作者
  email: 联系邮箱（留空不显示）
  favicon: 图标路径
  logo: Logo 路径

# ── 部署 ──
deployment:
  basePath: auto          # 子路径（auto = 自动检测）
  siteUrl: 站点 URL       # 用于 RSS/sitemap

# ── SEO ──
seo:
  allowIndex: true        # 是否允许搜索引擎收录

# ── 主题 ──
theme:
  active: graphite        # 主题名

# ── 内容分类 ──
content:
  categories:
    - id: guide           # 分类 ID（文章 front-matter 引用）
      name: 快速开始       # 显示名称
      icon: "->"           # 图标
      path: content/posts/guide  # 文章目录
      type: flat           # flat = 平铺，tree = 目录树

# ── 自定义页面 ──
  pages:
    - id: about
      name: 关于
      type: markdown       # markdown / custom
      source: content/pages/about.md

# ── 导航栏 ──
nav:
  - name: 首页
    page: index
  - name: 关于
    page: about

# ── 功能模块 ──
features:
  moments:
    enabled: true
    description: "页面描述"
  links:
    enabled: true
    description: "页面描述"
  gallery:
    enabled: true
    description: "页面描述"

# ── 备案 ──
beian:
  enabled: false
  icp:
    number: "ICP号"

# ── 评论 ──
comments:
  enabled: false
  provider: giscus

# ── 显示设置 ──
display:
  postsPerPage: 6
  heroSubtitle: "Hero 副标题"
  heroBadges: ["标签1", "标签2", "标签3"]
  heroActions:
    - label: "按钮文案"
      url: "./page.html?id=about"
      style: primary
  codeWrap: false          # false = 横向滚动，true = 自动换行

# ── 免责声明 ──
disclaimer:
  subtitle: ""
  items: []

# ── 404 页面 ──
error404:
  actions:
    - label: "返回首页"
      url: "./index.html"
      style: primary
```

## 常见任务速查

| 任务 | 操作 |
|------|------|
| 写新文章 | 在 `site/content/posts/<分类>/` 下创建 `.md` 文件 |
| 改站点名 | 编辑 `config.yml` 的 `site.name` |
| 换主题 | 编辑 `config.yml` 的 `theme.active` |
| 加导航项 | 编辑 `config.yml` 的 `nav` 数组 |
| 开关功能 | 编辑 `config.yml` 的 `features.*.enabled` |
| 构建 | `node build.js` |
| 预览 | `node serve.js` |
| 测试 | `node test.js` |
| 部署 | 用户确认后 `git push` 或 `docker compose up` |

## 错误处理

| 错误 | 原因 | 解决 |
|------|------|------|
| `Post not found` | 文章 ID 不存在 | 检查 front-matter 的 category 和文件名 |
| `Category not found` | 分类 ID 未在 config.yml 定义 | 检查 `content.categories` |
| `Missing config` | config.yml 不存在 | 运行 `node init.js` |
| `Build failed` | YAML 语法错误 | 检查 config.yml 缩进 |

## 创建自定义主题

### 目录结构

```
site/themes/custom/<theme-id>/
  theme.yml       ← 元数据（必须）
  theme.css       ← 样式（必须，必须 @import "../base.css"）
  theme.js        ← 可选：自定义交互
  fonts/          ← 可选：本地字体
  templates/      ← 可选：HTML 模板覆盖
```

`theme-id` 只能包含小写字母、数字和连字符，不能以数字开头，不能与内置主题重复。

### theme.yml 格式

```yaml
name: 主题名
version: 1.0.0
author: 作者
description: 描述
```

### theme.css 最小示例

```css
@import "../base.css";

:root {
  --accent: #e74c3c;
  --accent-soft: rgba(231, 76, 60, 0.16);
  --accent-strong: #ff6b5a;
}
```

`theme.css` 第一行必须是 `@import "../base.css";`，确保继承基础样式。只需覆盖需要修改的 Token，未覆盖的继承 `base.css` 默认值。

### 常用 Token 列表

**颜色：**

| Token | 说明 |
|-------|------|
| `--bg-primary` | 主背景色 |
| `--bg-secondary` | 次级背景色（卡片、面板） |
| `--text-primary` | 主文本色 |
| `--text-secondary` | 次级文本色 |
| `--accent` | 强调色（按钮、链接、高亮） |
| `--border` | 边框色 |

**排版：**

| Token | 说明 |
|-------|------|
| `--font-display` | 标题字体栈 |
| `--font-body` | 正文字体栈 |
| `--font-mono` | 等宽字体栈 |

**布局：**

| Token | 说明 |
|-------|------|
| `--layout-width` | 页面最大宽度 |
| `--layout-nav-height` | 导航栏高度 |
| `--layout-hero` | 首页 Hero 区域最小高度 |
| `--layout-prose` | 正文区域最大宽度 |

**代码：**

| Token | 说明 |
|-------|------|
| `--code-bg` | 代码块背景色 |
| `--code-text` | 代码块文本色 |
| `--code-muted` | 代码块弱化文本色（注释） |

### 暗色模式

```css
/* 默认暗色 */
:root {
  --bg-primary: #0b0d12;
  --bg-secondary: #11141b;
  --text-primary: #f5f7fb;
  /* ... */
}

/* 亮色覆盖 */
[data-color-scheme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --text-primary: #1a1a1a;
  /* ... */
}

/* 跟随系统 */
@media (prefers-color-scheme: light) {
  [data-color-scheme="auto"] {
    --bg-primary: #ffffff;
    --bg-secondary: #f8f9fa;
    --text-primary: #1a1a1a;
    /* ... */
  }
}
```

### theme.js 生命周期

`theme.js` 是可选的 JavaScript 文件，通过挂载到全局 `Blog` 对象的生命周期钩子来执行：

| 钩子 | 触发时机 | 用途 |
|------|---------|------|
| `Blog.onInit` | 博客初始化完成后 | 初始化自定义组件、注册事件监听 |
| `Blog.onPageLoad` | 页面内容加载后 | 绑定 DOM 事件、初始化动画 |
| `Blog.onThemeChange(newThemeId)` | 主题切换时 | 清理旧主题状态、重新初始化 |

```js
Blog.onInit = function () {
  console.log('Theme initialized:', Blog.config?.theme);
};

Blog.onPageLoad = function () {
  const postBody = document.querySelector('.post-body');
  if (postBody) {
    const wordCount = postBody.textContent.length;
    const readTime = Math.ceil(wordCount / 500);
    const metaEl = document.querySelector('.post-meta');
    if (metaEl) {
      metaEl.innerHTML += `<span>约 ${readTime} 分钟</span>`;
    }
  }
};

Blog.onThemeChange = function (newThemeId) {
  console.log('Theme changed to:', newThemeId);
};
```

### 启用主题

在 `config.yml` 中设置：

```yaml
theme:
  active: <theme-id>
```

## 创建语言包

### 目录结构

```
res/locales/
  zh.json     ← 中文
  en.json     ← 英文
  <code>.json ← 新语言
```

### locale 文件格式

```json
{
  "_meta": {
    "code": "ja",
    "name": "Japanese",
    "nativeName": "日本語",
    "shortLabel": "日"
  },
  "loading": "読み込み中...",
  "nav": { "home": "ホーム" },
  "site": { "defaultName": "ブログ", "personalBlog": "個人ブログ", "myBlog": "私のブログ" },
  "hero": { "learnMore": "もっと知る", "viewDisclaimer": "免責事項", "continueReading": "続きを読む", "badge1": "...", "badge2": "...", "badge3": "..." },
  "index": { "latestContent": "...", "sectionCopy": "...", "searchPlaceholder": "...", "all": "すべて" },
  "post": { "loading": "...", "notFound": "...", "backHome": "...", "missingParam": "..." },
  "page": { "kicker": "...", "loading": "...", "notFound": "...", "backHome": "...", "missingParam": "...", "pageNotFound": "...", "categoryNotFound": "...", "unsupportedType": "..." },
  "ui": { "backToTop": "...", "openMenu": "...", "toc": "...", "collapse": "...", "expand": "..." },
  "gallery": { "kicker": "...", "title": "...", "description": "..." },
  "moments": { "kicker": "...", "title": "...", "subtitle": "..." },
  "links": { "kicker": "...", "title": "...", "subtitle": "..." },
  "disclaimer": { "kicker": "...", "title": "...", "subtitle": "...", "item1Title": "...", "item1Desc": "..." },
  "error404": { "title": "...", "description": "..." }
}
```

### 语言自动发现

构建时自动扫描 `res/locales/*.json`，生成 `locales/index.json`。添加新语言文件后无需额外配置。

### 启用语言

用户在页面右上角语言切换下拉菜单中选择。
