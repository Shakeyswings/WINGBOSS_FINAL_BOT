#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TS="$(date +%Y%m%d_%H%M%S)"
OUT="backups/wingboss_snapshot_${TS}.tar.gz"

mkdir -p backups

tar -czf "$OUT" \
  .env .env.example .gitignore \
  package.json package-lock.json tsconfig.json README.md \
  scripts docs src menu data \
  2>/dev/null || true

echo "✅ Snapshot created: $OUT"
echo "To restore:"
echo "  tar -xzf $OUT -C $ROOT"
