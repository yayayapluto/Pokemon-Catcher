#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v bun >/dev/null 2>&1; then
  echo "Bun tidak ditemukan. Pasang dulu: https://bun.sh"
  exit 1
fi

if [ ! -d node_modules ]; then
  bun install
fi

exec bun run src/main.ts "$@"
