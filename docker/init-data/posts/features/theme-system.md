---
title: 多主题系统
date: 2025-01-01
tags: [功能, 主题]
---

# 多主题系统

博客内置 8 套精心设计的主题，一键切换。

## 内置主题

| 主题 | 风格 | 特点 |
|------|------|------|
| default | 现代 | 深色/浅色自适应，毛玻璃效果 |
| minimal | 极简 | 专注内容，干净简洁 |
| dark-pro | 深色 | 高对比度，适合夜间 |
| github | GitHub | 开发者风格，列表布局 |
| notion | Notion | 笔记风格，宽松排版 |
| vercel | Vercel | 科技感，大标题渐变 |
| stripe | Stripe | 商业感，精致渐变 |
| medium | Medium | 博客风格，衬线字体 |

## 切换主题

修改 `conf/config.yml`：

```yaml
theme:
  active: github  # 改为你想要的主题名
```

重启容器后生效。

## 自定义主题

1. 在 `usr/themes/` 下创建新目录
2. 创建 `style.css` 文件
3. 在配置中设置主题名

```css
/* usr/themes/my-theme/style.css */
:root {
  --primary-color: #6366f1;
  --bg-color: #ffffff;
}
```
