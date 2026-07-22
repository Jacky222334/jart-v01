#!/usr/bin/env python3
"""DJI Mic Mini: 4 Audio-Kanäle — L/R real, Mid/Side daraus (Mic3/Mic4)."""

from __future__ import annotations

import math
import subprocess
import threading
import time
from dataclasses import dataclass, field
from typing import Any


DEFAULT_SOURCE_HINT = "DJI_MIC_MINI"


def _to_db(peak: float) -> float | None:
    if peak <= 1e-9:
        return -60.0
    return round(20.0 * math.log10(min(1.0, peak)), 1)


def _ch_dict(peak: float, rms: float) -> dict[str, Any]:
    return {
        "peak": round(peak, 4),
        "rms": round(rms, 4),
        "db": _to_db(peak),
    }


@dataclass
class MicState:
    connected: bool = False
    source: str | None = None
    message: str = "Mic offline"
    channels: int = 4
    # 1=L 2=R 3=Mid 4=Side
    peak: list[float] = field(default_factory=lambda: [0.0, 0.0, 0.0, 0.0])
    rms: list[float] = field(default_factory=lambda: [0.0, 0.0, 0.0, 0.0])
    updated_at: float = 0.0
    lock: threading.Lock = field(default_factory=threading.Lock)

    def snapshot(self) -> dict[str, Any]:
        with self.lock:
            age = int((time.time() - self.updated_at) * 1000) if self.updated_at else None
            labels = ("mic1", "mic2", "mic3", "mic4")
            names = ("ROTA · L", "ANDŌ · R", "YUSTO · Mid", "YAN · Side")
            out: dict[str, Any] = {
                "connected": self.connected and (age is None or age < 1500),
                "source": self.source,
                "message": self.message,
                "channels": 4,
                "age_ms": age,
            }
            for i, key in enumerate(labels):
                out[key] = {
                    **_ch_dict(self.peak[i], self.rms[i]),
                    "label": names[i],
                }
            return out


def find_dji_source(hint: str = DEFAULT_SOURCE_HINT) -> str | None:
    try:
        out = subprocess.check_output(["pactl", "list", "short", "sources"], text=True)
    except Exception:
        return None
    for line in out.splitlines():
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        name = parts[1]
        if hint.lower() in name.lower() or "dji" in name.lower():
            return name
    return None


class MicReader:
    def __init__(self, source: str | None = None, rate: int = 48000):
        self.source_pref = source
        self.rate = rate
        self.state = MicState()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="mic-reader", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()

    def _run(self) -> None:
        while not self._stop.is_set():
            source = self.source_pref or find_dji_source()
            if not source:
                with self.state.lock:
                    self.state.connected = False
                    self.state.source = None
                    self.state.message = "DJI Mic nicht gefunden"
                    self.state.peak = [0.0, 0.0, 0.0, 0.0]
                self._stop.wait(1.5)
                continue

            cmd = [
                "parec",
                f"--device={source}",
                "--format=s16le",
                f"--rate={self.rate}",
                "--channels=2",
                "--latency-msec=50",
            ]
            try:
                proc = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.DEVNULL,
                    bufsize=0,
                )
            except Exception as exc:
                with self.state.lock:
                    self.state.connected = False
                    self.state.message = f"parec: {exc}"
                self._stop.wait(2)
                continue

            with self.state.lock:
                self.state.connected = True
                self.state.source = source
                self.state.message = "4 Kanäle · DJI L/R + Mid/Side"

            # ~20 ms Frames @ 48k stereo s16
            frame = int(self.rate * 0.02) * 2 * 2
            assert proc.stdout is not None
            try:
                while not self._stop.is_set():
                    data = proc.stdout.read(frame)
                    if not data or len(data) < 4:
                        break
                    self._analyze(data)
            finally:
                try:
                    proc.kill()
                except Exception:
                    pass
                try:
                    proc.wait(timeout=1)
                except Exception:
                    pass
            with self.state.lock:
                self.state.connected = False
                self.state.message = "Mic-Stream unterbrochen"
            self._stop.wait(0.8)

    def _analyze(self, data: bytes) -> None:
        import array

        samples = array.array("h")
        samples.frombytes(data[: len(data) - (len(data) % 4)])
        if not samples:
            return

        peak = [0, 0, 0, 0]
        sum_sq = [0.0, 0.0, 0.0, 0.0]
        n = 0
        for i in range(0, len(samples) - 1, 2):
            l = samples[i]
            r = samples[i + 1]
            mid = (l + r) // 2
            side = (l - r) // 2
            for idx, v in enumerate((l, r, mid, side)):
                a = abs(v)
                if a > peak[idx]:
                    peak[idx] = a
                sum_sq[idx] += float(v) * float(v)
            n += 1
        if n <= 0:
            return

        scale = 32768.0
        peaks = [p / scale for p in peak]
        rmss = [math.sqrt(s / n) / scale for s in sum_sq]

        with self.state.lock:
            for i in range(4):
                self.state.peak[i] = max(peaks[i], self.state.peak[i] * 0.82)
                self.state.rms[i] = rmss[i]
            self.state.updated_at = time.time()
            self.state.connected = True
