/** Nordpol · Sicht des Eises · Pixel */

export const PAL = {
  void: '#020612',
  sky: '#061028',
  auroraA: '#00ffcc',
  auroraB: '#ff00ea',
  auroraC: '#ffee00',
  ice: '#d8f4ff',
  iceDeep: '#7ec8e8',
  iceShadow: '#2a5080',
  water: '#003366',
  waterGlow: '#00aaff',
  hot: '#ff3366',
  white: '#ffffff',
};

export const LABEL = 'NORDPOL · SICHT DES EISES';
export const TAG = 'PIXEL · MANIA · 90°N';

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

export function pick(str, n) {
  return str[Math.floor(n * str.length) % str.length];
}
