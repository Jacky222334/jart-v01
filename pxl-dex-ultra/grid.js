/** PXL DEX Ultra · Grid · Kim Asendorf Hommage · ArtTab #4498 */

export function mulberry32(seed) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const NEON_PALETTE = [
  [0, 0, 12],
  [255, 0, 234],
  [0, 255, 255],
  [255, 238, 0],
  [255, 60, 0],
  [0, 255, 100],
  [180, 80, 255],
  [255, 255, 255],
];

function pickPixelGap(rnd, opts) {
  return {
    pixel: Math.floor(rnd() * (opts.pixelSizeMax - opts.pixelSizeMin + 1) + opts.pixelSizeMin),
    gap: Math.floor(rnd() * (opts.gapSizeMax - opts.gapSizeMin + 1) + opts.gapSizeMin),
  };
}

function fillRect(grid, width, rect, rnd, opts) {
  const { pixel, gap } = pickPixelGap(rnd, opts);
  const period = Math.max(2, pixel + gap);
  const bg = 0;
  const fg = 1 + Math.floor(rnd() * (opts.numColors - 1));
  const [x, y, w, h] = rect;

  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const idx = (col + x) + (row + y) * width;
      const inPixel = col % period < pixel && row % period < pixel;
      grid[idx] = inPixel ? fg : bg;
    }
  }
}

function subdivide(pending, rnd, opts, fill) {
  while (pending.length > 0) {
    const pick = Math.floor(rnd() * pending.length);
    const rect = pending.splice(pick, 1)[0];
    const [rx, ry, rw, rh] = rect;

    if (rnd() < 0.5) {
      const split = Math.floor(rnd() * rw);
      if (split >= opts.rectMin && rnd() < opts.splitDepth) fill([rx, ry, split, rh]);
      if (rw - split >= opts.rectMin && rnd() < opts.splitDepth) fill([rx + split, ry, rw - split, rh]);
    } else {
      const split = Math.floor(rnd() * rh);
      if (split >= opts.rectMin && rnd() < opts.splitDepth) fill([rx, ry, rw, split]);
      if (rh - split >= opts.rectMin && rnd() < opts.splitDepth) fill([rx, ry + split, rw, rh - split]);
    }
  }
}

export function generateGrid(shape, seed = 4498, userOpts = {}) {
  const rnd = mulberry32(seed);
  const opts = {
    rectMin: 8,
    pixelSizeMin: 1,
    pixelSizeMax: 9,
    gapSizeMin: 0,
    gapSizeMax: 5,
    splitDepth: 0.992,
    numColors: NEON_PALETTE.length,
    ...userOpts,
  };

  const width = shape[0];
  const height = shape[1];
  const grid = new Uint8Array(width * height);
  const pending = [];
  const rects = [];

  const fill = (rect) => {
    fillRect(grid, width, rect, rnd, opts);
    pending.push(rect);
    rects.push(rect);
  };

  fill([0, 0, width, height]);
  subdivide(pending, rnd, opts, fill);

  if (rects.length <= 3) {
    fill([0, 0, width, Math.floor(height * 0.4)]);
    subdivide(pending, rnd, opts, fill);
  }

  return { grid, rects, options: opts, width, height, seed };
}

export function gridToPixels(grid) {
  const data = new Uint8Array(grid.length * 4);
  for (let i = 0; i < grid.length; i++) {
    const [r, g, b] = NEON_PALETTE[grid[i]] || NEON_PALETTE[0];
    const o = i * 4;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = 255;
  }
  return data;
}

export function mutateRects(grid, width, rects, rnd, count = 4) {
  for (let n = 0; n < count; n++) {
    const rect = rects[Math.floor(rnd() * rects.length)];
    if (!rect) continue;
    fillRect(grid, width, rect, rnd, {
      pixelSizeMin: 1,
      pixelSizeMax: 11,
      gapSizeMin: 0,
      gapSizeMax: 6,
      numColors: NEON_PALETTE.length,
    });
  }
}
