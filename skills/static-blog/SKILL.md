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
└── themes/                 自定义主题
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
site/themes/<theme-id>/
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

---

### 设计原则：AI 创建主题的 6 步决策框架

创建主题不是"改几个颜色"，而是建立一套完整的视觉语言。按以下顺序决策：

**第 1 步：确定设计语言**

选择一个明确的设计方向，所有后续决策都围绕它展开：

| 设计语言 | 关键词 | 代表主题 |
|----------|--------|----------|
| 工业/蓝图 | 细线、刻度、参考线、技术感 | `graphite` |
| 品牌/杂志 | 大衬线、巨量留白、印刷品质感 | `aurora` |
| 手帐/笔记 | 稿纸纹理、手写体、撕角、墨水色 | `paper` |
| 极简/档案 | 全方角、等宽字体、黑白、高密度 | `mono` |
| 赛博/终端 | 霓虹色、扫描线、发光、暗底 | `terminal` |
| 私人/花见 | 暖纸底、衬线、大圆角、樱粉色 | `sakura`（自定义示例） |

**第 2 步：选字体**

字体决定 80% 的气质。Google Fonts 免费可用：

| 类型 | 气质 | 推荐字体 |
|------|------|----------|
| 无衬线 display | 现代、干净 | Inter, Plus Jakarta Sans, Outfit |
| 衬线 display | 优雅、印刷感 | Playfair Display, Lora, Noto Serif SC |
| 手写 display | 温暖、手工感 | Caveat, Kalam |
| 等宽 display | 技术、极简 | JetBrains Mono（作 display 时需加粗） |
| 中文衬线 | 正式、阅读舒适 | Noto Serif SC, Source Han Serif SC |
| 中文无衬线 | 现代、简洁 | Noto Sans SC, Source Han Sans SC |

规则：`--font-display` 用于标题，`--font-body` 用于正文，`--font-mono` 用于代码和标签。三者可以不同，但必须和谐。

**第 3 步：选配色**

配色方案决定情感基调：

| 方案 | 说明 | 示例 accent |
|------|------|-------------|
| 暖色 | 亲切、活力 | `#d04a1a`（橙红）、`#c85a6a`（樱粉） |
| 冷色 | 专业、冷静 | `#1a3aff`（蓝）、`#1a3a2e`（墨绿） |
| 单色 | 极简、专注 | `#0a0a0a`（纯黑，如 mono） |
| 对比色 | 强烈、科技 | `#00ff66`（霓虹绿，如 terminal） |

暗色模式时，accent 通常需要提亮 10-20%（如 `#1a3aff` → `#6b8aff`）。

**第 4 步：选圆角**

圆角定义组件的"性格"：

| 风格 | Token 值 | 视觉效果 |
|------|----------|----------|
| 方角（工业/极简） | `--card-radius: 0; --btn-radius: 0; --tag-radius: 0` | 锐利、精确 |
| 小圆角（现代/品牌） | `--card-radius: 8px; --btn-radius: 6px; --tag-radius: 999px` | 柔和但不幼稚 |
| 大圆角（手帐/可爱） | `--card-radius: 12px; --btn-radius: 8px; --tag-radius: 999px` | 亲切、温暖 |
| 胶囊（极简现代） | `--card-radius: 18px; --btn-radius: 999px; --tag-radius: 999px` | 流畅、高端 |

**第 5 步：选阴影**

阴影营造层次感：

| 风格 | Token 值 | 适用场景 |
|------|----------|----------|
| 无阴影 | `--shadow-sm: none; --shadow-md: none; --shadow-lg: none` | 极简/工业（mono） |
| 边框替代 | `--shadow-sm: 0 0 0 1px var(--border)` | 工业蓝图（graphite） |
| 柔和暖色 | `--shadow-sm: 0 1px 3px rgba(120,60,40,0.04), 0 4px 16px rgba(120,60,40,0.05)` | 手帐/花见（sakura） |
| 强烈抬升 | `--shadow-md: 0 2px 4px rgba(0,0,0,0.05), 0 12px 32px rgba(0,0,0,0.08)` | 品牌杂志（aurora） |
| 霓虹发光 | `--shadow-md: 0 0 0 1px var(--border), 0 0 12px rgba(0,255,100,0.1)` | 赛博终端（terminal） |

