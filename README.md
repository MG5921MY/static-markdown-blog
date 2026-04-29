# Static Markdown Blog

这是一个以 Markdown 为唯一正文来源的静态博客系统，当前正式模型已经切到：

- `workspace/site/` 是唯一用户工作区
- `examples/` 统一管理示例与 Docker seed
- `legacy/` 只保留旧结构迁移输入
- 根目录 `config/ + content/ + assets/ + themes/` 作为仓库内置基线与开发默认源

## 目录模型

```text
config/                    # 仓库内置默认配置
content/                   # 仓库内置默认内容
assets/                    # 仓库内置默认资源
themes/                    # 内置主题
docs/                      # 正式文档
scripts/                   # 维护脚本与迁移脚本
examples/
  starter-modern/site/     # 新结构示例站点
  starter-legacy/          # 旧结构示例
  docker-seed/site/        # Docker 首次启动种子
legacy/
  site/                    # 旧根目录结构迁移后的存档输入
workspace/
  site/                    # 用户真正编辑、挂载、备份的数据根
dist/                      # 构建产物
```

正式用户数据根固定为：

```text
workspace/site/
  config/blog.config.yml
  content/posts/**/*.md
  content/pages/*.md
  content/data/{moments,links,gallery}.yml
  assets/
  themes/custom/
```

## 快速开始

### 1. 初始化工作区

Windows PowerShell:

```powershell
.\init.ps1
```

Node:

```bash
node init.js
```

Linux / macOS:

```bash
chmod +x init.sh
./init.sh
```

初始化会把 `examples/starter-modern/site/` 复制到 `workspace/site/`。

### 2. 编辑内容

- 站点配置：`workspace/site/config/blog.config.yml`
- 文章：`workspace/site/content/posts/**/*.md`
- 页面：`workspace/site/content/pages/*.md`
- 数据页：`workspace/site/content/data/{moments,links,gallery}.yml`
- 资源：`workspace/site/assets/`
- 自定义主题：`workspace/site/themes/custom/<theme-id>/`

### 3. 构建

```bash
node build.js
```

构建器读取顺序：

1. `workspace/site/config/blog.config.yml`
2. `config/blog.config.yml`
3. legacy 仅在显式开启 `BLOG_ENABLE_LEGACY=1` 时才作为兼容输入

### 4. 本地预览

根路径预览：

```bash
node serve.js
```

子路径预览：

```bash
node serve.js 8080 /blog/
```

## Legacy 迁移

旧目录结构不再作为根目录长期公开入口。仓库当前把旧输入收进：

```text
legacy/site/
  conf/
  posts/
  pages/
  usr/themes/
```

如需导入 legacy 内容到新工作区，执行：

```bash
node scripts/migrate-legacy-to-workspace.js
```

该脚本会：

- 读取 `legacy/site/` 下的旧配置、文章、页面、数据和主题
- 转换为 `workspace/site/` 新结构
- 保留 legacy 原文件，不自动删除
- 输出迁移报告到 `output/legacy-migration-report.json`

## Docker

Docker 已切到单一工作区挂载模型：

- Host: `workspace/site`
- Container: `/app/workspace/site`

Compose 文件位于 `docker/` 目录，因此默认挂载写法是：

```yaml
volumes:
  - ../workspace/site:/app/workspace/site
```

首次启动如果挂载目录为空，容器会自动使用 `examples/docker-seed/site/` 初始化。

常用命令：

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

或使用辅助脚本：

```bash
./docker/deploy.sh init
./docker/deploy.sh start
```

Windows:

```powershell
.\docker\deploy.ps1 init
.\docker\deploy.ps1 start
```

## 主题系统

内置主题接口固定为：

```text
themes/<theme-id>/
  theme.yml
  theme.css
```

当前内置主题：

- `graphite`：默认，克制、偏开发者
- `aurora`：更偏品牌展示
- `paper`：阅读优先
- `mono`：黑白极简

工作区自定义主题放在：

```text
workspace/site/themes/custom/<theme-id>/
  theme.yml
  theme.css
```

## 运行时约定

以下 helper 是正式约定，不再改名：

- `Blog.resolveBasePath()`
- `Blog.resolveAsset(path)`
- `Blog.resolvePageUrl(page, params?)`

模板、资源、JSON 数据与页面跳转都应围绕这组 helper 保持 base-path agnostic。

## 相关文档

- `docs/architecture/blog-rebuild-plan.md`
- `docs/architecture/theme-design-baseline.md`
