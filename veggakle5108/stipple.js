/** Wall Rug / Veggåkle #34 — Stipple-Berg (Norwegian Husflid) */

export const PALETTE = [
  [5, 0, 0],
  [255, 0, 0],
  [255, 171, 0],
  [84, 255, 0],
  [0, 0, 255],
  [254, 128, 255],
  [203, 0, 255],
  [85, 85, 85],
  [247, 248, 255],
  [124, 124, 124],
  [206, 206, 206],
  [255, 85, 85],
  [255, 85, 255],
  [255, 255, 85],
  [255, 255, 255],
];

export const FRAMES = 64;
export const FPS = 25;
export const BG = [0, 0, 0];

function hash(x, y, z) {
  let n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Berg-Silhouette — mehrere Gipfel, inspiriert vom Original */
export function mountainTop(xNorm) {
  const x = xNorm * Math.PI * 2.4 - 0.6;
  return (
    0.52
    + 0.14 * Math.sin(x * 1.0 + 0.4)
    + 0.09 * Math.sin(x * 2.3 + 1.1)
    + 0.06 * Math.sin(x * 4.7 + 2.0)
    + 0.04 * Math.sin(x * 9.0 + 0.8)
    + 0.03 * Math.sin(x * 17.0 + 3.2)
  );
}

export function inMountain(x, y, w, h) {
  const xn = x / w;
  const yn = 1 - y / h;
  if (yn < 0.08) return false;
  const ridge = mountainTop(xn);
  const micro = (hash(Math.floor(x * 0.5), Math.floor(y * 0.5), 0) - 0.5) * 0.018;
  return yn <= ridge + micro;
}

export function pickColor(x, y, w, h, frame) {
  const yn = 1 - y / h;
  const xn = x / w;
  const ridge = mountainTop(xn);
  const heightT = Math.max(0, Math.min(1, (yn - 0.1) / Math.max(0.01, ridge - 0.05)));
  const r = hash(x, y, frame * 0.31);

  if (heightT > 0.88 && r > 0.35) return PALETTE[14];
  if (heightT > 0.78 && r > 0.55) return PALETTE[8];
  if (xn < 0.42 && heightT > 0.35 && r > 0.42) return PALETTE[3];
  if (xn > 0.55 && heightT < 0.55 && r > 0.5) return PALETTE[6];
  if (heightT > 0.55 && r > 0.48) return PALETTE[2];
  if (heightT > 0.3 && r > 0.52) return PALETTE[1];
  if (r > 0.58) return PALETTE[9];
  if (r > 0.62) return PALETTE[7];
  return PALETTE[Math.floor(r * 5) + 1];
}

export function stippleVisible(x, y, frame) {
  const base = hash(x * 1.7, y * 2.3, 0);
  const flicker = hash(x, y, frame * 1.13 + 17);
  const threshold = 0.905 + 0.018 * Math.sin(frame * 0.4 + x * 0.02);
  return flicker > threshold && base > 0.08;
}

export function renderFrame(w, h, frame) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (!inMountain(x, y, w, h) || !stippleVisible(x, y, frame)) {
        data[i] = BG[0];
        data[i + 1] = BG[1];
        data[i + 2] = BG[2];
        data[i + 3] = 255;
        continue;
      }
      const [r, g, b] = pickColor(x, y, w, h, frame);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return data;
}