**第 6 步：添加独特元素**

好的主题有一个"签名"元素让人记住：

| 主题 | 签名元素 | 实现方式 |
|------|----------|----------|
| graphite | 左侧刻度凹槽 | `border-left: 3px solid var(--accent)` + 卡片顶部刻度线 |
| aurora | 巨大斜体衬线标题 | `font-style: italic; font-size: clamp(56px, 9vw, 132px)` |
| paper | 稿纸横线底纹 | `repeating-linear-gradient` 背景 |
| mono | 8px 网格底纹 | `linear-gradient` 网格 + `border-radius: 0 !important` |
| terminal | 扫描线 + 霓虹发光 | `body::after` 伪元素 + `text-shadow` |
| sakura | 淡粉色光晕 | `radial-gradient` 背景装饰 |

---

### 完整 theme.css 模板

AI 创建主题时，以此模板为基础修改。这是覆盖所有组件的完整骨架：

```css
/* ═══════════════════════════════════════════════════════
   主题名 — 设计语言描述
   视觉语言：
    - 一句话描述设计方向
    - 字体选择说明
    - 圆角/阴影风格说明
    - 独特元素说明
   ═══════════════════════════════════════════════════════ */

@import "../base.css";
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

/* ── :root — 默认值（暗色模式）──────────────────────── */
:root {
  /* 颜色 */
  --bg-primary: #0b0d12;
  --bg-secondary: #11141b;
  --bg-elevated: #161b24;
  --text-primary: #f5f7fb;
  --text-secondary: #b7c0cf;
  --text-muted: #7f8794;
  --border: rgba(255, 255, 255, 0.08);
  --accent: #6f7cff;
  --accent-soft: rgba(111, 124, 255, 0.16);
  --accent-strong: #8c95ff;
  --brand-start: #6f7cff;
  --brand-end: #8c95ff;
  --brand-shadow: rgba(111, 124, 255, 0.18);

  /* 排版 */
  --font-display: "Inter", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-body: "Inter", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-mono: "JetBrains Mono", "SF Mono", Consolas, monospace;

  /* 字号阶梯 */
  --text-xxs: 11px;
  --text-xs: 13px;
  --text-caption: 12px;
  --text-sm: 14px;
  --text-sm-md: 15px;
  --text-body: 17px;
  --text-body-lg: clamp(15px, 1.6vw, 17px);
  --text-h3: 24px;
  --text-h4: 20px;
  --text-h5: 18px;
  --text-h1: clamp(28px, 4vw, 52px);
  --text-section: clamp(22px, 2.6vw, 28px);
  --text-hero: clamp(40px, 6.2vw, 68px);

  /* 间距 */
  --space-xxs: 4px;
  --space-xs: 6px;
  --space-sm: 12px;
  --space-md: 20px;
  --space-lg: 32px;
  --space-xl: 56px;
  --layout-gutter: clamp(16px, 4vw, 40px);
  --layout-width: 1120px;
  --layout-nav-height: 64px;
  --layout-hero: 64vh;
  --layout-prose: 760px;
  --layout-moments: 860px;

  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 18px;
  --radius-full: 999px;
  --card-radius: 0;
  --btn-radius: 0;
  --tag-radius: 0;

  /* 阴影 */
  --shadow-sm: 0 10px 30px rgba(0, 0, 0, 0.12);
  --shadow-md: 0 18px 50px rgba(0, 0, 0, 0.18);
  --shadow-lg: 0 24px 80px rgba(0, 0, 0, 0.24);

  /* 布局 */
  --card-min-width: 260px;
  --card-gap: 18px;
  --card-direction: column;
  --hero-align: center;
  --hero-min-height: min(var(--layout-hero), 720px);
  --post-article-width: 880px;
  --post-article-padding: clamp(20px, 4vw, 42px);
  --nav-justify: space-between;
  --layout-sidebar-width: 0;
  --layout-sidebar-position: right;

  /* 代码块 */
  --code-bg: #121722;
  --code-border: rgba(255, 255, 255, 0.08);
  --code-text: #eaf1ff;
  --code-muted: #8f9ab0;
  --code-inline-bg: rgba(255, 255, 255, 0.06);
  --code-inline-text: #f3f7ff;
  --code-selection: rgba(255, 255, 255, 0.1);
  --code-accent-1: #8fb4ff;
  --code-accent-2: #9ce3c3;
  --code-accent-3: #ffc98f;
}

/* ── 亮色模式 ──────────────────────────────────────── */
[data-color-scheme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-elevated: #ffffff;
  --text-primary: #1a1a1a;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --border: rgba(0, 0, 0, 0.08);
  --accent: #4f6df5;
  --accent-soft: rgba(79, 109, 245, 0.1);
  --accent-strong: #3b5bdb;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 2px 6px rgba(0, 0, 0, 0.06), 0 12px 32px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.08), 0 24px 56px rgba(0, 0, 0, 0.08);
  --code-bg: #f6f8fa;
  --code-border: rgba(0, 0, 0, 0.1);
  --code-text: #24292f;
  --code-muted: #6a737d;
  --code-inline-bg: rgba(79, 109, 245, 0.08);
  --code-inline-text: #24292f;
  --code-selection: rgba(79, 109, 245, 0.15);
  --code-accent-1: #6f42c1;
  --code-accent-2: #032f62;
  --code-accent-3: #005cc5;
}

/* ── 跟随系统（亮色）────────────────────────────── */
@media (prefers-color-scheme: light) {
  [data-color-scheme="auto"] {
    --bg-primary: #ffffff;
    --bg-secondary: #f8f9fa;
    --bg-elevated: #ffffff;
    --text-primary: #1a1a1a;
    --text-secondary: #6b7280;
    --text-muted: #9ca3af;
    --border: rgba(0, 0, 0, 0.08);
    --accent: #4f6df5;
    --accent-soft: rgba(79, 109, 245, 0.1);
    --accent-strong: #3b5bdb;
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.04);
    --shadow-md: 0 2px 6px rgba(0, 0, 0, 0.06), 0 12px 32px rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.08), 0 24px 56px rgba(0, 0, 0, 0.08);
    --code-bg: #f6f8fa;
    --code-border: rgba(0, 0, 0, 0.1);
    --code-text: #24292f;
    --code-muted: #6a737d;
    --code-inline-bg: rgba(79, 109, 245, 0.08);
    --code-inline-text: #24292f;
    --code-selection: rgba(79, 109, 245, 0.15);
    --code-accent-1: #6f42c1;
    --code-accent-2: #032f62;
    --code-accent-3: #005cc5;
  }
}

/* ── 跟随系统（暗色）────────────────────────────── */
@media (prefers-color-scheme: dark) {
  [data-color-scheme="auto"] {
    --bg-primary: #0b0d12;
    --bg-secondary: #11141b;
    --bg-elevated: #161b24;
    --text-primary: #f5f7fb;
    --text-secondary: #b7c0cf;
    --text-muted: #7f8794;
    --border: rgba(255, 255, 255, 0.08);
    --accent: #6f7cff;
    --accent-soft: rgba(111, 124, 255, 0.16);
    --accent-strong: #8c95ff;
    --shadow-sm: 0 10px 30px rgba(0, 0, 0, 0.12);
    --shadow-md: 0 18px 50px rgba(0, 0, 0, 0.18);
    --shadow-lg: 0 24px 80px rgba(0, 0, 0, 0.24);
    --code-bg: #121722;
    --code-border: rgba(255, 255, 255, 0.08);
    --code-text: #eaf1ff;
    --code-muted: #8f9ab0;
    --code-inline-bg: rgba(255, 255, 255, 0.06);
    --code-inline-text: #f3f7ff;
    --code-selection: rgba(255, 255, 255, 0.1);
    --code-accent-1: #8fb4ff;
    --code-accent-2: #9ce3c3;
    --code-accent-3: #ffc98f;
  }
}

/* ═══════════════════════════════════════════════════════
   组件样式覆盖（按需修改）
   ═══════════════════════════════════════════════════════ */

/* ── 导航栏 ────────────────────────────────────────── */
.nav {
  /* background: color-mix(in srgb, var(--bg-primary) 90%, transparent); */
  /* border-bottom: 1px solid var(--border); */
  /* backdrop-filter: blur(12px); */
}

.nav-brand {
  /* font-family: var(--font-display); */
  /* font-weight: 600; */
  /* font-size: 20px; */
}

.nav-link {
  /* font-family: var(--font-body); */
  /* font-size: var(--text-sm); */
  /* color: var(--text-secondary); */
}

.nav-link:hover,
.nav-link.active {
  /* color: var(--accent); */
}

/* ── Hero ──────────────────────────────────────────── */
.hero {
  /* min-height: var(--hero-min-height); */
  /* padding: 80px 0 48px; */
  /* text-align: var(--hero-align); */
}

.hero-title {
  /* font-family: var(--font-display); */
  /* font-size: var(--text-hero); */
  /* font-weight: 700; */
  /* line-height: 1.02; */
}

.hero-subtitle,
.hero-copy {
  /* color: var(--text-secondary); */
  /* max-width: 480px; */
  /* line-height: 1.7; */
}

/* ── 卡片 ──────────────────────────────────────────── */
.post-card {
  /* background: var(--bg-secondary); */
  /* border: 1px solid var(--border); */
  /* border-radius: var(--card-radius); */
  /* transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease; */
}

.post-card:hover {
  /* border-color: var(--accent); */
  /* box-shadow: var(--shadow-md); */
  /* transform: translateY(-3px); */
}

.post-card-title {
  /* font-family: var(--font-display); */
  /* font-weight: 600; */
}

/* ── 标签 ──────────────────────────────────────────── */
.post-tag {
  /* border: 1px solid var(--border); */
  /* background: transparent; */
  /* color: var(--text-muted); */
  /* border-radius: var(--tag-radius); */
}

.post-tag:hover {
  /* border-color: var(--accent); */
  /* color: var(--accent); */
}

/* ── 文章详情 ──────────────────────────────────────── */
.post-article {
  /* background: var(--bg-secondary); */
  /* border: 1px solid var(--border); */
  /* border-radius: var(--card-radius); */
}

.post-title {
  /* font-family: var(--font-display); */
  /* font-size: var(--text-h1); */
  /* font-weight: 700; */
}

.markdown-body h2 {
  /* border-bottom: 1px solid var(--border); */
  /* padding-bottom: var(--space-sm); */
}

.markdown-body a {
  /* color: var(--accent); */
  /* text-decoration: underline; */
  /* text-underline-offset: 3px; */
}

.markdown-body blockquote {
  /* border-left: 3px solid var(--accent); */
  /* background: var(--accent-soft); */
  /* padding: var(--space-sm) var(--space-md); */
}

/* ── 按钮 ──────────────────────────────────────────── */
.btn-primary {
  /* background: var(--accent); */
  /* color: #fff; */
  /* border: 0; */
  /* border-radius: var(--btn-radius); */
}

.btn-primary:hover {
  /* background: var(--accent-strong); */
  /* box-shadow: 0 2px 8px var(--brand-shadow); */
}

.btn-secondary {
  /* background: transparent; */
  /* color: var(--accent); */
  /* border: 1px solid var(--accent); */
}

/* ── 页脚 ──────────────────────────────────────────── */
.footer {
  /* border-top: 1px solid var(--border); */
  /* color: var(--text-muted); */
}

.footer-link:hover {
  /* color: var(--accent); */
}

/* ── 目录 ──────────────────────────────────────────── */
.toc-container {
  /* border: 1px solid var(--border); */
  /* background: var(--bg-secondary); */
}

.toc-link:hover,
.toc-link.active {
  /* color: var(--accent); */
}

/* ── 瞬间 ──────────────────────────────────────────── */
.moment-card {
  /* background: var(--bg-secondary); */
  /* border: 1px solid var(--border); */
}

.moment-dot {
  /* background: var(--accent); */
  /* box-shadow: 0 0 0 3px var(--accent-soft); */
}

/* ── 友链 ──────────────────────────────────────────── */
.link-card {
  /* background: var(--bg-secondary); */
  /* border: 1px solid var(--border); */
}

.link-card:hover {
  /* border-color: var(--accent); */
}

.link-pill {
  /* background: var(--accent-soft); */
  /* color: var(--accent); */
}

/* ── 图库 ──────────────────────────────────────────── */
.gallery-item {
  /* border: 1px solid var(--border); */
}

.gallery-item:hover {
  /* border-color: var(--accent); */
  /* box-shadow: var(--shadow-md); */
}

/* ── 返回顶部 ──────────────────────────────────────── */
.back-to-top {
  /* border: 1px solid var(--accent); */
  /* background: var(--bg-primary); */
  /* color: var(--accent); */
  /* border-radius: var(--card-radius); */
}

.back-to-top:hover {
  /* background: var(--accent); */
  /* color: #fff; */
}

/* ── 阅读进度条 ────────────────────────────────────── */
.reading-progress-bar {
  /* background: linear-gradient(90deg, var(--accent), var(--brand-end)); */
}

/* ── 移动端适配 ────────────────────────────────────── */
@media (max-width: 768px) {
  .hero {
    /* padding: 56px 0 32px; */
    /* min-height: auto; */
  }
}
```

