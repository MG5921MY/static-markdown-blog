# 静态 Markdown 博客

一个以 Markdown 为唯一正文来源的静态博客系统，当前版本已经完成新结构重构的核心落地：

- 新结构优先，旧结构兼容读取
- 配置模型收敛，默认更容易上手
- 主题系统基于 token，而不是整页 CSS 复制
- 构建产物统一输出到 `dist/`
- 运行时支持任意子路径部署

## 快速开始

### 1. 修改站点配置

编辑 `config/blog.config.yml`：

```yaml
site:
  name: Your Blog
  alias: 静态 Markdown 博客
  description: Markdown first, theme driven, base-path agnostic static blog.

theme:
  active: graphite
```

### 2. 写内容

- 文章：`content/posts/**/*.md`
- 页面：`content/pages/*.md`
- 数据页：`content/data/{moments,links,gallery}.yml`

### 3. 构建

```bash
node build.js
```

### 4. 本地预览

根路径预览：

```bash
node serve.js
```

子路径预览：

```bash
node serve.js 8080 /blog/
```

默认地址：

- 根路径：`http://localhost:8080`
- 子路径：`http://localhost:8080/blog/`

## 当前目录结构

```text
config/
  blog.config.yml
content/
  posts/
  pages/
  data/
themes/
  <theme-id>/
docs/
  architecture/
dist/
```

## 兼容策略

构建器仍兼容读取这些旧目录作为输入层：

- `conf/`
- `posts/`
- `pages/`
- `assets/`
- `usr/themes/`

兼容层的目标是平滑迁移，不是恢复旧结构为默认创作方式。新项目请直接使用 `config/ + content/ + themes/`。

如需检查 legacy 输入里的中文内容是否出现实际乱码，可以执行：

```bash
node scripts/encoding-audit.js
```

## 主题系统

主题接口固定为：

```text
themes/<theme-id>/
  theme.yml
  theme.css
```

当前内置主题：

- `graphite`：默认主题，参考 Linear + Vercel，克制科技感
- `aurora`：参考 Stripe，偏品牌展示
- `paper`：参考 Notion + Claude，阅读优先
- `mono`：黑白极简，偏开发者语境

首页支持可选的沉浸模式与背景图配置，默认关闭：

```yaml
display:
  hero:
    immersive: false
    background:
      enabled: false
      image: ""
      focalPoint: "center center"
      fit: "cover"
      dimming: 0.42
      blur: 0
```

背景图仅支持本地资源路径，并通过 `Blog.resolveAsset()` 解析。

`links` 页面默认定位为“参考与收藏”，更适合放长期阅读、设计来源和工具入口，而不是暗示互换友链或品牌背书。

更完整的设计基线请见：

- `docs/architecture/blog-rebuild-plan.md`
- `docs/architecture/theme-design-baseline.md`

## 运行时约定

以下 helper 是正式接口：

- `Blog.resolveBasePath()`
- `Blog.resolveAsset(path)`
- `Blog.resolvePageUrl(page, params?)`

模板、导航、主题资源和文章跳转都应围绕这些 helper 保持路径无关性。

## 构建产物

构建后主要产物位于 `dist/`：

- `dist/*.html`
- `dist/site-config.json`
- `dist/content-index.json`
- `dist/pathmap.json`
- `dist/posts/index.json`
- `dist/posts/_pathmap.json`
- `dist/themes/`

保留 `dist/posts/index.json` 和 `dist/posts/_pathmap.json` 是为了兼容旧前端读取链路。
