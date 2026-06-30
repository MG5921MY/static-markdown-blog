#!/usr/bin/env sh
# ═══════════════════════════════════════════════════════
# Static Markdown Blog — Docker 部署辅助脚本
#
# 用法: ./deploy.sh [命令]
#
# 命令:
#   init     从容器默认内容初始化 site/ 目录
#   start    启动容器
#   stop     停止容器
#   restart  重启容器
#   build    重新构建镜像
#   rebuild  在容器内执行 node build.js
#   logs     查看容器日志
#   shell    进入容器 shell
#   clean    移除容器和镜像
#   help     显示帮助信息
# ═══════════════════════════════════════════════════════

set -eu

# ── 配置 ──────────────────────────────────────────────

IMAGE_NAME="static-blog"
CONTAINER_NAME="static-blog"
PORT="${PORT:-8080}"

# 自动计算项目根目录（deploy/docker/ → 项目根）
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
WORKSPACE_DIR="$PROJECT_DIR/site"

# ── 工具函数 ──────────────────────────────────────────

log_info() { echo "[INFO] $1"; }
log_warn() { echo "[WARN] $1"; }
log_error() { echo "[ERROR] $1" >&2; }

# ── 命令 ──────────────────────────────────────────────

# 构建 Docker 镜像
build() {
  log_info "Building Docker image..."
  docker build -t "$IMAGE_NAME" -f "$SCRIPT_DIR/Dockerfile" "$PROJECT_DIR"
}

# 从容器默认内容初始化 site/ 目录
init() {
  log_info "Initializing site/ from container defaults..."
  mkdir -p "$WORKSPACE_DIR"

  # 如果 site/ 已有内容，跳过
  if [ -n "$(find "$WORKSPACE_DIR" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]; then
    log_warn "site/ already has content. Skipping initialization."
    log_warn "Use 'docker compose run -e INIT_MODE=force blog' to force reinitialize."
    exit 0
  fi

  # 从镜像中提取默认内容
  build
  docker create --name "${CONTAINER_NAME}-init" "$IMAGE_NAME" >/dev/null
  docker cp "${CONTAINER_NAME}-init:/app/site/." "$WORKSPACE_DIR"/
  docker rm "${CONTAINER_NAME}-init" >/dev/null
  log_info "site/ initialized with example content."
}

# 启动容器
start() {
  # 检查是否已在运行
  if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
    log_warn "Container is already running."
    exit 0
  fi

  # 如果镜像不存在，先构建
  if ! docker images -q "$IMAGE_NAME" | grep -q .; then
    build
  fi

  mkdir -p "$WORKSPACE_DIR"

  # 如果旧容器存在，先移除
  if docker ps -aq -f name="$CONTAINER_NAME" | grep -q .; then
    docker rm -f "$CONTAINER_NAME" >/dev/null
  fi

  log_info "Starting container on http://localhost:${PORT}"
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p "${PORT}:8080" \
    -v "$WORKSPACE_DIR:/app/site" \
    -e INIT_MODE="${INIT_MODE:-seed}" \
    --security-opt no-new-privileges:true \
    --tmpfs /tmp \
    --memory 128m \
    --cpus 0.5 \
    "$IMAGE_NAME" >/dev/null
}

# 停止容器
stop() {
  if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
    docker stop "$CONTAINER_NAME" >/dev/null
    log_info "Container stopped."
  else
    log_warn "Container is not running."
  fi
}

# 重启容器
restart() {
  stop
  start
}

# 在容器内执行构建
rebuild() {
  if ! docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
    log_error "Container is not running."
    exit 1
  fi
  docker exec "$CONTAINER_NAME" node build.js
}

# 查看容器日志
logs() {
  docker logs -f "$CONTAINER_NAME"
}

# 进入容器 shell
shell() {
  docker exec -it "$CONTAINER_NAME" /bin/sh
}

# 移除容器和镜像
clean() {
  printf "Remove the container and image? [y/N]: "
  read -r confirm
  if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
    docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
    docker rmi "$IMAGE_NAME" 2>/dev/null || true
    log_info "Docker artifacts removed."
  fi
}

# 显示帮助
help() {
  cat <<EOF
Static Markdown Blog — Docker 部署辅助脚本

Usage: ./deploy.sh [command]

Commands:
  init     从容器默认内容初始化 site/ 目录
  start    启动容器
  stop     停止容器
  restart  重启容器
  build    重新构建镜像
  rebuild  在容器内执行 node build.js
  logs     查看容器日志
  shell    进入容器 shell
  clean    移除容器和镜像

Environment:
  PORT         服务端口（默认 8080）
  INIT_MODE    初始化模式：seed / empty / force（默认 seed）

Examples:
  ./deploy.sh init                     初始化示例内容
  ./deploy.sh start                    启动容器
  INIT_MODE=empty ./deploy.sh start    启动时只创建空结构
  ./deploy.sh rebuild                  重新构建博客
  ./deploy.sh logs                     查看日志
EOF
}

# ── 入口 ──────────────────────────────────────────────

case "${1:-help}" in
  init) init ;;
  start) start ;;
  stop) stop ;;
  restart) restart ;;
  build) build ;;
  rebuild) rebuild ;;
  logs) logs ;;
  shell) shell ;;
  clean) clean ;;
  *) help ;;
esac
