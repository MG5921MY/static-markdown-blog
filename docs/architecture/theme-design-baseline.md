# 主题设计基线与映射

## 目的

这份文档用于把设计参考沉淀成项目内部的正式主题基线，避免后续继续走“整页 CSS 复制”或“凭感觉换色”的老路。

当前内置主题固定为：

- `graphite`：默认主题，参考 Linear + Vercel，克制、稳定、开发者友好
- `aurora`：参考 Stripe，更适合品牌展示，但保持克制
- `paper`：参考 Notion + Claude，阅读优先，正文层级更柔和
- `mono`：黑白极简，强调密度、节奏和排版

## 统一规则

所有主题都必须基于统一 token 接口，而不是重写页面结构。

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

## 页面表达原则

- 首页维持“单一强 Hero + 稳定 feed + 简洁 footer”
- 沉浸模式只改变首页首屏节奏，不改变整体信息架构
- 背景图只作用于首页 Hero，且默认关闭
- `moments / links / gallery` 共享基础排版语言，不各自演化成独立风格 demo
- `links` 默认定位为“参考与收藏”，不是品牌友链墙

## 代码块原则

- 代码块视觉由本地主题 token 接管
- `highlight.js` 仅保留语义类名与高亮能力，不负责最终皮肤
- `inline code` 与 `code block` 必须拆开处理
- 深色代码块优先保证长时间阅读的稳定性，再谈装饰感

## Legacy 策略

`usr/themes/*` 仍可作为 legacy 输入保留，但只用于：

- 兼容旧站点
- 对照迁移
- 提取可复用 token

它们不再是新站点的默认主题来源。
