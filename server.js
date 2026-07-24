#!/usr/bin/env node
/** jart_v01 · Static server + WLAN-Kamera-Proxy */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { access, readFile, stat } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { scanLanCameras } from './blob-tracker/scan-lan.js';
import { ptzMove, ptzStop } from './blob-tracker/tapo-ptz.js';
import { listUsbDevices } from './usb-erkennen/list-usb.mjs';
import {
  autoStorageEnabled,
  listUploads,
  putUpload,
  storageConfigured,
  storageStatus,
} from './storage.mjs';
import {
  addDiaryEntry,
  diaryStatus,
  listDiaryEntries,
} from './diary-store.mjs';
import {
  addFeedback,
  feedbackStatus,
  listFeedback,
} from './feedback-store.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8765;
/** Remote-Dashboard mit USB-MJPEG (z.B. Cloudflare-Tunnel zum Pi) */
const PI_USB_CAM_BASE = (process.env.PI_USB_CAM_BASE || '').replace(/\/$/, '');
/** Token für Pi → Railway Telemetrie-Push (Header Authorization: Bearer …) */
const PI_INGEST_TOKEN = (process.env.PI_INGEST_TOKEN || '').trim();

/** Letzter Live-Snapshot vom Pi (GPS / Mic / Cam-Status) */
let piLive = {
  gps: {},
  mic: {},
  fc: {},
  usb_cam: {},
  phone_cam: {},
  updated_at: 0,
  source: 'none',
};

/** iPhone → App (ohne Pi): JPEG-Frames per POST, MJPEG-Ausspielung */
const phoneHub = {
  frame: null,
  updated_at: 0,
  frames: 0,
  publishers: 0,
  waiters: new Set(),
};

function phoneStatusJson() {
  const age = phoneHub.updated_at ? Date.now() - phoneHub.updated_at : null;
  const live = !!(phoneHub.frame && age != null && age < 4000);
  return {
    ok: live,
    streaming: live,
    frames: phoneHub.frames,
    age_ms: age,
    publishers: phoneHub.publishers,
    source: 'browser-push',
    label: 'iPhone · direkt in App',
    send_url: '/flight-dashboard/phone-send.html',
  };
}

function pushPhoneFrame(buf) {
  phoneHub.frame = buf;
  phoneHub.updated_at = Date.now();
  phoneHub.frames += 1;
  for (const wake of phoneHub.waiters) {
    try {
      wake();
    } catch {
      /* */
    }
  }
  phoneHub.waiters.clear();
  // Auto-Snapshot in die Cloud (gedrosselt)
  maybeAutoSnap(buf);
}

let lastAutoSnap = 0;
async function maybeAutoSnap(buf) {
  if (!autoStorageEnabled()) return;
  const everyMs = Number(process.env.STORAGE_SNAP_MS || 5000);
  const now = Date.now();
  if (now - lastAutoSnap < everyMs) return;
  lastAutoSnap = now;
  try {
    await putUpload({
      body: buf,
      contentType: 'image/jpeg',
      agent: 'PHONE',
      name: `live_${now}.jpg`,
      folder: 'auto/snaps',
    });
  } catch (err) {
    console.error('[storage] auto-snap', err.message || err);
  }
}

function waitPhoneFrame(ms = 2000) {
  return new Promise((resolve) => {
    if (phoneHub.frame && Date.now() - phoneHub.updated_at < 250) {
      resolve(phoneHub.frame);
      return;
    }
    const wake = () => {
      clearTimeout(t);
      phoneHub.waiters.delete(wake);
      resolve(phoneHub.frame);
    };
    const t = setTimeout(() => {
      phoneHub.waiters.delete(wake);
      resolve(phoneHub.frame);
    }, ms);
    phoneHub.waiters.add(wake);
  });
}

