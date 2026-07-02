# Deploy · GitHub → Railway

**Live:** https://jart-v01-production.up.railway.app  
**Repo:** https://github.com/Jacky222334/jart-v01

## 1. GitHub Push

```bash
cd jart_v01
node scripts/push-github.mjs   # ohne Xcode-git
# oder klassisch:
git add . && git commit -m "update" && git push
```

## 2. Railway (Auto-Deploy)

**Option A — GitHub verbinden (empfohlen):**
1. [railway.app](https://railway.app) → Projekt `jart-v01` → Service → **Settings**
2. **Connect Repo** → `Jacky222334/jart-v01` → Branch `main`
3. Jeder Push auf `main` deployt automatisch

**Option B — GitHub Actions:**
1. Railway → Account → **Tokens** → Token erstellen
2. GitHub → Repo → Settings → Secrets → `RAILWAY_TOKEN`
3. Workflow `.github/workflows/railway.yml` deployt bei jedem Push

**Option C — Manuell:**
```bash
railway up --detach
```

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
