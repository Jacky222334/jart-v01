/** Rekursives Pixel-Gitter — inspiriert von Rainbow Grid (Kim Asendorf) */

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function pickPixelGap(opts) {
  return {
    pixel: Math.floor(rand(opts.pixelSizeMin, opts.pixelSizeMax + 0.999)),
    gap: Math.floor(rand(opts.gapSizeMin, opts.gapSizeMax + 0.999)),
  };
}

/** Klassische Regenbogen-Palette — stabil, nicht pulsierend */
export const PALETTE = [
  [0, 0, 0],
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 255, 0],
  [0, 255, 255],
  [255, 0, 255],
];

function fillRect(grid, width, rect, opts) {
  const { pixel, gap } = pickPixelGap(opts);
  const period = pixel + gap;
  const bg = 0;
  const fg = 1 + Math.floor(Math.random() * (opts.numColors - 1));
  const [x, y, w, h] = rect;

  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const idx = (col + x) + (row + y) * width;
      const inPixel = col % period < pixel && row % period < pixel;
      grid[idx] = inPixel ? fg : bg;
    }
  }
}

function subdivide(pending, opts, fill) {
  while (pending.length > 0) {
    const pick = Math.floor(Math.random() * pending.length);
    const rect = pending.splice(pick, 1)[0];
    const [rx, ry, rw, rh] = rect;

    if (Math.random() < 0.5) {
      const split = Math.floor(Math.random() * rw);
      if (split >= opts.rectMin && Math.random() < opts.splitDepth) {
        fill([rx, ry, split, rh]);
      }
      if (rw - split >= opts.rectMin && Math.random() < opts.splitDepth) {
        fill([rx + split, ry, rw - split, rh]);
      }
    } else {
      const split = Math.floor(Math.random() * rh);
      if (split >= opts.rectMin && Math.random() < opts.splitDepth) {
        fill([rx, ry, rw, split]);
      }
      if (rh - split >= opts.rectMin && Math.random() < opts.splitDepth) {
        fill([rx, ry + split, rw, rh - split]);
      }
    }
  }
}

export function generateGrid(shape, userOpts = {}) {
  const opts = {
    rectMin: 12,
    pixelSizeMin: 1,
    pixelSizeMax: 7,
    gapSizeMin: 1,
    gapSizeMax: 4,
    splitDepth: 0.985,
    numColors: 7,
    ...userOpts,
  };

  const width = shape[0];
  const height = shape[1];
  const grid = new Uint8Array(width * height);
  const pending = [];
  const rects = [];

  function fill(rect) {
    fillRect(grid, width, rect, opts);
    pending.push(rect);
    rects.push(rect);
  }

  fill([0, 0, width, height]);
  subdivide(pending, opts, fill);

  if (rects.length <= 2) {
    fill([0, 0, width, Math.floor(height * 0.45)]);
    subdivide(pending, opts, fill);
  }

  return { grid, rects, options: opts, width, height };
}

/** Farben bleiben fix — nur Geometrie/Texture ändert sich dynamisch */
export function gridToPixels(grid) {
  const data = new Uint8Array(grid.length * 4);
  for (let i = 0; i < grid.length; i++) {
    const [r, g, b] = PALETTE[grid[i]] || PALETTE[0];
    const o = i * 4;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = 255;
  }
  return data;
}

/** Einzelne Rechtecke neu einfärben — Struktur bleibt, Muster wechselt */
export function mutateRects(grid, width, rects, count = 3) {
  for (let n = 0; n < count; n++) {
    const rect = rects[Math.floor(Math.random() * rects.length)];
    if (!rect) continue;
    fillRect(grid, width, rect, {
      pixelSizeMin: 1,
      pixelSizeMax: 7,
      gapSizeMin: 1,
      gapSizeMax: 4,
      numColors: 7,
    });
  }
}
