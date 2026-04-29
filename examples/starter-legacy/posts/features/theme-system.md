---
title: 主题系统
date: 2025-01-01
tags: [功能, 主题]
---

# 主题系统

博客支持灵活的主题系统，可以轻松切换和自定义主题。

## 内置主题

### Default 默认主题
- 简洁现代的设计风格
- 响应式布局
- 毛玻璃效果

### Minimal 极简主题
- 极简设计
- 专注内容阅读
- 轻量快速

### Dark-Pro 深色主题
- 专业深色配色
- 护眼模式
- 适合夜间阅读

## 切换主题

在 `conf/config.yml` 中修改：

```yaml
theme:
  active: dark-pro  # 改为你想要的主题名
```

## 自定义主题

1. 在 `usr/themes/` 下创建新目录
2. 创建 `style.css` 文件
3. 在配置中设置主题名

```css
/* usr/themes/my-theme/style.css */
:root {
  --primary-color: #6366f1;
  --bg-color: #ffffff;
  --text-color: #1f2937;
}
```

## 主题回退

如果配置的主题不存在，系统会自动回退到 `default` 主题。
