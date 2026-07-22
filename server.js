#!/usr/bin/env node
/** jart_v01 · Static server + WLAN-Kamera-Proxy */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { scanLanCameras } from './blob-tracker/scan-lan.js';
import { ptzMove, ptzStop } from './blob-tracker/tapo-ptz.js';
import { listUsbDevices } from './usb-erkennen/list-usb.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8765;

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
      '-rw_timeout', '5000000',
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

/** USB-Webcam (/dev/video0) → MJPEG für Blob-Overlay (ohne Browser-Portal) */
async function proxyUsbMjpeg(req, res) {
  const device = process.env.USB_VIDEO_DEV || '/dev/video0';
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

    // USB-Webcam → MJPEG (für LIITH Blob-Overlay / blob-tracker)
    if (u.pathname === '/api/usb-mjpeg') {
      await proxyUsbMjpeg(req, res);
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
