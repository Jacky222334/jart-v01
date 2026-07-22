#!/usr/bin/env python3
"""GPS + DJI Mic Dashboard auf dem Pi."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from gps_reader import GpsReader  # noqa: E402
from mic_reader import MicReader, find_dji_source  # noqa: E402
from upload_api import ensure_dir, list_uploads, save_upload  # noqa: E402

GPS: GpsReader | None = None
MIC: MicReader | None = None


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/telemetry":
            self._json(
                {
                    "gps": GPS.state.snapshot() if GPS else {},
                    "mic": MIC.state.snapshot() if MIC else {},
                }
            )
            return
        if path == "/api/status":
            g = GPS.state.snapshot() if GPS else {}
            m = MIC.state.snapshot() if MIC else {}
            self._json(
                {
                    "ok": True,
                    "gps": {
                        "connected": g.get("connected"),
                        "fix": g.get("fix"),
                        "message": g.get("message"),
                        "satellites": g.get("satellites"),
                    },
                    "mic": {
                        "connected": m.get("connected"),
                        "message": m.get("message"),
                        "channels": m.get("channels", 4),
                        "mic1": (m.get("mic1") or {}).get("db"),
                        "mic2": (m.get("mic2") or {}).get("db"),
                        "mic3": (m.get("mic3") or {}).get("db"),
                        "mic4": (m.get("mic4") or {}).get("db"),
                    },
                }
            )
            return
        if path == "/api/audio/live":
            self._stream_live_audio()
            return
        if path == "/api/uploads":
            self._json({"ok": True, "files": list_uploads()})
            return
        if path in ("/", "/index.html"):
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/upload":
            self._handle_upload()
            return
        self.send_error(404, "Not found")

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _handle_upload(self) -> None:
        try:
            ensure_dir()
            length = int(self.headers.get("Content-Length", 0))
            if length <= 0:
                self.send_error(400, "Leerer Upload")
                return
            if length > 80 * 1024 * 1024:
                self.send_error(413, "Datei zu gross (max. 80 MB)")
                return
            body = self.rfile.read(length)
            ctype = self.headers.get("Content-Type", "")
            qs = parse_qs(urlparse(self.path).query)
            agent = (qs.get("agent") or ["TEAM"])[0]
            result = save_upload(body, ctype, agent=agent)
            self._json(result)
        except ValueError as exc:
            self.send_error(400, str(exc))
        except Exception as exc:
            self.send_error(500, f"Upload-Fehler: {exc}")

    def _json(self, obj) -> None:
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _stream_live_audio(self) -> None:
        source = (MIC.state.source if MIC else None) or find_dji_source()
        if not source:
            self.send_error(503, "DJI Mic nicht gefunden")
            return

        # ffmpeg: Pulse/PipeWire Source → MP3 fürs Browser-<audio>
        cmd = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "pulse",
            "-i",
            source,
            "-ac",
            "2",
            "-ar",
            "48000",
            "-f",
            "mp3",
            "-b:a",
            "128k",
            "-content_type",
            "audio/mpeg",
            "pipe:1",
        ]
        try:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                bufsize=0,
            )
        except Exception as exc:
            self.send_error(500, f"ffmpeg: {exc}")
            return

        self.send_response(200)
        self.send_header("Content-Type", "audio/mpeg")
        self.send_header("Cache-Control", "no-store, no-cache")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Connection", "close")
        self.end_headers()

        assert proc.stdout is not None
        try:
            while True:
                chunk = proc.stdout.read(4096)
                if not chunk:
                    break
                self.wfile.write(chunk)
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            try:
                proc.kill()
            except Exception:
                pass
            try:
                proc.wait(timeout=1)
            except Exception:
                pass

    def end_headers(self) -> None:
        if "Access-Control-Allow-Origin" not in (getattr(self, "_headers_buffer", []) or []):
            try:
                self.send_header("Access-Control-Allow-Origin", "*")
            except Exception:
                pass
        super().end_headers()


def main() -> int:
    global GPS, MIC
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=8788)
    ap.add_argument("--gps", default="/dev/ttyACM0")
    ap.add_argument("--mic-source", default=None)
    args = ap.parse_args()

    GPS = GpsReader(port=args.gps)
    MIC = MicReader(source=args.mic_source)
    GPS.start()
    MIC.start()

    httpd = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Dashboard: http://{args.host}:{args.port}/")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStop.")
    finally:
        GPS.stop()
        MIC.stop()
        httpd.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
