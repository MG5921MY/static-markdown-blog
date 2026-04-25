# 主题设计基线与映射

## 目的

这份文档用于把 `.tmp/` 中收集的大厂设计资料沉淀成项目内部的正式设计基线，避免后续主题扩展重新回到“凭感觉配色”和“复制整页 CSS”的做法。

本轮重点参考来源：

- `linear.app`
- `vercel`
- `stripe`
- `notion`
- `claude`

研究资料目录：

- `.tmp/awesome-design-md-cn-main`
- `.tmp/awesome-design-md-main`

## 总体结论

真正应该沉淀的不是某一张首页截图，而是这些可复用的设计决策：

- 背景层级
- 文字层级
- 边框与阴影强度
- 圆角与留白节奏
- 信息密度
- 按钮与卡片的表达强弱
- 阅读页与列表页的优先级关系

因此主题系统必须基于 token，而不是基于整页 CSS 复制。

## 内置主题映射

### graphite

- 参考：Linear + Vercel
- 定位：默认主题，克制、冷静、开发者友好
- 特征：深色底、轻边框、稳定层级、低噪声

### aurora

- 参考：Stripe
- 定位：品牌展示型主题
- 特征：更明亮的底色、清晰的品牌强调、更轻的产品海报感

### paper

- 参考：Notion + Claude
- 定位：阅读友好型主题
- 特征：暖白背景、柔和对比、正文优先、长文舒适

### mono

- 参考：Vercel 的开发者表达 + 终端式排版
- 定位：黑白极简开发者主题
- 特征：更克制的配色、更强的排版节奏、较低视觉装饰

## Token 约定

所有主题都应至少覆盖以下 token：

### 颜色

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

### 阴影

- `--shadow-sm`
- `--shadow-md`
- `--shadow-lg`

### 圆角

- `--radius-sm`
- `--radius-md`
- `--radius-lg`
- `--radius-xl`

### 间距

- `--space-xs`
- `--space-sm`
- `--space-md`
- `--space-lg`
- `--space-xl`

### 字体

- `--font-display`
- `--font-body`
- `--font-mono`

### 布局

- `--layout-width`
- `--layout-nav-height`
- `--layout-hero`

## 页面基线

### 首页

- 一个主 Hero
- 一个稳定的内容 feed
- 一个简洁 footer
- 不使用营销式卡片堆砌作为首页主体

### 列表与分类页

- 优先保证扫描效率
- 筛选、分页和目录关系清楚
- 卡片密度中等，不做仪表盘式堆叠

### 文章页

- 标题与正文优先
- 元信息弱于正文
- 目录和代码块层级清晰

### 功能页

- `moments / links / gallery` 共享统一排版语言
- 允许气质差异，不允许每个功能页都演变成独立风格 demo

## 禁止事项

- 不再新增大量“品牌名即主题名”的整页主题变体
- 不再复制整页 CSS 制造主题分叉
- 不再把主题接口收缩成单一色值配置
- 不再让主题自己决定页面结构

## Legacy 策略

`usr/themes/*` 仍可作为 legacy 输入保留，但仅用于：

- 兼容旧站点
- 对照迁移
- 提取可复用 token

它们不再是新站点的默认主题来源。
