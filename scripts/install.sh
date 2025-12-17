#!/usr/bin/env bash

set -euo pipefail

if ! command -v bun >/dev/null 2>&1; then
  echo "bun が見つかりません。https://bun.sh/docs/installation を参照してインストールしてください。" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run_install() {
  local dir="$1"
  echo "[bun install] $dir"

  local -a bun_flags=()
  if [[ -n "${BUN_INSTALL_FLAGS:-}" ]]; then
    # shellcheck disable=SC2206
    bun_flags=(${BUN_INSTALL_FLAGS})
  fi

  (cd "$dir" && bun install "${bun_flags[@]}")
}

run_install "$ROOT_DIR/backend" || {
  echo "backend の bun install に失敗" >&2
  exit 1
}
run_install "$ROOT_DIR/frontend" || {
  echo "frontend の bun install に失敗" >&2
  exit 1
}

echo "bun install 完了 ✅"
