#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
TS="$(date +%Y%m%d_%H%M%S)"
tar -czf "backups/wingboss_${TS}.tar.gz" data menu docs src scripts package.json tsconfig.json README.md .env.example .gitignore 2>/dev/null || true
echo "OK: backups/wingboss_${TS}.tar.gz"
