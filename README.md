# Static Markdown Blog

零依赖、Token 驱动主题、支持任意子路径部署的静态博客平台。

## 特性

- **零依赖** — 无 npm install，纯 Node.js 内置模块构建
- **构建时渲染** — Markdown → HTML，SEO 友好
- **5 个内置主题** — graphite / aurora / paper / mono / terminal
- **三态亮暗切换** — 自动/亮色/暗色，跟随系统或手动选择
- **Token 驱动** — 45+ CSS 变量，主题只需覆盖值
- **主题引擎** — 布局 token + theme.js + 模板覆盖
- **i18n** — 中英双语，完整的 UI 翻译
- **增量构建** — `--incremental` 跳过未变化文件
- **SSG** — 构建时生成完整 HTML，搜索引擎可直接抓取
- **全文搜索** — Lunr.js 离线索引，支持中文分词
- **数学公式** — KaTeX 懒加载渲染
- **流程图** — Mermaid 懒加载渲染
- **评论** — Giscus / Cusdis 可选集成
- **热重载** — 开发服务器 SSE 自动刷新
- **Docker** — 原生支持，一键部署

## 快速开始

```bash
# 初始化工作区
node init.js

# 编辑配置
# workspace/site/config/blog.config.yml

# 构建
node build.js

# 预览
node serve.js
```

CLI 方式：

```bash
npm install -g .
blog init
blog build
blog serve 8080
```

## 目录结构

```text
kernel/               内核（config, content, markdown, output, index）
plugins/              构建时插件（rss, sitemap, search-index, ssg）
client/               运行时模块（core, render, ui, i18n, blog）
build.js              构建入口（调用 kernel/index.js）
serve.js              开发服务器（热重载）
bin/blog.js           CLI 入口
vendor/               第三方库（marked, lunr, katex）
themes/               5 个内置主题 + base.css
locales/              中英双语
config/               默认配置
content/              默认内容
workspace/site/       用户工作区
examples/             示例站点
docker/               Dockerfile + compose
.github/workflows/    GitHub Actions
docs/architecture/    主题引擎参考文档
```

## 内置主题

| 主题 | 风格 | 设计参考 |
|------|------|----------|
| graphite | 工业蓝图 | Linear + Vercel |
| aurora | 品牌展示 | Stripe |
| paper | 阅读优先 | Notion + Claude |
| mono | 黑白极简 | Vercel |
| terminal | CRT 赛博 | DiskScope |

## 主题开发

详见 `docs/architecture/theme-engine-reference.md`。

核心概念：

```css
/* 主题只需覆盖 token */
:root {
  --bg-primary: #ffffff;
  --accent: #0066ff;
  --font-display: "Inter", sans-serif;
}

/* 暗色模式 */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg-primary: #0a0a0a;
    --accent: #6b8aff;
  }
}
:root[data-theme="dark"] {
  --bg-primary: #0a0a0a;
  --accent: #6b8aff;
}
```

## 部署

### GitHub Pages

推送到 main 分支自动构建部署（`.github/workflows/deploy.yml`）。

### Docker

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

首次启动自动从 `examples/docker-seed/` 初始化。

### 通用静态托管

`dist/` 目录即完整产物，可直接部署到 Vercel / Netlify / Cloudflare Pages / Nginx。

## 构建选项

```bash
node build.js                    # 全量构建
node build.js --incremental      # 增量构建（跳过未变化文件）
node build.js --include-drafts   # 包含草稿
```

## 文档

- `docs/architecture/theme-engine-reference.md` — 主题引擎完整参考
