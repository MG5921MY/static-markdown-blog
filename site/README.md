# 工作区指南

本目录是博客的用户工作区。所有内容、配置、资源都在这里管理。

## 安全提示

- `config.yml` 中的 `email`、`repo` 等字段不应出现在公开内容中
- 不要将 API Key、Token、密码写入任何文件
- 部署操作（git push）需用户确认

## 目录结构

```
site/
├── config.yml              站点配置（名称、主题、导航、功能开关）
├── content/
│   ├── posts/              文章（按分类子目录组织）
│   │   ├── guide/          示例分类
│   │   └── themes/         示例分类
│   ├── pages/              自定义页面（Markdown 或 HTML）
│   │   ├── about.md        关于页面
│   │   └── *.html          自定义 HTML 页面
│   └── data/               数据文件
│       ├── moments.yml     瞬间（短记录）
│       ├── links.yml       友链
│       ├── gallery.yml     图库
│       └── projects.yml    项目
├── assets/                 资源文件（图片、图标等）
└── themes/custom/          自定义主题
```

---

## 1. Front-matter 完整参考

每篇文章必须以 YAML front-matter 开头，用 `---` 包裹。

### 完整字段列表

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:----:|--------|------|
| `title` | string | ✅ | — | 文章标题，显示在文章页和列表中 |
| `date` | string | ✅ | — | 发布日期，格式 `YYYY-MM-DD` |
| `category` | string | ✅ | — | 分类 ID，必须在 `config.yml` 的 `content.categories` 中定义 |
| `tags` | string[] | ❌ | `[]` | 标签数组，用于文章标签展示 |
| `summary` | string | ❌ | 自动截取 | 文章摘要。不写则自动截取正文前 `display.summaryLength` 个字符（默认 140） |
| `draft` | boolean | ❌ | `false` | 草稿标记。`true` 时构建跳过该文章 |

### 示例

```markdown
---
title: Docker 部署指南
date: 2026-07-23
category: guide
tags: [Docker, 部署, DevOps]
summary: 从零开始用 Docker 容器化部署静态博客的完整流程。
draft: false
---

# Docker 部署指南

正文内容...
```

### 写作规范

- `category` 必须是 `config.yml` 中 `content.categories` 里已定义的 ID
- `date` 格式严格为 `YYYY-MM-DD`
- `tags` 用 YAML 数组语法：`[标签1, 标签2]` 或多行列表
- 正文支持完整 Markdown 语法
- 代码块用 ` ```语言名 ` 标记（支持语法高亮）
- 数学公式用 `$$...$$`（块级）或 `$...$`（行内）
- 流程图用 ` ```mermaid ` 代码块

---

## 2. 数据文件格式

数据文件存放在 `content/data/` 目录，使用 YAML 格式。

### 2.1 moments.yml — 瞬间

短记录/想法，类似微博时间线。

```yaml
moments:
  - date: 2026-06-29            # 日期（YYYY-MM-DD）
    mood: "Ship"                # 心情/类型标签（自由定义）
    content: |                  # 内容（支持多行）
      5 个内置主题全部支持亮暗切换，导航栏新增语言切换按钮。
    tags: [theme, i18n]         # 标签
  - date: 2026-06-20
    mood: "Note"
    content: |
      图库功能上线，支持目录扫描、文件夹导航和灯箱查看器。
    tags: [gallery, feature]
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `date` | string | ✅ | 日期 |
| `mood` | string | ❌ | 心情/类型标签 |
| `content` | string | ✅ | 内容文本 |
| `tags` | string[] | ❌ | 标签 |

### 2.2 links.yml — 友链

收藏的参考资源与工具链接，支持分组。

```yaml
groups:                         # 分组定义
  - id: references              # 分组 ID（链接引用）
    name: 设计参考               # 分组显示名称
    icon: "Ref"                 # 分组图标
  - id: reading
    name: 长期阅读
    icon: "Read"
  - id: tools
    name: 常用工具
    icon: "Tool"

