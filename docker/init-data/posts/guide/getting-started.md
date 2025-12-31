---
title: 快速开始
date: 2025-01-01
tags: [入门, Docker]
---

# 快速开始

恭喜！您已成功运行静态博客 Docker 容器。

## 当前状态

您看到的是默认的演示站点。要创建您自己的博客，请按以下步骤操作。

## 自定义您的博客

### 1. 准备目录结构

在宿主机创建以下目录：

```
my-blog/
├── conf/
│   └── config.yml      # 站点配置
├── posts/              # 文章目录
│   └── your-post.md
├── pages/              # 自定义页面
│   └── about.md
├── assets/             # 静态资源
└── usr/themes/         # 自定义主题（可选）
```

### 2. 创建配置文件

从容器复制示例配置：

```bash
docker cp static-blog:/app/docker/init-data/conf/config.yml ./conf/
```

或手动创建 `conf/config.yml`，参考文档配置。

### 3. 编写文章

在 `posts/` 目录下创建 Markdown 文件：

```markdown
---
title: 我的第一篇文章
date: 2025-01-01
tags: [标签1, 标签2]
---

# 正文

这里是文章内容...
```

### 4. 重启容器

```bash
docker restart static-blog
```

容器会自动检测到您的配置文件并使用它们。

## 目录挂载说明

| 容器路径 | 说明 | 必需 |
|---------|------|------|
| /app/conf | 配置文件 | 是 |
| /app/posts | 文章目录 | 是 |
| /app/pages | 自定义页面 | 否 |
| /app/assets | 静态资源 | 否 |
| /app/usr/themes | 自定义主题 | 否 |

## 下一步

- 阅读 [配置说明](./config-guide.md) 了解所有配置项
- 查看 [功能介绍](../features/) 了解系统特性
