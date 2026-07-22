#!/usr/bin/env bash
# jart Kiosk — Pi GPIO-TFT 3.5", links 90 Grad, Audio-Reaktiv
set -euo pipefail

PXL_DIR="/home/jbs3123/pxl-dex-82"
LOG="/tmp/jart-kiosk.log"
UD="/tmp/chromium-jart"
WATCH_PID="/tmp/jart-kiosk-watch.pid"
PORT=8765
# USB-Webcam Vollbild (Logitech). Playlist wieder: …/jart-kiosk/pi.html?rotate=left&…
KIOSK_QUERY="rotate=left"
URL="http://127.0.0.1:${PORT}/usb-webcam/index.html?${KIOSK_QUERY}"

export DISPLAY="${DISPLAY:-:0}"
export XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}"

wait_display() {
  for _ in $(seq 1 45); do
    xdpyinfo -display "$DISPLAY" >/dev/null 2>&1 && return 0
    sleep 2
  done
  echo "WARN: Display $DISPLAY nicht bereit" >&2
  return 1
}

stop_all() {
  if [ -f "$WATCH_PID" ]; then
    WATCHER="$(tr -d '\n' < "$WATCH_PID" 2>/dev/null || true)"
    if [ -n "$WATCHER" ] && [ "$WATCHER" != "$$" ]; then
      kill "$WATCHER" 2>/dev/null || true
    fi
    rm -f "$WATCH_PID"
  fi
  /home/jbs3123/start-dual-kiosk.sh stop 2>/dev/null || true
  pkill -f "chromium.*--app=" 2>/dev/null || true
  pkill -f "chromium.*$UD" 2>/dev/null || true
  sleep 1
  rm -rf "$UD"
}

start_http() {
  pkill -f "python3 -m http.server ${PORT}" 2>/dev/null || true
  sleep 0.5
  nohup python3 -m http.server "${PORT}" --bind 0.0.0.0 --directory "$PXL_DIR" >>/tmp/jart-http.log 2>&1 &
  sleep 1
}

setup_display() {
  # GPIO-TFT läuft über fbdev (/dev/fb0); die feste 90-Grad-Drehung
  # passiert im Pi-Kiosk per rotate=left, damit sie beim Boot sicher greift.
  xset s off -dpms 2>/dev/null || true
}

setup_audio() {
  if command -v pactl >/dev/null 2>&1; then
    pactl set-sink-mute @DEFAULT_SINK@ false 2>/dev/null || true
    pactl set-sink-volume @DEFAULT_SINK@ 100% 2>/dev/null || true
  fi
  if command -v wpctl >/dev/null 2>&1; then
    wpctl set-mute @DEFAULT_AUDIO_SINK@ 0 2>/dev/null || true
    wpctl set-volume @DEFAULT_AUDIO_SINK@ 1.0 2>/dev/null || true
  fi
  if command -v amixer >/dev/null 2>&1; then
    amixer sset Master unmute 100% 2>/dev/null || true
    amixer sset PCM unmute 100% 2>/dev/null || true
    amixer sset Headphone unmute 100% 2>/dev/null || true
    amixer sset Speaker unmute 100% 2>/dev/null || true
  fi
}

prepare_chromium_profile() {
  mkdir -p "$UD/Default"
  python3 - "$UD" <<'PY'
import json
import pathlib
import sys

ud = pathlib.Path(sys.argv[1])
(ud / "Local State").write_text(json.dumps({
    "intl": {"app_locale": "de-DE"},
    "translate": {"enabled": False},
}), encoding="utf-8")
(ud / "Default" / "Preferences").write_text(json.dumps({
    "browser": {"has_seen_welcome_page": True},
    "credentials_enable_service": False,
    "intl": {"accept_languages": "de-DE,de,en-US,en"},
    "profile": {
        "default_content_setting_values": {
            "notifications": 2,
            "media_stream_camera": 1,
            "media_stream_mic": 1,
        },
        "password_manager_enabled": False,
    },
    "translate": {"enabled": False},
}), encoding="utf-8")
PY
}

launch_kiosk() {
  prepare_chromium_profile
  nohup /usr/bin/chromium \
    --user-data-dir="$UD" \
    --new-window --start-fullscreen \
    --window-position=0,0 --window-size=480,320 \
    --noerrdialogs --disable-infobars --disable-session-crashed-bubble \
    --disable-translate --disable-features=Translate,TranslateUI \
    --lang=de-DE --accept-lang=de-DE,de,en-US,en \
    --no-first-run \
    --autoplay-policy=no-user-gesture-required \
    --use-fake-ui-for-media-stream \
    --check-for-update-interval=31536000 \
    --enable-webgl --ignore-gpu-blocklist \
    --app="$URL" >>"$LOG" 2>&1 &
  echo "$(date -Iseconds) jart-kiosk: $URL" >>"$LOG"
}

watch_kiosk() {
  while true; do
    sleep 45
    pgrep -f "chromium.*${UD}" >/dev/null && continue
    pgrep -f "python3 -m http.server ${PORT}" >/dev/null || start_http
    echo "$(date -Iseconds) watchdog: chromium neu starten" >>"$LOG"
    launch_kiosk
  done
}

run_forever() {
  trap 'stop_all; exit 0' INT TERM
  stop_all
  wait_display || true
  start_http
  setup_display
  setup_audio
  launch_kiosk
  echo $$ >"$WATCH_PID"
  echo "jart-kiosk läuft fest → $URL"
  watch_kiosk
}

case "${1:-start}" in
  start)
    stop_all
    wait_display || true
    start_http
    setup_display
    setup_audio
    launch_kiosk
    watch_kiosk >>"$LOG" 2>&1 &
    echo $! >"$WATCH_PID"
    echo "jart-kiosk gestartet → $URL"
    ;;
  stop)
    stop_all
    echo "jart-kiosk gestoppt"
    ;;
  restart)
    stop_all
    sleep 1
    "$0" start
    ;;
  run)
    run_forever
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|run}"
    exit 1
    ;;
esac
