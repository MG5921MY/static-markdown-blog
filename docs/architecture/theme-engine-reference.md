# 主题引擎开发者参考

本文档是主题系统的完整开发者参考手册。适用于内置主题作者和自定义主题开发者。

---

## 目录

1. [主题目录结构](#1-主题目录结构)
2. [Token 参考（完整列表）](#2-token-参考完整列表)
3. [可覆盖选择器](#3-可覆盖选择器)
4. [布局控制](#4-布局控制)
5. [字体加载](#5-字体加载)
6. [暗色模式](#6-暗色模式)
7. [主题 JS（theme.js）](#7-主题-jsthemejs)
8. [模板局部（Template Partials）](#8-模板局部template-partials)
9. [theme.yml 参考](#9-themeyml-参考)
10. [示例](#10-示例)

---

## 1. 主题目录结构

每个主题必须遵循以下目录契约：

```
themes/<theme-id>/
  theme.yml       ← 主题元数据（必须）
  theme.css       ← 样式文件，必须 @import "../base.css"（必须）
  theme.js        ← 可选：自定义交互逻辑
  fonts/          ← 可选：本地打包字体文件
  templates/      ← 可选：HTML 模板局部覆盖
```

### 工作区自定义主题

用户自定义主题存放在工作区目录，接口完全一致：

```
workspace/site/themes/<theme-id>/
  theme.yml
  theme.css
  theme.js        ← 可选
  fonts/          ← 可选
  templates/      ← 可选
```

### 构建行为

- `build.js` 自动将 `themes/*/fonts/` 复制到 `dist/` 对应目录
- `theme.css` 必须以 `@import "../base.css";` 开头，确保继承基础样式
- `theme.js` 在博客初始化后自动加载（如果存在）
- `templates/` 中的 HTML 文件会在运行时被注入到对应位置

### 文件命名规则

- `theme-id` 只能包含小写字母、数字和连字符（如 `my-theme`）
- `theme-id` 不能以数字开头
- `theme-id` 不能与已有内置主题重复

---

## 2. Token 参考（完整列表）

所有主题通过 CSS 自定义属性（Token）控制视觉表现。主题只需覆盖需要修改的 Token，未覆盖的 Token 会继承 `base.css` 的默认值。

### 2.1 颜色 Token

| Token | 说明 | 默认值 |
|-------|------|--------|
| `--bg-primary` | 主背景色 | `#0b0d12` |
| `--bg-secondary` | 次级背景色（卡片、面板） | `#11141b` |
| `--bg-elevated` | 提升层背景色（悬浮、弹窗） | `#161b24` |
| `--text-primary` | 主文本色 | `#f5f7fb` |
| `--text-secondary` | 次级文本色 | `#b7c0cf` |
| `--text-muted` | 弱化文本色（标签、辅助信息） | `#7f8794` |
| `--border` | 边框色 | `rgba(255,255,255,0.08)` |
| `--accent` | 强调色（按钮、链接、高亮） | `#6f7cff` |
| `--accent-soft` | 弱化强调色（背景点缀） | `rgba(111,124,255,0.16)` |
| `--accent-strong` | 增强强调色（hover 状态） | `#8c95ff` |
| `--brand-start` | 品牌渐变起始色 | `#6f7cff` |
| `--brand-end` | 品牌渐变终止色 | `#8c95ff` |
| `--brand-shadow` | 品牌阴影色 | `rgba(111,124,255,0.18)` |

> **提示**：`--border-strong` 是部分主题（如 graphite）使用的扩展 Token，用于强调边框。base.css 未定义此 Token，主题可按需自行添加。

### 2.2 排版 Token

#### 字体栈

| Token | 说明 | 默认值 |
|-------|------|--------|
| `--font-display` | 标题字体栈 | `"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif` |
| `--font-body` | 正文字体栈 | `"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif` |
| `--font-mono` | 等宽字体栈 | `Consolas,"SFMono-Regular","JetBrains Mono",monospace` |

#### 字号阶梯（Typography Scale）

| Token | 说明 | 默认值 |
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

### 2.3 间距 Token

| Token | 说明 | 默认值 |
|-------|------|--------|
| `--space-xxs` | 极小间距 | `4px` |
| `--space-xs` | 超小间距 | `6px` |
| `--space-sm` | 小间距 | `12px` |
| `--space-md` | 中间距 | `20px` |
| `--space-lg` | 大间距 | `32px` |
| `--space-xl` | 超大间距 | `56px` |
| `--layout-gutter` | 布局排水槽（响应式） | `clamp(16px, 4vw, 40px)` |
| `--layout-moments` | 瞬间页面最大宽度 | `860px` |

### 2.4 圆角 Token

| Token | 说明 | 默认值 |
|-------|------|--------|
| `--radius-sm` | 小圆角 | `4px` |
| `--radius-md` | 中圆角 | `8px` |
| `--radius-lg` | 大圆角 | `12px` |
| `--radius-xl` | 超大圆角 | `18px` |
| `--radius-full` | 胶囊/圆形圆角 | `999px` |
| `--card-radius` | 卡片圆角 | `0` |
| `--btn-radius` | 按钮圆角 | `0` |
| `--tag-radius` | 标签圆角 | `0` |

### 2.5 阴影 Token

| Token | 说明 | 默认值 |
|-------|------|--------|
| `--shadow-sm` | 小阴影（卡片默认） | `0 10px 30px rgba(0,0,0,0.12)` |
| `--shadow-md` | 中阴影（悬浮卡片） | `0 18px 50px rgba(0,0,0,0.18)` |
| `--shadow-lg` | 大阴影（弹窗、浮层） | `0 24px 80px rgba(0,0,0,0.24)` |

### 2.6 布局 Token

| Token | 说明 | 默认值 |
|-------|------|--------|
| `--layout-width` | 页面最大宽度 | `1120px` |
| `--layout-nav-height` | 导航栏高度 | `64px` |
| `--layout-hero` | 首页 Hero 区域最小高度 | `64vh` |
| `--layout-prose` | 正文区域最大宽度 | `760px` |

### 2.7 布局扩展 Token

这些 Token 由主题自行定义（base.css 未内置），用于更精细的布局控制：

| Token | 说明 | 建议默认值 |
|-------|------|-----------|
| `--card-columns` | 卡片网格列数（auto-fit 时为自动） | `auto` |
| `--card-min-width` | 卡片最小宽度 | `260px` |
| `--card-gap` | 卡片间距 | `18px` |
| `--card-direction` | 卡片排列方向（`row` 变为列表） | `column` |
| `--card-padding` | 卡片内边距 | `20px` |
| `--card-radius` | 卡片圆角 | `0` |
| `--hero-align` | Hero 区域对齐方式 | `center` |
| `--hero-min-height` | Hero 区域最小高度 | `min(var(--layout-hero), 720px)` |
| `--post-article-width` | 文章页面宽度 | `880px` |
| `--post-article-padding` | 文章页面内边距 | `clamp(20px, 4vw, 42px)` |
| `--nav-justify` | 导航栏内容对齐 | `space-between` |
| `--layout-sidebar-width` | 侧边栏宽度 | `0`（无侧边栏） |
| `--layout-sidebar-position` | 侧边栏位置（`left` / `right`） | `right` |

### 2.8 代码块 Token

| Token | 说明 | 默认值 |
|-------|------|--------|
| `--code-bg` | 代码块背景色 | `#121722` |
| `--code-border` | 代码块边框色 | `rgba(255,255,255,0.08)` |
| `--code-text` | 代码块文本色 | `#eaf1ff` |
| `--code-muted` | 代码块弱化文本色（注释） | `#8f9ab0` |
| `--code-inline-bg` | 行内代码背景色 | `rgba(255,255,255,0.06)` |
| `--code-inline-text` | 行内代码文本色 | `#f3f7ff` |
| `--code-selection` | 代码块选区背景色 | `rgba(255,255,255,0.1)` |
| `--code-accent-1` | 代码高亮色 1（关键字、标签） | `#8fb4ff` |
| `--code-accent-2` | 代码高亮色 2（字符串、属性） | `#9ce3c3` |
| `--code-accent-3` | 代码高亮色 3（数字、类型） | `#ffc98f` |
| `--code-line-num-color` | 行号文本色 | `var(--code-muted)` |
| `--code-line-num-bg` | 行号背景色 | `color-mix(var(--code-bg) 85%, var(--code-text))` |
| `--code-line-num-border` | 行号分隔线色 | `var(--code-border)` |

---

## 3. 可覆盖选择器

主题可以通过 CSS 选择器覆盖以下组件的样式。所有选择器均定义在 `base.css` 中，主题可以直接重新定义这些规则。

### 3.1 导航栏

| 选择器 | 说明 |
|--------|------|
| `.nav` | 导航栏容器（sticky 定位、背景模糊） |
| `.nav-brand` | 品牌标识区域（Logo + 站名） |
| `.nav-links` | 导航链接列表 |
| `.nav-link` | 单个导航链接 |
| `.nav-link.active` | 当前页面对应的导航链接 |
| `.nav-logo` | Logo 图标 |
| `.nav-toggle` | 移动端菜单按钮 |
| `.nav-overlay` | 移动端菜单遮罩层 |
| `.theme-toggle-btn` | 主题切换按钮 |

### 3.2 Hero 区域

| 选择器 | 说明 |
|--------|------|
| `.hero` | Hero 容器 |
| `.hero-content` | Hero 内容区域 |
| `.hero-title` | Hero 标题 |
| `.hero-subtitle` | Hero 副标题 |
| `.hero-copy` | Hero 描述文本 |
| `.hero-actions` | Hero 操作按钮组 |
| `.hero-meta` | Hero 元信息（日期、分类等） |
| `.hero-kicker` | Hero 标签/徽章 |
| `.hero-rule` | Hero 分隔线 |
| `.hero-media` | Hero 背景媒体 |
| `.hero-scroll-cue` | Hero 滚动提示 |
| `.home-hero` | 首页 Hero 容器 |
| `.home-hero.has-hero-image` | 有背景图的首页 Hero |
| `.hero.hero-compact` | 紧凑型 Hero（非首页） |

### 3.3 文章卡片与列表

| 选择器 | 说明 |
|--------|------|
| `.posts-grid` | 文章卡片网格容器 |
| `.post-card` | 文章卡片 |
| `.post-card-title` | 卡片标题 |
| `.post-card-header` | 卡片头部（标题 + 元信息） |
| `.post-summary` | 卡片摘要文本 |
| `.post-meta` | 文章元信息（日期、分类） |
| `.post-date` | 发布日期 |
| `.post-category` | 分类标签 |
| `.post-tags` | 标签列表容器 |
| `.post-tag` | 单个标签 |
| `.post-link` | 文章链接 |

### 3.4 文章详情页

| 选择器 | 说明 |
|--------|------|
| `.post-article` | 文章容器 |
| `.post-header` | 文章头部 |
| `.post-title` | 文章标题 |
| `.post-body` | 文章正文 |
| `.markdown-body` | Markdown 渲染内容 |
| `.post-nav` | 上下篇导航容器 |
| `.post-nav-link` | 上下篇链接 |
| `.post-nav-label` | 上下篇标签 |
| `.post-nav-title` | 上下篇标题 |
| `.back-link` | 返回链接 |

### 3.5 页脚

| 选择器 | 说明 |
|--------|------|
| `.footer` | 页脚容器 |
| `.footer-content` | 页脚内容区域 |
| `.footer-links` | 页脚链接列表 |
| `.footer-link` | 单个页脚链接 |
| `.footer-info` | 页脚信息文本 |

### 3.6 区块与面板

| 选择器 | 说明 |
|--------|------|
| `.section` | 内容区块容器 |
| `.section-surface` | 区块表面（带边框和背景） |
| `.section-header` | 区块头部（标题 + 操作区） |
| `.section-title` | 区块标题（带 § 序号） |
| `.section-copy` | 区块描述文本 |
| `.container` | 通用内容容器 |

### 3.7 按钮与交互

| 选择器 | 说明 |
|--------|------|
| `.btn` | 通用按钮 |
| `.btn-primary` | 主要按钮 |
| `.btn-secondary` | 次要按钮 |
| `.filter-btn` | 分类筛选按钮 |
| `.filter-btn.active` | 选中的筛选按钮 |
| `.page-btn` | 分页按钮 |
| `.page-btn.active` | 当前页码按钮 |
| `.load-more` | 加载更多按钮 |
| `.group-btn` | 分组按钮（图库） |

### 3.8 瞬间、链接与图库

| 选择器 | 说明 |
|--------|------|
| `.moment-card` | 瞬间卡片 |
| `.moment-content` | 瞬间内容 |
| `.moment-images` | 瞬间图片网格 |
| `.moment-dot` | 时间轴圆点 |
| `.moment-item` | 时间轴条目 |
| `.moments-timeline` | 时间轴容器 |
| `.link-card` | 链接卡片 |
| `.link-avatar` | 链接头像 |
| `.link-name` | 链接名称 |
| `.link-desc` | 链接描述 |
| `.link-pill` | 链接标签胶囊 |
| `.links-group` | 链接分组容器 |
| `.gallery-item` | 图库项目 |
| `.gallery-item-overlay` | 图库项目悬浮层 |
| `.gallery-grid` | 图库网格 |
| `.folder-card` | 文件夹卡片 |

### 3.9 目录与导航

| 选择器 | 说明 |
|--------|------|
| `.toc-container` | 目录容器 |
| `.toc-header` | 目录头部 |
| `.toc-list` | 目录列表 |
| `.toc-link` | 目录链接 |
| `.toc-link.active` | 当前激活的目录链接 |
| `.toc-h3` | 三级标题缩进 |
| `.back-to-top` | 返回顶部按钮 |
| `.back-to-top.visible` | 可见状态的返回顶部按钮 |
| `.reading-progress` | 阅读进度条容器 |
| `.reading-progress-bar` | 阅读进度条 |

### 3.10 其他组件

| 选择器 | 说明 |
|--------|------|
| `.search-box` | 搜索框容器 |
| `.search-input` | 搜索输入框 |
| `.loading-state` | 加载状态 |
| `.loading-spinner` | 加载动画 |
| `.empty-state` | 空状态 |
| `.error-state` | 错误状态 |
| `.error-page` | 错误页面 |
| `.error-code` | 错误代码 |
| `.disclaimer-item` | 免责声明条目 |
| `.info-item` | 站点信息条目 |
| `.lightbox` | 灯箱（图片查看器） |
| `.animate-in` | 入场动画类 |
| `mark` | 文本高亮标记 |

---

## 4. 布局控制

通过设置布局扩展 Token，主题可以在不修改 HTML 结构的情况下改变页面布局。

### 4.1 添加侧边栏

```css
:root {
  --layout-sidebar-width: 280px;
  --layout-sidebar-position: right;  /* left 或 right */
}
```

> 注意：侧边栏功能需要 JS 支持。当 `--layout-sidebar-width` 不为 `0` 时，主题 JS 应在对应位置插入侧边栏 DOM。

### 4.2 改变卡片网格列数

```css
:root {
  --card-columns: 2;  /* 固定 2 列 */
}

/* 应用到网格容器 */
.posts-grid {
  grid-template-columns: repeat(var(--card-columns, auto-fit), minmax(min(100%, var(--card-min-width, 260px)), 1fr));
  gap: var(--card-gap, 18px);
}
```

### 4.3 卡片变为列表布局

```css
:root {
  --card-direction: row;
}

.post-card {
  flex-direction: var(--card-direction, column);
}
```

### 4.4 Hero 区域对齐

```css
:root {
  --hero-align: left;  /* left | center | right */
}

.hero {
  text-align: var(--hero-align, left);
  justify-items: var(--hero-align, start);
}
```

### 4.5 文章页面宽度

```css
:root {
  --post-article-width: 1200px;
}

.post-article {
  width: min(100%, var(--post-article-width, 880px));
}
```

### 4.6 导航栏居中

```css
:root {
  --nav-justify: center;
}

.nav {
  justify-content: var(--nav-justify, space-between);
}
```

### 4.7 完整布局 Token 应用示例

```css
:root {
  --layout-width: 1400px;
  --layout-sidebar-width: 300px;
  --layout-sidebar-position: left;
  --card-columns: 3;
  --card-gap: 24px;
  --hero-align: center;
  --post-article-width: 1000px;
  --nav-justify: center;
}
```

---

## 5. 字体加载

主题通过 `--font-display`、`--font-body`、`--font-mono` 三个 Token 控制字体。`base.css` 提供系统字体栈作为默认值，主题可覆盖为自定义字体。

### 5.1 加载方式

#### 方式 1：Google Fonts（适合快速原型）

```css
@import "../base.css";
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --font-display: 'Inter', 'Segoe UI', 'PingFang SC', sans-serif;
  --font-body: 'Inter', 'Segoe UI', 'PingFang SC', sans-serif;
  --font-mono: 'JetBrains Mono', 'Consolas', monospace;
}
```

#### 方式 2：本地打包字体（适合生产部署、离线环境）

将字体文件放入主题目录的 `fonts/` 子目录：

```
themes/my-theme/
  theme.yml
  theme.css
  fonts/
    inter-latin.woff2
    inter-latin-ext.woff2
    jetbrains-mono-latin.woff2
```

在 `theme.css` 中通过 `@font-face` 引用：

```css
@import "../base.css";

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url('./fonts/inter-latin.woff2') format('woff2');
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 400 500;
  font-display: swap;
  src: url('./fonts/jetbrains-mono-latin.woff2') format('woff2');
}

:root {
  --font-display: 'Inter', 'Segoe UI', 'PingFang SC', sans-serif;
  --font-body: 'Inter', 'Segoe UI', 'PingFang SC', sans-serif;
  --font-mono: 'JetBrains Mono', 'Consolas', monospace;
}
```

### 5.2 theme.yml 字体声明

主题可在 `theme.yml` 中声明字体元数据，供文档和工具链使用：

```yaml
name: My Theme
version: 1.0.0
author: Your Name
description: A custom theme.
fonts:
  - name: Inter
    source: bundled          # bundled | google | none
    weights: [400, 500, 600, 700]
  - name: JetBrains Mono
    source: google
    weights: [400, 500]
```

### 5.3 规则

- 字体加载只在主题 CSS 内部声明，不修改 `base.css`
- 回退字体栈必须覆盖中英文场景（`PingFang SC` / `Microsoft YaHei` / `Segoe UI`）
- `font-display: swap` 是必须的，避免 FOIT（字体加载阻塞渲染）
- 用户自定义主题使用完全相同的机制，无特殊路径
- 构建时 `build.js` 自动将 `themes/*/fonts/` 复制到 `dist/` 对应目录

---

## 6. 暗色模式

### 6.1 三态切换系统

博客支持三种颜色模式状态：

| 状态 | 行为 | `data-color-scheme` 值 |
|------|------|----------------------|
| `auto` | 跟随系统偏好 | `auto` |
| `light` | 强制亮色模式 | `light` |
| `dark` | 强制暗色模式 | `dark` |

切换按钮显示顺序为：`auto` → `light` → `dark` → `auto`（循环）。

### 6.2 CSS 结构要求

主题应使用 `data-color-scheme` 属性选择器来定义不同颜色模式：

```css
/* 默认暗色（大多数主题的默认模式） */
:root {
  --bg-primary: #0b0d12;
  --bg-secondary: #11141b;
  --text-primary: #f5f7fb;
  /* ... */
}

/* 亮色模式覆盖 */
[data-color-scheme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --text-primary: #1a1a1a;
  /* ... */
}

/* 跟随系统偏好（auto 状态下） */
@media (prefers-color-scheme: light) {
  [data-color-scheme="auto"] {
    --bg-primary: #ffffff;
    --bg-secondary: #f8f9fa;
    --text-primary: #1a1a1a;
    /* ... */
  }
}

@media (prefers-color-scheme: dark) {
  [data-color-scheme="auto"] {
    --bg-primary: #0b0d12;
    --bg-secondary: #11141b;
    --text-primary: #f5f7fb;
    /* ... */
  }
}
```

### 6.3 最佳实践

- 默认主题应以暗色为默认（`data-color-scheme` 未设置时的样式）
- 亮色主题（如 paper、graphite）应以亮色为默认，暗色为覆盖
- 每个颜色模式都需要完整覆盖所有颜色 Token
- 代码块 Token 通常在暗色模式下保持深色背景
- 测试时确保三种状态都正确渲染

---

## 7. 主题 JS（theme.js）

`theme.js` 是可选的 JavaScript 文件，用于添加自定义交互逻辑。它通过挂载到全局 `Blog` 对象的生命周期钩子来执行。

### 7.1 生命周期钩子

```js
// theme.js

/**
 * Blog.onInit()
 * 在博客初始化完成后调用。此时 config、index 等数据已加载完毕。
 * 适用于：初始化自定义组件、注册事件监听、设置默认状态。
 */
Blog.onInit = function () {
  // 示例：初始化自定义搜索
  console.log('Theme initialized:', Blog.config?.theme);
};

/**
 * Blog.onPageLoad()
 * 在页面内容加载完成后调用。此时 DOM 已渲染完毕。
 * 适用于：绑定 DOM 事件、初始化动画、添加交互行为。
 */
Blog.onPageLoad = function () {
  // 示例：添加阅读时间估算
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

/**
 * Blog.onThemeChange(newThemeId)
 * 在用户切换主题时调用。
 * 适用于：清理旧主题状态、重新初始化依赖主题的功能。
 */
Blog.onThemeChange = function (newThemeId) {
  console.log('Theme changed to:', newThemeId);
  // 重新初始化需要根据主题调整的功能
};
```

### 7.2 执行顺序

1. `blog.core.js` → `blog.render.js` → `blog.ui.js` → `blog.js` 加载
2. `Blog.init()` 执行
3. `Blog.loadTheme()` 加载主题 CSS 和 JS
4. `Blog.onInit()` 调用
5. 页面特定逻辑执行（`Blog.runPage()` 中的 `task`）
6. `Blog.onPageLoad()` 调用

### 7.3 可用的 Blog API

在 `theme.js` 中可以使用以下 `Blog` 对象的 API：

| API | 说明 |
|-----|------|
| `Blog.config` | 博客配置对象 |
| `Blog.index` | 文章索引数据 |
| `Blog.posts` | 文章列表 |
| `Blog.getAllPosts()` | 获取所有文章 |
| `Blog.escapeHtml(str)` | HTML 转义 |
| `Blog.resolveAsset(path)` | 解析资源路径 |
| `Blog.formatDate(dateStr)` | 格式化日期 |
| `Blog.renderPostCard(post)` | 渲染文章卡片 HTML |
| `Blog.setupCardAnimations()` | 设置卡片入场动画 |
| `Blog.setPageTitle(title)` | 设置页面标题 |
| `Blog.setNavSiteName()` | 设置导航栏站点名 |
| `Blog.renderState(el, msg)` | 渲染状态提示 |
| `Blog.t(key)` | 国际化翻译 |

---

## 8. 模板局部（Template Partials）

主题可以通过 `templates/` 目录提供自定义 HTML 模板，覆盖默认的页面片段。

### 8.1 支持的模板文件

| 文件 | 说明 | 注入位置 |
|------|------|---------|
| `templates/hero.html` | 自定义 Hero 区域 | 首页 Hero 容器内 |
| `templates/footer.html` | 自定义页脚 | 页脚容器内 |
| `templates/post-card.html` | 自定义文章卡片 | 文章列表中每张卡片 |

### 8.2 模板语法

模板使用简单的 HTML，支持 `{{变量名}}` 占位符：

**templates/hero.html**
```html
<div class="hero-content">
  <span class="hero-kicker">{{site.tagline}}</span>
  <h1 class="hero-title">{{site.name}}</h1>
  <p class="hero-subtitle">{{site.description}}</p>
  <div class="hero-actions">
    <a href="posts.html" class="btn btn-primary">阅读全文</a>
    <a href="about.html" class="btn btn-secondary">关于我</a>
  </div>
</div>
```

**templates/post-card.html**
```html
<article class="post-card" data-category="{{post.category}}">
  <div class="post-card-header">
    <span class="post-category">{{post.category}}</span>
    <span class="post-date">{{post.date}}</span>
  </div>
  <h3 class="post-card-title">
    <a href="{{post.url}}">{{post.title}}</a>
  </h3>
  <p class="post-summary">{{post.summary}}</p>
  <div class="post-tags">
    {{#each post.tags}}
    <span class="post-tag">{{this}}</span>
    {{/each}}
  </div>
</article>
```

**templates/footer.html**
```html
<div class="footer-content">
  <div class="footer-info">
    <span>{{site.name}} &copy; {{year}}</span>
  </div>
  <nav class="footer-links">
    <a href="index.html" class="footer-link">首页</a>
    <a href="posts.html" class="footer-link">文章</a>
    <a href="about.html" class="footer-link">关于</a>
  </nav>
</div>
```

### 8.3 可用变量

| 变量 | 说明 |
|------|------|
| `site.name` | 站点名称 |
| `site.tagline` | 站点标语 |
| `site.description` | 站点描述 |
| `site.url` | 站点 URL |
| `year` | 当前年份 |
| `post.title` | 文章标题 |
| `post.url` | 文章链接 |
| `post.summary` | 文章摘要 |
| `post.date` | 发布日期 |
| `post.category` | 文章分类 |
| `post.tags` | 文章标签数组 |

### 8.4 注意事项

- 模板文件是可选的，未提供的模板会使用默认渲染逻辑
- 模板中的 `{{变量名}}` 会在运行时被替换为实际值
- 模板不支持复杂逻辑，如需条件渲染请使用 `theme.js`
- 自定义模板的 CSS 类名应与 `base.css` 中的选择器保持一致

---

## 9. theme.yml 参考

`theme.yml` 是主题的元数据声明文件，必须位于主题根目录。

### 9.1 完整字段列表

```yaml
# 必填字段
name: My Theme                    # 主题显示名称
version: 1.0.0                   # 语义化版本号
author: Author Name              # 作者名称
description: A brief description # 主题简介

# 可选字段
id: my-theme                     # 主题 ID（默认为目录名）
license: MIT                     # 开源协议
homepage: https://example.com    # 主题主页
references:                      # 设计参考来源
  - linear.app
  - stripe

# 字体声明（供文档和工具链使用）
fonts:
  - name: Inter
    source: bundled              # bundled | google | none
    weights: [400, 500, 600, 700]
  - name: JetBrains Mono
    source: google
    weights: [400, 500]

# 模板声明
templates:
  hero: true                     # 是否提供自定义 hero 模板
  footer: true                   # 是否提供自定义 footer 模板
  post-card: false               # 是否提供自定义 post-card 模板

# 颜色模式支持
colorModes:
  - dark                         # 支持的颜色模式列表
  - light

# 布局预设（可选，供 UI 选择器使用）
layouts:
  default:
    label: 默认布局
    card-columns: auto
  grid-2:
    label: 双列网格
    card-columns: 2
  list:
    label: 列表视图
    card-direction: row
```

### 9.2 最小示例

```yaml
name: My Theme
version: 1.0.0
author: Me
description: A minimal custom theme.
```

### 9.3 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 主题显示名称，用于 UI 选择器 |
| `version` | string | 是 | 语义化版本号（major.minor.patch） |
| `author` | string | 是 | 作者名称 |
| `description` | string | 是 | 主题简介，建议 50 字以内 |
| `id` | string | 否 | 主题 ID，默认取目录名 |
| `license` | string | 否 | 开源协议标识 |
| `homepage` | string | 否 | 主题主页 URL |
| `references` | string[] | 否 | 设计参考来源列表 |
| `fonts` | object[] | 否 | 字体声明列表 |
| `fonts[].name` | string | 是 | 字体名称 |
| `fonts[].source` | string | 是 | 字体来源：`bundled` / `google` / `none` |
| `fonts[].weights` | number[] | 否 | 字重列表 |
| `templates` | object | 否 | 模板声明 |
| `colorModes` | string[] | 否 | 支持的颜色模式列表 |
| `layouts` | object | 否 | 布局预设列表 |

---

## 10. 示例

### 10.1 最小主题

一个最小可用主题只需要两个文件：

**themes/minimal/theme.yml**
```yaml
name: Minimal
version: 1.0.0
author: Your Name
description: A minimal theme with custom accent color.
```

**themes/minimal/theme.css**
```css
@import "../base.css";

:root {
  --accent: #e74c3c;
  --accent-soft: rgba(231, 76, 60, 0.16);
  --accent-strong: #ff6b5a;
}
```

这个主题只覆盖了三个颜色 Token，其他所有样式继承自 `base.css`。

### 10.2 完整主题

一个功能完整的主题示例：

**themes/ocean/theme.yml**
```yaml
name: Ocean
version: 1.0.0
author: Your Name
description: A calm, blue-tinted theme inspired by the sea.
references:
  - linear.app
  - notion
fonts:
  - name: Inter
    source: bundled
    weights: [400, 500, 600, 700]
  - name: Fira Code
    source: google
    weights: [400, 500]
templates:
  hero: true
  footer: true
colorModes:
  - dark
  - light
```

**themes/ocean/theme.css**
```css
@import "../base.css";
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap');

/* ── 暗色模式（默认） ─────────────────────────── */
:root {
  /* 颜色 */
  --bg-primary: #0a1628;
  --bg-secondary: #0f1f3a;
  --bg-elevated: #162a4a;
  --text-primary: #e8f0ff;
  --text-secondary: #8eadd4;
  --text-muted: #4a6a8a;
  --border: rgba(100, 160, 255, 0.12);
  --accent: #4a9eff;
  --accent-soft: rgba(74, 158, 255, 0.14);
  --accent-strong: #70b4ff;
  --brand-start: #4a9eff;
  --brand-end: #70b4ff;
  --brand-shadow: rgba(74, 158, 255, 0.2);

  /* 排版 */
  --font-display: 'Inter', 'Segoe UI', 'PingFang SC', sans-serif;
  --font-body: 'Inter', 'Segoe UI', 'PingFang SC', sans-serif;
  --font-mono: 'Fira Code', 'Consolas', monospace;

  /* 间距与圆角 */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;

  /* 阴影 */
  --shadow-sm: 0 4px 20px rgba(0, 30, 80, 0.2);
  --shadow-md: 0 8px 40px rgba(0, 30, 80, 0.3);
  --shadow-lg: 0 16px 60px rgba(0, 30, 80, 0.4);

  /* 布局 */
  --layout-width: 1200px;
  --layout-nav-height: 64px;
  --layout-hero: 70vh;
  --layout-prose: 780px;

  /* 代码块 */
  --code-bg: #0d1b30;
  --code-border: rgba(74, 158, 255, 0.15);
  --code-text: #d4e4ff;
  --code-muted: #4a6a8a;
  --code-inline-bg: rgba(74, 158, 255, 0.1);
  --code-inline-text: #e8f0ff;
  --code-selection: rgba(74, 158, 255, 0.2);
  --code-accent-1: #7eb8ff;
  --code-accent-2: #7ee0c3;
  --code-accent-3: #ffce9b;
}

/* ── 亮色模式 ─────────────────────────────────── */
[data-color-scheme="light"] {
  --bg-primary: #f0f5ff;
  --bg-secondary: #ffffff;
  --bg-elevated: #e4ecf8;
  --text-primary: #1a2a40;
  --text-secondary: #4a6080;
  --text-muted: #8090a8;
  --border: rgba(26, 42, 64, 0.12);
  --accent: #2a7eff;
  --accent-soft: rgba(42, 126, 255, 0.1);
  --accent-strong: #0060e0;
  --shadow-sm: 0 4px 20px rgba(0, 30, 80, 0.08);
  --shadow-md: 0 8px 40px rgba(0, 30, 80, 0.12);
  --shadow-lg: 0 16px 60px rgba(0, 30, 80, 0.16);
  --code-bg: #1a2a40;
  --code-text: #d4e4ff;
}

/* ── 导航栏 ───────────────────────────────────── */
.nav {
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg-primary) 90%, transparent);
}

/* ── Hero ──────────────────────────────────────── */
.hero {
  text-align: center;
  justify-items: center;
}

.hero-title {
  background: linear-gradient(135deg, var(--brand-start), var(--brand-end));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── 卡片 ──────────────────────────────────────── */
.post-card {
  border-radius: var(--radius-lg);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.post-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: var(--accent);
}

.post-card::before {
  display: none;
}

/* ── 代码块 ────────────────────────────────────── */
.markdown-body pre,
.moment-content pre {
  border-radius: var(--radius-lg);
}

/* ── 目录 ──────────────────────────────────────── */
.toc-container {
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-secondary);
}

/* ── 返回顶部 ──────────────────────────────────── */
.back-to-top {
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

/* ── 页脚 ──────────────────────────────────────── */
.footer {
  border-top: 1px solid color-mix(in srgb, var(--accent) 20%, var(--border));
}
```

**themes/ocean/templates/hero.html**
```html
<div class="hero-content">
  <span class="hero-kicker">{{site.tagline}}</span>
  <h1 class="hero-title">{{site.name}}</h1>
  <p class="hero-subtitle">{{site.description}}</p>
  <div class="hero-actions">
    <a href="index.html" class="btn btn-primary">探索内容</a>
    <a href="about.html" class="btn btn-secondary">了解更多</a>
  </div>
</div>
```

**themes/ocean/templates/footer.html**
```html
<div class="footer-content">
  <div class="footer-info">
    <span>{{site.name}} &copy; {{year}} &middot; Powered by Static Blog</span>
  </div>
  <nav class="footer-links">
    <a href="index.html" class="footer-link">首页</a>
    <a href="posts.html" class="footer-link">归档</a>
    <a href="moments.html" class="footer-link">瞬间</a>
    <a href="about.html" class="footer-link">关于</a>
  </nav>
</div>
```

**themes/ocean/theme.js**
```js
Blog.onInit = function () {
  console.log('[Ocean] Theme initialized');
};

Blog.onPageLoad = function () {
  const postBody = document.querySelector('.post-body');
  if (postBody) {
    const text = postBody.textContent || '';
    const minutes = Math.ceil(text.length / 500);
    const meta = document.querySelector('.post-meta');
    if (meta) {
      const span = document.createElement('span');
      span.textContent = `约 ${minutes} 分钟阅读`;
      meta.appendChild(span);
    }
  }
};

Blog.onThemeChange = function (newThemeId) {
  console.log('[Ocean] Switched to:', newThemeId);
};
```

### 10.3 目录结构对比

```
minimal/          ocean/
  theme.yml         theme.yml
  theme.css         theme.css
                    theme.js
                    templates/
                      hero.html
                      footer.html
                    fonts/
                      inter-latin.woff2
                      fira-code-latin.woff2
```

---

## 附录：内置主题列表

| ID | 名称 | 风格 | 说明 |
|----|------|------|------|
| `graphite` | Graphite | 工业蓝图 | 参考 Linear + Vercel，克制、稳定、开发者友好 |
| `aurora` | Aurora | 品牌展示 | 参考 Stripe，偏品牌展示，不过度装饰 |
| `paper` | Paper | 阅读优先 | 参考 Notion + Claude，正文层级柔和 |
| `mono` | Mono | 黑白极简 | 强调排版、密度与节奏 |
| `terminal` | Terminal | 赛博终端 | 参考 DiskScope CRT，霓虹绿 + 扫描线 |
