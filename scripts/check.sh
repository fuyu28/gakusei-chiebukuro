#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run() {
  echo "[$1] $2"
  (cd "$1" && eval "$2")
}

# Backend: type-check
run "$ROOT_DIR/backend" "bun run type-check"

# Frontend: lint & type-check
run "$ROOT_DIR/frontend" "bun run lint"
run "$ROOT_DIR/frontend" "bun run type-check"

echo "All checks passed ✅"
