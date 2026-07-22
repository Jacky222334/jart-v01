#!/usr/bin/env python3
"""USB-Geräte erkennen (lsusb + optional pyusb) → JSON auf stdout."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import datetime, timezone


KNOWN = {
    ("2982", "1967"): ("Ableton Push 2", "midi"),
    ("1235", "000e"): ("Novation Launchpad", "midi"),
    ("046d", "085b"): ("Logitech Webcam C925e", "video"),
    ("046d", "082d"): ("Logitech HD Pro Webcam C920", "video"),
    ("1d6b", "0002"): ("USB 2.0 Root Hub", "hub"),
    ("1d6b", "0003"): ("USB 3.0 Root Hub", "hub"),
}


def run_lsusb() -> list[dict]:
    try:
        out = subprocess.check_output(["lsusb"], text=True, stderr=subprocess.DEVNULL)
    except (FileNotFoundError, subprocess.CalledProcessError) as e:
        return [{"error": f"lsusb: {e}"}]

    devices = []
    # Bus 001 Device 003: ID 046d:085b Logitech, Inc. Logitech Webcam C925e
    pat = re.compile(
        r"^Bus\s+(\d+)\s+Device\s+(\d+):\s+ID\s+([0-9a-fA-F]{4}):([0-9a-fA-F]{4})\s+(.*)$"
    )
    for line in out.splitlines():
        m = pat.match(line.strip())
        if not m:
            continue
        bus, dev, vid, pid, name = m.groups()
        vid_l, pid_l = vid.lower(), pid.lower()
        known = KNOWN.get((vid_l, pid_l))
        devices.append(
            {
                "bus": int(bus),
                "device": int(dev),
                "vid": vid_l,
                "pid": pid_l,
                "id": f"{vid_l}:{pid_l}",
                "name": name.strip(),
                "alias": known[0] if known else None,
                "kind": known[1] if known else "other",
                "path": f"/dev/bus/usb/{int(bus):03d}/{int(dev):03d}",
            }
        )
    return devices


def enrich_pyusb(devices: list[dict]) -> list[dict]:
    try:
        import usb.core  # type: ignore
        import usb.util  # type: ignore
    except ImportError:
        return devices

    by_id = {(d["vid"], d["pid"], d["bus"], d["device"]): d for d in devices if "vid" in d}
    for dev in usb.core.find(find_all=True):
        try:
            vid = f"{dev.idVendor:04x}"
            pid = f"{dev.idProduct:04x}"
            bus = int(dev.bus)
            addr = int(dev.address)
            key = (vid, pid, bus, addr)
            row = by_id.get(key)
            if not row:
                continue
            try:
                mfr = usb.util.get_string(dev, dev.iManufacturer) if dev.iManufacturer else None
            except Exception:
                mfr = None
            try:
                prod = usb.util.get_string(dev, dev.iProduct) if dev.iProduct else None
            except Exception:
                prod = None
            row["manufacturer"] = mfr
            row["product"] = prod
            row["address"] = addr
        except Exception:
            continue
    return devices


def video_nodes() -> list[str]:
    from pathlib import Path

    return sorted(str(p) for p in Path("/dev").glob("video*") if p.is_char_device())


def midi_nodes() -> list[str]:
    from pathlib import Path

    midi = Path("/dev/snd")
    if not midi.is_dir():
        return []
    return sorted(str(p) for p in midi.glob("midi*") if p.exists())


def main() -> int:
    devices = run_lsusb()
    if devices and "error" not in devices[0]:
        devices = enrich_pyusb(devices)

    payload = {
        "ok": True,
        "ts": datetime.now(timezone.utc).isoformat(),
        "count": len([d for d in devices if "vid" in d]),
        "devices": devices,
        "video": video_nodes(),
        "midi": midi_nodes(),
    }
    json.dump(payload, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