使用方法：复制此模板，取消注释需要修改的属性并改为目标值。不需要修改的组件保持注释或删除。

---

### 5 个内置主题的设计分析

每个主题都是设计决策的完整示例。分析它们可以帮助 AI 理解"什么样的设计决策组合会产生什么样的视觉效果"。

#### 1. graphite — 工业蓝图

- **设计语言**：技术图纸 / 工程图。细线 + 刻度尺 + 参考线。
- **字体**：Inter（无衬线 display） + JetBrains Mono。全部 sans + mono 混排，不用衬线。
- **配色**：冷色蓝 `#1a3aff`，暖灰底 `#f4f4ef`。暗色模式切到深蓝灰。
- **圆角**：全部方角 `--card-radius: 0; --btn-radius: 0; --tag-radius: 0`。`--radius-sm: 0`。
- **阴影**：无真实阴影，用 `0 0 0 1px var(--border)` 模拟边框。
- **独特元素**：
  - 背景：顶部刻度尺（`linear-gradient` 水平线）+ 左侧参考线（垂直线）
  - 卡片：左侧 3px accent 边框 + 顶部 4 个"刻度钉"（`::after` 伪元素）
  - nav-brand 前缀 `[G]` 标签
  - Hero 右侧 spec table（`<dl>` 格式的规格表）
  - 文章顶部装饰刻度条
