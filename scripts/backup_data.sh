#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
TS="$(date +%Y%m%d_%H%M%S)"
tar -czf "backups/data_$TS.tar.gz" data menu .env .env.example README.md docs src prisma package.json tsconfig.json 2>/dev/null || true
ln -sf "data_$TS.tar.gz" "backups/latest.tar.gz"
echo "OK: backups/data_$TS.tar.gz"
