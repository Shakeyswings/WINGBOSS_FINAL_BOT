#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
ARCHIVE="${1:-}"
if [ -z "$ARCHIVE" ]; then
  echo "Usage: bash scripts/restore_data.sh backups/wingboss_YYYYMMDD_HHMMSS.tar.gz"
  exit 1
fi
tar -xzf "$ARCHIVE"
echo "OK: restored from $ARCHIVE"