links:                          # 链接列表
  - name: UI Patterns           # 链接名称
    url: https://ui-patterns.com/  # URL
    description: 交互模式、信息层级和常见流程的参考入口。  # 描述
    icon: "UI"                  # 图标（短文本）
    label: 模式                  # 标签
    group: references           # 所属分组 ID
  - name: MDN Web Docs
    url: https://developer.mozilla.org/
    description: Web 技术参考，HTML/CSS/JS 标准文档。
    icon: "MD"
    label: 文档
    group: tools
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `name` | string | ✅ | 链接名称 |
| `url` | string | ✅ | 链接地址 |
| `description` | string | ❌ | 描述文本 |
| `icon` | string | ❌ | 图标短文本 |
| `label` | string | ❌ | 标签文字 |
| `group` | string | ❌ | 所属分组 ID（对应 `groups` 中的 `id`） |

### 2.3 gallery.yml — 图库

图片资源管理，支持目录扫描和分组。

```yaml
settings:                       # 全局设置
  maxDepth: 2                   # 最大扫描深度
  formats: [jpg, jpeg, png, gif, webp, svg]  # 支持的图片格式

groups:                         # 图片分组
  - id: identity                # 分组 ID
    name: 品牌资产               # 分组名称
    icon: "ID"                  # 图标
    path: assets/gallery/identity  # 图片目录路径（相对于 site/）
    maxDepth: 1                 # 该分组的扫描深度（覆盖全局）
  - id: posters
    name: 视觉基线
    icon: "DS"
    path: assets/gallery/posters
    maxDepth: 1
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `settings.maxDepth` | number | ❌ | 全局最大目录扫描深度 |
| `settings.formats` | string[] | ❌ | 支持的图片文件扩展名 |
| `groups[].id` | string | ✅ | 分组 ID |
| `groups[].name` | string | ✅ | 分组显示名称 |
| `groups[].icon` | string | ❌ | 图标 |
| `groups[].path` | string | ✅ | 图片目录路径（相对于 `site/`） |
| `groups[].maxDepth` | number | ❌ | 该分组的扫描深度（覆盖全局设置） |

### 2.4 projects.yml — 项目

项目展示数据，用于作品集页面。

```yaml
projects:
  - name: Static Markdown Blog  # 项目名称
    status: active              # 状态：active / archived / planned
    tech: [Node.js, CSS, Markdown]  # 技术栈
    description: 零依赖、Token 驱动主题的静态博客平台。  # 描述
    link: https://github.com    # 项目链接（留空则不显示）
  - name: Desktop Pet
    status: archived
    tech: [Electron, CSS, Animation]
    description: 桌面宠物应用，支持自定义模型。
    link: ""
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `name` | string | ✅ | 项目名称 |
| `status` | string | ❌ | 状态：`active` / `archived` / `planned` |
| `tech` | string[] | ❌ | 技术栈标签 |
| `description` | string | ✅ | 项目描述 |
| `link` | string | ❌ | 项目链接 URL（留空不显示） |

---

## 3. config.yml 完整参考

### 3.1 site — 站点信息

```yaml
site:
  name: Mijiao Notes            # 站点名称（显示在导航栏和页脚）
  alias: 静态 Markdown 博客      # 副标题（显示在 Hero 区域）
  description: Markdown first, theme driven, base-path agnostic static blog.
  author: MijiaoGame             # 作者名称
  email: ""                      # 联系邮箱（留空则不显示）
  favicon: assets/favicon.svg    # 网站图标路径（相对于 site/）
  logo: ""                       # Logo 图片路径（留空则显示文字）
```

| 字段 | 说明 |
|------|------|
| `name` | 站点名称，显示在导航栏 Logo 和页脚 |
| `alias` | 副标题，显示在首页 Hero 区域 |
| `description` | 站点描述，用于 SEO meta 标签和 RSS |
| `author` | 作者名称 |
| `email` | 联系邮箱，留空则不在页面上显示 |
| `favicon` | 网站图标路径（支持 SVG/PNG/ICO） |
| `logo` | Logo 图片路径，留空则用 `name` 文字代替 |

### 3.2 deployment — 部署配置

```yaml
deployment:
  basePath: auto                 # 子路径：auto = 自动检测，或手动指定如 /blog/
  siteUrl: ""                    # 完整站点 URL（用于 RSS/sitemap），如 https://example.com
```

| 字段 | 说明 |
|------|------|
| `basePath` | 部署子路径。`auto` 自动检测；手动指定如 `/blog/`（必须以 `/` 开头和结尾） |
| `siteUrl` | 完整站点 URL，用于生成 RSS feed 和 sitemap.xml 中的绝对链接 |

### 3.3 seo — SEO 配置

```yaml
seo:
  allowIndex: true               # true = 允许搜索引擎收录；false = 禁止收录
```

