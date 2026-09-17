FROM node:22-alpine

WORKDIR /app

# ── OCI 元数据（Forgejo/ghcr 包页面展示）────────────────
# 注意：github 构建时 title/description/source 会被 metadata-action
# 生成值覆盖（既有行为）；readme label 两端均生效。
# readme 为单行文本（Dockerfile LABEL 不支持真实换行），
# 完整使用说明见镜像内 /app/README.md 与项目仓库。
LABEL org.opencontainers.image.title="Static Markdown Blog"
LABEL org.opencontainers.image.description="零依赖静态博客平台（Markdown + Token 主题 + Docker）"
LABEL org.opencontainers.image.version="1.4.1"
LABEL org.opencontainers.image.source="https://github.com/MG5921MY/static-markdown-blog"
LABEL org.opencontainers.image.licenses="Apache-2.0"
LABEL org.opencontainers.image.readme="Static Markdown Blog — 零依赖静态博客平台（Markdown 写作 + Token 驱动主题 + Docker 部署）。运行：docker run -d -p 8080:8080 -v /path/to/your/site:/app/site -e INIT_MODE=seed <your-registry>/<owner>/static-markdown-blog:latest。环境变量：PORT（默认 8080）、INIT_MODE（seed/empty/force）。完整使用说明见镜像内 /app/README.md 与项目 README（https://github.com/MG5921MY/static-markdown-blog）。"

# ── 复制平台代码 ──────────────────────────────────────
# 构建引擎 + 客户端模块
COPY src ./src/
# 5 个内置主题
COPY res/themes ./res/themes/
# 中英双语翻译
COPY res/locales ./res/locales/
# 第三方库 (marked, lunr, katex)
COPY res/vendor ./res/vendor/
# CLI 入口
COPY bin ./bin/
# build.js, serve.js, init.js, test.js
COPY *.js ./
# package.json
COPY *.json ./
# favicon
COPY *.ico ./
# 项目文档（镜像内可读，含完整使用说明）
COPY README.md ./README.md

# ── 复制用户工作区（作为默认种子内容）──────────────────
# 注意：必须复制到 /app/site-defaults/，不能复制到 /app/site/
# 因为 docker-compose 会把宿主机 site/ 挂载到 /app/site/，
# 如果源和目标相同，cp 会报 "are the same file" 错误。
COPY site ./site-defaults/

# ── 入口脚本 ──────────────────────────────────────────
COPY deploy/docker/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh \
    && mkdir -p /app/dist

# ── 端口与环境变量 ────────────────────────────────────
EXPOSE 8080

ENV PORT=8080
ENV NODE_ENV=production
# INIT_MODE 控制首次启动时 site/ 目录的初始化行为：
#   seed  — 空目录时复制默认示例内容（默认）
#   empty — 空目录时只创建空目录结构
#   force — 每次启动都强制重新初始化
ENV INIT_MODE=seed

# ── 健康检查 ──────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/ || exit 1

ENTRYPOINT ["/entrypoint.sh"]
