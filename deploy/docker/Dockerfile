# ═══════════════════════════════════════════════════════
# Static Markdown Blog — Dockerfile
# 基于 Node.js 22 Alpine，构建并运行静态博客服务
# ═══════════════════════════════════════════════════════

FROM node:22-alpine

WORKDIR /app

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
