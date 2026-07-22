/** LAN-Scan nach typischen WLAN-/IP-Kameras */
import net from 'node:net';
import os from 'node:os';
import dns from 'node:dns/promises';
import { execSync } from 'node:child_process';

const CAM_PORTS = [8080, 8081, 81, 80, 8000, 8554, 5000, 8888, 10554];
const CAM_PATHS = [
  '/video',
  '/stream',
  '/mjpeg',
  '/mjpeg/1',
  '/mjpegfeed',
  '/videostream.cgi',
  '/cgi-bin/mjpg/video.cgi',
  '/axis-cgi/mjpg/video.cgi',
  '/cam.mjpg',
  '/live',
  '/shot.jpg',
  '/photo.jpg',
  '/videofeed',
  '/stream.mjpg',
  '/jsfs.html',
  '/',
];

const SKIP_IFACE = /^(lo|utun|awdl|llw|bridge|vmnet|vbox|docker|veth|cni|flannel|tun)/i;

function defaultGatewayIface() {
  try {
    if (process.platform === 'darwin') {
      const out = execSync('route -n get default 2>/dev/null', { encoding: 'utf8' });
      const m = /interface:\s+(\S+)/.exec(out);
      return m?.[1] || null;
    }
    if (process.platform === 'linux') {
      const out = execSync('ip route show default 2>/dev/null', { encoding: 'utf8' });
      const m = /\bdev\s+(\S+)/.exec(out);
      return m?.[1] || null;
    }
  } catch { /* */ }
  return null;
}

function localSubnets() {
  const preferred = defaultGatewayIface();
  const nets = os.networkInterfaces();
  const all = [];
  for (const [name, list] of Object.entries(nets)) {
    if (SKIP_IFACE.test(name)) continue;
    for (const n of list || []) {
      if (n.family !== 'IPv4' && n.family !== 4) continue;
      if (n.internal) continue;
      const parts = n.address.split('.').map(Number);
      const mask = (n.netmask || '255.255.255.0').split('.').map(Number);
      if (!(mask[0] === 255 && mask[1] === 255 && mask[2] === 255)) continue;
      // skip weird APIPA unless nothing else
      const apipa = parts[0] === 169;
      all.push({
        name,
        base: `${parts[0]}.${parts[1]}.${parts[2]}`,
        self: n.address,
        preferred: preferred ? name === preferred : false,
        apipa,
        score:
          (preferred && name === preferred ? 100 : 0)
          + (/^en\d|^eth\d|^wlan/i.test(name) ? 40 : 0)
          + (parts[0] === 192 && parts[1] === 168 ? 20 : 0)
          + (parts[0] === 10 ? 10 : 0)
          - (apipa ? 50 : 0),
      });
    }
  }
  all.sort((a, b) => b.score - a.score);
  // primary + any other high-score physical nets (scan up to 2)
  const picked = [];
  for (const s of all) {
    if (s.apipa && picked.length) continue;
    if (!picked.length || s.score >= 40) {
      if (!picked.some((p) => p.base === s.base)) picked.push(s);
    }
    if (picked.length >= 2) break;
  }
  return picked;
}

function tcpOpen(host, port, timeoutMs = 180) {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port });
    const done = (ok) => {
      try { sock.destroy(); } catch { /* */ }
      resolve(ok);
    };
    sock.setTimeout(timeoutMs);
    sock.on('connect', () => done(true));
    sock.on('timeout', () => done(false));
    sock.on('error', () => done(false));
  });
}

async function mapPool(items, concurrency, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length || 1) }, () => worker()));
  return results;
}