async function streamPhoneMjpeg(req, res) {
  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
    'Cache-Control': 'no-store, no-cache',
    'Access-Control-Allow-Origin': '*',
    Connection: 'close',
  });
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  let closed = false;
  const stop = () => {
    closed = true;
  };
  req.on('close', stop);
  res.on('close', stop);

  let lastSent = 0;
  while (!closed) {
    const age = phoneHub.updated_at ? Date.now() - phoneHub.updated_at : null;
    if (!phoneHub.frame || age == null || age > 8000) {
      await new Promise((r) => setTimeout(r, 200));
      continue;
    }
    if (phoneHub.updated_at === lastSent) {
      await waitPhoneFrame(1500);
      continue;
    }
    const jpeg = phoneHub.frame;
    lastSent = phoneHub.updated_at;
    try {
      res.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${jpeg.length}\r\n\r\n`);
      res.write(jpeg);
      res.write('\r\n');
    } catch {
      break;
    }
  }
  try {
    res.end();
  } catch {
    /* */
  }
}

/** RTSP-URL aus wlan_loca.txt / .env.tapo / Env */
function encodeRtspAuth(rtspUrl) {
  // ffmpeg auf manchen Builds scheitert an '!' im Passwort → %21
  const m = /^rtsp:\/\/([^:/?#@]+):([^@/]+)@(.+)$/i.exec(String(rtspUrl || '').trim());
  if (!m) return rtspUrl;
  return `rtsp://${encodeURIComponent(decodeURIComponent(m[1]))}:${encodeURIComponent(decodeURIComponent(m[2]))}@${m[3]}`;
}

function parseEnvFile(text) {
  const out = {};
  for (const line of String(text || '').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

async function loadTapoEnvFile() {
  try {
    return parseEnvFile(await readFile(join(ROOT, '.env.tapo'), 'utf8'));
  } catch {
    return {};
  }
}

function tcpOpen(host, port, ms = 1200) {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port }, () => {
      sock.destroy();
      resolve(true);
    });
    sock.setTimeout(ms);
    sock.on('timeout', () => {
      sock.destroy();
      resolve(false);
    });
    sock.on('error', () => resolve(false));
  });
}

async function loadTapoRtsp(stream = 'sub') {
  const fileEnv = await loadTapoEnvFile();
  const envMain = process.env.TAPO_C220_RTSP_MAIN || fileEnv.TAPO_C220_RTSP_MAIN;
  const envSub = process.env.TAPO_C220_RTSP_SUB || fileEnv.TAPO_C220_RTSP_SUB;
  let raw = null;
  if (stream === 'main' && envMain) raw = envMain;
  else if (stream !== 'main' && envSub) raw = envSub;
  else if (envMain) raw = envMain;

  if (!raw) {
    for (const file of ['wlan_loca.txt', '.env.tapo', 'Wlan_cams.txt']) {
      try {
        const text = await readFile(join(ROOT, file), 'utf8');
        const key = stream === 'main' ? /RTSP main:\s*(\S+)/i : /RTSP sub:\s*(\S+)/i;
        const keyEnv = stream === 'main'
          ? /TAPO_C220_RTSP_MAIN=(\S+)/
          : /TAPO_C220_RTSP_SUB=(\S+)/;
        const m = key.exec(text) || keyEnv.exec(text) || /rtsp:\/\/\S+/i.exec(text);
        if (m) {
          raw = (m[1] || m[0]).trim();
          break;
        }
      } catch { /* */ }
    }
  }
  return raw ? encodeRtspAuth(raw) : null;
}

