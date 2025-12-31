# 静态博客系统

一个轻量级的纯静态博客系统，无需后端服务器，支持 Markdown 写作、多主题切换、YAML 配置驱动。

## ✨ 特性

- 📝 **Markdown 支持** - 使用 Markdown 编写文章，支持 Front Matter
- 🎨 **多主题系统** - 内置 3 套主题，支持自定义主题
- 📂 **灵活分类** - 支持平铺(flat)和层级(tree)两种显示模式
- 🔒 **安全加固** - XSS 防护、路径遍历防护、URL 验证
- ⚡ **纯静态** - 无需数据库和后端，可部署到任意静态托管服务
- 🌐 **GitHub Pages 友好** - 完美支持 GitHub Pages 自动部署

## 📁 项目结构

```
├── conf/
│   ├── config.yml          # 主配置文件
│   └── config.yml.example  # 配置示例
├── usr/themes/             # 主题目录
│   ├── default/            # 默认主题
│   ├── minimal/            # 极简主题
│   └── dark-pro/           # 深色主题
├── posts/                  # 文章目录
│   └── [分类]/[文章].md
├── pages/                  # 自定义页面
├── build.js                # 构建脚本
├── blog.js                 # 前端引擎
├── backup.js               # 备份脚本
├── index.html              # 首页
├── post.html               # 文章页
└── page.html               # 自定义页面
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/your-blog.git
cd your-blog
```

### 2. 配置站点

复制并编辑配置文件：

```bash
cp conf/config.yml.example conf/config.yml
```

编辑 `conf/config.yml` 设置站点信息：

```yaml
site:
  name: 你的站点名
  description: 站点描述
  author: 作者名
  email: your@email.com
```

### 3. 编写文章

在 `posts/` 目录下创建 Markdown 文件：

```markdown
---
title: 文章标题
date: 2025-01-01
tags: [标签1, 标签2]
---

# 正文内容

这里是文章正文...
```

### 4. 构建索引

```bash
node build.js
```

### 5. 本地预览

```bash
# Python
python -m http.server 8080

# 或 Node.js
npx serve .
```

访问 `http://localhost:8080` 预览效果。

## 🌐 部署到 GitHub Pages

### 方式一：GitHub Actions 自动部署（推荐）

1. 将 `github` 目录重命名为 `.github`：

```bash
mv github .github
```

2. 在 GitHub 仓库设置中：
   - 进入 Settings → Pages
   - Source 选择 "GitHub Actions"

3. 推送代码后自动部署：

```bash
git add .
git commit -m "Update blog"
git push
```

> 工作流文件已准备好在 `github/workflows/deploy.yml`，重命名目录即可启用。

### 方式二：手动部署到 gh-pages 分支

1. 本地构建：

```bash
node build.js
```

2. 推送到 gh-pages 分支：

```bash
git add .
git commit -m "Update"
git subtree push --prefix . origin gh-pages
```

3. 在 GitHub 设置中选择 gh-pages 分支作为 Pages 源。

## ⚙️ 配置说明

### 站点配置

```yaml
site:
  name: 站点名称
  alias: 站点别名
  description: 站点描述
  author: 作者
  email: 邮箱
  favicon: assets/favicon.ico
  logo: assets/logo.png
```

### 主题配置

```yaml
theme:
  active: default  # default / minimal / dark-pro
```

### 分类配置

```yaml
categories:
  - id: tech
    name: 技术笔记
    icon: 📝
    path: posts/tech
    type: tree      # tree(层级) / flat(平铺)
```

### 导航菜单

```yaml
nav:
  - name: 首页
    url: ./index.html
  - name: 关于
    url: ./page.html?id=about
```

### 自定义页面

```yaml
pages:
  - id: about
    name: 关于
    type: markdown
    source: pages/about.md
```

## 🎨 自定义主题

1. 在 `usr/themes/` 下创建新目录
2. 创建 `style.css` 文件
3. 可选：创建 `theme.yml` 描述主题信息
4. 在配置中设置 `theme.active` 为新主题名

## 📜 命令参考

```bash
# 构建索引
node build.js

# 备份（默认版本号命名）
node backup.js

# 备份（时间戳命名）
node backup.js --mode=ts

# 备份（日期命名）
node backup.js --mode=date

# 备份（自定义名称）
node backup.js --name=my-backup
```

## 📄 License

MIT License
