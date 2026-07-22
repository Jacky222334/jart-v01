#!/usr/bin/env python3
"""ESPlane FC: USB-Status + optional CRTP/WiFi-IMU."""

from __future__ import annotations

import logging
import math
import re
import socket
import threading
import time
from dataclasses import dataclass, field
from typing import Any

try:
    import serial
except ImportError:
    serial = None

URI_DEFAULT = "udp://192.168.43.42:2390"
DRONE_HOST = "192.168.43.42"

PREFERRED = [
    ("stabilizer.roll", "float"),
    ("stabilizer.pitch", "float"),
    ("stabilizer.yaw", "float"),
    ("stabilizer.thrust", "uint16_t"),
    ("gyro.x", "float"),
    ("gyro.y", "float"),
    ("gyro.z", "float"),
    ("acc.x", "float"),
    ("acc.y", "float"),
    ("acc.z", "float"),
    ("motor.m1", "int32_t"),
    ("motor.m2", "int32_t"),
    ("motor.m3", "int32_t"),
    ("motor.m4", "int32_t"),
    ("pm.vbat", "float"),
    ("sys.armed", "uint8_t"),
    ("sys.canfly", "uint8_t"),
]

TYPE_SIZE = {
    "uint8_t": 1,
    "int8_t": 1,
    "uint16_t": 2,
    "int16_t": 2,
    "uint32_t": 4,
    "int32_t": 4,
    "float": 4,
}
MAX_BLOCK = 26


@dataclass
class FcState:
    usb_port: str = "/dev/ttyUSB0"
    uri: str = URI_DEFAULT
    mode: str = "offline"  # offline | usb | live | demo
    connected: bool = False
    message: str = "FC offline"
    usb_ok: bool = False
    mpu_ok: bool | None = None
    ready: bool | None = None
    ssid: str | None = None
    values: dict[str, float] = field(default_factory=dict)
    peaks: dict[str, float] = field(default_factory=dict)
    subscribed: list[str] = field(default_factory=list)
    updated_at: float = 0.0
    packets: int = 0
    lock: threading.Lock = field(default_factory=threading.Lock)

    def snapshot(self) -> dict[str, Any]:
        with self.lock:
            age = int((time.time() - self.updated_at) * 1000) if self.updated_at else None
            mode = self.mode
            connected = self.connected
            message = self.message
            if mode == "live" and (age is None or age > 1500):
                mode = "stale"
                connected = False
                message = f"IMU-Stream tot ({age} ms)"
            return {
                "mode": mode,
                "connected": connected,
                "message": message,
                "usb_ok": self.usb_ok,
                "mpu_ok": self.mpu_ok,
                "ready": self.ready,
                "ssid": self.ssid,
                "values": dict(self.values),
                "peaks": dict(self.peaks),
                "subscribed": list(self.subscribed),
                "updated_at": self.updated_at,
                "packets": self.packets,
                "age_ms": age,
                "usb_port": self.usb_port,
                "uri": self.uri,
            }

    def set_imu(self, data: dict[str, Any], mode: str) -> None:
        with self.lock:
            self.mode = mode
            self.connected = mode == "live"
            self.updated_at = time.time()
            self.packets += 1
            for k, v in data.items():
                try:
                    fv = float(v)
                except (TypeError, ValueError):
                    continue
                self.values[k] = fv
                self.peaks[k] = max(self.peaks.get(k, 0.0), abs(fv))
            if mode == "live":
                self.message = f"Live IMU – {len(self.values)} Werte"


def on_softap() -> bool:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.2)
        s.connect((DRONE_HOST, 1))
        local = s.getsockname()[0]
        s.close()
        return local.startswith("192.168.43.")
    except OSError:
        return False


