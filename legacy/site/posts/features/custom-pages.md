---
title: 自定义页面
date: 2025-01-01
tags: [功能, 页面]
---

# 自定义页面

博客支持创建自定义页面，可以是 Markdown 内容或分类列表。

## 页面类型

### Markdown 页面

绑定单个 Markdown 文件：

```yaml
pages:
  - id: about
    name: 关于本站
    icon: 👤
    type: markdown
    source: pages/about.md
```

### 分类页面

显示指定分类的文章列表：

```yaml
pages:
  - id: tech-notes
    name: 技术笔记
    icon: 📝
    type: category
    categoryId: tech
```

## 访问页面

所有自定义页面通过 `page.html?id=xxx` 访问：

- `page.html?id=about` - 关于页面
- `page.html?id=tech-notes` - 技术笔记分类

## 添加到导航

在 `nav` 配置中添加链接：

```yaml
nav:
  - name: 关于
    url: ./page.html?id=about
```

## 创建新页面

1. 在 `pages/` 目录创建 `.md` 文件
2. 在 `config.yml` 的 `pages` 中添加配置
3. 可选：添加到 `nav` 导航菜单
4. 运行 `node build.js` 重新构建
