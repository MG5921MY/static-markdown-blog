# 主题设计基线

## 目标

这份文档用于把设计参考沉淀为项目内部正式主题基线，避免重新回到“整页 CSS 复制”的旧模式。

当前内置主题固定为：

- `graphite`：默认，参考 Linear + Vercel，克制、稳定、开发者友好
- `aurora`：参考 Stripe，更偏品牌展示，但不过度装饰
- `paper`：参考 Notion + Claude，阅读优先，正文层级更柔和
- `mono`：黑白极简，强调排版、密度与节奏
- `terminal`：参考 DiskScope CRT，赛博终端风格，霓虹绿 + 扫描线

## 统一接口

所有主题必须遵循相同目录契约：

```text
themes/<theme-id>/
  theme.yml
  theme.css
  fonts/            ← 可选，本地打包字体
```

工作区自定义主题接口保持一致：

```text
workspace/site/themes/custom/<theme-id>/
  theme.yml
  theme.css
  fonts/            ← 可选，用户自定义字体
```

## Token 原则

主题系统必须建立在统一 token 之上，而不是重写页面结构。

基础 token：

- `--bg-primary`
- `--bg-secondary`
- `--bg-elevated`
- `--text-primary`
- `--text-secondary`
- `--text-muted`
- `--border`
- `--accent`
- `--accent-soft`
- `--accent-strong`
- `--shadow-*`
- `--radius-*`
- `--space-*`
- `--font-*`
- `--layout-*`

代码块 token：

- `--code-bg`
- `--code-border`
- `--code-text`
- `--code-muted`
- `--code-inline-bg`
- `--code-inline-text`
- `--code-selection`
- `--code-accent-1`
- `--code-accent-2`
- `--code-accent-3`

## 字体加载策略

主题通过 `--font-display`、`--font-body`、`--font-mono` 三个 token 控制字体。base.css 提供系统字体栈作为默认值，主题可覆盖为自定义字体。

### 加载方式

主题作者在 `theme.css` 中选择以下任一方式声明字体：

**方式 1：Google Fonts（适合快速原型）**

```css
@import "../base.css";
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --font-display: 'Inter', 'Segoe UI', 'PingFang SC', sans-serif;
  --font-body: 'Inter', 'Segoe UI', 'PingFang SC', sans-serif;
  --font-mono: 'JetBrains Mono', 'Consolas', monospace;
}
```

**方式 2：本地打包字体（适合生产部署、离线环境）**

将字体文件放入主题目录的 `fonts/` 子目录：

```text
themes/graphite/
  theme.yml
  theme.css
  fonts/
    inter-latin.woff2
    inter-latin-ext.woff2
    jetbrains-mono-latin.woff2
```

在 theme.css 中通过 `@font-face` 引用：

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

构建时 `build.js` 自动将 `themes/*/fonts/` 和 `themes/custom/*/fonts/` 复制到 `dist/` 对应目录。浏览器通过相对路径加载。

### theme.yml 字段

主题可在 `theme.yml` 中声明字体元数据，供文档和工具链使用：

```yaml
name: Graphite
version: 1.1.0
author: MijiaoGame
description: Default theme inspired by Linear and Vercel.
fonts:
  - name: Inter
    source: bundled          # bundled | google | none
    weights: [400, 500, 600, 700]
  - name: JetBrains Mono
    source: google
    weights: [400, 500]
```

### 规则

- 字体加载只在主题 CSS 内部声明，不修改 base.css
- 回退字体栈必须覆盖中英文场景（PingFang SC / Microsoft YaHei / Segoe UI）
- `font-display: swap` 是必须的，避免 FOIT（字体加载阻塞渲染）
- 用户自定义主题使用完全相同的机制，无特殊路径

## 页面表达原则

- 首页维持“单一 Hero + 稳定 feed + 简洁 footer”
- 沉浸模式只改变首页首屏节奏，不改变整体信息架构
- 背景图只作用于首页 Hero，默认关闭
- `moments / links / gallery` 共享基础版式语言，不各自演化成整页 demo
- `links` 默认语义是“参考与收藏”，不是品牌友链墙

## 代码块原则

- 代码块视觉由本地主题 token 接管
- `highlight.js` 只保留语义类名，不负责最终视觉皮肤
- `inline code` 与 `code block` 必须分离处理
- 深色代码块优先保证长时间阅读稳定性

## Legacy 主题边界

`legacy/site/usr/themes/*` 仍可作为迁移输入保留，但只用于：

- 兼容旧站点
- 迁移对照
- 提取可复用 token

它们不再是新站点的默认主题来源。
