#!/usr/bin/env sh

set -eu

WORKSPACE_DIR="/app/workspace/site"
SEED_DIR="/app/examples/docker-seed/site"

is_empty_dir() {
  target="$1"
  mkdir -p "$target"
  if [ -z "$(find "$target" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]; then
    return 0
  fi
  return 1
}

echo "=========================================="
echo "  Static blog container"
echo "=========================================="
echo ""

mkdir -p "$WORKSPACE_DIR"

if is_empty_dir "$WORKSPACE_DIR"; then
  echo "[INIT] workspace/site is empty, seeding the modern starter..."
  cp -R "$SEED_DIR"/. "$WORKSPACE_DIR"/
else
  echo "[OK] Using existing workspace/site content."
fi

if [ ! -f "$WORKSPACE_DIR/config/blog.config.yml" ]; then
  echo "[ERROR] Missing workspace config: $WORKSPACE_DIR/config/blog.config.yml"
  exit 1
fi

echo "[START] Serving blog on port ${PORT:-8080}"
echo "[INFO] Open http://localhost:${PORT:-8080}"
echo ""

exec node serve.js "${PORT:-8080}"
