"""Einfacher Multipart-Upload für Foto/Video (iPhone-tauglich)."""

from __future__ import annotations

import json
import re
import time
import uuid
from pathlib import Path

UPLOAD_DIR = Path(__file__).resolve().parent / "media" / "uploads"
MAX_BYTES = 80 * 1024 * 1024  # 80 MB
ALLOWED_EXT = {
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".heic",
    ".heif",
    ".mp4",
    ".mov",
    ".m4v",
    ".webm",
}


def ensure_dir() -> Path:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    return UPLOAD_DIR


def list_uploads(limit: int = 40) -> list[dict]:
    ensure_dir()
    files = sorted(UPLOAD_DIR.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True)
    out = []
    for p in files:
        if not p.is_file() or p.name.startswith("."):
            continue
        st = p.stat()
        ext = p.suffix.lower()
        kind = "video" if ext in {".mp4", ".mov", ".m4v", ".webm"} else "image"
        out.append(
            {
                "name": p.name,
                "url": f"/media/uploads/{p.name}",
                "size": st.st_size,
                "mtime": int(st.st_mtime),
                "kind": kind,
            }
        )
        if len(out) >= limit:
            break
    return out


def _parse_multipart(body: bytes, content_type: str) -> tuple[bytes | None, str | None]:
    m = re.search(r"boundary=([^;]+)", content_type, re.I)
    if not m:
        return None, None
    boundary = m.group(1).strip().strip('"').encode()
    sep = b"--" + boundary
    parts = body.split(sep)
    for part in parts:
        if not part or part in (b"--\r\n", b"--", b"\r\n"):
            continue
        if part.startswith(b"--"):
            continue
        if part.startswith(b"\r\n"):
            part = part[2:]
        if part.endswith(b"\r\n"):
            part = part[:-2]
        header_blob, _, data = part.partition(b"\r\n\r\n")
        if not _:
            continue
        headers = header_blob.decode("utf-8", errors="replace")
        if "filename=" not in headers and "filename*=" not in headers:
            continue
        fname = None
        fm = re.search(r'filename\*?=(?:UTF-8\'\')?"?([^";\r\n]+)"?', headers, re.I)
        if fm:
            fname = fm.group(1).strip()
        if data.endswith(b"\r\n"):
            data = data[:-2]
        return data, fname
    return None, None


def save_upload(body: bytes, content_type: str, agent: str | None = None) -> dict:
    if len(body) > MAX_BYTES:
        raise ValueError("Datei zu gross (max. 80 MB)")
    data, orig = _parse_multipart(body, content_type)
    if data is None:
        raise ValueError("Keine Datei im Upload gefunden")
    ensure_dir()
    orig_name = orig or "upload.bin"
    # nur Basisname
    orig_name = Path(orig_name).name
    ext = Path(orig_name).suffix.lower()
    if ext not in ALLOWED_EXT:
        # iPhone oft ohne Extension → sniff
        if data[:3] == b"\xff\xd8\xff":
            ext = ".jpg"
        elif data[:4] == b"\x89PNG":
            ext = ".png"
        elif data[4:8] == b"ftyp":
            ext = ".mp4"
        else:
            ext = ".bin"
    safe_agent = re.sub(r"[^A-Za-z0-9_-]", "", agent or "TEAM")[:12] or "TEAM"
    stamp = time.strftime("%Y%m%d-%H%M%S")
    name = f"{stamp}_{safe_agent}_{uuid.uuid4().hex[:6]}{ext}"
    path = UPLOAD_DIR / name
    path.write_bytes(data)
    kind = "video" if ext in {".mp4", ".mov", ".m4v", ".webm"} else "image"
    return {
        "ok": True,
        "name": name,
        "url": f"/media/uploads/{name}",
        "size": len(data),
        "kind": kind,
        "original": orig_name,
    }
