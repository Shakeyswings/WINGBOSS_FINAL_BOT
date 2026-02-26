#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
git pull
npm install
bash scripts/termux_run.sh