- **AI 可学到**：方角 + 细线 + mono 字体可以营造精确的技术感。背景纹理用 `linear-gradient` 实现，不依赖图片。

#### 2. aurora — 品牌杂志

- **设计语言**：高端品牌画册 / 杂志。巨量留白，最少装饰。
- **字体**：Playfair Display（大衬线 italic display） + Inter（无衬线正文） + JetBrains Mono。
- **配色**：暖橙红 `#d04a1a`，暖纸底 `#faf8f3`。暗色模式加深到 `#101010`。
- **圆角**：中等 `--card-radius: 8px; --btn-radius: 6px; --tag-radius: 999px`。
- **阴影**：柔和多层阴影 `0 1px 2px ... 0 4px 16px ...`，hover 时加深。
- **独特元素**：
  - Hero 标题用 italic，字号巨大 `clamp(56px, 9vw, 132px)`
  - 卡片 hover 时 `translateY(-4px)` + 阴影加深，有"抬升"感
  - section-title 居中 + 底部 32px accent 横线
  - blockquote 居中 + 大引号装饰 `::before`
  - 按钮用胶囊形 `border-radius: 999px`
- **AI 可学到**：大衬线 italic + 巨量留白 + 柔和阴影 = 高端感。最少装饰但每个细节都精致。

