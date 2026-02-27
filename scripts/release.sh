#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

git pull || true
npm install

VERSION="$(node -p "require('./package.json').version")"
TS="$(date +%Y%m%d_%H%M%S)"
ZIP="WINGBOSS_FINAL_BOT_v${VERSION}_${TS}.zip"

zip -r "$ZIP" . \
  -x "node_modules/*" \
  -x ".git/*" \
  -x ".env" \
  -x "backups/*" \
  -x "data/*.tar.gz"

echo "✅ Built: $ZIP"
ls -la "$ZIP"

if [ -d "$HOME/storage/downloads" ]; then
  cp -f "$ZIP" "$HOME/storage/downloads/"
  echo "✅ Copied: ~/storage/downloads/$ZIP"
fi
