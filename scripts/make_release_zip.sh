#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

TS="$(date +%Y%m%d_%H%M%S)"
ZIP="WINGBOSS_FINAL_BOT_${TS}.zip"

# build zip (exclude secrets + heavy dirs)
zip -r "$ZIP" . \
  -x "node_modules/*" \
  -x ".git/*" \
  -x ".env" \
  -x "backups/*" \
  -x "data/*.tar.gz"

echo "✅ Built: $ZIP"
ls -la "$ZIP"
