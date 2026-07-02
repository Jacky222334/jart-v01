/** Polarlichter · GO · Pixel-Aurora */

export const PAL = {
  bg: '#020818',
  green: '#00ff88',
  cyan: '#00ffff',
  magenta: '#ff00ea',
  violet: '#aa44ff',
  yellow: '#ffee00',
  pink: '#ff4488',
  white: '#ffffff',
};

export const LABEL = 'GO · POLARLICHTER';
export const SUB = '90°N · AURORA · PIXEL MANIA';

export function hash(x, y, t = 0) {
  const s = Math.sin(x * 127.1 + y * 311.7 + t * 47.3) * 43758.5453;
  return s - Math.floor(s);
}

export function noise2(x, y, t) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, t);
  const b = hash(ix + 1, iy, t);
  const c = hash(ix, iy + 1, t);
  const d = hash(ix + 1, iy + 1, t);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function auroraHue(t, x, y) {
  const w1 = Math.sin(x * 0.04 + t * 1.6) * 0.5 + 0.5;
  const w2 = Math.sin(y * 0.03 - t * 2.1 + x * 0.02) * 0.5 + 0.5;
  const w3 = Math.sin(t * 3.2 + x * 0.08) * 0.5 + 0.5;
  if (w3 > 0.72) return PAL.magenta;
  if (w2 > 0.6) return PAL.cyan;
  if (w1 > 0.55) return PAL.green;
  if (w1 > 0.3) return PAL.violet;
  return PAL.yellow;
}
