---
title: 图库功能
date: 2025-01-01
tags: [功能, 图库]
---

# 图库功能

相册式图片展示，支持分组和文件夹递归扫描。

## 特性

- 分组管理（摄影、壁纸、截图等）
- 自动递归扫描子文件夹
- 瀑布流布局
- Lightbox 灯箱放大查看
- 键盘导航（← → Esc）
- 懒加载优化
- 分页加载更多

## 配置方式

1. 创建图片目录：

```
assets/gallery/
├── photos/          # 摄影作品
│   ├── 2024/
│   └── 2025/
├── wallpapers/      # 壁纸收藏
└── screenshots/     # 截图记录
```

2. 在 `conf/gallery.yml` 中配置：

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
    
  - id: wallpapers
    name: 壁纸收藏
    icon: 🖼️
    path: assets/gallery/wallpapers
```

3. 在 `config.yml` 中启用：

```yaml
features:
  gallery:
    enabled: true
    source: conf/gallery.yml
```

4. 在导航栏添加入口：

```yaml
nav:
  - name: 图库
    url: ./gallery.html
```

## 查看演示

点击导航栏的「图库」查看效果。

> 注意：默认演示站点没有图片，请添加您自己的图片到 `assets/gallery/` 目录。