async function probeHttp(host, port, path, timeoutMs = 800) {
  const url = `http://${host}:${port}${path}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { Accept: '*/*', 'User-Agent': 'jart-cam-scan/1' },
    });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    try { await res.body?.cancel(); } catch { /* */ }

    const score =
      (ct.includes('multipart') ? 100 : 0)
      + (ct.includes('mjpeg') || ct.includes('image/jpeg') ? 80 : 0)
      + (ct.includes('image/') ? 50 : 0)
      + (ct.includes('video/') ? 70 : 0)
      + (path !== '/' ? 10 : 0)
      + (res.ok ? 5 : 0);

    if (!res.ok && res.status !== 401 && res.status !== 403) return null;
    if (score < 15 && path === '/') return null;

    return {
      url,
      host,
      port,
      path,
      status: res.status,
      contentType: ct || null,
      score,
      authRequired: res.status === 401 || res.status === 403,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * @param {{ onProgress?: (p: object) => void, maxHosts?: number }} opts
 */
export async function scanLanCameras(opts = {}) {
  const { onProgress, maxHosts = 254 } = opts;
  const subnets = localSubnets();
  if (!subnets.length) {
    return { subnet: null, cameras: [], openHosts: [], message: 'Kein LAN-Interface gefunden' };
  }

  const open = [];
  const hosts = [];
  for (const subnet of subnets) {
    for (let i = 1; i <= Math.min(254, maxHosts); i++) {
      const ip = `${subnet.base}.${i}`;
      if (ip === subnet.self) continue;
      hosts.push(ip);
    }
  }

  onProgress?.({ phase: 'ports', total: hosts.length * CAM_PORTS.length, done: 0, found: 0 });

  let done = 0;
  await mapPool(hosts, 80, async (host) => {
    for (const port of CAM_PORTS) {
      const ok = await tcpOpen(host, port, 160);
      done++;
      if (ok) open.push({ host, port });
      if (done % 50 === 0) {
        onProgress?.({
          phase: 'ports',
          total: hosts.length * CAM_PORTS.length,
          done,
          found: open.length,
        });
      }
    }
  });

  onProgress?.({ phase: 'http', total: open.length * CAM_PATHS.length, done: 0, found: 0 });

  const hits = [];
  let httpDone = 0;
  await mapPool(open, 16, async ({ host, port }) => {
    for (const path of CAM_PATHS) {
      const hit = await probeHttp(host, port, path);
      httpDone++;
      if (hit) hits.push(hit);
      if (httpDone % 8 === 0) {
        onProgress?.({
          phase: 'http',
          total: Math.max(1, open.length * CAM_PATHS.length),
          done: httpDone,
          found: hits.length,
        });
      }
    }
  });

  const best = new Map();
  for (const h of hits) {
    const key = `${h.host}:${h.port}`;
    const prev = best.get(key);
    if (!prev || h.score > prev.score) best.set(key, h);
  }

  const cameras = [...best.values()].sort((a, b) => b.score - a.score);

  // Hostnames für offene Ports (auch ohne gültigen Stream-Pfad)
  const nameCache = new Map();
  async function hostName(ip) {
    if (nameCache.has(ip)) return nameCache.get(ip);
    try {
      const names = await dns.reverse(ip);
      const n = names?.[0] || null;
      nameCache.set(ip, n);
      return n;
    } catch {
      nameCache.set(ip, null);
      return null;
    }
  }

  const candidates = [];
  for (const h of open) {
    const name = await hostName(h.host);
    const cam = cameras.find((c) => c.host === h.host && c.port === h.port);
    candidates.push({
      host: h.host,
      port: h.port,
      name,
      url: cam?.url || `http://${h.host}:${h.port}/video`,
      hasStream: Boolean(cam),
      contentType: cam?.contentType || null,
      status: cam?.status ?? null,
    });
  }
  candidates.sort((a, b) => Number(b.hasStream) - Number(a.hasStream) || a.host.localeCompare(b.host));

  return {
    subnet: subnets.map((s) => `${s.base}.0/24 (${s.name})`).join(', '),
    self: subnets.map((s) => s.self).join(', '),
    interfaces: subnets,
    openHosts: open,
    candidates,
    cameras,
    scannedHosts: hosts.length,
    scannedPorts: CAM_PORTS,
  };
}
