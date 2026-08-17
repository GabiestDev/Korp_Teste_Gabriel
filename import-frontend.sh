#!/usr/bin/env bash
set -euo pipefail

SOURCE="${1:-}"
if [ -z "$SOURCE" ] && [ -f .env ]; then
  SOURCE=$(grep -E '^FRONTEND_CONTEXT=' .env | cut -d'=' -f2- | tr -d '"') || true
fi

if [ -z "$SOURCE" ]; then
  read -rp "Enter frontend source path (absolute or relative): " SOURCE
fi

TARGET="./Korp-Frontend-Gabriel"

# Resolve real paths if possible
if command -v realpath >/dev/null 2>&1; then
  SRC_REAL=$(realpath "$SOURCE")
  if [ -d "$TARGET" ]; then
    TGT_REAL=$(realpath "$TARGET")
  else
    TGT_REAL=""
  fi
else
  SRC_REAL="$SOURCE"
  TGT_REAL="$TARGET"
fi

if [ "$SRC_REAL" = "$TGT_REAL" ] && [ -n "$TGT_REAL" ]; then
  echo "Source and target are the same; nothing to do."
  exit 0
fi

mkdir -p "$TARGET"

# rsync with exclusions
rsync -av --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.angular' \
  --exclude 'dist' \
  --exclude '.cache' \
  "$SOURCE"/ "$TARGET"/

echo "Frontend imported to $TARGET"
