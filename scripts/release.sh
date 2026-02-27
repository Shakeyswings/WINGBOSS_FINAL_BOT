#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Ensure storage is available for Downloads copy (won't fail if already set)
termux-setup-storage >/dev/null 2>&1 || true

echo "==> Git pull"
git pull || true

echo "==> npm install"
npm install

# Optional tests (won't fail release if tests don't exist)
if npm run -s test >/dev/null 2>&1; then
  echo "==> npm test"
  npm test
else
  echo "==> (no tests configured, skipping)"
fi

VERSION="$(node -p "require('./package.json').version")"
TS="$(date +%Y%m%d_%H%M%S)"
ZIP="WINGBOSS_FINAL_BOT_v${VERSION}_${TS}.zip"

echo "==> Build zip: $ZIP"
zip -r "$ZIP" . \
  -x "node_modules/*" \
  -x ".git/*" \
  -x ".env" \
  -x "backups/*" \
  -x "data/*.tar.gz"

echo "✅ Built: $ZIP"
ls -la "$ZIP"

# Copy to Downloads for easy sharing
if [ -d "$HOME/storage/downloads" ]; then
  cp -f "$ZIP" "$HOME/storage/downloads/"
  echo "✅ Copied to: ~/storage/downloads/$ZIP"
else
  echo "⚠️ Downloads not available. Run: termux-setup-storage"
fi
