#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "✅ patch_safe: use cat > file <<EOF blocks only (no perl/sed dependency)"
