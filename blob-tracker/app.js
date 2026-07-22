import { createTracker } from './tracker.js';
import { drawOverlay } from './draw.js';

const video = document.getElementById('cam');
const still = document.getElementById('still'); // MJPEG / snapshot via <img>
const canvas = document.getElementById('out');
const ctx = canvas.getContext('2d', { alpha: true });
const work = document.createElement('canvas');
const wctx = work.getContext('2d', { willReadFrequently: true });
const statusEl = document.getElementById('status');
const countEl = document.getElementById('count');
const fpsEl = document.getElementById('fps');
const urlInput = document.getElementById('cam-url');
const sourceSel = document.getElementById('cam-source');
const startBtn = document.getElementById('start');

const STORAGE_KEY = 'blob-tracker-wlan-url';

const tracker = createTracker({
  minArea: 60,
  maxArea: 18000,
  maxBlobs: 32,
  threshold: 130,
  invert: false,
  trailLength: 28,
  motionSmoothing: 0.55,
  sizeSmoothing: 0.5,
  frameSkip: 1,
});

const opts = {
  useBrackets: true,
  drawTrails: true,
  drawConnections: true,
  useDotted: false,
  showIds: true,
  showMetrics: true,
  showGrid: false,
  invert: false,
  clear: false,
  outline: '#ff3b4a',
  trail: '#ff8a9a',
  thickness: 2.25,
  lineSmoothness: 8,
};

/** Basis-Auflösung für Detection; skaliert mit resScale (wie Upstream). */
const DETECT_BASE_W = 640;
const DETECT_BASE_H = 360;
let resScale = 0.5;
let stream = null;
let running = false;
let showVideo = true;
let mirror = true; // webcam default
let rotate = 'left'; // none | left | right | 180
let mode = 'wlan'; // 'webcam' | 'wlan'
let sourceKind = null; // 'video' | 'img'
let snapTimer = null;
let lastFpsT = performance.now();
let fpsFrames = 0;
let fpsValue = 0;

function detectSize() {
  return {
    w: Math.max(80, Math.round(DETECT_BASE_W * resScale)),
    h: Math.max(45, Math.round(DETECT_BASE_H * resScale)),
  };
}

function proxyUrl(raw) {
  const u = raw.trim();
  if (!u) return '';
  // lokale API-Streams (Tapo-MJPEG etc.) nicht nochmal wrappen
  if (u.startsWith('/api/')) return u;
  return `/api/cam-proxy?url=${encodeURIComponent(u)}`;
}

function bindSlider(id, valId, apply, format = (v) => String(v)) {
  const el = document.getElementById(id);
  const val = document.getElementById(valId);
  if (!el) return;
  const sync = () => {
    apply(Number(el.value));
    if (val) val.textContent = format(el.value);
  };
  sync();
  el.addEventListener('input', sync);
}

function bindToggles() {
  const map = {
    't-brackets': (v) => { opts.useBrackets = v; },
    't-trails': (v) => { opts.drawTrails = v; },
    't-links': (v) => { opts.drawConnections = v; },
    't-dotted': (v) => { opts.useDotted = v; },
    't-ids': (v) => { opts.showIds = v; },
    't-metrics': (v) => { opts.showMetrics = v; },
    't-grid': (v) => { opts.showGrid = v; },
    't-invert': (v) => { opts.invert = v; tracker.params.invert = v; },
    't-video': (v) => { showVideo = v; },
    't-mirror': (v) => { mirror = v; },
    't-skip': (v) => { tracker.params.frameSkip = v ? 2 : 1; },
  };
  for (const [id, fn] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (!el) continue;
    fn(el.checked);
    el.addEventListener('change', () => fn(el.checked));
  }

  bindSlider('threshold', 'threshold-val', (v) => { tracker.params.threshold = v; });
  bindSlider('minarea', 'minarea-val', (v) => { tracker.params.minArea = v; });
  bindSlider('maxarea', 'maxarea-val', (v) => { tracker.params.maxArea = v; });
  bindSlider('maxblobs', 'maxblobs-val', (v) => { tracker.params.maxBlobs = v; });
  bindSlider('res-scale', 'res-val', (v) => { resScale = v; }, (v) => Number(v).toFixed(2));
  bindSlider('motion-smooth', 'motion-val', (v) => {
    tracker.params.motionSmoothing = v;
    tracker.params.sizeSmoothing = v;
  }, (v) => Number(v).toFixed(2));
  bindSlider('line-smooth', 'line-val', (v) => { opts.lineSmoothness = v; });
  bindSlider('thickness', 'thick-val', (v) => { opts.thickness = v; }, (v) => Number(v).toFixed(2));

  const outline = document.getElementById('outline-color');
  const trail = document.getElementById('trail-color');
  if (outline) {
    opts.outline = outline.value;
    outline.addEventListener('input', () => { opts.outline = outline.value; });
  }
  if (trail) {
    opts.trail = trail.value;
    trail.addEventListener('input', () => { opts.trail = trail.value; });
  }

  const rot = document.getElementById('rotate');
  if (rot) {
    rotate = rot.value;
    rot.addEventListener('change', () => {
      rotate = rot.value;
      localStorage.setItem('blob-tracker-rotate', rotate);
    });
  }
}

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function syncSourceUi() {
  mode = sourceSel.value;
  const wlanBox = document.getElementById('wlan-box');
  wlanBox.hidden = mode !== 'wlan';
  document.getElementById('t-mirror').checked = mode === 'webcam';
  mirror = mode === 'webcam';
  startBtn.textContent = running ? 'Stop' : (mode === 'wlan' ? 'WLAN-Stream starten' : 'Webcam starten');
}

