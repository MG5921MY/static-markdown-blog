# 博客重构基线

## 当前目标

项目已经明确转向以下方向：

- Markdown 优先
- 配置最少
- 主题可扩展
- 默认观感稳定
- 任意子路径可部署
- legacy 目录仅作为兼容输入层保留

## 正式主结构

```text
config/blog.config.yml
content/posts/**/*.md
content/pages/*.md
content/data/{moments,links,gallery}.yml
themes/<theme-id>/{theme.yml,theme.css}
docs/architecture/*.md
dist/
```

## 运行时约定

以下 helper 是正式接口，不再改名：

- `Blog.resolveBasePath()`
- `Blog.resolveAsset(path)`
- `Blog.resolvePageUrl(page, params?)`

## 首页与主题约定

- 首页支持可选沉浸模式
- 首页支持可选背景图，默认关闭，仅支持本地资源
- 代码块视觉由本地 token 体系接管
- 四套内置主题维持稳定接口，不再复制整页 CSS

## Legacy 边界

仍兼容读取：

- `conf/`
- `posts/`
- `pages/`
- `assets/`
- `usr/themes/`

但这些目录不再是默认创作入口，也不再是默认主题来源。