#### 3. paper — 手记 / 稿纸

- **设计语言**：手写笔记 / 稿纸。横线底纹 + 左侧红线区 + 手写体。
- **字体**：Caveat（手写 display） + Source Han Serif SC（衬线正文） + JetBrains Mono。
- **配色**：墨绿墨水 `#1a3a2e`，牛皮纸底 `#f5f1e6`。暗色模式变深绿 `#4a8a6a`。
- **圆角**：中等 `--card-radius: 12px; --btn-radius: 8px; --tag-radius: 999px`。
- **阴影**：柔和暖色阴影。
- **独特元素**：
  - 背景：稿纸横线（`repeating-linear-gradient` 32px 间隔）+ 左侧 64px 红线区
  - `line-height: 32px` 与底纹对齐
  - 卡片右上角"撕角"效果（`::after` 用 `linear-gradient(225deg, ...)` 裁切）
  - 文章段落 `text-indent: 2em` 模拟中文排版
  - hover 时微旋转 `rotate(-0.4deg)` 模拟纸张翻动
  - 标题后缀 `——` 装饰线
- **AI 可学到**：真实纹理（稿纸线）+ 手写体 + 微动效（旋转）可以营造强烈的手工感。`line-height` 与背景纹理对齐是关键细节。

#### 4. mono — 开发者档案柜

