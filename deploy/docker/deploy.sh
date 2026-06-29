#!/usr/bin/env sh

set -eu

IMAGE_NAME="static-blog"
CONTAINER_NAME="static-blog"
PORT="${PORT:-8080}"

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
WORKSPACE_DIR="$PROJECT_DIR/site"

log_info() { echo "[INFO] $1"; }
log_warn() { echo "[WARN] $1"; }
log_error() { echo "[ERROR] $1" >&2; }

build() {
  log_info "Building Docker image..."
  docker build -t "$IMAGE_NAME" -f "$SCRIPT_DIR/Dockerfile" "$PROJECT_DIR"
}

init() {
  log_info "Initializing site/ from container defaults..."
  mkdir -p "$WORKSPACE_DIR"

  if [ -n "$(find "$WORKSPACE_DIR" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]; then
    log_warn "site/ already has content. Skipping initialization."
    exit 0
  fi

  build
  docker create --name "${CONTAINER_NAME}-init" "$IMAGE_NAME" >/dev/null
  docker cp "${CONTAINER_NAME}-init:/app/site/." "$WORKSPACE_DIR"/
  docker rm "${CONTAINER_NAME}-init" >/dev/null
  log_info "site/ initialized."
}

start() {
  if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
    log_warn "Container is already running."
    exit 0
  fi

  if ! docker images -q "$IMAGE_NAME" | grep -q .; then
    build
  fi

  mkdir -p "$WORKSPACE_DIR"

  if docker ps -aq -f name="$CONTAINER_NAME" | grep -q .; then
    docker rm -f "$CONTAINER_NAME" >/dev/null
  fi

  log_info "Starting container on http://localhost:${PORT}"
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p "${PORT}:8080" \
    -v "$WORKSPACE_DIR:/app/site" \
    --security-opt no-new-privileges:true \
    --tmpfs /tmp \
    --memory 128m \
    --cpus 0.5 \
    "$IMAGE_NAME" >/dev/null
}

stop() {
  if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
    docker stop "$CONTAINER_NAME" >/dev/null
    log_info "Container stopped."
  else
    log_warn "Container is not running."
  fi
}

restart() {
  stop
  start
}

rebuild() {
  if ! docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
    log_error "Container is not running."
    exit 1
  fi
  docker exec "$CONTAINER_NAME" node build.js
}

logs() {
  docker logs -f "$CONTAINER_NAME"
}

shell() {
  docker exec -it "$CONTAINER_NAME" /bin/sh
}

clean() {
  printf "Remove the container and image? [y/N]: "
  read -r confirm
  if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
    docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
    docker rmi "$IMAGE_NAME" 2>/dev/null || true
    log_info "Docker artifacts removed."
  fi
}

help() {
  cat <<EOF
Static blog Docker helper

Usage: ./deploy.sh [command]

Commands:
  init     Seed site/ from the bundled defaults
  start    Start the container
  stop     Stop the container
  restart  Restart the container
  build    Rebuild the image
  rebuild  Run node build.js inside the container
  logs     Follow container logs
  shell    Open a shell in the container
  clean    Remove the container and image
EOF
}

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
