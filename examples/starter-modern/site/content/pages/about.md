# 关于这个博客

这是一个以 Markdown 为唯一正文来源的静态博客项目。

这次重构的重点不是“换一层皮”，而是把项目真正整理成一套适合长期维护的静态内容系统：

- 内容入口收敛到 `content/`
- 主配置收敛到 `config/blog.config.yml`
- 主题改为 token 驱动，而不是整页 CSS 复制
- 构建产物统一输出到 `dist/`
- 兼容旧目录输入，但不再把旧结构当作默认创作方式
- 运行时默认支持任意子路径部署

如果你是第一次打开这个仓库，建议先看：

1. 首页
2. `content/posts/guide/getting-started.md`
3. `docs/architecture/blog-rebuild-plan.md`
4. `docs/architecture/theme-design-baseline.md`
