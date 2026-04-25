# 静态 Markdown 博客重构说明

## 目标

把现有项目重构成一套真正适合长期维护的静态博客系统：

- Markdown 优先
- 配置最少
- 主题体系统一
- 默认观感稳定
- 支持任意子路径部署
- 保留旧目录兼容输入层

## 结构约定

新的主结构固定为：

- `config/blog.config.yml`
- `content/posts/**/*.md`
- `content/pages/*.md`
- `content/data/{moments,links,gallery}.yml`
- `themes/<theme-id>/{theme.yml,theme.css}`
- `docs/architecture/*.md`
- `dist/`

以下目录继续保留为兼容输入层：

- `conf/`
- `posts/`
- `pages/`
- `assets/`
- `usr/themes/`

兼容层只负责迁移与回归，不再作为默认创作入口。

## 配置模型

主配置文件为 `config/blog.config.yml`，默认只保留这些主块：

- `site`
- `deployment`
- `theme`
- `content`
- `nav`
- `features`
- `display`
- `beian`

旧 `conf/config.yml` 仍可读取，但属于 legacy 输入，不再代表默认结构。

## 构建与输出

构建入口保持为：

```bash
node build.js
```

统一输出到 `dist/`，主要包括：

- `dist/site-config.json`
- `dist/content-index.json`
- `dist/pathmap.json`
- `dist/posts/index.json`
- `dist/posts/_pathmap.json`
- `dist/*.html`
- `dist/themes/...`

其中 `posts/index.json` 与 `posts/_pathmap.json` 继续保留，用于兼容旧前端读取方式。

## 运行时约定

前端运行时必须围绕这三个 helper 组织路径：

- `Blog.resolveBasePath()`
- `Blog.resolveAsset(path)`
- `Blog.resolvePageUrl(page, params?)`

它们负责以下事情：

- 根路径与子路径部署兼容
- 主题、favicon、JSON、Markdown 资源路径统一解析
- 导航和页面跳转路径保持 base-path agnostic

## 当前交付边界

本轮重构已经完成：

- 新结构落地
- 4 套内置主题落地
- 文档正式沉淀
- 兼容输入层保留
- 本地 `/blog/` 子路径验收支持
- `moments / links / gallery` 纳入统一主题体系

后续新增主题或页面能力，应继续沿用这套结构和 helper 约定，不再回退到旧式整页主题复制方案。
