---
title: 配置说明
date: 2025-01-01
tags: [配置, 教程]
---

# 配置说明

所有配置都在 `conf/config.yml` 文件中。

## 站点基本信息

```yaml
site:
  name: 站点名称
  alias: 站点别名
  description: 站点描述
  author: 作者名
  email: your@email.com
  favicon: assets/favicon.ico
  logo: assets/logo.png
```

## 主题配置

```yaml
theme:
  active: default  # 主题名称
```

内置主题：
- `default` - 默认主题，现代化设计
- `minimal` - 极简主题
- `dark-pro` - 深色专业主题
- `github` - GitHub 风格
- `notion` - Notion 风格
- `vercel` - Vercel 风格
- `stripe` - Stripe 风格
- `medium` - Medium 风格

## 文章分类

```yaml
categories:
  - id: tech           # 分类 ID
    name: 技术笔记      # 显示名称
    icon: 📝           # 图标
    path: posts/tech   # 文章目录
    type: flat         # flat(平铺) / tree(层级)
```

## 导航菜单

```yaml
nav:
  - name: 首页
    url: ./index.html
  - name: 关于
    url: ./page.html?id=about
```

## 自定义页面

```yaml
pages:
  # Markdown 页面
  - id: about
    name: 关于
    type: markdown
    source: pages/about.md

  # 分类页面
  - id: tech
    name: 技术笔记
    type: category
    categoryId: tech
```

## 显示配置

```yaml
display:
  postsPerPage: 10        # 每页文章数
  summaryLength: 150      # 摘要长度
  heroBadge: "徽章文字"    # 首页徽章
  heroSubtitle: "副标题"   # 首页副标题
  showSiteInfo: true      # 显示站点信息
  siteType: "个人博客"     # 站点类型
  contentDirection: "技术" # 内容方向
```
