#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.." || exit 1

LOCK=".run.lock"
if [ -f "$LOCK" ]; then
  PID="$(cat "$LOCK" 2>/dev/null || true)"
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    echo "❌ Bot already running (pid=$PID). Refusing to start."
    exit 1
  fi
fi

echo $$ > "$LOCK"
trap 'rm -f "$LOCK"' EXIT

bash scripts/termux_run.sh