| 值 | 行为 |
|----|------|
| `true` | 生成 `robots.txt` 允许爬虫，生成 `sitemap.xml` |
| `false` | 生成 `robots.txt` 禁止爬虫，不生成 `sitemap.xml` |

### 3.4 theme — 主题

```yaml
theme:
  active: graphite               # 主题 ID
```

可选值：`graphite` / `aurora` / `paper` / `mono` / `terminal`

自定义主题：使用 `custom/<theme-id>` 格式，详见下方"自定义主题"章节。

### 3.5 content.categories — 内容分类

```yaml
content:
  categories:
    - id: guide                  # 分类 ID（文章 front-matter 引用）
      name: 快速开始              # 显示名称
      icon: "->"                 # 图标（短文本）
      path: content/posts/guide  # Markdown 文件目录（相对于 site/）
      type: flat                 # flat = 平铺列表，tree = 目录树导航
      description: 新结构上手与部署入口。  # 分类描述
```

| 字段 | 说明 |
|------|------|
| `id` | 分类唯一标识，文章 `category` 字段引用此 ID |
| `name` | 分类显示名称 |
| `icon` | 图标文本（如 `->`、`*`、`+`） |
| `path` | 文章目录路径（相对于 `site/`） |
| `type` | `flat` = 平铺列表；`tree` = 按目录结构生成树形导航 |
| `description` | 分类描述文字 |

### 3.6 content.pages — 自定义页面

```yaml
content:
  pages:
    - id: about                  # 页面 ID（导航栏和 URL 引用）
      name: 关于                 # 显示名称
      icon: "i"                  # 图标
      type: markdown             # 页面类型
      source: content/pages/about.md  # 源文件路径

    - id: skills
      name: 技能矩阵
      icon: "+"
      type: custom               # 自定义 HTML 页面
      source: content/pages/skills.html
      scripts: true              # 启用 JS 执行

    - id: portfolio
      name: 作品集
      icon: "*"
      type: custom
      source: content/pages/portfolio.html
      data:                      # 数据文件（构建时嵌入为 JSON）
        projects: content/data/projects.yml
      scripts: true

    - id: playground
      name: 工具箱
      icon: ">"
      type: custom
      source: content/pages/playground.html
      standalone: true           # 独立模式：隐藏平台导航栏/页脚
      scripts: true
```

| 字段 | 说明 |
|------|------|
| `id` | 页面唯一标识，用于导航和 URL 参数 `?id=<page-id>` |
| `name` | 显示名称 |
| `icon` | 图标文本 |
| `type` | `markdown` = Markdown 渲染；`custom` = 自定义 HTML；`category` = 分类文章列表 |
| `source` | 源文件路径（相对于 `site/`） |
| `scripts` | `true` = 允许页面中的 JS 执行（仅 `custom` 类型） |
| `standalone` | `true` = 独立模式，隐藏平台导航栏和页脚 |
| `data` | 数据文件映射（key-value），构建时嵌入为页面内 JSON |

### 3.7 content.data — 功能数据文件

```yaml
content:
  data:
    moments: content/data/moments.yml    # 瞬间数据
    links: content/data/links.yml        # 友链数据
    gallery: content/data/gallery.yml    # 图库数据
```

### 3.8 nav — 导航栏

```yaml
nav:
  - name: 首页                   # 显示名称
    page: index                  # 引用页面 ID（index = 首页）
  - name: 关于
    page: about                  # 引用 content.pages 中的 ID
  - name: 瞬间
    url: ./moments.html          # 直接指定 URL
```

支持两种引用方式：

| 方式 | 说明 | 示例 |
|------|------|------|
| `page: <page-id>` | 引用 `content.pages` 中定义的页面 | `page: about` |
| `url: <path>` | 直接指定 URL 路径 | `url: ./moments.html` |

### 3.9 navActions — 导航栏图标按钮

```yaml
navActions:
  - type: link                   # 链接按钮
    icon: "RSS"                  # 图标文本
    url: ./feed.xml              # 链接地址
    title: RSS 订阅              # 鼠标悬停提示
  - type: button                 # 交互按钮（配合 theme.js 处理事件）
    icon: "☀"                    # 图标
    title: 切换主题
```

| 字段 | 说明 |
|------|------|
| `type` | `link` = 链接跳转；`button` = 交互按钮（需 `theme.js` 处理） |
| `icon` | 图标文本 |
| `url` | 链接地址（仅 `type: link`） |
| `title` | 鼠标悬停提示文字 |

