/** Matterhorn · Voxel-Pixel · 2D-Rotation */

export const NEON = {
  snow: '#f0f8ff',
  snowGlow: '#00ffff',
  rock: '#6a7080',
  rockDark: '#3a4050',
  rockLight: '#9aa0b0',
  sky: '#050818',
  star: '#aaccff',
};

export const LABEL = 'MATTERHORN · 4478 m · PIXEL';

/** Voxel-Raster (lokal, y = Höhe) */
export function heightAt(x, z) {
  const nx = x * 0.14;
  const nz = z * 0.14;
  const asym = 1 + nx * 0.35;
  const r = Math.hypot(nx * 0.85, nz * 1.05) * asym;
  const peak = 17.5 - r * 2.05 - Math.pow(r, 2.4) * 0.35;
  const ridge = Math.max(0, 6 - Math.abs(nx - 2.2) * 1.8) * 0.4;
  const h = peak + ridge;
  if (h <= 0) return 0;
  const n = noise3(x * 0.7, z * 0.7, 0) * 0.6;
  return h + n;
}

function noise3(x, y, z) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

export function voxelColor(x, y, z, h, maxH) {
  const t = y / maxH;
  if (t > 0.72) {
    const g = 0.85 + noise3(x, y, z) * 0.15;
    return { fill: NEON.snow, glow: NEON.snowGlow, g };
  }
  const shade = 0.35 + (y / h) * 0.45 + noise3(x * 2, y, z * 2) * 0.15;
  return {
    fill: shade > 0.55 ? NEON.rockLight : shade > 0.4 ? NEON.rock : NEON.rockDark,
    glow: null,
    g: shade,
  };
}

export function rotateY(x, z, a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: x * c - z * s, z: x * s + z * c };
}