async function proxyRtspMjpeg(req, res, rtspUrl) {
  const safeUrl = encodeRtspAuth(rtspUrl);
  let host;
  let port = 554;
  try {
    const u = new URL(safeUrl);
    host = u.hostname;
    port = Number(u.port) || 554;
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('bad rtsp url');
    return;
  }
  if (!isAllowedCamHost(host)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('host not allowed');
    return;
  }

  // Kamera offline → sofort klarer Fehler statt hängendem Browser
  if (!(await tcpOpen(host, port, 1500))) {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Tapo offline: ${host}:${port} nicht erreichbar (WLAN/Strom prüfen)`);
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=ffmpeg',
    'Cache-Control': 'no-store, no-cache',
    'Access-Control-Allow-Origin': '*',
    Connection: 'close',
  });

  const ff = spawn(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel', 'error',
      '-rtsp_transport', 'tcp',
      // ffmpeg 8: rw_timeout entfernt → timeout (µs) vor -i
      '-timeout', '5000000',
      '-i', safeUrl,
      '-an',
      '-vf', 'scale=960:-2',
      '-f', 'mpjpeg',
      '-q:v', '6',
      'pipe:1',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  ff.stdout.pipe(res);
  ff.stderr.on('data', (chunk) => {
    const msg = chunk.toString().trim();
    if (msg) console.error('[tapo-ffmpeg]', msg);
  });
  const kill = () => {
    try { ff.kill('SIGKILL'); } catch { /* */ }
  };
  req.on('close', kill);
  res.on('close', kill);
  ff.on('error', (err) => {
    console.error('[tapo-ffmpeg] spawn', err.message);
    try {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`ffmpeg: ${err.message}`);
      } else res.end();
    } catch { /* */ }
  });
  ff.on('close', (code) => {
    if (!res.writableEnded) {
      try { res.end(); } catch { /* */ }
    }
    if (code && code !== 0) console.error('[tapo-ffmpeg] exit', code);
  });
}

async function deviceExists(path) {
  try {
    await access(path, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/** Remote-Pi USB-MJPEG (HTTPS-Tunnel) durchreichen */
async function proxyRemoteUsbMjpeg(req, res, base) {
  const target = `${base}/api/usb-mjpeg`;
  let upstream;
  try {
    upstream = await fetch(target, {
      headers: { Accept: '*/*', 'User-Agent': 'jart-usb-relay/1' },
      signal: AbortSignal.timeout(20000),
    });
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end(`pi usb relay: ${err.message}`);
    return;
  }
  const ct = upstream.headers.get('content-type')
    || 'multipart/x-mixed-replace; boundary=ffmpeg';
  res.writeHead(upstream.status, {
    'Content-Type': ct,
    'Cache-Control': 'no-store, no-cache',
    'Access-Control-Allow-Origin': '*',
    Connection: 'close',
  });
  if (!upstream.body) {
    res.end();
    return;
  }
  const reader = upstream.body.getReader();
  req.on('close', () => {
    try { reader.cancel(); } catch { /* */ }
  });
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(value)) {
        await new Promise((r) => res.once('drain', r));
      }
    }
    res.end();
  } catch {
    try { res.end(); } catch { /* */ }
  }
}

async function usbStatusJson() {
  const device = process.env.USB_VIDEO_DEV || '/dev/video0';
  const localOk = await deviceExists(device);
  if (localOk) {
    return {
      ok: true,
      device,
      streaming: false,
      source: 'local',
      label: 'USB Webcam · local',
    };
  }
  if (PI_USB_CAM_BASE) {
    try {
      const r = await fetch(`${PI_USB_CAM_BASE}/api/usb-status`, {
        signal: AbortSignal.timeout(4000),
      });
      if (r.ok) {
        const j = await r.json();
        return { ...j, source: 'pi-relay', relay: PI_USB_CAM_BASE };
      }
    } catch (err) {
      return {
        ok: false,
        source: 'pi-relay',
        relay: PI_USB_CAM_BASE,
        last_error: err.message,
        label: 'Team USB · Relay offline',
      };
    }
  }
  return {
    ok: false,
    device,
    source: 'none',
    label: 'Keine USB-Cam',
  };
}

/** USB-Webcam (/dev/video0) → MJPEG, sonst Relay von PI_USB_CAM_BASE */
async function proxyUsbMjpeg(req, res) {
  const device = process.env.USB_VIDEO_DEV || '/dev/video0';
  if (!(await deviceExists(device))) {
    if (PI_USB_CAM_BASE) {
      await proxyRemoteUsbMjpeg(req, res, PI_USB_CAM_BASE);
      return;
    }
    res.writeHead(503, { 'Content-Type': 'text/plain' });
    res.end('Keine USB-Kamera (lokal) und kein PI_USB_CAM_BASE');
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=ffmpeg',
    'Cache-Control': 'no-store, no-cache',
    'Access-Control-Allow-Origin': '*',
    Connection: 'close',
  });
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const ff = spawn(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel', 'warning',
      '-f', 'v4l2',
      '-input_format', 'mjpeg',
      '-video_size', '640x480',
      '-i', device,
      '-an',
      '-vf', 'scale=640:360',
      '-r', '12',
      '-f', 'mpjpeg',
      '-q:v', '7',
      'pipe:1',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  ff.stdout.pipe(res);
  ff.stderr.on('data', (chunk) => {
    const msg = chunk.toString().trim();
    if (msg) console.error('[usb-ffmpeg]', msg);
  });
  const kill = () => {
    try { ff.kill('SIGKILL'); } catch { /* */ }
  };
  req.on('close', kill);
  res.on('close', kill);
  ff.on('error', (err) => {
    console.error('[usb-ffmpeg] spawn', err.message);
    try {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`ffmpeg: ${err.message}`);
      } else res.end();
    } catch { /* */ }
  });
  ff.on('close', (code) => {
    if (!res.writableEnded) {
      try { res.end(); } catch { /* */ }
    }
    if (code && code !== 0) console.error('[usb-ffmpeg] exit', code);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.wasm': 'application/wasm',
  '.min.js': 'text/javascript; charset=utf-8',
};

function contentType(file) {
  if (file.endsWith('.min.js')) return MIME['.min.js'];
  return MIME[extname(file).toLowerCase()] || 'application/octet-stream';
}

/** Nur private / lokale Kameras proxyn (kein offenes Internet-Relay) */
function isAllowedCamHost(hostname) {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
  if (h.endsWith('.local')) return true;
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

async function proxyCam(req, res, targetUrl) {
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('bad url');
    return;
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('only http/https');
    return;
  }
  if (!isAllowedCamHost(parsed.hostname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('host not allowed (only LAN / localhost)');
    return;
  }

  const upstream = await fetch(parsed.href, {
    headers: {
      Accept: '*/*',
      'User-Agent': 'jart-cam-proxy/1',
      ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  }).catch((err) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end(`upstream: ${err.message}`);
    return null;
  });
  if (!upstream) return;

  const ct = upstream.headers.get('content-type') || 'application/octet-stream';
  res.writeHead(upstream.status, {
    'Content-Type': ct,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });

  if (!upstream.body) {
    res.end();
    return;
  }

  const reader = upstream.body.getReader();
  const pump = async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!res.write(value)) {
          await new Promise((r) => res.once('drain', r));
        }
      }
      res.end();
    } catch {
      try { res.end(); } catch { /* */ }
    }
  };

  req.on('close', () => {
    try { reader.cancel(); } catch { /* */ }
  });
  pump();
}

async function serve(req, res) {
  try {
    const u = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'OPTIONS' && u.pathname.startsWith('/api/')) {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Pi-Token',
      });
      res.end();
      return;
    }

    // Pi pusht Live-GPS/Mic/Status hierher (Railway)
    if (u.pathname === '/api/pi-ingest' && req.method === 'POST') {
      if (!PI_INGEST_TOKEN) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'PI_INGEST_TOKEN nicht gesetzt' }));
        return;
      }
      const auth = req.headers.authorization || '';
      const hdr = req.headers['x-pi-token'] || '';
      const okAuth =
        auth === `Bearer ${PI_INGEST_TOKEN}` || hdr === PI_INGEST_TOKEN;
      if (!okAuth) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'unauthorized' }));
        return;
      }
      const chunks = [];
      for await (const c of req) chunks.push(c);
      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'invalid json' }));
        return;
      }
      piLive = {
        gps: body.gps && typeof body.gps === 'object' ? body.gps : piLive.gps,
        mic: body.mic && typeof body.mic === 'object' ? body.mic : piLive.mic,
        fc: body.fc && typeof body.fc === 'object' ? body.fc : piLive.fc,
        usb_cam:
          body.usb_cam && typeof body.usb_cam === 'object'
            ? body.usb_cam
            : piLive.usb_cam,
        phone_cam:
          body.phone_cam && typeof body.phone_cam === 'object'
            ? body.phone_cam
            : piLive.phone_cam,
        updated_at: Date.now(),
        source: 'pi-push',
      };
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ ok: true, updated_at: piLive.updated_at }));
      return;
    }

    if (u.pathname === '/api/telemetry' && req.method === 'GET') {
      const age = piLive.updated_at ? Date.now() - piLive.updated_at : null;
      const stale = age == null || age > 15000;
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(
        JSON.stringify({
          gps: piLive.gps || {},
          mic: piLive.mic || {},
          fc: piLive.fc || {},
          relay: {
            source: piLive.source,
            updated_at: piLive.updated_at || null,
            age_ms: age,
            stale,
            live: !stale && !!(piLive.gps && piLive.gps.connected),
          },
        })
      );
      return;
    }

    if (u.pathname === '/api/fc' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify(piLive.fc || { mode: 'offline', message: 'kein FC-Relay' }));
      return;
    }

    if (u.pathname === '/api/status' && req.method === 'GET') {
      const g = piLive.gps || {};
      const m = piLive.mic || {};
      const f = piLive.fc || {};
      const age = piLive.updated_at ? Date.now() - piLive.updated_at : null;
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(
        JSON.stringify({
          ok: true,
          gps: {
            connected: g.connected,
            fix: g.fix,
            message: g.message,
            satellites: g.satellites,
          },
          mic: {
            connected: m.connected,
            message: m.message,
            channels: m.channels || 4,
            mic1: (m.mic1 || {}).db,
            mic2: (m.mic2 || {}).db,
            mic3: (m.mic3 || {}).db,
            mic4: (m.mic4 || {}).db,
          },
          fc: {
            mode: f.mode,
            connected: f.connected,
            message: f.message,
            usb_ok: f.usb_ok,
            mpu_ok: f.mpu_ok,
            ready: f.ready,
            values: f.values || {},
          },
          usb_cam: piLive.usb_cam || {},
          phone_cam: piLive.phone_cam || {},
          relay: {
            source: piLive.source,
            updated_at: piLive.updated_at || null,
            age_ms: age,
            stale: age == null || age > 15000,
          },
        })
      );
      return;
    }

    if (u.pathname === '/api/cam-proxy') {
      const target = u.searchParams.get('url');
      if (!target) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('missing ?url=');
        return;
      }
      await proxyCam(req, res, target);
      return;
    }

    // USB-Webcam → MJPEG (lokal oder PI_USB_CAM_BASE-Relay)
    if (u.pathname === '/api/usb-mjpeg') {
      await proxyUsbMjpeg(req, res);
      return;
    }
    if (u.pathname === '/api/usb-status') {
      const body = JSON.stringify(await usbStatusJson());
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(body);
      return;
    }

    // iPhone direkt → App (ohne Pi / ohne Larix-RTMP)
    if (u.pathname === '/api/phone-frame' && req.method === 'POST') {
      const chunks = [];
      let size = 0;
      for await (const c of req) {
        size += c.length;
        if (size > 2_500_000) {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'frame too large' }));
          return;
        }
        chunks.push(c);
      }
      const buf = Buffer.concat(chunks);
      if (buf.length < 100) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'empty frame' }));
        return;
      }
      pushPhoneFrame(buf);
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      });
      res.end();
      return;
    }
    if (u.pathname === '/api/phone-mjpeg') {
      const age = phoneHub.updated_at ? Date.now() - phoneHub.updated_at : null;
      if (phoneHub.frame && age != null && age < 10000) {
        await streamPhoneMjpeg(req, res);
        return;
      }
      const piPhone = (process.env.PI_PHONE_CAM_BASE || '').replace(/\/$/, '');
      if (piPhone) {
        try {
          const upstream = await fetch(`${piPhone}/api/phone-mjpeg`, {
            headers: { Accept: 'multipart/x-mixed-replace,*/*' },
            signal: AbortSignal.timeout(8000),
          });
          if (upstream.ok && upstream.body) {
            res.writeHead(200, {
              'Content-Type':
                upstream.headers.get('content-type') ||
                'multipart/x-mixed-replace; boundary=frame',
              'Cache-Control': 'no-store',
              'Access-Control-Allow-Origin': '*',
            });
            const reader = upstream.body.getReader();
            req.on('close', () => {
              try {
                reader.cancel();
              } catch {
                /* */
              }
            });
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
            res.end();
            return;
          }
        } catch {
          /* */
        }
      }
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(
        'Kein Phone-Stream — öffne /flight-dashboard/phone-send.html auf dem iPhone'
      );
      return;
    }
    if (u.pathname === '/api/phone-status') {
      const local = phoneStatusJson();
      const body = JSON.stringify({
        ...local,
        pi: piLive.phone_cam || {},
        storage: await storageStatus(),
      });
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(body);
      return;
    }

    if (u.pathname === '/api/storage-status') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify(await storageStatus()));
      return;
    }

    if (u.pathname === '/api/diary' && req.method === 'GET') {
      try {
        const data = await listDiaryEntries({
          agent: u.searchParams.get('agent') || null,
          limit: Number(u.searchParams.get('limit') || 200),
        });
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify(data));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message, entries: [] }));
      }
      return;
    }

    if (u.pathname === '/api/diary-status' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify(await diaryStatus()));
      return;
    }

    if (u.pathname === '/api/diary' && req.method === 'POST') {
      try {
        const chunks = [];
        let size = 0;
        const max = 64 * 1024;
        for await (const c of req) {
          size += c.length;
          if (size > max) {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'Payload zu gross' }));
            return;
          }
          chunks.push(c);
        }
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        const result = await addDiaryEntry(body);
        res.writeHead(201, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify(result));
      } catch (err) {
        const code = err.status || 500;
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message || String(err) }));
      }
      return;
    }

    if (u.pathname === '/api/feedback' && req.method === 'GET') {
      try {
        const data = await listFeedback({
          target: u.searchParams.get('target') || null,
          limit: Number(u.searchParams.get('limit') || 80),
        });
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify(data));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message, posts: [] }));
      }
      return;
    }

    if (u.pathname === '/api/feedback-status' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify(await feedbackStatus()));
      return;
    }

    if (u.pathname === '/api/feedback' && req.method === 'POST') {
      try {
        const chunks = [];
        let size = 0;
        const max = 32 * 1024;
        for await (const c of req) {
          size += c.length;
          if (size > max) {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'Payload zu gross' }));
            return;
          }
          chunks.push(c);
        }
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        const result = await addFeedback(body);
        res.writeHead(201, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify(result));
      } catch (err) {
        const code = err.status || 500;
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message || String(err) }));
      }
      return;
    }

    if (u.pathname === '/api/uploads' && req.method === 'GET') {
      try {
        const files = storageConfigured()
          ? await listUploads({
              prefix: u.searchParams.get('prefix') || 'uploads/',
              max: 80,
            })
          : [];
        // auch Auto-Snaps/Clips auflisten wenn gewünscht
        let auto = [];
        if (storageConfigured() && u.searchParams.get('auto') !== '0') {
          auto = await listUploads({ prefix: 'auto/', max: 40 });
        }
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(
          JSON.stringify({
            ok: true,
            storage: await storageStatus(),
            files: [...files, ...auto]
              .sort((a, b) => String(b.mtime || '').localeCompare(String(a.mtime || '')))
              .slice(0, 80),
          })
        );
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message, files: [] }));
      }
      return;
    }

    if (u.pathname === '/api/upload' && req.method === 'POST') {
      if (!storageConfigured()) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            ok: false,
            error:
              'Cloud-Storage fehlt. Setze S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT, S3_PUBLIC_BASE_URL',
          })
        );
        return;
      }
      try {
        const chunks = [];
        let size = 0;
        const max = 80 * 1024 * 1024;
        for await (const c of req) {
          size += c.length;
          if (size > max) {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'Datei zu gross (max 80 MB)' }));
            return;
          }
          chunks.push(c);
        }
        const raw = Buffer.concat(chunks);
        const ctype = req.headers['content-type'] || '';
        let body = raw;
        let contentType = ctype.split(';')[0].trim() || 'application/octet-stream';
        let filename = u.searchParams.get('name') || '';

        // multipart/form-data grob parsen (Feld "file")
        if (ctype.includes('multipart/form-data')) {
          const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ctype);
          const boundary = (m && (m[1] || m[2]) || '').trim();
          if (!boundary) throw new Error('multipart boundary fehlt');
          const parts = raw.toString('binary').split(`--${boundary}`);
          for (const part of parts) {
            if (!part.includes('Content-Disposition')) continue;
            const headEnd = part.indexOf('\r\n\r\n');
            if (headEnd < 0) continue;
            const head = part.slice(0, headEnd);
            if (!/name="file"/i.test(head)) continue;
            const fn = /filename="([^"]+)"/i.exec(head);
            if (fn) filename = fn[1];
            const ctm = /Content-Type:\s*([^\r\n]+)/i.exec(head);
            if (ctm) contentType = ctm[1].trim();
            let bin = part.slice(headEnd + 4);
            if (bin.endsWith('\r\n')) bin = bin.slice(0, -2);
            body = Buffer.from(bin, 'binary');
            break;
          }
          if (!body.length) throw new Error('Kein file-Feld im Upload');
        }

        const agent = u.searchParams.get('agent') || 'TEAM';
        const folder = u.searchParams.get('folder') || 'uploads';
        const result = await putUpload({
          body,
          contentType,
          agent,
          name: filename,
          folder,
        });
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message || String(err) }));
      }
      return;
    }

    // Tapo C220 → MJPEG für Blob-Tracker (Zugangsdaten aus wlan_loca.txt)
    if (u.pathname === '/api/tapo-mjpeg' || u.pathname === '/api/rtsp-mjpeg') {
      const which = u.searchParams.get('stream') === 'main' ? 'main' : 'sub';
      const custom = u.searchParams.get('url');
      const rtsp = custom || await loadTapoRtsp(which);
      if (!rtsp) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('keine RTSP-URL (wlan_loca.txt / .env.tapo)');
        return;
      }
      await proxyRtspMjpeg(req, res, rtsp);
      return;
    }

    // Tapo PTZ: ?dir=left|right|up|down|stop  oder pan=&tilt=&ms=
    if (u.pathname === '/api/tapo-ptz') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      });
      try {
        const dir = (u.searchParams.get('dir') || '').toLowerCase();
        if (dir === 'stop') {
          res.end(JSON.stringify(await ptzStop(ROOT)));
          return;
        }
        const speed = Math.min(1, Math.max(0.15, Number(u.searchParams.get('speed') || 0.45)));
        const ms = Number(u.searchParams.get('ms') || 450);
        let pan = Number(u.searchParams.get('pan') || 0);
        let tilt = Number(u.searchParams.get('tilt') || 0);
        if (dir === 'left') pan = -speed;
        if (dir === 'right') pan = speed;
        if (dir === 'up') tilt = speed;
        if (dir === 'down') tilt = -speed;
        if (!pan && !tilt) {
          res.end(JSON.stringify({ ok: false, error: 'dir oder pan/tilt nötig' }));
          return;
        }
        const result = await ptzMove(ROOT, { pan, tilt, durationMs: ms });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
      return;
    }

    if (u.pathname === '/api/cam-scan') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      try {
        const result = await scanLanCameras();
        res.end(JSON.stringify(result));
      } catch (err) {
        res.end(JSON.stringify({ error: err.message, cameras: [] }));
      }
      return;
    }

    if (u.pathname === '/api/usb-devices') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      });
      try {
        res.end(JSON.stringify(await listUsbDevices()));
      } catch (err) {
        res.end(JSON.stringify({ ok: false, error: err.message, devices: [], video: [], midi: [] }));
      }
      return;
    }

    let url = decodeURIComponent(u.pathname);
    if (url === '/') url = '/jart-kiosk/pi.html';
    const safe = normalize(url).replace(/^(\.\.[/\\])+/, '');
    let filePath = join(ROOT, safe);

    let st;
    try {
      st = await stat(filePath);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404');
      return;
    }

    if (st.isDirectory()) {
      filePath = join(filePath, 'index.html');
      st = await stat(filePath);
    }

    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': contentType(filePath),
      'Cache-Control': filePath.includes('node_modules') ? 'public, max-age=86400' : 'public, max-age=300',
    });
    res.end(body);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500');
  }
}

createServer(serve).listen(PORT, '0.0.0.0', () => {
  console.log(`jart_v01 → http://0.0.0.0:${PORT}`);
});
