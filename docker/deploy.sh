#!/bin/bash
# ============================================
# 静态博客 Docker 部署脚本
# 
# 功能：
# - 首次部署时从容器复制初始文件到宿主机
# - 避免空目录挂载覆盖容器内数据
# - 支持热更新配置和文章
#
# 使用方法：
#   chmod +x deploy.sh
#   ./deploy.sh [命令]
#
# 命令：
#   init     - 首次初始化（从容器复制文件）
#   start    - 启动服务
#   stop     - 停止服务
#   restart  - 重启服务
#   build    - 重新构建镜像
#   rebuild  - 仅重新构建索引
#   logs     - 查看日志
#   shell    - 进入容器
#   clean    - 清理容器和镜像
# ============================================

set -e

# 配置
IMAGE_NAME="static-blog"
CONTAINER_NAME="static-blog"
PORT="${PORT:-8080}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$SCRIPT_DIR"

# 首次初始化：从容器复制文件到宿主机
init() {
    log_info "首次初始化..."
    
    # 检查是否已有数据
    if [ -f "$PROJECT_DIR/conf/config.yml" ]; then
        log_warn "检测到已有配置文件，跳过初始化"
        log_warn "如需重新初始化，请先删除 conf/config.yml"
        return 0
    fi
    
    # 构建镜像
    log_info "构建 Docker 镜像..."
    docker build -t "$IMAGE_NAME" -f Dockerfile "$PROJECT_DIR"
    
    # 创建临时容器（不启动）
    log_info "创建临时容器..."
    docker create --name "${CONTAINER_NAME}-init" "$IMAGE_NAME"
    
    # 从容器复制文件到宿主机
    log_info "从容器复制初始文件..."
    
    # 复制配置
    docker cp "${CONTAINER_NAME}-init:/app/conf" "$PROJECT_DIR/"
    
    # 复制示例文章
    docker cp "${CONTAINER_NAME}-init:/app/posts" "$PROJECT_DIR/"
    
    # 复制页面
    docker cp "${CONTAINER_NAME}-init:/app/pages" "$PROJECT_DIR/"
    
    # 复制主题
    mkdir -p "$PROJECT_DIR/usr"
    docker cp "${CONTAINER_NAME}-init:/app/usr/themes" "$PROJECT_DIR/usr/"
    
    # 复制资源
    docker cp "${CONTAINER_NAME}-init:/app/assets" "$PROJECT_DIR/"
    
    # 删除临时容器
    docker rm "${CONTAINER_NAME}-init"
    
    log_info "初始化完成！"
    log_info "请编辑 $PROJECT_DIR/conf/config.yml 配置站点信息"
}

# 构建镜像
build() {
    log_info "构建 Docker 镜像..."
    docker build -t "$IMAGE_NAME" -f Dockerfile "$PROJECT_DIR"
    log_info "构建完成"
}

# 启动服务
start() {
    # 检查是否已运行
    if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
        log_warn "容器已在运行"
        return 0
    fi
    
    # 检查是否存在已停止的容器
    if docker ps -aq -f name="$CONTAINER_NAME" | grep -q .; then
        log_info "启动已存在的容器..."
        docker start "$CONTAINER_NAME"
    else
        # 检查镜像是否存在
        if ! docker images -q "$IMAGE_NAME" | grep -q .; then
            build
        fi
        
        log_info "创建并启动容器..."
        docker run -d \
            --name "$CONTAINER_NAME" \
            --restart unless-stopped \
            -p "${PORT}:8080" \
            -v "$PROJECT_DIR/conf:/app/conf:ro" \
            -v "$PROJECT_DIR/posts:/app/posts:ro" \
            -v "$PROJECT_DIR/pages:/app/pages:ro" \
            -v "$PROJECT_DIR/usr/themes:/app/usr/themes:ro" \
            -v "$PROJECT_DIR/assets:/app/assets:ro" \
            --security-opt no-new-privileges:true \
            --read-only \
            --tmpfs /tmp \
            --memory 128m \
            --cpus 0.5 \
            "$IMAGE_NAME"
    fi
    
    log_info "服务已启动: http://localhost:${PORT}"
}

# 停止服务
stop() {
    if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
        log_info "停止容器..."
        docker stop "$CONTAINER_NAME"
        log_info "服务已停止"
    else
        log_warn "容器未运行"
    fi
}

# 重启服务
restart() {
    stop
    # 删除旧容器以应用新配置
    if docker ps -aq -f name="$CONTAINER_NAME" | grep -q .; then
        docker rm "$CONTAINER_NAME"
    fi
    start
}

# 仅重新构建索引（进入容器执行）
rebuild() {
    if ! docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
        log_error "容器未运行，请先启动服务"
        exit 1
    fi
    
    log_info "重新构建索引..."
    docker exec "$CONTAINER_NAME" node build.js
    log_info "索引构建完成"
}

# 查看日志
logs() {
    docker logs -f "$CONTAINER_NAME"
}

# 进入容器
shell() {
    docker exec -it "$CONTAINER_NAME" /bin/sh
}

# 清理
clean() {
    log_warn "这将删除容器和镜像，确定吗？[y/N]"
    read -r confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        stop 2>/dev/null || true
        docker rm "$CONTAINER_NAME" 2>/dev/null || true
        docker rmi "$IMAGE_NAME" 2>/dev/null || true
        log_info "清理完成"
    else
        log_info "已取消"
    fi
}

# 显示帮助
help() {
    echo "静态博客 Docker 部署脚本"
    echo ""
    echo "使用方法: ./deploy.sh [命令]"
    echo ""
    echo "命令:"
    echo "  init     - 首次初始化（从容器复制文件到宿主机）"
    echo "  start    - 启动服务"
    echo "  stop     - 停止服务"
    echo "  restart  - 重启服务（应用配置更改）"
    echo "  build    - 重新构建镜像"
    echo "  rebuild  - 仅重新构建索引"
    echo "  logs     - 查看日志"
    echo "  shell    - 进入容器"
    echo "  clean    - 清理容器和镜像"
    echo ""
    echo "环境变量:"
    echo "  PORT     - 服务端口（默认: 8080）"
    echo ""
    echo "示例:"
    echo "  ./deploy.sh init      # 首次部署"
    echo "  ./deploy.sh start     # 启动服务"
    echo "  PORT=3000 ./deploy.sh start  # 指定端口启动"
}

# 主入口
case "${1:-help}" in
    init)    init ;;
    start)   start ;;
    stop)    stop ;;
    restart) restart ;;
    build)   build ;;
    rebuild) rebuild ;;
    logs)    logs ;;
    shell)   shell ;;
    clean)   clean ;;
    *)       help ;;
esac
