# 主题设计基线

## 目标

这份文档用于把设计参考沉淀为项目内部正式主题基线，避免重新回到“整页 CSS 复制”的旧模式。

当前内置主题固定为：

- `graphite`：默认，参考 Linear + Vercel，克制、稳定、开发者友好
- `aurora`：参考 Stripe，更偏品牌展示，但不过度装饰
- `paper`：参考 Notion + Claude，阅读优先，正文层级更柔和
- `mono`：黑白极简，强调排版、密度与节奏

## 统一接口

所有主题必须遵循相同目录契约：

```text
themes/<theme-id>/
  theme.yml
  theme.css
```

工作区自定义主题接口保持一致：

```text
workspace/site/themes/custom/<theme-id>/
  theme.yml
  theme.css
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