- **设计语言**：极简档案柜 / 终端日志。全部方角，强制等宽字体，8px 网格。
- **字体**：Consolas / JetBrains Mono 作 display（`!important` 强制覆盖）。正文仍用系统无衬线。
- **配色**：纯黑 `#0a0a0a` + 灰白底 `#f4f3ef`。暗色模式反转。
- **圆角**：`border-radius: 0 !important` 全局强制方角。
- **阴影**：全部 `none`。
- **独特元素**：
  - 背景：8px 网格线（`linear-gradient` 水平 + 垂直线）
  - 所有标题、标签、按钮强制 `font-family: var(--font-display) !important`（等宽）
  - 卡片左上角自动编号 `counter(post-card, decimal-leading-zero)`
  - 导航链接底部 2px 粗线
  - 标题前缀 § 序号
  - 代码块左侧 4px accent 边框
- **AI 可学到**：`!important` 全局覆盖字体 + 方角 + 无阴影 = 极致极简。自动编号和序号可以增加信息密度。暗色模式可以完全反转色值（黑变白、白变黑）。

#### 5. terminal — 黑客终端

- **设计语言**：CRT 终端 / 黑客界面。霓虹绿 + 暗底 + 扫描线 + 发光。
- **字体**：Orbitron（科幻 display） + Inter（正文） + JetBrains Mono。
- **配色**：霓虹绿 `#00ff66` + 深黑底 `#0a0f0a`。自定义 `--text-bright: #e8ffe8`。
- **圆角**：全部方角 `--card-radius: 0`。
- **阴影**：边框式 + 霓虹发光 `0 0 12px rgba(0,255,100,0.1)`。
- **独特元素**：
  - `body::after` 全屏扫描线（`repeating-linear-gradient` 2px 间隔，`mix-blend-mode: multiply`）
  - nav-brand 后闪烁状态点（`animation: terminal-pulse 2s`）
  - nav 底部 1px 霓虹渐变光
  - 六边形 logo（`clip-path: polygon(50% 0%, 100% 25%, ...)`）
  - 所有按钮/标签前缀 `▸` 箭头
  - 代码块前缀 `$ ` 模拟终端
  - 面板顶部 1px neon 渐变光
  - 链接用虚线下划线 `border-bottom: 1px dashed`
- **AI 可学到**：`::after` 伪元素可以做全屏覆盖效果（扫描线）。`clip-path` 可以做非矩形形状。`text-shadow` 和 `box-shadow` 的发光效果是赛博风的核心。自定义 CSS 变量（如 `--text-bright`、`--status-cyan`）可以扩展 Token 系统。

---

### 常见陷阱

