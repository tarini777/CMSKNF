#!/usr/bin/env bash
set -euo pipefail

SRC="${CMSKNF_DATABASE_SRC:-$(cd "$(dirname "$0")/../.." && pwd)/database}"
DEST="${CMS_DATASET_DESKTOP_SYNC_ROOT:-$HOME/Google Drive/My Drive/CMSKNF/cms-open-payments}"

echo "[copy-gdrive-sync] Source: $SRC"
echo "[copy-gdrive-sync] Destination: $DEST"

mkdir -p "$DEST"

copy_dir() {
  local name="$1"
  echo "[copy-gdrive-sync] Copying $name ..."
  mkdir -p "$DEST/$name"
  rsync -ah "$SRC/$name/" "$DEST/$name/"
}

copy_dir "PGYR2023_P01232026_01102026"
copy_dir "PGYR2024_P01232026_01102026 (1)"
copy_dir "PHPRFL_P01232026_01102026"

echo "[copy-gdrive-sync] Done. Update manifest desktopSyncRoot if your path differs:"
echo "  $DEST"
