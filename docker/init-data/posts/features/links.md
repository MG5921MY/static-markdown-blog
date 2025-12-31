---
title: 友情链接
date: 2025-01-01
tags: [功能, 友链]
---

# 友情链接

展示友情链接，支持分组和卡片式布局。

## 特性

- 卡片式布局，美观大方
- 支持分组管理
- 支持图标和头像
- 支持链接描述
- 独立配置文件

## 配置方式

1. 在 `conf/links.yml` 中添加内容：

```yaml
groups:
  - id: friends
    name: 好友博客
    icon: 👥
  - id: tools
    name: 常用工具
    icon: 🔧

links:
  - name: GitHub
    url: https://github.com
    icon: 🐙
    description: 代码托管平台
    group: tools
    
  - name: 某某的博客
    url: https://example.com
    avatar: https://example.com/avatar.png
    description: 一个有趣的博客
    group: friends
```

2. 在 `config.yml` 中启用：

```yaml
features:
  links:
    enabled: true
    source: conf/links.yml
```

3. 在导航栏添加入口：

```yaml
nav:
  - name: 友链
    url: ./links.html
```

## 查看演示

点击导航栏的「友链」查看效果。
