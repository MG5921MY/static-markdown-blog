# 静态资源目录

此目录用于存放博客的静态资源文件。

## 目录结构

```
assets/
├── favicon.ico          # 网站图标（可选）
├── logo.png             # 网站 Logo（可选）
├── gallery/             # 图库图片
│   ├── photos/          # 摄影作品
│   ├── wallpapers/      # 壁纸收藏
│   └── screenshots/     # 截图记录
└── images/              # 文章配图（可选）
```

## 使用说明

1. 将网站图标放在 `assets/favicon.ico`
2. 图库图片按分组放在 `gallery/` 子目录下
3. 文章配图可放在 `images/` 目录，在 Markdown 中引用

## 图库配置

在 `conf/gallery.yml` 中配置图库分组，路径指向此目录下的子文件夹。
