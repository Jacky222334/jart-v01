#!/usr/bin/env bash
# Pi-Kiosk · feste Werke · Autostart nach Reboot · jbs3123
set -euo pipefail

PI_HOST="${PI_HOST:-jbs3123}"
PI_USER="${PI_USER:-jbs3123}"
PI_KEY="${PI_KEY:-$HOME/.ssh/pi5_key}"
PXL_DIR="/home/${PI_USER}/pxl-dex-82"
SRC="$(cd "$(dirname "$0")" && pwd)"

SSH=(ssh -i "$PI_KEY" -o StrictHostKeyChecking=accept-new "${PI_USER}@${PI_HOST}")
RSYNC=(rsync -avz -e "ssh -i $PI_KEY -o StrictHostKeyChecking=accept-new")

# Alle vorhandenen Kiosk-Werke (jart-kiosk/manifest.js)
ART_DIRS=(
  audio
  afrika-hunger-geld afrika-tod antrieb-100ly artemis blocks8133 buyingtime
  custom-qmdNwJG custom-qmYinCe custom5109 go-grenzen hail-mary
  implosion11073 rooms11075 balance10724 pages10086 pages10108 liith7655 liith7599
  hail-mary-dance hail-mary-model hail-mary-v3-dance kalender-gedichte
  kosmos-reise lego-binary liebe-momente liith5113 matterhorn nasa_api nasa-launch
  night5109 nordpol-eis organic-neo polarlichter portrait-galerie prismflux
  pxl-dex-ultra radar-eye rainbow11127 raketen-wahn raster1500
  raumanzug-catwalk space-live spectron108-neon teil-sas theorien-lego
  uncertain8132 veggakle5108
  jart-kiosk
)

ROOT_FILES=(
  index.html app.js sketch.js
  updateVertex.js updateFragmentPhysarum.js drawVertex.js
  trailDecayFragment.js trailDisplayFragment.js depositFragment.js
)

echo "→ Deploy Pi-Kiosk inkl. aller vorhandenen Animationen nach ${PI_USER}@${PI_HOST}:${PXL_DIR}/"

for file in "${ROOT_FILES[@]}"; do
  [ -f "${SRC}/${file}" ] || { echo "WARN: fehlt ${file}"; continue; }
  echo "  · ${file}"
  "${RSYNC[@]}" "${SRC}/${file}" "${PI_USER}@${PI_HOST}:${PXL_DIR}/${file}"
done

for dir in "${ART_DIRS[@]}"; do
  [ -d "${SRC}/${dir}" ] || { echo "WARN: fehlt ${dir}"; continue; }
  echo "  · ${dir}"
  "${RSYNC[@]}" "${SRC}/${dir}/" "${PI_USER}@${PI_HOST}:${PXL_DIR}/${dir}/"
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
sudo loginctl enable-linger "$U" 2>/dev/null || true
REMOTE

echo "→ Kiosk-Service starten (Autostart + Watchdog)"
"${SSH[@]}" "systemctl --user restart jart-kiosk.service"

echo "→ Verifikation"
"${SSH[@]}" bash -s <<EOF
PIECES=\$(grep -c "path:" ${PXL_DIR}/jart-kiosk/manifest-pi.js || echo 0)
curl -sf "http://127.0.0.1:8765/jart-kiosk/pi.html" | grep -q 'jart Pi Kiosk' && echo "OK: pi.html"
curl -sf "http://127.0.0.1:8765/nasa_api/index.html" | grep -q 'EPOXID-PLASTIK' && echo "OK: nasa_api Epoxid-Präsentation"
echo "OK: \${PIECES} Animationen in manifest-pi.js"
systemctl --user is-enabled jart-kiosk.service 2>/dev/null && echo "OK: systemd autostart enabled"
systemctl --user is-active jart-kiosk.service 2>/dev/null && echo "OK: systemd service active"
test -f "${PXL_DIR}/audio/interstellar.mp3" && echo "OK: interstellar.mp3"
COSMIC=\$(python3 - "${PXL_DIR}/audio/cosmic" <<'PY'
from pathlib import Path
import sys
print(len(list(Path(sys.argv[1]).glob('*.mp3'))))
PY
)
echo "OK: \${COSMIC} kosmische MP3s"
CHROMIUM=\$(python3 - <<'PY'
from pathlib import Path
for proc in Path('/proc').iterdir():
    if not proc.name.isdigit():
        continue
    try:
        cmd = (proc / 'cmdline').read_bytes().decode('utf-8', 'ignore').replace('\0', ' ')
    except Exception:
        continue
    if 'chromium' in cmd and 'jart-kiosk/pi.html' in cmd:
        print(cmd)
        break
PY
)
case "\$CHROMIUM" in *'vol=1'*) echo "OK: kiosk vol=1";; *) echo "WARN: kiosk vol=1 nicht sichtbar";; esac
case "\$CHROMIUM" in *'musicvol=1'*) echo "OK: musicvol=1";; *) echo "WARN: musicvol=1 nicht sichtbar";; esac
printf '%s\n' "\$CHROMIUM"
EOF

echo "Fertig. Pi-Kiosk startet mit Sound und Bildschirm rechts um 90° gedreht."
