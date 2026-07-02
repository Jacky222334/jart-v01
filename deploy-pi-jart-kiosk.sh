#!/usr/bin/env bash
# jart_v01 komplett auf jbs3123 deployen + Kiosk + Autostart bei Reboot
set -euo pipefail

PI_HOST="${PI_HOST:-jbs3123}"
PI_USER="${PI_USER:-jbs3123}"
PI_KEY="${PI_KEY:-$HOME/.ssh/pi5_key}"
PXL_DIR="/home/${PI_USER}/pxl-dex-82"
SRC="$(cd "$(dirname "$0")" && pwd)"

SSH=(ssh -i "$PI_KEY" -o StrictHostKeyChecking=accept-new "${PI_USER}@${PI_HOST}")
RSYNC=(rsync -avz -e "ssh -i $PI_KEY -o StrictHostKeyChecking=accept-new")

# Alle Animations-Ordner (manifest.js muss passende Pfade haben)
ART_DIRS=(
  antrieb-100ly pxl-dex-ultra spectron108-neon raketen-wahn blocks8133 kosmos-reise go-grenzen polarlichter nordpol-eis matterhorn lego-binary raumanzug-catwalk afrika-hunger-geld hail-mary artemis afrika-tod organic-neo
  veggakle5108 alternate10074 liith5113 uncertain8132 night5109
  invader8135 rainbow11127 buyingtime prismflux space-live
  custom5109 custom-qmdNwJG custom-qmYinCe raster1500 jart-kiosk
)

echo "→ Deploy Kunstwerke + Kiosk nach ${PI_USER}@${PI_HOST}:${PXL_DIR}/"
"${SSH[@]}" "mkdir -p ${PXL_DIR}/eukar"

for dir in "${ART_DIRS[@]}"; do
  [ -d "${SRC}/${dir}" ] || { echo "WARN: fehlt ${dir}"; continue; }
  echo "  · ${dir}"
  "${RSYNC[@]}" "${SRC}/${dir}/" "${PI_USER}@${PI_HOST}:${PXL_DIR}/${dir}/"
done

echo "→ eukär (Root-Dateien)"
EUKAR_FILES=(
  index.html app.js sketch.js depositFragment.js trailDecayFragment.js
  trailDisplayFragment.js drawVertex.js updateFragmentPhysarum.js updateVertex.js
)
for f in "${EUKAR_FILES[@]}"; do
  rsync -avz -e "ssh -i $PI_KEY -o StrictHostKeyChecking=accept-new" \
    "${SRC}/${f}" "${PI_USER}@${PI_HOST}:${PXL_DIR}/eukar/${f}"
done

echo "→ start-jart-kiosk.sh"
"${RSYNC[@]}" "${SRC}/start-jart-kiosk.sh" "${PI_USER}@${PI_HOST}:/home/${PI_USER}/start-jart-kiosk.sh"
"${SSH[@]}" "chmod +x /home/${PI_USER}/start-jart-kiosk.sh"

echo "→ Autostart (systemd + Desktop)"
"${RSYNC[@]}" "${SRC}/systemd/jart-kiosk.service" "${PI_USER}@${PI_HOST}:/tmp/jart-kiosk.service"
"${RSYNC[@]}" "${SRC}/autostart/jart-kiosk.desktop" "${PI_USER}@${PI_HOST}:/tmp/jart-kiosk.desktop"

"${SSH[@]}" bash -s <<'REMOTE'
set -euo pipefail
U=jbs3123
mkdir -p "/home/$U/.config/systemd/user"
mkdir -p "/home/$U/.config/autostart"
cp /tmp/jart-kiosk.service "/home/$U/.config/systemd/user/jart-kiosk.service"
cp /tmp/jart-kiosk.desktop "/home/$U/.config/autostart/jart-kiosk.desktop"
chmod 644 "/home/$U/.config/systemd/user/jart-kiosk.service"
chmod 644 "/home/$U/.config/autostart/jart-kiosk.desktop"
systemctl --user daemon-reload
systemctl --user enable jart-kiosk.service
# User-Services auch ohne Login (Reboot)
sudo loginctl enable-linger "$U" 2>/dev/null || true
REMOTE

echo "→ Kiosk starten (HDMI-2)"
"${SSH[@]}" "/home/${PI_USER}/start-jart-kiosk.sh restart"

echo "→ Verifikation"
"${SSH[@]}" bash -s <<EOF
PIECES=\$(grep -c "path:" ${PXL_DIR}/jart-kiosk/manifest.js || echo 0)
curl -sf "http://127.0.0.1:8765/jart-kiosk/index.html" | grep -q 'jart Kiosk' && echo "OK: Kiosk HTTP"
echo "OK: \${PIECES} Werke in manifest.js"
systemctl --user is-enabled jart-kiosk.service 2>/dev/null && echo "OK: systemd autostart enabled"
pgrep -af 'chromium.*jart-kiosk' | head -1 || pgrep -af 'chromium.*8765' | head -1
EOF

echo "Fertig. Nach Reboot startet der Kiosk automatisch auf HDMI-2."
