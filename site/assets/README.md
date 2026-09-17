# 静态资源目录

此目录用于存放博客的静态资源文件。

## 目录结构

```
assets/
├── favicon.ico          # 网站图标（可选）
├── logo.png             # 网站 Logo（可选）
├── gallery/             # 媒体资源（按 gallery.yml 分组组织）
│   ├── identity/        # 品牌资产（示例分组）
│   ├── posters/         # 视觉基线（示例分组）
│   └── demos/           # 媒体演示（示例分组，含图片/视频/音频/文件）
└── images/              # 文章配图（可选）
```

## 使用说明

1. 将网站图标放在 `assets/favicon.ico`
2. 媒体资源（图片/视频/音频/文件）按分组放在 `gallery/` 子目录下
3. 文章配图可放在 `images/` 目录，在 Markdown 中引用

## 资源配置

在 `site/content/data/gallery.yml` 中配置资源分组（各类型扩展名与扫描类型），
路径指向此目录下的子文件夹。媒体类型与展示行为详见 `site/README.md` 第 2.3 节。
