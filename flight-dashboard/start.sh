#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q pyserial

echo "GPS Dashboard: http://0.0.0.0:8788/"
exec python server.py --host 0.0.0.0 --port 8788 "$@"