1. **不要从零写 CSS** — 下载现有主题作为基础，只改 Token 值。从零写会导致大量组件样式缺失（按钮、标签、目录、代码块、灯箱等都没有样式）
2. **只覆盖 base.css 中已有的 Token** — 自创 CSS 变量（如 `--glass-bg`）不会生效，base.css 的组件不识别
3. **用 `[data-color-scheme]` 而不是 `@media`** — `@media (prefers-color-scheme)` 的优先级低于 `[data-color-scheme]`，无头浏览器的系统偏好可能和用户选择不一致，导致暗色模式下显示亮色
4. **theme.yml 必须有 `id` 字段** — 没有 `id` 字段的主题不会被识别。`id` 就是目录名（如 `sakura`）
5. **`@import "../base.css"` 是必须的** — 不写这行，所有 base.css 的组件样式都不会加载，页面完全无样式
6. **不要只改颜色** — 一个好看的主题需要独特的设计语言：背景纹理/渐变、字体选择、圆角风格、阴影层次、hover 动效。参考现有 5 个主题的设计注释
7. **config.yml 不要用 yaml.dump** — Python 的 yaml.dump 会改变缩进格式，导致 Node.js YAML 解析器报错。直接写文件，保留原始格式
8. **Token 值必须和视觉一致** — 如果主题想要圆角卡片，设置 `--card-radius: 12px`，不要在组件里写 `border-radius: 12px`（会绕过 Token 系统）

---

### 完整 Token 参考

以下是 `base.css` 中定义的全部 CSS 自定义属性。自定义主题只需覆盖需要修改的，未覆盖的继承 `base.css` 默认值。

#### 颜色

| Token | 用途 | base.css 默认值 |
|-------|------|-----------------|
| `--bg-primary` | 主背景色 | `#0b0d12` |
| `--bg-secondary` | 次级背景色（卡片、面板） | `#11141b` |
| `--bg-elevated` | 提升层背景色（悬浮、弹窗） | `#161b24` |
| `--text-primary` | 主文本色 | `#f5f7fb` |
| `--text-secondary` | 次级文本色 | `#b7c0cf` |
| `--text-muted` | 弱化文本色（标签、辅助信息） | `#7f8794` |
| `--border` | 边框色 | `rgba(255, 255, 255, 0.08)` |
| `--accent` | 强调色（按钮、链接、高亮） | `#6f7cff` |
| `--accent-soft` | 弱化强调色（背景点缀） | `rgba(111, 124, 255, 0.16)` |
| `--accent-strong` | 增强强调色（hover 状态） | `#8c95ff` |
| `--brand-start` | 品牌渐变起始色 | `#6f7cff` |
| `--brand-end` | 品牌渐变终止色 | `#8c95ff` |
| `--brand-shadow` | 品牌阴影色 | `rgba(111, 124, 255, 0.18)` |

#### 排版

| Token | 用途 | base.css 默认值 |
|-------|------|-----------------|
| `--font-display` | 标题字体栈 | `"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif` |
| `--font-body` | 正文字体栈 | `"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif` |
| `--font-mono` | 等宽字体栈 | `Consolas, "SFMono-Regular", "JetBrains Mono", monospace` |

#### 字号阶梯

| Token | 用途 | base.css 默认值 |
|-------|------|-----------------|
| `--text-xxs` | 极小文本 | `11px` |
| `--text-xs` | 超小文本 | `13px` |
| `--text-caption` | 说明文字 | `12px` |
| `--text-sm` | 小号文本 | `14px` |
| `--text-sm-md` | 中小号文本 | `15px` |
| `--text-body` | 正文默认 | `17px` |
| `--text-body-lg` | 大号正文（响应式） | `clamp(15px, 1.6vw, 17px)` |
| `--text-h3` | 三级标题 | `24px` |
| `--text-h4` | 四级标题 | `20px` |
| `--text-h5` | 五级标题 | `18px` |
| `--text-h1` | 一级标题（响应式） | `clamp(28px, 4vw, 52px)` |
| `--text-section` | 区块标题（响应式） | `clamp(22px, 2.6vw, 28px)` |
| `--text-hero` | Hero 标题（响应式） | `clamp(40px, 6.2vw, 68px)` |

#### 间距

