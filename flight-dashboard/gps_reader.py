#!/usr/bin/env python3
"""u-blox NMEA Reader (ttyACM)."""

from __future__ import annotations

import math
import threading
import time
from dataclasses import dataclass, field
from typing import Any

try:
    import serial
except ImportError:
    serial = None


def _nmea_ok(line: str) -> bool:
    if not line.startswith("$") or "*" not in line:
        return False
    body, _, csum = line[1:].partition("*")
    if len(csum) < 2:
        return False
    try:
        want = int(csum[:2], 16)
    except ValueError:
        return False
    got = 0
    for ch in body:
        got ^= ord(ch)
    return got == want


def _dm_to_deg(dm: str, hemi: str) -> float | None:
    if not dm or not hemi:
        return None
    try:
        val = float(dm)
    except ValueError:
        return None
    deg = int(val // 100)
    minutes = val - deg * 100
    out = deg + minutes / 60.0
    if hemi in ("S", "W"):
        out = -out
    return out


@dataclass
class GpsState:
    port: str = "/dev/ttyACM0"
    connected: bool = False
    message: str = "GPS offline"
    fix: bool = False
    fix_quality: int = 0
    satellites: int = 0
    hdop: float | None = None
    lat: float | None = None
    lon: float | None = None
    alt_m: float | None = None
    speed_kn: float | None = None
    course: float | None = None
    utc: str | None = None
    date: str | None = None
    sats_in_view: list[dict[str, Any]] = field(default_factory=list)
    last_nmea: list[str] = field(default_factory=list)
    updated_at: float = 0.0
    sentences: int = 0
    lock: threading.Lock = field(default_factory=threading.Lock)

    def snapshot(self) -> dict[str, Any]:
        with self.lock:
            age = int((time.time() - self.updated_at) * 1000) if self.updated_at else None
            return {
                "connected": self.connected and (age is None or age < 3000),
                "message": self.message,
                "fix": self.fix,
                "fix_quality": self.fix_quality,
                "satellites": self.satellites,
                "hdop": self.hdop,
                "lat": self.lat,
                "lon": self.lon,
                "alt_m": self.alt_m,
                "speed_kn": self.speed_kn,
                "speed_kmh": (self.speed_kn * 1.852) if self.speed_kn is not None else None,
                "course": self.course,
                "utc": self.utc,
                "date": self.date,
                "sats_in_view": list(self.sats_in_view),
                "last_nmea": list(self.last_nmea),
                "updated_at": self.updated_at,
                "sentences": self.sentences,
                "age_ms": age,
                "port": self.port,
            }


class GpsReader:
    def __init__(self, port: str = "/dev/ttyACM0", baud: int = 9600):
        self.port = port
        self.baud = baud
        self.state = GpsState(port=port)
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._gsv_buf: dict[int, dict[str, Any]] = {}

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="gps-reader", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()

    def _run(self) -> None:
        while not self._stop.is_set():
            if serial is None:
                with self.state.lock:
                    self.state.message = "pyserial fehlt"
                    self.state.connected = False
                self._stop.wait(2)
                continue
            try:
                ser = serial.Serial(self.port, self.baud, timeout=1)
            except Exception as exc:
                with self.state.lock:
                    self.state.connected = False
                    self.state.message = f"GPS nicht offen: {exc}"
                self._stop.wait(2)
                continue

            with self.state.lock:
                self.state.connected = True
                self.state.message = "GPS lesen…"

            try:
                while not self._stop.is_set():
                    raw = ser.readline()
                    if not raw:
                        continue
                    line = raw.decode("ascii", "replace").strip()
                    if not line.startswith("$"):
                        continue
                    if not _nmea_ok(line):
                        continue
                    self._handle(line)
            except Exception as exc:
                with self.state.lock:
                    self.state.connected = False
                    self.state.message = f"GPS Fehler: {exc}"
            finally:
                try:
                    ser.close()
                except Exception:
                    pass
            self._stop.wait(1)

    def _handle(self, line: str) -> None:
        body = line[1 : line.index("*")]
        parts = body.split(",")
        typ = parts[0][2:] if len(parts[0]) >= 5 else parts[0]

        with self.state.lock:
            self.state.sentences += 1
            self.state.updated_at = time.time()
            self.state.last_nmea = (self.state.last_nmea + [line])[-12:]
            self.state.connected = True

            if typ == "GGA" and len(parts) >= 10:
                self.state.utc = parts[1] or self.state.utc
                self.state.lat = _dm_to_deg(parts[2], parts[3])
                self.state.lon = _dm_to_deg(parts[4], parts[5])
                try:
                    self.state.fix_quality = int(parts[6] or 0)
                except ValueError:
                    self.state.fix_quality = 0
                self.state.fix = self.state.fix_quality > 0
                try:
                    self.state.satellites = int(parts[7] or 0)
                except ValueError:
                    pass
                try:
                    self.state.hdop = float(parts[8]) if parts[8] else None
                except ValueError:
                    pass
                try:
                    self.state.alt_m = float(parts[9]) if parts[9] else None
                except ValueError:
                    pass
                self.state.message = "GPS Fix" if self.state.fix else "GPS – warte auf Fix"

            elif typ == "RMC" and len(parts) >= 10:
                self.state.utc = parts[1] or self.state.utc
                status = parts[2]
                self.state.fix = status == "A" or self.state.fix
                if status == "A":
                    self.state.lat = _dm_to_deg(parts[3], parts[4]) or self.state.lat
                    self.state.lon = _dm_to_deg(parts[5], parts[6]) or self.state.lon
                    try:
                        self.state.speed_kn = float(parts[7]) if parts[7] else None
                    except ValueError:
                        pass
                    try:
                        self.state.course = float(parts[8]) if parts[8] else None
                    except ValueError:
                        pass
                    self.state.date = parts[9] or self.state.date
                    self.state.message = "GPS Fix"
                elif not self.state.fix:
                    self.state.message = "GPS – kein Fix (V)"

            elif typ == "GSV" and len(parts) >= 4:
                try:
                    total_msgs = int(parts[1])
                    msg_num = int(parts[2])
                except ValueError:
                    return
                if msg_num == 1:
                    self._gsv_buf.clear()
                i = 4
                while i + 3 < len(parts):
                    prn, elev, az, snr = parts[i : i + 4]
                    i += 4
                    if not prn:
                        continue
                    try:
                        self._gsv_buf[int(prn)] = {
                            "prn": int(prn),
                            "elev": float(elev) if elev else None,
                            "az": float(az) if az else None,
                            "snr": float(snr) if snr else None,
                        }
                    except ValueError:
                        continue
                if msg_num >= total_msgs:
                    self.state.sats_in_view = sorted(
                        self._gsv_buf.values(), key=lambda s: -(s.get("snr") or 0)
                    )
