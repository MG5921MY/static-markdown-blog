# ROADMAP

## 项目定位

面向所有人的静态博客平台，替代"丑/停更/过时"的现有方案。

## 发行方式

1. **源码构建** — `node init.js && node build.js && node serve.js`
2. **Docker 部署** — `docker compose -f docker/docker-compose.yml up -d --build`
3. **npm 安装**（开发中）— `npm install -g static-markdown-blog && blog init && blog build`

## 已完成

### P0 — 致命缺陷
- ✅ 构建时 Markdown → HTML 渲染
- ✅ package.json + CLI 入口

### P1 — 严重缺失
- ✅ RSS / sitemap / i18n / 暗色模式 / 字体加载 / 热重载

### P2 — 开发体验
- ✅ 草稿系统 / 文章导航 / formatDate locale
- ✅ 目录结构重构（src/ + site/ 分离）
- ✅ 统一路径管理（src/kernel/paths.js）
- ✅ Docker 全面修复
- ✅ 关于页面 + 图库数据加载修复

### P2.5 — 主题引擎
- ✅ 布局 token / 选择器文档 / theme.js / 模板覆盖

### P3 — 功能扩展
- ✅ 评论 / 搜索 / 数学公式 / 流程图 / 打印 / 代码复制
- ✅ 语言切换面板 / SSG / OG tags / reduced-motion
- ✅ 自动化测试（212 项）

## 未完成

### P4 — 生态
- 英文文档
- npm 发布
- 主题市场
