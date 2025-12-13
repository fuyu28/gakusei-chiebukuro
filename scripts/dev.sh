#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

BACKEND_CMD="cd \"$ROOT_DIR/backend\" && bun run dev"
FRONTEND_CMD="cd \"$ROOT_DIR/frontend\" && NEXT_PUBLIC_API_BASE_URL=\${NEXT_PUBLIC_API_BASE_URL:-http://localhost:3000/api} bun run dev"

pids=()

wait_for_url() {
  local name="$1"
  local url="$2"
  local timeout="${3:-30}"
  local start
  start=$(date +%s)

  echo "Waiting for $name at $url ..."

  while true; do
    if command -v curl >/dev/null 2>&1; then
      if curl -fsS "$url" >/dev/null 2>&1; then
        echo "$name is up."
        return 0
      fi
    fi

    if command -v nc >/dev/null 2>&1; then
      # Strip protocol/host/port from url to get host:port for nc
      local hostport
      hostport=$(echo "$url" | sed -E 's#^[a-z]+://##' | cut -d/ -f1)
      local host
      local port
      host=$(echo "$hostport" | cut -d: -f1)
      port=$(echo "$hostport" | cut -d: -f2)
      if nc -z "$host" "$port" >/dev/null 2>&1; then
        echo "$name is up (port check)."
        return 0
      fi
    fi

    if [ $(( $(date +%s) - start )) -ge "$timeout" ]; then
      echo "Timed out waiting for $name."
      return 1
    fi

    sleep 1
  done
}

cleanup() {
  for pid in "${pids[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
}

trap 'cleanup' INT TERM EXIT

echo "Starting backend: $BACKEND_CMD"
bash -c "$BACKEND_CMD" &
pids+=("$!")

wait_for_url "backend" "http://localhost:3000/api/health" 40 || true

echo "Starting frontend: $FRONTEND_CMD"
bash -c "$FRONTEND_CMD" &
pids+=("$!")

wait_for_url "frontend" "http://localhost:8080" 40 || true

echo "Both dev servers started (or attempted). Press Ctrl+C to stop."

wait -n || true
