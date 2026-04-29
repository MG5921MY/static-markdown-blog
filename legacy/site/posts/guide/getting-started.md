---
title: 快速开始
date: 2025-01-01
tags: [入门, 教程]
---

# 快速开始

欢迎使用这个静态博客系统！本文将帮助你快速上手。

## 安装与运行

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd your-blog
```

### 2. 构建索引

```bash
node build.js
```

### 3. 启动本地服务器

```bash
# Python 方式
python -m http.server 8080

# 或使用 Node.js
npx serve .
```

### 4. 访问博客

打开浏览器访问 `http://localhost:8080`

## 目录结构

```
├── conf/
│   └── config.yml          # 主配置文件
├── usr/themes/             # 主题目录
│   ├── default/
│   ├── minimal/
│   └── dark-pro/
├── posts-example/          # 文章目录
│   ├── guide/              # 使用指南
│   ├── features/           # 功能展示
│   └── demo/               # 示例文章
├── pages-example/          # 自定义页面
├── build.js                # 构建脚本
├── blog.js                 # 前端引擎
└── index.html              # 首页
```

## 下一步

- 阅读 [配置说明](./config-guide.md) 了解如何自定义博客
- 查看 [功能展示](../features/) 了解所有功能特性
