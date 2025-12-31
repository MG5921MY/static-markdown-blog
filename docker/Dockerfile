# ============================================
# 静态博客 Docker 构建器
# 使用 Node.js 22 LTS Alpine 官方镜像（安全、轻量）
# 
# 特性：
# - 开箱即用：内置默认演示站点
# - 可自定义：挂载目录非空时使用用户内容
# ============================================

FROM node:22-alpine3.21

WORKDIR /app

# 复制项目核心文件
COPY *.js ./
COPY *.html ./
COPY assets ./assets/
COPY usr ./usr/

# 复制 Docker 初始化数据（默认站点）
COPY docker/init-data /app/init-data/

# 复制入口脚本
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 创建挂载点目录
RUN mkdir -p /app/conf /app/posts /app/pages /app/usr/themes

EXPOSE 8080

ENV PORT=8080
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/ || exit 1

ENTRYPOINT ["/entrypoint.sh"]
