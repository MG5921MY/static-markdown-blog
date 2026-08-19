---
title: 5 分钟快速开始
date: 2026-06-30
tags: [guide, start]
summary: 从安装到第一篇文章发布，5 分钟内完成。
---

# 5 分钟快速开始

## 安装

### 源码构建

```bash
git clone https://github.com/MG5921MY/static-markdown-blog.git
cd static-markdown-blog
node init.js          # 初始化 site/ 工作区
```

### Docker

```bash
cd deploy/docker
docker compose up -d --build
```

### npm（开发中）

```bash
npm install -g static-markdown-blog
mkdir my-blog && cd my-blog
blog init
```

## 第一步：修改站点信息

编辑 `site/config.yml`：

```yaml
site:
  name: 我的博客
  alias: 记录与思考
  description: 一个关于技术与生活的博客。
  author: 你的名字
  email: ""
```

## 第二步：写文章

在 `site/content/posts/` 下创建 Markdown 文件：

```markdown
---
title: 我的第一篇文章
date: 2026-06-30
tags: [hello, blog]
summary: 这是我的第一篇博客文章。
---

# 你好世界

这是正文内容。支持 **粗体**、*斜体*、`代码`。

## 代码块

```javascript
console.log('Hello, blog!');
```

## 列表

- 第一项
- 第二项
- 第三项
```

### 支持的 front-matter 字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `title` | 是 | 文章标题 |
| `date` | 是 | 发布日期（YYYY-MM-DD） |
| `tags` | 否 | 标签数组 |
| `summary` | 否 | 摘要（不填则自动截取正文） |
| `draft` | 否 | `true` 表示草稿，构建时跳过 |

## 第三步：构建与预览

```bash
node build.js         # 构建到 dist/
node serve.js         # 预览 http://localhost:8080
```

### 构建选项

```bash
node build.js                    # 全量构建
node build.js --incremental      # 增量构建（跳过未变化文件）
node build.js --include-drafts   # 包含草稿
```

## 第四步：部署

`dist/` 目录即完整产物，可直接部署到：

- **GitHub Pages** — 推送到 main 分支自动构建
- **Vercel / Netlify / Cloudflare Pages** — 指向 `dist/` 目录
- **Nginx** — 将 `dist/` 复制到 web 根目录
- **Docker** — `docker compose up -d --build`

## 切换主题

修改 `site/config.yml`：

```yaml
theme:
  active: terminal    # 可选: graphite / aurora / paper / mono / terminal
```

重新构建即可。主题通过 CSS 变量驱动，切换不需要改任何内容。

## 添加自定义页面

在 `site/config.yml` 的 `content.pages` 中添加：

```yaml
pages:
  - id: portfolio
    name: 作品集
    type: custom
    source: content/pages/portfolio.html
    data:
      projects: content/data/projects.yml
```

自定义页面支持：
- **嵌入模式** — 显示平台导航栏/页脚，CSS 自动隔离
- **独立模式** — `standalone: true`，隐藏平台 UI，页面自己管理
- **数据嵌入** — `data` 字段指定 YAML/JSON 文件，构建时嵌入
- **JS 执行** — `scripts: true` 显式开启，默认关闭

## 更多功能

| 功能 | 配置位置 |
|------|----------|
| 瞬间（短内容） | `site/content/data/moments.yml` |
| 友链 | `site/content/data/links.yml` |
| 图库 | `site/content/data/gallery.yml` |
| 自定义页面 | `site/content/pages/` + `site/config.yml` |
| 评论 | `site/config.yml` 的 `comments` |
| 备案信息 | `site/config.yml` 的 `beian` |
| 数学公式 | 文章中写 `$E=mc^2$` 或 `$$\int_0^1$$` |
| 流程图 | 文章中写 ` ```mermaid ` 代码块 |
| 搜索 | 自动启用，构建时生成索引 |
| 导航栏按钮 | `site/config.yml` 的 `navActions` |
