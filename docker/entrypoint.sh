#!/bin/sh
# ============================================
# 容器启动入口脚本
# 
# 逻辑：
# 1. 检测挂载目录是否为空
# 2. 空目录 → 复制默认内容（开箱即用）
# 3. 非空 → 使用用户内容
# 4. 启动服务器（自动构建索引）
# ============================================

set -e

INIT_DATA="/app/init-data"

echo "=========================================="
echo "  静态博客 Docker 容器"
echo "=========================================="
echo ""

# 检查并初始化目录的函数
init_dir() {
    local target="$1"
    local source="$2"
    local name="$3"
    
    # 确保目标目录存在
    mkdir -p "$target" 2>/dev/null || true
    
    if [ -z "$(ls -A "$target" 2>/dev/null)" ]; then
        echo "[INIT] $name 为空，使用默认内容..."
        if [ -d "$source" ] && [ -n "$(ls -A "$source" 2>/dev/null)" ]; then
            # 使用 cp -a 保留权限，逐个复制避免通配符问题
            for item in "$source"/*; do
                if [ -e "$item" ]; then
                    cp -a "$item" "$target"/ 2>/dev/null || {
                        echo "[WARN] 复制失败: $item (可能是权限问题)"
                    }
                fi
            done
            # 验证复制结果
            if [ -n "$(ls -A "$target" 2>/dev/null)" ]; then
                echo "[OK] $name 初始化完成"
            else
                echo "[WARN] $name 初始化可能失败，目录仍为空"
            fi
        else
            echo "[WARN] 默认 $name 不存在或为空，跳过"
        fi
    else
        echo "[OK] $name 使用用户内容 ($(ls -1 "$target" | wc -l) 项)"
    fi
}

# 初始化各目录
init_dir "/app/conf" "$INIT_DATA/conf" "配置目录"
init_dir "/app/posts" "$INIT_DATA/posts" "文章目录"
init_dir "/app/pages" "$INIT_DATA/pages" "页面目录"
init_dir "/app/usr/themes" "$INIT_DATA/usr/themes" "主题目录"

echo ""

# 检查配置文件
if [ ! -f "/app/conf/config.yml" ]; then
    echo "[ERROR] 配置文件不存在: /app/conf/config.yml"
    echo "[ERROR] 初始化失败，请检查 init-data 目录"
    exit 1
fi

# 启动服务器（serve.js 会自动构建索引）
echo "[START] 启动服务器 (端口: ${PORT:-8080})"
echo "[INFO] 访问 http://localhost:${PORT:-8080}"
echo ""
exec node serve.js "${PORT:-8080}"