### 3.10 features — 功能模块开关

```yaml
features:
  moments:
    enabled: true                # 启用/禁用
    source: content/data/moments.yml  # 数据文件路径
    description: "记录想法与瞬间。"    # 页面描述
  links:
    enabled: true
    source: content/data/links.yml
    description: "收藏的参考资源与工具。"
  gallery:
    enabled: true
    source: content/data/gallery.yml
    description: "浏览图片资源。"
    sectionCopy: "图片资源按分组展示。"  # 图库区块描述
```

### 3.11 beian — 备案信息

中国大陆网站需要配置，默认关闭。

```yaml
beian:
  enabled: false                 # 总开关
  displayName: ""                # 显示名称
  icp:
    enabled: false               # ICP 备案开关
    number: ""                   # ICP 备案号，如 京ICP备XXXXXXXX号
    url: "https://beian.miit.gov.cn/"  # 备案查询链接
  police:
    enabled: false               # 公安备案开关
    number: ""                   # 公安备案号
    url: ""                      # 公安备案链接
    statusText: ""               # 无链接时的纯文本替代
```

### 3.12 comments — 评论系统

默认关闭，基于 GitHub Discussions 的 Giscus 评论系统。

```yaml
comments:
  enabled: false                 # 总开关
  provider: giscus               # 评论提供者
  giscus:
    repo: ""                     # GitHub 仓库，如 owner/repo
    repoId: ""                   # GitHub Discussions repo ID
    category: ""                 # Discussion 分类名
    categoryId: ""               # Discussion 分类 ID
    mapping: pathname            # 页面与 Discussion 的映射方式
    reactionsEnabled: true       # 启用表情反应
    emitMetadata: false          # 发送元数据
```

配置指南：访问 https://giscus.app/zh-CN 获取 `repoId` 和 `categoryId`。

### 3.13 display — 显示设置

```yaml
display:
  postsPerPage: 6                # 首页每页文章数
  summaryLength: 140             # 文章摘要截取长度（字符数）
  heroBadge: "Markdown First"    # Hero 区顶部徽章文字
  heroSubtitle: "少配置、强主题、可部署到任意子路径。"  # Hero 区副标题
  heroBadges:                    # Hero 区底部标签（最多 3 个）
    - "Markdown 优先"
    - "主题 token 驱动"
    - "支持任意子路径部署"
  heroLearnMorePage: about       # "了解更多"按钮指向的页面 ID
  heroActions:                   # Hero 区行动按钮
    - label: "了解项目"          # 按钮文案
      url: "./page.html?id=about"  # 链接地址
      style: primary             # primary / secondary
    - label: "查看说明"
      url: "./disclaimer.html"
      style: secondary
  latestContentCopy: "最新发布的文章。"   # 最新内容区块描述
  siteInfoCopy: "站点的基本信息与联系方式。"  # 站点信息区块描述
  showSiteInfo: true             # 是否显示站点信息区
  siteType: 静态博客              # 站点类型标签
  contentDirection: Markdown / Themes / Notes  # 内容方向标签
  codeWrap: false                # false = 代码块横向滚动，true = 代码块自动换行
```

#### hero — 沉浸式首页

```yaml
display:
  hero:
    immersive: false             # 沉浸式首页模式
    background:
      enabled: false             # 启用背景图片
      image: ""                  # 背景图片路径（相对于 site/）
      focalPoint: "center center"  # 焦点位置
      fit: "cover"               # 图片适配：cover / contain
      dimming: 0.42              # 暗化程度（0-1）
      blur: 0                    # 模糊程度（px）
```

### 3.14 disclaimer — 免责声明

```yaml
disclaimer:
  subtitle: ""                   # 副标题（留空使用默认值）
  items: []                      # 条款列表（留空使用默认示例）
```

### 3.15 error404 — 404 页面

```yaml
error404:
  actions:                       # 操作按钮数组
    - label: "返回首页"          # 按钮文案
      url: "./index.html"        # 链接地址
      style: primary             # primary / secondary
    - label: "关于本站"
      url: "./page.html?id=about"
      style: secondary
```

---

## 4. 主题切换

修改 `config.yml` 的 `theme.active` 字段即可切换主题：

```yaml
theme:
  active: graphite
```

### 内置主题列表

