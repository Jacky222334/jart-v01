# Deploy · GitHub → Railway

## 1. GitHub Repository

```bash
cd jart_v01
git init
git add .
git commit -m "jart_v01 · Kiosk-Animationen · Railway-ready"
git branch -M main
git remote add origin https://github.com/DEIN-USER/jart-v01.git
git push -u origin main
```

## 2. Railway

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Repo `jart-v01` auswählen
3. Railway erkennt `package.json` + `server.js` automatisch
4. **Settings → Networking → Generate Domain** (öffentliche URL)

Start: `node server.js` · Port aus `$PORT` (Railway setzt das automatisch).

## URLs nach Deploy

| Pfad | Inhalt |
|------|--------|
| `/` | Kiosk-Rotation (alle Werke) |
| `/antrieb-100ly/` | Antrieb 100LY + Hail Mary Kontakt |
| `/hail-mary/` | Standalone Astrophage-Film |

## Lokal testen

```bash
node server.js
# → http://127.0.0.1:8765/antrieb-100ly/
```

## Pi (weiterhin optional)

```bash
./deploy-pi-jart-kiosk.sh
```
