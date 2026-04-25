---
title: 主题系统与设计基线
date: 2026-04-24
tags: [theme, design]
summary: 内置主题不再依赖整页 CSS 复制，而是统一语义结构与 token 驱动的表达方式。
---

# 主题系统与设计基线

新的主题系统目标是：

- 统一页面结构
- 统一 token 接口
- 降低主题维护成本
- 保持默认主题观感稳定

## 内置主题

- `graphite`: Linear + Vercel
- `aurora`: Stripe
- `paper`: Notion + Claude
- `mono`: developer monochrome

## Token

主题至少提供这些 token：

- `color.*`
- `shadow.*`
- `radius.*`
- `space.*`
- `font.*`
- `layout.*`

## 主题目录

```text
themes/<theme-id>/
  theme.yml
  theme.css
```

更多设计依据见 `docs/architecture/theme-design-baseline.md`。
