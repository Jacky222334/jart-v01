#!/usr/bin/env bash
# Rainbow L16-7F auf jbs3123 deployen und im Kiosk starten
set -euo pipefail

PI_HOST="${PI_HOST:-jbs3123}"
PI_USER="${PI_USER:-jbs3123}"
PI_KEY="${PI_KEY:-$HOME/.ssh/pi5_key}"
REMOTE_DIR="${REMOTE_DIR:-/home/${PI_USER}/art/rainbow11127}"
PORT="${PORT:-8765}"
SRC="$(cd "$(dirname "$0")/rainbow11127" && pwd)"

SSH=(ssh -i "$PI_KEY" -o StrictHostKeyChecking=accept-new "${PI_USER}@${PI_HOST}")
RSYNC=(rsync -avz --delete -e "ssh -i $PI_KEY -o StrictHostKeyChecking=accept-new")

echo "→ Deploy nach ${PI_USER}@${PI_HOST}:${REMOTE_DIR}"
"${SSH[@]}" "mkdir -p $(dirname "$REMOTE_DIR")"
"${RSYNC[@]}" "$SRC/" "${PI_USER}@${PI_HOST}:${REMOTE_DIR}/"

echo "→ HTTP-Server und Kiosk-URL setzen (Port ${PORT})"
"${SSH[@]}" bash -s <<EOF
set -e
mkdir -p "$REMOTE_DIR"
pkill -f "python3 -m http.server ${PORT}" 2>/dev/null || true
sleep 0.5
cd "$REMOTE_DIR/.."
nohup python3 -m http.server ${PORT} --bind 0.0.0.0 >/tmp/jart-http.log 2>&1 &
sleep 1
if curl -sf "http://127.0.0.1:${PORT}/rainbow11127/" >/dev/null; then
  echo "OK: http://\$(hostname -I | awk '{print \$1}'):${PORT}/rainbow11127/"
else
  echo "WARN: Server gestartet, Pfad-Check fehlgeschlagen — Log: /tmp/jart-http.log"
fi
# Chromium-Kiosk auf Rainbow umleiten (falls vorhanden)
if command -v chromium-browser >/dev/null 2>&1; then CH=chromium-browser
elif command -v chromium >/dev/null 2>&1; then CH=chromium
else CH=; fi
if [ -n "\$CH" ]; then
  pkill -f "chromium.*kiosk" 2>/dev/null || true
  sleep 0.5
  export DISPLAY=:0
  nohup \$CH --kiosk --noerrdialogs --disable-infobars \\
    "http://127.0.0.1:${PORT}/rainbow11127/" >/tmp/jart-kiosk.log 2>&1 &
  echo "Kiosk gestartet (DISPLAY=\$DISPLAY)"
fi
EOF

echo "Fertig."
