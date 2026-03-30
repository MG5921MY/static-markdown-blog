# 静态博客系统

一个轻量级的纯静态博客系统，无需后端服务器，支持 Markdown 写作、多主题切换、YAML 配置驱动。

## ✨ 特性

- 📝 **Markdown 支持** - 使用 Markdown 编写文章，支持 Front Matter
- 🎨 **多主题系统** - 内置 8 套主题（default、minimal、dark-pro、github、notion、vercel、stripe、medium）
- 📂 **灵活分类** - 支持平铺(flat)和层级(tree)两种显示模式
- 💭 **瞬间/说说** - 记录生活点滴，时间线展示
- 🔗 **友情链接** - 卡片式布局，支持分组管理
- 🖼️ **图库相册** - 瀑布流展示，Lightbox 灯箱，递归扫描
- 🔒 **安全加固** - XSS 防护、路径遍历防护、URL 验证
- ⚡ **纯静态** - 无需数据库和后端，可部署到任意静态托管服务
- 🐳 **Docker 开箱即用** - 一条命令启动，自动初始化演示站点
- 🌐 **GitHub Pages 友好** - 完美支持 GitHub Pages 自动部署

## 📁 项目结构

```
├── conf/
│   ├── config.yml          # 主配置文件
│   ├── moments.yml         # 瞬间配置
│   ├── links.yml           # 友链配置
│   └── gallery.yml         # 图库配置
├── usr/themes/             # 主题目录（8 套内置主题）
├── posts/                  # 文章目录
├── pages/                  # 自定义页面
├── assets/gallery/         # 图库图片目录
├── build.js                # 构建脚本
├── blog.js                 # 前端引擎
├── serve.js                # 开发服务器
├── index.html              # 首页
├── post.html               # 文章页
├── page.html               # 自定义页面
├── moments.html            # 瞬间页面
├── links.html              # 友链页面
└── gallery.html            # 图库页面
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/your-blog.git
cd your-blog
```

### 2. 初始化项目

Git 仓库中只包含示例文件（`xxx-example`），需要先初始化：

**方式一：使用初始化脚本（推荐）**

```bash
# Node.js（跨平台）
node init.js

# Linux/macOS
chmod +x init.sh && ./init.sh

# Windows PowerShell
.\init.ps1
```

脚本会将示例文件复制到工作目录：
- `conf-example/config.yml.example` → `conf/config.yml`
- `conf-example/moments.yml.example` → `conf/moments.yml`
- `conf-example/links.yml.example` → `conf/links.yml`
- `conf-example/gallery.yml.example` → `conf/gallery.yml`
- `posts-example/` → `posts/`
- `pages-example/` → `pages/`
- `assets-example/` → `assets/`

> 如果目标已存在，脚本会要求连续确认 3 次才会覆盖。

**方式二：手动复制**

```bash
# 复制配置文件
cp conf-example/config.yml.example conf/config.yml
cp conf-example/moments.yml.example conf/moments.yml
cp conf-example/links.yml.example conf/links.yml
cp conf-example/gallery.yml.example conf/gallery.yml

# 复制示例内容
cp -r posts-example posts
cp -r pages-example pages
cp -r assets-example assets
```

### 3. 配置站点

编辑 `conf/config.yml` 设置站点信息：

```yaml
site:
  name: 你的站点名
  description: 站点描述
  author: 作者名
  email: your@email.com
```

### 4. 编写文章

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

### 5. 构建索引

```bash
node build.js
```

### 6. 本地预览

```bash
# 使用内置服务器（推荐）
node serve.js

# 或 Python
python -m http.server 8080
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

### 功能模块（瞬间/友链/图库）

使用独立 YAML 文件配置：

```yaml
# config.yml 中启用
features:
  moments:
    enabled: true
    source: conf/moments.yml
  links:
    enabled: true
    source: conf/links.yml
  gallery:
    enabled: true
    source: conf/gallery.yml

# 在导航栏添加入口
nav:
  - name: 瞬间
    url: ./moments.html
  - name: 友链
    url: ./links.html
  - name: 图库
    url: ./gallery.html
