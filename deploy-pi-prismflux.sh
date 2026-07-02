#!/usr/bin/env bash
# Prismflux auf jbs3123 deployen — dauerhaft Port 8767 + Kiosk
set -euo pipefail

PI_HOST="${PI_HOST:-jbs3123}"
PI_USER="${PI_USER:-jbs3123}"
PI_KEY="${PI_KEY:-$HOME/.ssh/pi5_key}"
REMOTE_DIR="/home/${PI_USER}/art/prismflux"
PORT=8767
SRC="$(cd "$(dirname "$0")/prismflux" && pwd)"

RSYNC=(rsync -avz --delete -e "ssh -i $PI_KEY -o StrictHostKeyChecking=accept-new")
SSH=(ssh -i "$PI_KEY" -o StrictHostKeyChecking=accept-new "${PI_USER}@${PI_HOST}")

echo "→ Deploy ${SRC}/ → ${PI_USER}@${PI_HOST}:${REMOTE_DIR}/"
"${SSH[@]}" "mkdir -p $(dirname "$REMOTE_DIR")"
"${RSYNC[@]}" "$SRC/" "${PI_USER}@${PI_HOST}:${REMOTE_DIR}/"

echo "→ Systemd-Services neu starten"
"${SSH[@]}" bash -s <<EOF
systemctl --user restart jart-prismflux-http.service
sleep 1
systemctl --user restart jart-prismflux-kiosk.service
curl -sf "http://127.0.0.1:${PORT}/prismflux/" | grep -o '<title>[^<]*</title>'
echo "URL: http://\$(hostname -I | awk '{print \$1}'):${PORT}/prismflux/"
EOF

echo "Fertig."