function getFrameSource() {
  if (sourceKind === 'img' && still.naturalWidth) return still;
  if (video.videoWidth) return video;
  return null;
}

function frameSize(src) {
  if (src === still) return { vw: still.naturalWidth, vh: still.naturalHeight };
  return { vw: video.videoWidth, vh: video.videoHeight };
}

async function startWebcam() {
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  video.srcObject = stream;
  video.src = '';
  still.removeAttribute('src');
  await video.play();
  sourceKind = 'video';
  statusEl.textContent = 'live · Webcam';
}

async function startWlan() {
  const raw = urlInput.value.trim();
  if (!raw) throw new Error('WLAN-URL fehlt');
  localStorage.setItem(STORAGE_KEY, raw);
  const proxied = proxyUrl(raw);

  statusEl.textContent = 'WLAN verbinden…';
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  video.srcObject = null;
  video.removeAttribute('src');

  const looksLikeFile = /\.m3u8(\?|$)|\.mp4(\?|$)/i.test(raw);

  if (looksLikeFile) {
    still.removeAttribute('src');
    video.src = proxied;
    await video.play();
    sourceKind = 'video';
  } else {
    // Vorcheck: Tapo/Proxy liefert oft Klartext-Fehler statt MJPEG
    if (/^\/api\/(tapo|rtsp)-mjpeg/.test(raw) || proxied.includes('/api/tapo-mjpeg')) {
      try {
        const probe = await fetch(proxied, { cache: 'no-store' });
        if (!probe.ok) {
          const msg = (await probe.text()).trim().slice(0, 160);
          throw new Error(msg || `HTTP ${probe.status}`);
        }
        try { probe.body?.cancel?.(); } catch { /* */ }
      } catch (err) {
        throw new Error(err.message || 'Tapo-Stream nicht erreichbar');
      }
    }

    // MJPEG / Live-JPEG über <img> + Server-Proxy (kein CORS-Problem)
    video.removeAttribute('src');
    still.src = proxied;
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Timeout — Kamera/WLAN prüfen')), 8000);
      still.onload = () => { clearTimeout(t); resolve(); };
      still.onerror = () => {
        clearTimeout(t);
        reject(new Error('Stream fehlgeschlagen — Tapo online? Server: npm run kiosk'));
      };
    });
    sourceKind = 'img';

    // Einzelbild-Snapshot-URLs: periodisch neu laden
    if (/snapshot|capture/i.test(raw) && !/mjpeg|stream|\/video/i.test(raw)) {
      clearInterval(snapTimer);
      snapTimer = setInterval(() => {
        const join = proxied.includes('?') ? '&' : '?';
        still.src = `${proxied.split(/[&?]_t=/)[0]}${join}_t=${Date.now()}`;
      }, 150);
    }
  }
  statusEl.textContent = 'live · WLAN';
}

async function startCam() {
  statusEl.textContent = 'verbinden…';
  if (mode === 'webcam') await startWebcam();
  else await startWlan();
  running = true;
  requestAnimationFrame(loop);
  syncSourceUi();
}

function stopCam() {
  running = false;
  clearInterval(snapTimer);
  snapTimer = null;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  video.pause();
  video.srcObject = null;
  video.removeAttribute('src');
  still.removeAttribute('src');
  sourceKind = null;
  statusEl.textContent = 'gestoppt';
  syncSourceUi();
}

