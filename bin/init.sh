#!/usr/bin/env sh
set -eu

# Navigate to project root (parent of bin/)
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo "Static blog workspace initializer"
echo ""

if [ ! -f "$PROJECT_ROOT/init.js" ]; then
  echo "Error: init.js not found in $PROJECT_ROOT" >&2
  exit 1
fi

cd "$PROJECT_ROOT"
exec node init.js "$@"
