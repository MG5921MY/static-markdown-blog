# 博客重构基线

## 当前目标

项目当前的正式形态是一个：

- Markdown 优先
- 配置最少
- 主题可扩展
- 默认观感稳定
- 支持任意子路径部署
- 使用单一 `workspace/site` 工作区的静态博客系统

## 正式结构

```text
config/blog.config.yml
content/posts/**/*.md
content/pages/*.md
content/data/{moments,links,gallery}.yml
themes/<theme-id>/{theme.yml,theme.css}
docs/architecture/*.md
dist/
```

上面这组目录是仓库内置基线。真正面向用户写作、挂载、备份与 Docker 部署的正式入口是：

```text
workspace/site/
  config/blog.config.yml
  content/posts/**/*.md
  content/pages/*.md
  content/data/{moments,links,gallery}.yml
  assets/
  themes/custom/
```

## 读取优先级

构建器当前按以下顺序发现站点配置：

1. `workspace/site/config/blog.config.yml`
2. `config/blog.config.yml`
3. legacy 输入，仅在 `BLOG_ENABLE_LEGACY=1` 时显式启用

内容、数据、资源和用户主题都与所选站点根一起切换，避免配置和内容分裂在不同目录。

## Legacy 边界

legacy 不再作为根目录默认使用方式长期保留。

当前 legacy 只保留为迁移输入：

```text
legacy/site/
  conf/
  posts/
  pages/
  usr/themes/
```

原则：

- legacy 是迁移入口，不是继续创作入口
- 不再默认扫描根目录 `conf/posts/pages/usr`
- 不再把旧主题目录当默认主题来源
- 新用户默认只使用 `workspace/site/`

如需导入旧内容，使用：

```bash
node scripts/migrate-legacy-to-workspace.js
```

## 示例与 Docker seed

示例与初始化模板统一收进 `examples/`：

```text
examples/
  starter-modern/site/
  starter-legacy/
  docker-seed/site/
```

其中：

- `starter-modern/site/` 是新结构默认示例
- `starter-legacy/` 是旧结构样例与对照输入
- `docker-seed/site/` 用于容器首次启动自动初始化

当前通过 `scripts/sync-example-seeds.js` 把 `starter-modern/site/` 同步到 `docker-seed/site/`，避免长期手工漂移。

## Docker 模型

Docker 正式挂载契约为：

- Host: `workspace/site`
- Container: `/app/workspace/site`

容器启动逻辑：

1. 检查 `/app/workspace/site`
2. 若为空，则从 `examples/docker-seed/site` 初始化
3. 若非空，则直接使用用户工作区
4. 执行构建并启动预览服务

## 运行时约定

以下 helper 是正式约定：

- `Blog.resolveBasePath()`
- `Blog.resolveAsset(path)`
- `Blog.resolvePageUrl(page, params?)`

页面模板、导航链接、主题资源、Markdown 内容与 JSON 加载都围绕这组 helper 保持路径无关性。
