---
title: 配置说明
date: 2025-01-01
tags: [配置, 教程]
---

# 配置说明

博客的所有配置都在 `conf/config.yml` 文件中。

## 站点基本信息

```yaml
site:
  name: YourSiteName        # 站点名称
  alias: 站点别名            # 站点别名
  description: 个人博客      # 站点描述
  author: YourName          # 作者名
  email: your@email.com     # 联系邮箱
  favicon: assets/icon.ico  # 网站图标
  logo: assets/logo.png     # 网站 Logo
```

## 主题配置

```yaml
theme:
  active: default           # 当前主题（对应 usr/themes/ 下的目录名）
  config:
    primaryColor: "#6366f1" # 主色调
    showFooter: true        # 是否显示页脚
```

内置主题：
- `default` - 默认主题，简洁现代
- `minimal` - 极简主题
- `dark-pro` - 深色专业主题

## 文章分类

```yaml
categories:
  - id: tech                # 分类 ID（唯一）
    name: 技术笔记           # 显示名称
    icon: 📝                 # 图标
    path: posts/tech        # 文章目录路径
    description: 技术文章    # 分类描述
    type: tree              # 显示模式：tree(层级) / flat(平铺)
```

## 导航菜单

```yaml
nav:
  - name: 首页
    url: ./index.html
  - name: 关于
    url: ./page.html?id=about
  - name: GitHub            # 外部链接
    url: https://github.com
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
  - id: tech-notes
    name: 技术笔记
    type: category
    categoryId: tech
```
