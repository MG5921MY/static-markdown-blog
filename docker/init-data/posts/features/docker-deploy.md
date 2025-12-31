---
title: Docker 部署
date: 2025-01-01
tags: [功能, Docker]
---

# Docker 部署

一条命令启动博客。

## 快速启动

```bash
docker run -d \
  --name static-blog \
  -p 8080:8080 \
  your-registry/static-blog:latest
```

访问 `http://localhost:8080` 即可看到默认站点。

## 自定义部署

```bash
docker run -d \
  --name static-blog \
  -p 8080:8080 \
  -v ./conf:/app/conf \
  -v ./posts:/app/posts \
  -v ./pages:/app/pages \
  -v ./assets:/app/assets \
  your-registry/static-blog:latest
```

## Docker Compose

```yaml
services:
  blog:
    image: your-registry/static-blog:latest
    ports:
      - "8080:8080"
    volumes:
      - ./conf:/app/conf
      - ./posts:/app/posts
      - ./pages:/app/pages
      - ./assets:/app/assets
    restart: unless-stopped
```

## 热更新

修改文章或配置后，重启容器即可：

```bash
docker restart static-blog
```

容器启动时会自动重新构建索引。
