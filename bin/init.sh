#!/usr/bin/env sh

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
SOURCE_DIR="$ROOT_DIR/examples/starter-modern/site"
TARGET_DIR="$ROOT_DIR/workspace/site"

list_entries() {
  target="$1"
  if [ ! -d "$target" ]; then
    return 0
  fi
  find "$target" -mindepth 1 -maxdepth 1 ! -name ".gitkeep" -print
}

has_meaningful_content() {
  target="$1"
  if [ ! -d "$target" ]; then
    return 1
  fi
  if [ -n "$(list_entries "$target")" ]; then
    return 0
  fi
  return 1
}

confirm_overwrite() {
  target="$1"
  echo ""
  echo "Target already has content: $target"
  i=1
  while [ "$i" -le 3 ]; do
    printf "Overwrite workspace data? (%s/3) [y/N]: " "$i"
    read -r answer
    answer="$(printf "%s" "$answer" | tr '[:upper:]' '[:lower:]')"
    if [ "$answer" != "y" ] && [ "$answer" != "yes" ]; then
      return 1
    fi
    i=$((i + 1))
  done
  return 0
}

echo ""
echo "Static blog workspace initializer"
echo ""
echo "Source : $SOURCE_DIR"
echo "Target : $TARGET_DIR"
echo ""

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Starter site not found: $SOURCE_DIR" >&2
  exit 1
fi

printf "Initialize workspace/site from the modern starter? [Y/n]: "
read -r start_answer
start_answer="$(printf "%s" "$start_answer" | tr '[:upper:]' '[:lower:]')"
if [ "$start_answer" = "n" ] || [ "$start_answer" = "no" ]; then
  echo ""
  echo "Initialization cancelled."
  exit 0
fi

if has_meaningful_content "$TARGET_DIR"; then
  if ! confirm_overwrite "$TARGET_DIR"; then
    echo ""
    echo "Initialization cancelled."
    exit 0
  fi
  rm -rf "$TARGET_DIR"
fi

mkdir -p "$TARGET_DIR"
cp -R "$SOURCE_DIR"/. "$TARGET_DIR"/

echo ""
echo "Workspace initialized."
echo "Next steps:"
echo "1. Edit workspace/site/config/blog.config.yml"
echo "2. Add posts under workspace/site/content/posts/"
echo "3. Run node build.js"
echo "4. Run node serve.js"
echo ""
