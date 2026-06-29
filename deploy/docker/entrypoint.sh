#!/usr/bin/env sh

set -eu

WORKSPACE_DIR="/app/site"

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
  echo "[INIT] site/ is empty, seeding from defaults..."
  cp -R /app/site/. "$WORKSPACE_DIR"/
else
  echo "[OK] Using existing site/ content."
fi

if [ ! -f "$WORKSPACE_DIR/config.yml" ]; then
  echo "[ERROR] Missing workspace config: $WORKSPACE_DIR/config.yml"
  exit 1
fi

echo "[START] Serving blog on port ${PORT:-8080}"
echo "[INFO] Open http://localhost:${PORT:-8080}"
echo ""

exec node serve.js "${PORT:-8080}"