| 主题 ID | 名称 | 风格描述 |
|---------|------|----------|
| `graphite` | Graphite | 工业蓝图风格，受 Linear 和 Vercel 启发。细线 + 刻度尺 + 参考线，sans + mono 混排 |
| `aurora` | Aurora | 品牌展示风格，受 Stripe 启发。渐变色彩、现代商业感 |
| `paper` | Paper | 阅读优先风格，受 Notion 和 Claude 启发。纸质质感、舒适阅读 |
| `mono` | Mono | 紧凑单色开发者风格，受 Vercel 启发。极简黑白、高密度信息 |
| `terminal` | Terminal | 黑客终端风格，受 DiskScope 和经典 CRT 显示器启发。霓虹绿 + 暗底 + 扫描线 |

所有主题均支持亮色/暗色自动切换。

---

## 5. 创建自定义主题

### 5.1 目录结构

将自定义主题放在 `site/themes/custom/<theme-id>/` 下：

```
site/themes/custom/<theme-id>/
├── theme.yml       ← 元数据（必须）
├── theme.css       ← 样式（必须，必须 @import "../base.css"）
├── theme.js        ← 可选
├── fonts/          ← 可选
└── templates/      ← 可选
```

### 5.2 命名规则

- `theme-id` 只能包含小写字母、数字和连字符（如 `my-theme`）
- 不能以数字开头
- 不能与内置主题 ID 重复

### 5.3 theme.yml 完整字段

```yaml
name: 主题名                     # 主题显示名称（必须）
version: 1.0.0                   # 版本号（必须）
author: 作者名                   # 作者（必须）
description: 描述                # 主题描述（必须）
references:                      # 设计参考（可选）
  - reference-site.com
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `name` | string | ✅ | 主题显示名称 |
| `version` | string | ✅ | 语义版本号 |
| `author` | string | ✅ | 作者名称 |
| `description` | string | ✅ | 主题描述 |
| `references` | string[] | ❌ | 设计参考链接 |

### 5.4 theme.css 结构

必须以 `@import "../base.css";` 开头，继承基础样式。通过 CSS 自定义属性（Token）控制视觉表现，只需覆盖需要修改的 Token，未覆盖的继承 `base.css` 默认值。

#### 基本结构

```css
@import "../base.css";

/* 暗色（默认） */
:root {
  --bg-primary: #0b0d12;
  --bg-secondary: #11141b;
  --text-primary: #f5f7fb;
  --accent: #6f7cff;
  /* 更多 token... */
}

/* 亮色 */
[data-color-scheme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --text-primary: #1a1a1a;
  /* 更多 token... */
}

/* 跟随系统 */
@media (prefers-color-scheme: light) {
  [data-color-scheme="auto"] {
    /* 亮色 token */
  }
}
```

#### 说明

- `:root` — 暗色模式下的 Token 值，也是默认值
- `[data-color-scheme="light"]` — 用户手动切换到亮色时的覆盖值
- `@media (prefers-color-scheme: light)` + `[data-color-scheme="auto"]` — 跟随系统偏好时的亮色覆盖

### 5.5 常用 Token 列表

所有 Token 均定义在 `base.css` 中，自定义主题只需覆盖需要修改的。

#### 颜色

| Token | 用途 | 示例值 |
|-------|------|--------|
| `--bg-primary` | 主背景色 | `#0b0d12` / `#ffffff` |
| `--bg-secondary` | 次级背景色 | `#11141b` / `#f8f9fa` |
| `--bg-elevated` | 悬浮/卡片背景 | `#1a1d27` / `#ffffff` |
| `--text-primary` | 主文本色 | `#f5f7fb` / `#1a1a1a` |
| `--text-secondary` | 次要文本色 | `#a0a6b8` / `#6b7280` |
| `--text-muted` | 弱化文本色 | `#5a6178` / `#9ca3af` |
| `--border` | 边框色 | `#23273a` / `#e5e7eb` |
| `--accent` | 强调色 | `#6f7cff` / `#3b82f6` |
| `--accent-soft` | 弱化强调色背景 | `rgba(111,124,255,0.12)` |
| `--accent-strong` | 强化强调色 | `#8b96ff` |
| `--brand-start` | 品牌渐变起始色 | `#6f7cff` |
| `--brand-end` | 品牌渐变终止色 | `#8c95ff` |
| `--brand-shadow` | 品牌阴影色 | `rgba(111,124,255,0.18)` |

