#!/usr/bin/env bash
# jart Kiosk — alle Animationen, je 2 Min, dynamische Hochfarben · nur HDMI-2
set -euo pipefail

PXL_DIR="/home/jbs3123/pxl-dex-82"
LOG="/tmp/jart-kiosk.log"
UD="/tmp/chromium-jart"
PORT=8765
URL="http://127.0.0.1:${PORT}/jart-kiosk/index.html"

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
  /home/jbs3123/start-dual-kiosk.sh stop 2>/dev/null || true
  pkill -f "chromium.*--app=" 2>/dev/null || true
  pkill -f "chromium.*$UD" 2>/dev/null || true
  sleep 1
}

start_http() {
  pkill -f "python3 -m http.server ${PORT}" 2>/dev/null || true
  sleep 0.5
  nohup python3 -m http.server "${PORT}" --bind 0.0.0.0 --directory "$PXL_DIR" >>/tmp/jart-http.log 2>&1 &
  sleep 1
}

setup_display() {
  xrandr --output HDMI-1 --off 2>/dev/null || true
  xrandr --output HDMI-2 --auto --rotate right --pos 0x0 2>/dev/null || true
  xset s off -dpms 2>/dev/null || true
}

launch_kiosk() {
  nohup /usr/bin/chromium \
    --user-data-dir="$UD" \
    --new-window --start-fullscreen \
    --window-position=0,0 --window-size=1080,1920 \
    --noerrdialogs --disable-infobars --disable-session-crashed-bubble \
    --disable-translate --no-first-run \
    --autoplay-policy=no-user-gesture-required \
    --check-for-update-interval=31536000 \
    --enable-webgl --ignore-gpu-blocklist \
    --app="$URL" >>"$LOG" 2>&1 &
  echo "$(date -Iseconds) jart-kiosk: $URL" >>"$LOG"
}

case "${1:-start}" in
  start)
    stop_all
    wait_display || true
    start_http
    setup_display
    launch_kiosk
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
  *)
    echo "Usage: $0 {start|stop|restart}"
    exit 1
    ;;
esac