| Token | 用途 | base.css 默认值 |
|-------|------|-----------------|
| `--space-xxs` | 极小间距 | `4px` |
| `--space-xs` | 超小间距 | `6px` |
| `--space-sm` | 小间距 | `12px` |
| `--space-md` | 中间距 | `20px` |
| `--space-lg` | 大间距 | `32px` |
| `--space-xl` | 超大间距 | `56px` |
| `--layout-gutter` | 布局排水槽（响应式） | `clamp(16px, 4vw, 40px)` |
| `--layout-moments` | 瞬间页面最大宽度 | `860px` |

#### 圆角

| Token | 用途 | base.css 默认值 |
|-------|------|-----------------|
| `--radius-sm` | 小圆角 | `4px` |
| `--radius-md` | 中圆角 | `8px` |
| `--radius-lg` | 大圆角 | `12px` |
| `--radius-xl` | 超大圆角 | `18px` |
| `--radius-full` | 胶囊/圆形圆角 | `999px` |
| `--card-radius` | 卡片圆角 | `0` |
| `--btn-radius` | 按钮圆角 | `0` |
| `--tag-radius` | 标签圆角 | `0` |

#### 阴影

| Token | 用途 | base.css 默认值 |
|-------|------|-----------------|
| `--shadow-sm` | 小阴影（卡片默认） | `0 10px 30px rgba(0, 0, 0, 0.12)` |
| `--shadow-md` | 中阴影（hover、弹窗） | `0 18px 50px rgba(0, 0, 0, 0.18)` |
| `--shadow-lg` | 大阴影（灯箱、模态） | `0 24px 80px rgba(0, 0, 0, 0.24)` |

#### 布局

| Token | 用途 | base.css 默认值 |
|-------|------|-----------------|
| `--layout-width` | 页面最大宽度 | `1120px` |
| `--layout-nav-height` | 导航栏高度 | `64px` |
| `--layout-hero` | Hero 区域最小高度 | `64vh` |
| `--layout-prose` | 正文区域最大宽度 | `760px` |
| `--card-min-width` | 卡片最小宽度 | `260px` |
| `--card-gap` | 卡片间距 | `18px` |
| `--card-direction` | 卡片排列方向 | `column` |
| `--card-padding` | 卡片内边距 | `var(--space-md)` |
| `--hero-align` | Hero 区域对齐方式 | `center` |
| `--hero-min-height` | Hero 区域最小高度 | `min(var(--layout-hero), 720px)` |
| `--post-article-width` | 文章页面宽度 | `880px` |
| `--post-article-padding` | 文章页面内边距 | `clamp(20px, 4vw, 42px)` |
| `--nav-justify` | 导航栏内容对齐 | `space-between` |
| `--layout-sidebar-width` | 侧边栏宽度 | `0` |
| `--layout-sidebar-position` | 侧边栏位置 | `right` |

#### 代码块

| Token | 用途 | base.css 默认值 |
|-------|------|-----------------|
| `--code-bg` | 代码块背景色 | `#121722` |
| `--code-border` | 代码块边框色 | `rgba(255, 255, 255, 0.08)` |
| `--code-text` | 代码块文本色 | `#eaf1ff` |
| `--code-muted` | 代码块注释/弱化色 | `#8f9ab0` |
| `--code-inline-bg` | 行内代码背景色 | `rgba(255, 255, 255, 0.06)` |
| `--code-inline-text` | 行内代码文本色 | `#f3f7ff` |
| `--code-selection` | 代码选中背景色 | `rgba(255, 255, 255, 0.1)` |
| `--code-accent-1` | 代码高亮色 1（关键字、标签） | `#8fb4ff` |
| `--code-accent-2` | 代码高亮色 2（字符串、属性） | `#9ce3c3` |
| `--code-accent-3` | 代码高亮色 3（数字、类型） | `#ffc98f` |
| `--code-line-num-color` | 行号颜色 | `var(--code-muted)` |
| `--code-line-num-bg` | 行号背景色 | `rgba(255, 255, 255, 0.04)` |
| `--code-line-num-border` | 行号边框色 | `var(--code-border)` |

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
