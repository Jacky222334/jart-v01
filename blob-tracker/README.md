# Blob Tracker (Web)

Browser-Port von:
- [nicholaspjm/touchdesigner-blobtracker](https://github.com/nicholaspjm/touchdesigner-blobtracker) (TD / `main.py`)
- [nicholaspjm/web-blob-tracker](https://github.com/nicholaspjm/web-blob-tracker) (offizielle Web-Variante)

Erweitert um Tapo/WLAN-MJPEG, Overlay, Drehung, PTZ.

## Start

Server starten (Root):

```bash
npm run kiosk
```

Dann:

```
http://localhost:8765/blob-tracker/?cam=/api/tapo-mjpeg&autostart=1&rotate=left
```

Braucht laufenden `node server.js` **und** erreichbare Tapo (`wlan_loca.txt` / `.env.tapo`).  
Leer/kein Bild: oft Server aus oder Kamera offline (502).

Kamera erlauben. Helle Blobs vor dunklem Hintergrund — oder **Invert** für dunkle Objekte.

## Features

- Blob-Detection (Threshold + Connected Components)
- ID-Matching über Frames
- Motion-/Size-Smoothing mit Confidence
- Brackets / Rechtecke, Catmull-Rom Trails, Connections, Grid, Metrics
- Detection-Resolution, Frame Skip, Max Area/Blobs, Farben, FPS
- Tapo RTSP→MJPEG Proxy, PTZ (Pfeiltasten), 90°-Drehung
