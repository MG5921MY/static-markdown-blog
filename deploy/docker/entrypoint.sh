#!/usr/bin/env sh
# ═══════════════════════════════════════════════════════
# Static Markdown Blog — 容器入口脚本
#
# 首次启动时根据 INIT_MODE 环境变量初始化 site/ 目录：
#   seed  — 复制默认示例内容（默认）
#   empty — 只创建空目录结构
#   force — 强制重新初始化（覆盖已有内容）
# ═══════════════════════════════════════════════════════

set -eu

WORKSPACE_DIR="/app/site"
INIT_MODE="${INIT_MODE:-seed}"

# ── 工具函数 ──────────────────────────────────────────

# 检查目录是否为空
is_empty_dir() {
  target="$1"
  mkdir -p "$target"
  if [ -z "$(find "$target" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]; then
    return 0
  fi
  return 1
}

# 创建空目录结构（不含示例内容）
create_empty_structure() {
  mkdir -p "$WORKSPACE_DIR"/{content/{posts,pages,data},assets,themes}
  # 创建最小配置文件
  if [ ! -f "$WORKSPACE_DIR/config.yml" ]; then
    cat > "$WORKSPACE_DIR/config.yml" <<'EOF'
site:
  name: My Blog
  description: A static blog powered by Markdown.
theme:
  active: graphite
content:
  categories: []
  pages: []
nav:
  - name: 首页
    page: index
EOF
  fi
}

# 复制默认示例内容（从 /app/site-defaults/ 到 /app/site/）
seed_example_content() {
  cp -R /app/site-defaults/. "$WORKSPACE_DIR"/
}

# ── 主逻辑 ────────────────────────────────────────────

echo "=========================================="
echo "  Static Markdown Blog"
echo "  INIT_MODE=$INIT_MODE"
echo "=========================================="
echo ""

mkdir -p "$WORKSPACE_DIR"

case "$INIT_MODE" in
  force)
    # 强制重新初始化：清空并重新填充
    echo "[INIT] Force mode: reinitializing site/..."
    rm -rf "$WORKSPACE_DIR"/*
    seed_example_content
    echo "[OK] site/ reinitialized with example content."
    ;;

  empty)
    # 空结构模式：只创建目录和最小配置
    if is_empty_dir "$WORKSPACE_DIR"; then
      echo "[INIT] Empty mode: creating directory structure..."
      create_empty_structure
      echo "[OK] Empty site/ structure created."
    else
      echo "[OK] Using existing site/ content."
    fi
    ;;

  seed|*)
    # 种子模式（默认）：空目录时复制示例内容
    if is_empty_dir "$WORKSPACE_DIR"; then
      echo "[INIT] Seed mode: copying example content..."
      seed_example_content
      echo "[OK] Example content seeded."
    else
      echo "[OK] Using existing site/ content."
    fi
    ;;
esac

# ── 校验配置文件 ──────────────────────────────────────

if [ ! -f "$WORKSPACE_DIR/config.yml" ]; then
  echo "[ERROR] Missing workspace config: $WORKSPACE_DIR/config.yml"
  echo "[HINT]  Set INIT_MODE=seed or INIT_MODE=empty to auto-create it."
  exit 1
fi

# ── 启动服务 ──────────────────────────────────────────

echo ""
echo "[START] Serving blog on port ${PORT:-8080}"
echo "[INFO]  Open http://localhost:${PORT:-8080}"
echo ""

exec node serve.js "${PORT:-8080}"
