---
title: 5 分钟快速开始
date: 2026-04-24
tags: [guide, start]
summary: 用新的 config/content/themes 结构快速改站点名、写文章、预览博客。
---

# 5 分钟快速开始

这个项目现在默认围绕三件事组织：

1. `config/blog.config.yml`
2. `content/posts/**/*.md`
3. `themes/<theme-id>/`

## 改站点信息

编辑 `config/blog.config.yml` 中的 `site`：

```yaml
site:
  name: Your Blog
  alias: 你的副标题
  description: 站点描述
```

## 新增文章

在 `content/posts/guide/` 或其他分类目录里新增 Markdown 文件：

```md
---
title: 新文章
date: 2026-04-24
tags: [note]
---

# 正文
```

## 切换主题

修改：

```yaml
theme:
  active: graphite
```

可选主题：

- `graphite`
- `aurora`
- `paper`
- `mono`

## 构建与预览

```bash
node build.js
node serve.js
```

默认会输出到 `dist/`，本地预览也直接服务 `dist/`。