function loop() {
  if (!running) return;
  const src = getFrameSource();
  if (!src) {
    requestAnimationFrame(loop);
    return;
  }
  const { vw, vh } = frameSize(src);
  if (!vw) {
    requestAnimationFrame(loop);
    return;
  }

  const dw = window.innerWidth;
  const dh = window.innerHeight;

  ctx.setTransform(
    Math.min(devicePixelRatio || 1, 2),
    0,
    0,
    Math.min(devicePixelRatio || 1, 2),
    0,
    0,
  );
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, dw, dh);

  // Logische Zeichenfläche nach Drehung
  let lw = dw;
  let lh = dh;
  ctx.save();
  if (rotate === 'left') {
    // 90° CCW
    ctx.translate(0, dh);
    ctx.rotate(-Math.PI / 2);
    lw = dh;
    lh = dw;
  } else if (rotate === 'right') {
    ctx.translate(dw, 0);
    ctx.rotate(Math.PI / 2);
    lw = dh;
    lh = dw;
  } else if (rotate === '180') {
    ctx.translate(dw, dh);
    ctx.rotate(Math.PI);
  }

  const scale = Math.max(lw / vw, lh / vh);
  const dwv = vw * scale;
  const dhv = vh * scale;
  const ox = (lw - dwv) / 2;
  const oy = (lh - dhv) / 2;

  if (showVideo) {
    ctx.save();
    if (mirror) {
      ctx.translate(lw, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(src, ox - (lw - dwv), oy, dwv, dhv);
    } else {
      ctx.drawImage(src, ox, oy, dwv, dhv);
    }
    ctx.restore();
  }

  // Blobs als Overlay darüber (ohne Video zu löschen)
  const { w: detW, h: detH } = detectSize();
  work.width = detW;
  work.height = detH;
  wctx.save();
  if (mirror) {
    wctx.translate(detW, 0);
    wctx.scale(-1, 1);
  }
  wctx.drawImage(src, 0, 0, detW, detH);
  wctx.restore();
  const frame = wctx.getImageData(0, 0, detW, detH);
  const track = tracker.update(frame, detW, detH);

  const sx = dwv / detW;
  const sy = dhv / detH;
  const scaled = {
    centers: track.centers.map(([x, y]) => [ox + x * sx, oy + y * sy]),
    sizes: track.sizes.map((s) => s * ((sx + sy) * 0.5)),
    ids: track.ids,
    confidence: track.confidence,
    trails: new Map(
      [...track.trails.entries()].map(([id, pts]) => [
        id,
        pts.map(([x, y]) => [ox + x * sx, oy + y * sy]),
      ]),
    ),
    count: track.count,
  };

  drawOverlay(ctx, lw, lh, scaled, opts);
  ctx.restore();

  countEl.textContent = `${track.count} blobs`;
  fpsFrames += 1;
  const now = performance.now();
  if (now - lastFpsT >= 500) {
    fpsValue = Math.round((fpsFrames * 1000) / (now - lastFpsT));
    fpsFrames = 0;
    lastFpsT = now;
    if (fpsEl) fpsEl.textContent = `${fpsValue} fps`;
  }
  requestAnimationFrame(loop);
}

startBtn.addEventListener('click', async () => {
  try {
    if (running) stopCam();
    else await startCam();
  } catch (err) {
    console.error(err);
    statusEl.textContent = err.message || 'Verbindung fehlgeschlagen';
    stopCam();
  }
});

sourceSel.addEventListener('change', () => {
  if (running) stopCam();
  syncSourceUi();
});

urlInput.value = localStorage.getItem(STORAGE_KEY) || '/api/tapo-mjpeg';

const scanBtn = document.getElementById('scan');
const scanStatus = document.getElementById('scan-status');
const scanResults = document.getElementById('scan-results');