#### 排版

| Token | 用途 | 示例值 |
|-------|------|--------|
| `--font-display` | 标题字体 | `"Inter", sans-serif` |
| `--font-body` | 正文字体 | `"Inter", sans-serif` |
| `--font-mono` | 等宽字体 | `"JetBrains Mono", monospace` |

#### 字号阶梯

| Token | 用途 | 默认值 |
|-------|------|--------|
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

| Token | 用途 | 默认值 |
|-------|------|--------|
| `--space-xxs` | 极小间距 | `4px` |
| `--space-xs` | 超小间距 | `6px` |
| `--space-sm` | 小间距 | `12px` |
| `--space-md` | 中间距 | `20px` |
| `--space-lg` | 大间距 | `32px` |
| `--space-xl` | 超大间距 | `56px` |
| `--layout-gutter` | 布局排水槽（响应式） | `clamp(16px, 4vw, 40px)` |
| `--layout-moments` | 瞬间页面最大宽度 | `860px` |

#### 圆角

| Token | 用途 | 默认值 |
|-------|------|--------|
| `--radius-sm` | 小圆角 | `4px` |
| `--radius-md` | 中圆角 | `8px` |
| `--radius-lg` | 大圆角 | `12px` |
| `--radius-xl` | 极大圆角 | `16px` |
| `--radius-full` | 胶囊/圆形圆角 | `999px` |
| `--card-radius` | 卡片圆角 | `0` |
| `--btn-radius` | 按钮圆角 | `0` |
| `--tag-radius` | 标签圆角 | `0` |

#### 布局

| Token | 用途 | 默认值 |
|-------|------|--------|
| `--layout-width` | 内容最大宽度 | `1080px` |
| `--layout-nav-height` | 导航栏高度 | `56px` |
| `--layout-hero` | Hero 区高度 | `420px` |
| `--layout-prose` | 正文最大宽度 | `720px` |
| `--card-min-width` | 卡片最小宽度 | `260px` |
| `--card-gap` | 卡片间距 | `18px` |
| `--card-direction` | 卡片排列方向 | `column` |
| `--hero-align` | Hero 区域对齐方式 | `center` |
| `--hero-min-height` | Hero 区域最小高度 | `min(var(--layout-hero), 720px)` |
| `--post-article-width` | 文章页面宽度 | `880px` |
| `--post-article-padding` | 文章页面内边距 | `clamp(20px, 4vw, 42px)` |
| `--nav-justify` | 导航栏内容对齐 | `space-between` |
| `--layout-sidebar-width` | 侧边栏宽度 | `0` |
| `--layout-sidebar-position` | 侧边栏位置 | `right` |

#### 代码

| Token | 用途 | 示例值 |
|-------|------|--------|
| `--code-bg` | 代码块背景 | `#161822` / `#f6f8fa` |
| `--code-text` | 代码文本色 | `#e6e8f0` / `#24292f` |
| `--code-muted` | 代码注释/弱色 | `#5a6178` / `#6a737d` |
| `--code-accent-1` | 代码高亮色 1 | `#7c8aff` |
| `--code-accent-2` | 代码高亮色 2 | `#ff6b8a` |
| `--code-accent-3` | 代码高亮色 3 | `#4ecdc4` |

### 5.6 theme.js 生命周期

`theme.js` 用于添加自定义交互逻辑，通过 `Blog` 全局对象的生命周期钩子实现：

```js
Blog.onInit = function () {
  // 初始化：页面首次加载时调用一次
  // 适合绑定全局事件、初始化状态
};

Blog.onPageLoad = function () {
  // 页面加载后：每次页面内容更新后调用
  // 适合操作 DOM、初始化页面级组件
};

Blog.onThemeChange = function (newThemeId) {
  // 主题切换：用户切换主题时调用
  // newThemeId 为切换后的主题 ID
  // 适合更新需要与主题联动的自定义组件
};
```

### 5.7 最小示例

最快的自定义主题只需两个文件：

**theme.yml**

```yaml
name: My Accent
version: 1.0.0
author: YourName
description: 修改强调色的最小主题。
```

**theme.css**

```css
@import "../base.css";

:root {
  --accent: #e74c3c;
  --accent-soft: rgba(231, 76, 60, 0.16);
}
```

这个示例只覆盖了强调色，其余所有样式继承 `base.css` 默认值。

### 5.8 启用自定义主题