def softap_pingable() -> bool:
    """Auch von LAN aus prüfen, ob SoftAP irgendwie erreichbar ist (meist nein)."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.4)
        s.sendto(b"\xff\x01\x01\x01", (DRONE_HOST, 2390))
        s.close()
    except OSError:
        pass
    return on_softap()


def patch_udp_driver() -> None:
    try:
        from cflib.crtp import udpdriver as ud

        if getattr(ud.UdpDriver, "_flight_patched", False):
            return

        def connect(self, uri, linkQualityCallback, linkErrorCallback):
            import re as _re
            from urllib.parse import urlparse
            from cflib.crtp.exceptions import WrongUriType

            if not _re.search("^udp://", uri):
                raise WrongUriType("Not an UDP URI")
            parse = urlparse(uri)
            self.link_error_callback = linkErrorCallback
            self.link_quality_callback = linkQualityCallback
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.addr = (parse.hostname, parse.port)
            for port in (2399, 2398, 2397, 0):
                try:
                    self.socket.bind(("", port))
                    break
                except OSError:
                    continue
            self.socket.settimeout(0.1)
            self.socket.connect(self.addr)
            self.socket.send(b"\xFF\x01\x01\x01")

        def send_packet(self, pk):
            raw = (pk.header,) + pk.datat
            raw = bytearray(raw + (sum(raw) % 256,))
            self.socket.send(raw)

        def receive_packet(self, time=0):
            try:
                self.socket.settimeout(time if time and time > 0 else 0.05)
                data = self.socket.recv(1024)
            except (BlockingIOError, TimeoutError, OSError):
                return None
            if not data:
                return None
            if sum(data[:-1]) % 256 != data[-1]:
                return None
            from cflib.crtp.crtpstack import CRTPPacket

            return CRTPPacket(data[0], list(data[1:]))

        def close(self):
            try:
                if self.socket:
                    try:
                        self.socket.send(b"\xFF\x01\x02\x02")
                    except OSError:
                        pass
                    self.socket.close()
            finally:
                self.socket = None

        ud.UdpDriver.connect = connect
        ud.UdpDriver.send_packet = send_packet
        ud.UdpDriver.receive_packet = receive_packet
        ud.UdpDriver.close = close
        ud.UdpDriver._flight_patched = True
    except Exception as exc:
        logging.getLogger(__name__).warning("UDP patch: %s", exc)


class FcReader:
    def __init__(
        self,
        usb_port: str = "/dev/ttyUSB0",
        uri: str = URI_DEFAULT,
        demo: bool = False,
    ):
        self.usb_port = usb_port
        self.uri = uri
        self.allow_demo = demo
        self.state = FcState(usb_port=usb_port, uri=uri)
        self._stop = threading.Event()
        self._threads: list[threading.Thread] = []

    def start(self) -> None:
        self._stop.clear()
        for name, target in (("fc-usb", self._run_usb), ("fc-imu", self._run_imu)):
            t = threading.Thread(target=target, name=name, daemon=True)
            t.start()
            self._threads.append(t)

    def stop(self) -> None:
        self._stop.set()

    def _parse_usb_log(self, text: str) -> None:
        if not text:
            return
        ssid = None
        m = re.search(r"SSID:([^\s]+)", text)
        if m:
            ssid = m.group(1)
        mpu_ok = None
        if re.search(r"MPU6050 I2C connection \[OK\]", text):
            mpu_ok = True
        elif re.search(r"MPU6050.*\[FAIL\]", text, re.I):
            mpu_ok = False
        ready = None
        if "Ready to fly" in text:
            ready = True
        if "sensors init done" in text and mpu_ok is None:
            mpu_ok = True

        with self.state.lock:
            self.state.usb_ok = True
            if ssid:
                self.state.ssid = ssid
            if mpu_ok is not None:
                self.state.mpu_ok = mpu_ok
            if ready is not None:
                self.state.ready = ready
            if self.state.mode != "live":
                self.state.mode = "usb"
                bits = []
                if self.state.mpu_ok:
                    bits.append("MPU6050 OK")
                elif self.state.mpu_ok is False:
                    bits.append("MPU FAIL")
                if self.state.ready:
                    bits.append("Ready")
                if self.state.ssid:
                    bits.append(self.state.ssid)
                bits.append("IMU via SoftAP")
                self.state.message = " · ".join(bits)

    def _run_usb(self) -> None:
        """USB-Status: einmal DTR-Reset, dann Log mithören (ohne Dauer-Reboot)."""
        did_reset = False
        while not self._stop.is_set():
            if serial is None:
                with self.state.lock:
                    self.state.usb_ok = False
                    self.state.message = "pyserial fehlt"
                self._stop.wait(2)
                continue
            try:
                ser = serial.Serial(self.usb_port, 115200, timeout=0.4)
            except Exception as exc:
                with self.state.lock:
                    self.state.usb_ok = False
                    if self.state.mode not in ("live",):
                        self.state.message = f"FC USB: {exc}"
                self._stop.wait(2)
                continue

            with self.state.lock:
                self.state.usb_ok = True
                if self.state.mode not in ("live", "usb"):
                    self.state.mode = "usb"
                    self.state.message = "FC USB ok – IMU über SoftAP"

            try:
                if not did_reset:
                    ser.dtr = False
                    time.sleep(0.05)
                    ser.dtr = True
                    did_reset = True
                    listen_s = 14.0
                else:
                    listen_s = 20.0

                buf = b""
                t0 = time.time()
                while time.time() - t0 < listen_s and not self._stop.is_set():
                    chunk = ser.read(4096)
                    if chunk:
                        buf += chunk
                        # inkrementell parsen, sobald genug da
                        if len(buf) > 200:
                            self._parse_usb_log(buf.decode("utf-8", "replace"))
                self._parse_usb_log(buf.decode("utf-8", "replace"))
            except Exception as exc:
                with self.state.lock:
                    if self.state.mode != "live":
                        self.state.message = f"USB-Scan: {exc}"
            finally:
                try:
                    ser.close()
                except Exception:
                    pass

            self._stop.wait(2)

    def _run_imu(self) -> None:
        while not self._stop.is_set():
            if on_softap():
                if self._live_session():
                    continue
            elif self.allow_demo:
                self._demo_slice()
                continue
            else:
                with self.state.lock:
                    if self.state.mode == "live":
                        self.state.mode = "usb" if self.state.usb_ok else "offline"
                        self.state.connected = False
                        if self.state.usb_ok:
                            self.state.message = (
                                "USB ok – für Live-IMU Pi auf SoftAP "
                                f"({self.state.ssid or 'ESP-DRONE_…'} / 12345678)"
                            )
                self._stop.wait(1.5)

    def _demo_slice(self) -> None:
        t0 = time.time()
        while not self._stop.is_set() and not on_softap():
            t = time.time() - t0
            data = {
                "stabilizer.roll": 12 * math.sin(t * 1.2),
                "stabilizer.pitch": 8 * math.sin(t * 0.9),
                "stabilizer.yaw": (t * 20) % 360 - 180,
                "gyro.x": 30 * math.sin(t * 2.5),
                "gyro.y": 25 * math.sin(t * 2.1),
                "gyro.z": 15 * math.sin(t * 1.6),
                "acc.x": 0.1 * math.sin(t * 2),
                "acc.y": 0.1 * math.cos(t * 1.7),
                "acc.z": 1.0 + 0.05 * math.sin(t * 3),
            }
            self.state.set_imu(data, "demo")
            with self.state.lock:
                self.state.message = "Demo-IMU (kein SoftAP)"
                self.state.subscribed = list(data)
            self._stop.wait(1 / 20)

    def _live_session(self) -> bool:
        try:
            import cflib.crtp
            from cflib.crazyflie import Crazyflie
            from cflib.crazyflie.log import LogConfig
            from cflib.crazyflie.syncCrazyflie import SyncCrazyflie
        except ImportError:
            with self.state.lock:
                self.state.message = "cflib fehlt (esp-drone Branch)"
            self._stop.wait(3)
            return False

        logging.getLogger("cflib").setLevel(logging.ERROR)
        patch_udp_driver()
        cflib.crtp.init_drivers()

        try:
            with SyncCrazyflie(self.uri, cf=Crazyflie(rw_cache="./cache")) as scf:
                toc = scf.cf.log.toc.toc
                blocks = []
                ordered = []
                for name, fb in PREFERRED:
                    g, _, v = name.partition(".")
                    if g in toc and v in toc[g]:
                        ctype = toc[g][v].ctype or fb
                        if ctype in TYPE_SIZE:
                            ordered.append((name, ctype))
                idx = i = 0
                while i < len(ordered) and idx < 8:
                    lg = LogConfig(name=f"fc{idx}", period_in_ms=40)
                    used = count = 0
                    while i < len(ordered):
                        name, ctype = ordered[i]
                        sz = TYPE_SIZE[ctype]
                        if count and used + sz > MAX_BLOCK:
                            break
                        try:
                            lg.add_variable(name, ctype)
                        except Exception:
                            i += 1
                            continue
                        used += sz
                        count += 1
                        i += 1
                        if count >= 6:
                            break
                    if count:
                        blocks.append(lg)
                        idx += 1
                    else:
                        i += 1

                if not blocks:
                    return False

                subs = [v.name for b in blocks for v in b.variables]
                with self.state.lock:
                    self.state.subscribed = subs
                    self.state.mode = "live"
                    self.state.connected = True
                    self.state.message = f"Live IMU – {len(subs)} Kanäle"

                latest: dict[str, float] = {}
                lock = threading.Lock()

                def make_cb():
                    def cb(_ts, data, _conf):
                        with lock:
                            for k, v in data.items():
                                try:
                                    latest[k] = float(v)
                                except (TypeError, ValueError):
                                    pass
                            snap = dict(latest)
                        self.state.set_imu(snap, "live")

                    return cb

                for blk in blocks:
                    scf.cf.log.add_config(blk)
                    blk.data_received_cb.add_callback(make_cb())
                    blk.start()

                stale = None
                while not self._stop.is_set() and on_softap():
                    with self.state.lock:
                        age = (
                            time.time() - self.state.updated_at
                            if self.state.updated_at
                            else 99
                        )
                    if age > 1.5:
                        stale = stale or time.time()
                        if time.time() - stale > 2:
                            break
                    else:
                        stale = None
                    self._stop.wait(0.15)

                for blk in blocks:
                    try:
                        blk.stop()
                    except Exception:
                        pass
                return True
        except Exception as exc:
            with self.state.lock:
                if self.state.mode == "live":
                    self.state.mode = "usb" if self.state.usb_ok else "offline"
                self.state.connected = False
                self.state.message = f"CRTP: {exc}"
            self._stop.wait(2)
            return False
