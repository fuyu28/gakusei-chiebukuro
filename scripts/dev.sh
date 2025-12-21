#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

BACKEND_CMD="cd \"$ROOT_DIR/backend\"; exec bun run dev"
FRONTEND_CMD="cd \"$ROOT_DIR/frontend\"; NEXT_PUBLIC_API_BASE_URL=\${NEXT_PUBLIC_API_BASE_URL:-http://localhost:3000/api} exec bun run dev"

pids=()

start_bg() {
  local name="$1"
  local cmd="$2"

  echo "Starting $name: $cmd"
  # setsid で新しいセッション(=新しいプロセスグループ)で起動
  setsid bash -lc "$cmd" >/tmp/${name}.log 2>&1 &
  local pid=$!
  pids+=("$pid")
  echo "$name pid=$pid"
}

wait_for_url() {
  local name="$1"
  local url="$2"
  local pid="$3"
  local timeout="${4:-30}"
  local start
  start=$(date +%s)

  echo "Waiting for $name at $url ..."

  while true; do
    # 起動元が死んでたら即失敗（ここが大事）
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "$name process exited while waiting. (see /tmp/${name}.log)"
      return 1
    fi

    if command -v curl >/dev/null 2>&1; then
      if curl -fsS "$url" >/dev/null 2>&1; then
        echo "$name is up."
        return 0
      fi
    fi

    if [ $(($(date +%s) - start)) -ge "$timeout" ]; then
      echo "Timed out waiting for $name."
      return 1
    fi

    sleep 1
  done
}

cleanup() {
  set +e
  for pid in "${pids[@]:-}"; do
    # プロセスグループごと殺す（-PID）
    kill -- -"$pid" 2>/dev/null || true
  done
  # ゾンビ回収
  wait 2>/dev/null || true
}

trap 'cleanup; exit 130' INT TERM
trap 'cleanup' EXIT

start_bg "backend" "$BACKEND_CMD"
backend_pid="${pids[-1]}"
wait_for_url "backend" "http://localhost:3000/api/health" "$backend_pid" 40

start_bg "frontend" "$FRONTEND_CMD"
frontend_pid="${pids[-1]}"
wait_for_url "frontend" "http://localhost:8080" "$frontend_pid" 40

echo "Both dev servers started. Press Ctrl+C to stop."
wait -n