在 `config.yml` 中使用 `custom/<theme-id>` 格式：

```yaml
theme:
  active: custom/my-theme        # 使用 custom/<theme-id> 格式
```

### 5.9 完整开发流程

1. 在 `site/themes/custom/` 下创建主题目录
2. 创建 `theme.yml` 填写元数据
3. 创建 `theme.css`，先 `@import "../base.css"`，再按需覆盖 Token
4. （可选）创建 `theme.js` 添加交互逻辑
5. （可选）将自定义字体放入 `fonts/` 目录
6. 修改 `config.yml` 的 `theme.active` 为 `custom/<theme-id>`
7. 运行 `node build.js` 构建
8. 运行 `node serve.js` 预览效果
9. 亮/暗模式均需测试：切换 `data-color-scheme` 属性验证两种配色

---

## 6. 导航配置

### nav — 导航链接

在 `config.yml` 的 `nav` 数组中添加/删除/排序导航项：

```yaml
nav:
  - name: 首页
    page: index                  # 内置首页
  - name: 关于
    page: about                  # 引用 content.pages 中的 ID
  - name: 技能
    page: skills
  - name: 瞬间
    url: ./moments.html          # 直接指定 URL（功能页面）
  - name: 参考
    url: ./links.html
  - name: 图库
    url: ./gallery.html
```

**两种引用方式：**

- `page: <page-id>` — 引用 `content.pages` 中定义的页面，构建时自动解析 URL
- `url: <path>` — 直接指定 URL 路径，适用于功能页面（moments/links/gallery）

### navActions — 右侧图标按钮

```yaml
navActions:
  - type: link
    icon: "RSS"
    url: ./feed.xml
    title: RSS 订阅
  - type: link
    icon: "GH"
    url: https://github.com
    title: GitHub
```

---

## 7. 功能开关

三个功能模块（瞬间、友链、图库）可通过 `features` 配置独立启用/禁用：

```yaml
features:
  moments:
    enabled: true                # true = 启用，false = 禁用
    source: content/data/moments.yml
    description: "记录想法与瞬间。"
  links:
    enabled: true
    source: content/data/links.yml
    description: "收藏的参考资源与工具。"
  gallery:
    enabled: true
    source: content/data/gallery.yml
    description: "浏览图片资源。"
    sectionCopy: "图片资源按分组展示。"
```

**禁用某个功能：** 将 `enabled` 设为 `false`，该功能页面将不会生成。

```yaml
features:
  gallery:
    enabled: false               # 禁用图库
```

禁用后仍保留数据文件，重新启用只需改回 `true`。

---

## 8. 构建与部署

### 构建命令

```bash
node build.js                    # 全量构建到 dist/
node build.js --incremental      # 增量构建（跳过未变化文件）
node build.js --include-drafts   # 包含草稿文章
```

### 本地预览

```bash
node serve.js                    # 启动开发服务器 http://localhost:8080
node serve.js 3000               # 指定端口
```

### 运行测试

```bash
node test.js
```

### 部署方式

| 方式 | 命令 | 说明 |
|------|------|------|
| GitHub Pages | `git push` | 推送到 GitHub，自动构建部署 |
| Docker | `cd deploy/docker && docker compose up -d --build` | 容器化部署 |
| 静态托管 | 上传 `dist/` 目录 | Vercel / Netlify / Cloudflare Pages / Nginx |
| 本地预览 | `node serve.js` | 仅本地查看 |

### 安全规则

- 不将 `config.yml` 中的 `email`、`repo`、`repoId` 等敏感信息泄露到输出中
- 不将 API Key、Token 写入任何文件
- 不自动执行 `git push`、`docker compose up` 等部署操作，必须等用户确认

---

## 常见任务速查

| 任务 | 操作 |
|------|------|
| 写新文章 | 在 `content/posts/<分类>/` 下创建 `.md` 文件 |
| 改站点名 | 编辑 `config.yml` 的 `site.name` |
| 换主题 | 编辑 `config.yml` 的 `theme.active` |
| 加导航项 | 编辑 `config.yml` 的 `nav` 数组 |
| 开关功能 | 编辑 `config.yml` 的 `features.*.enabled` |
| 添加友链 | 编辑 `content/data/links.yml` |
| 添加瞬间 | 编辑 `content/data/moments.yml` |
| 添加图片 | 将图片放入对应目录，编辑 `content/data/gallery.yml` |
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