scanBtn.addEventListener('click', async () => {
  scanBtn.disabled = true;
  scanResults.hidden = true;
  scanResults.innerHTML = '';
  scanStatus.textContent = 'scanne LAN… (kann ~30–90 s dauern)';
  statusEl.textContent = 'WLAN-Suche…';
  try {
    const res = await fetch('/api/cam-scan', { cache: 'no-store' });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const cams = data.cameras || [];
    const candidates = data.candidates || [];
    scanStatus.textContent = cams.length
      ? `${cams.length} Stream(s) in ${data.subnet}`
      : `${candidates.length} Kandidat(en) · ${data.subnet || '?'}`;

    const list = cams.length
      ? cams.map((c) => ({
        url: c.url,
        label: `${c.url}${c.authRequired ? ' · Auth' : ''}`,
        title: c.contentType || '',
      }))
      : candidates.map((c) => ({
        url: c.url,
        label: `${c.host}:${c.port}${c.name ? ` · ${c.name}` : ''}${c.hasStream ? ' · Stream' : ' · Port offen'}`,
        title: c.contentType || '',
      }));

    if (list.length) {
      scanResults.hidden = false;
      for (const item of list) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = item.label;
        b.title = item.title;
        b.addEventListener('click', () => {
          urlInput.value = item.url;
          localStorage.setItem(STORAGE_KEY, item.url);
        });
        scanResults.appendChild(b);
      }
      urlInput.value = list[0].url;
      localStorage.setItem(STORAGE_KEY, list[0].url);
    }
    statusEl.textContent = cams.length
      ? `gefunden · ${cams[0].url}`
      : (candidates.length ? `${candidates.length} Ports — App/Stream prüfen` : 'keine Kamera gefunden');
  } catch (err) {
    console.error(err);
    scanStatus.textContent = err.message || 'Scan fehlgeschlagen';
    statusEl.textContent = 'Scan fehlgeschlagen';
  } finally {
    scanBtn.disabled = false;
  }
});

document.getElementById('preset').addEventListener('change', (e) => {
  const v = e.target.value;
  if (!v) return;
  // Absolute API-Presets (Tapo)
  if (v.startsWith('/api/')) {
    urlInput.value = v;
    localStorage.setItem(STORAGE_KEY, v);
    return;
  }
  let base = urlInput.value.trim();
  if (/^https?:\/\/[\d.]+$/.test(base) || /^https?:\/\/[\d.]+\/?$/.test(base)) {
    urlInput.value = base.replace(/\/$/, '') + v;
  } else if (/^https?:\/\/[\d.]+/.test(base)) {
    const m = base.match(/^(https?:\/\/[\d.]+)/);
    urlInput.value = m[1] + v;
  } else {
    urlInput.value = `http://192.168.1.100${v}`;
  }
  localStorage.setItem(STORAGE_KEY, urlInput.value);
});

window.addEventListener('resize', resize);
window.addEventListener('keydown', (e) => {
  if (e.key === ' ' && e.target === document.body) {
    e.preventDefault();
    startBtn.click();
  }
});

const ptzStatus = document.getElementById('ptz-status');
let ptzBusy = false;

async function movePtz(dir) {
  if (ptzBusy && dir !== 'stop') return;
  ptzBusy = true;
  if (ptzStatus) ptzStatus.textContent = dir === 'stop' ? 'stop…' : `${dir}…`;
  try {
    const res = await fetch(`/api/tapo-ptz?dir=${encodeURIComponent(dir)}&ms=450&speed=0.45`, {
      cache: 'no-store',
    });
    const data = await res.json();
    if (ptzStatus) {
      ptzStatus.textContent = data.ok ? dir : (data.error || 'Fehler');
    }
  } catch (err) {
    if (ptzStatus) ptzStatus.textContent = err.message || 'PTZ fehlgeschlagen';
  } finally {
    ptzBusy = false;
  }
}

document.querySelectorAll('[data-ptz]').forEach((btn) => {
  btn.addEventListener('click', () => movePtz(btn.dataset.ptz));
});

window.addEventListener('keydown', (e) => {
  if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
  const map = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    Escape: 'stop',
  };
  const dir = map[e.key];
  if (!dir) return;
  e.preventDefault();
  movePtz(dir);
});

bindToggles();
syncSourceUi();
resize();
statusEl.textContent = 'WLAN-URL eintragen · starten';

// Query: ?cam=/api/tapo-mjpeg&autostart=1&rotate=left
const params = new URLSearchParams(location.search);
const q = params.get('cam');
if (q) {
  urlInput.value = q;
  sourceSel.value = 'wlan';
  syncSourceUi();
}
const rotParam = params.get('rotate') || localStorage.getItem('blob-tracker-rotate');
const rotEl = document.getElementById('rotate');
if (rotParam && rotEl && ['none', 'left', 'right', '180'].includes(rotParam)) {
  rotEl.value = rotParam;
  rotate = rotParam;
}
if (params.get('autostart') === '1' || params.has('autostart')) {
  syncSourceUi();
  startCam().catch((err) => {
    statusEl.textContent = err.message || 'Autostart fehlgeschlagen';
  });
}
