---
title: 主题系统与设计基线
date: 2026-06-30
tags: [theme, design]
summary: Token 驱动的 5 主题系统，支持亮暗切换、布局控制、自定义字体和模板覆盖。
---

# 主题系统与设计基线

## 设计原则

- **Token 驱动** — 主题只需覆盖 CSS 变量，不改页面结构
- **暗色模式内置** — 三态切换（自动/亮色/暗色）
- **布局可调** — 10+ 布局 token 控制卡片、Hero、文章宽度
- **可扩展** — theme.js 生命周期 + 模板覆盖 + 自定义页面

## 内置主题

| 主题 | 风格 | 设计参考 |
|------|------|----------|
| graphite | 工业蓝图 | Linear + Vercel |
| aurora | 品牌展示 | Stripe |
| paper | 阅读优先 | Notion + Claude |
| mono | 黑白极简 | Vercel |
| terminal | CRT 赛博 | DiskScope |

## Token 体系

### 颜色

```css
--bg-primary        /* 主背景 */
--bg-secondary      /* 次背景（卡片、面板） */
--bg-elevated       /* 浮层背景 */
--text-primary      /* 主文字 */
--text-secondary    /* 次文字 */
--text-muted        /* 弱文字 */
--border            /* 边框 */
--accent            /* 强调色 */
--accent-soft       /* 强调色淡底 */
```

### 布局

```css
--layout-width      /* 最大宽度（默认 1120px） */
--layout-prose      /* 正文最大宽度（默认 760px） */
--card-columns      /* 卡片网格列数（auto = 响应式） */
--card-min-width    /* 卡片最小宽度（默认 280px） */
--card-gap          /* 卡片间距 */
--card-direction    /* 卡片方向（column = 纵向，row = 横向列表） */
--hero-align        /* Hero 对齐（center / left） */
--post-article-width /* 文章最大宽度（默认 880px） */
```

### 字体

```css
--font-display      /* 标题字体 */
--font-body         /* 正文字体 */
--font-mono         /* 等宽字体 */
```

主题可通过 `@import url(...)` 或 `@font-face` 加载自定义字体。

## 暗色模式

平台支持三态切换（导航栏右侧按钮）：

| 模式 | 行为 |
|------|------|
| 自动 | 跟随系统 `prefers-color-scheme` |
| 亮色 | 强制亮色 |
| 暗色 | 强制暗色 |

主题 CSS 结构：

```css
/* 默认亮色 */
:root { --bg-primary: #ffffff; }

/* 自动暗色 */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --bg-primary: #0a0a0a; }
}

/* 手动暗色 */
:root[data-theme="dark"] { --bg-primary: #0a0a0a; }
```

## 自定义主题

目录结构：

```text
site/themes/my-theme/
  theme.yml          ← 元数据
  theme.css          ← 样式
  fonts/             ← 可选，本地打包字体
  templates/         ← 可选，HTML 模板覆盖
  theme.js           ← 可选，自定义交互
```

theme.css 最小示例：

```css
@import "../../res/themes/base.css";

:root {
  --bg-primary: #ffffff;
  --text-primary: #1a1a1a;
  --accent: #0066ff;
  --font-display: "Inter", sans-serif;
}
```

详见 `docs/architecture/theme-engine-reference.md`。