```

图库配置示例 (`conf/gallery.yml`)：
```yaml
settings:
  maxDepth: 2  # 全局递归深度
  formats: [jpg, jpeg, png, gif, webp]

groups:
  - id: photos
    name: 摄影作品
    icon: 📷
    path: assets/gallery/photos
    maxDepth: 3  # 可覆盖全局深度
```

瞬间配置示例 (`conf/moments.yml`)：
```yaml
moments:
  - content: 今天天气不错
    date: 2025-01-01
    mood: 🌤️
    tags: [生活]
```

友链配置示例 (`conf/links.yml`)：
```yaml
groups:
  - id: friends
    name: 好友博客
    icon: 👥

links:
  - name: GitHub
    url: https://github.com
    icon: 🐙
    description: 代码托管平台
    group: friends
```

## 🎨 自定义主题

1. 在 `usr/themes/` 下创建新目录
2. 创建 `style.css` 文件
3. 可选：创建 `theme.yml` 描述主题信息
4. 在配置中设置 `theme.active` 为新主题名

## 📜 命令参考

```bash
# 项目初始化（复制示例文件）
node init.js

# 构建索引
node build.js

# 本地开发（构建 + 启动服务器）
node serve.js
node serve.js 3000  # 指定端口

# 备份（默认版本号命名）
node backup.js

# 备份（时间戳命名）
node backup.js --mode=ts

# 备份（日期命名）
node backup.js --mode=date

# 备份（自定义名称）
node backup.js --name=my-backup
```

## 🐳 Docker 部署

### 开箱即用

Docker 镜像内置默认演示站点，首次启动时：
- 挂载目录为空 → 自动复制默认内容（配置、文章、主题）
- 挂载目录非空 → 使用您的自定义内容

### 快速启动

```bash
cd docker
chmod +x entrypoint.sh

# 新版 Docker（推荐）
docker compose up -d --build

# 旧版 Docker
docker-compose up -d --build
```

访问 `http://localhost:8080` 即可看到演示站点。

### 自定义内容

启动后在 `docker/data/` 目录编辑：

```
docker/data/
├── conf/config.yml      # 站点配置
├── posts/               # 文章目录
├── pages/               # 自定义页面
├── assets/              # 静态资源
└── usr/themes/          # 主题目录
```

修改后重启容器生效：

```bash
docker compose restart
```

### 使用部署脚本

```bash
cd docker
chmod +x deploy.sh

./deploy.sh start    # 启动
./deploy.sh stop     # 停止
./deploy.sh restart  # 重启
./deploy.sh logs     # 查看日志
./deploy.sh clean    # 清理

# 指定端口
PORT=3000 ./deploy.sh start
```

### 常用 Docker Compose 命令

```bash
docker compose up -d --build    # 构建并启动
docker compose logs -f          # 查看日志
docker compose restart          # 重启
docker compose down             # 停止
docker compose down -v          # 停止并删除数据卷
```

### 安全特性

- Node.js 22 LTS Alpine 官方镜像（轻量、安全）
- 非 root 用户运行
- 资源限制（128MB 内存、0.5 CPU）
- 无额外 npm 依赖，避免供应链攻击

## 📄 License

MIT License

## 配置校验（build 前置）

从当前版本开始，`node build.js` 在生成索引前会先执行配置结构校验，发现错误会直接中断构建。

已覆盖的关键规则：
- `display.postsPerPage` 必须是大于等于 `1` 的整数
- `categories`/`pages`/`nav` 必须是数组，且核心字段必填
- `categories.id`、`pages.id` 不允许重复
- `pages.type=markdown` 必须有 `source`
- `pages.type=category` 必须有合法 `categoryId`，且该分类必须存在
- `features.moments|links|gallery.enabled=true` 时必须配置 `source`

常见报错示例：
- `display.postsPerPage 必须是大于等于 1 的整数`
- `pages[1].categoryId 引用不存在的分类: xxx`
- `features.gallery.enabled=true 时，source 必须是非空字符串`

建议流程：
1. 修改 `conf/config.yml` 后先运行 `node build.js`
2. 按报错逐条修正配置
3. 构建通过后再运行 `node serve.js` 预览
