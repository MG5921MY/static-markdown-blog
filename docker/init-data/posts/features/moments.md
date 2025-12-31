---
title: 瞬间功能
date: 2025-01-01
tags: [功能, 瞬间]
---

# 瞬间功能

记录生活中的点滴，类似微博/说说的时间线展示。

## 特性

- 时间线布局，按日期倒序展示
- 支持心情表情
- 支持图片附件
- 支持标签分类
- 独立配置文件，便于管理

## 配置方式

1. 在 `conf/moments.yml` 中添加内容：

```yaml
moments:
  - content: 今天天气不错
    date: 2025-01-01
    mood: 🌤️
    tags: [生活]
    
  - content: 学习了新技术
    date: 2025-01-02
    mood: 📚
    images:
      - assets/photos/study.jpg
```

2. 在 `config.yml` 中启用：

```yaml
features:
  moments:
    enabled: true
    source: conf/moments.yml
```

3. 在导航栏添加入口：

```yaml
nav:
  - name: 瞬间
    url: ./moments.html
```

## 查看演示

点击导航栏的「瞬间」查看效果。
