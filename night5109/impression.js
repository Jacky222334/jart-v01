/** Night Impression IV — verschwommenes Farbfeld (MCHX) */

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpRgb(a, b, t) {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}

function mixPalettes(palettes, phase) {
  const n = palettes.length;
  const f = phase * n;
  const i = Math.floor(f) % n;
  const j = (i + 1) % n;
  const t = f - Math.floor(f);
  const a = palettes[i];
  const b = palettes[j];
  return {
    vertical: a.vertical.map((c, k) => lerpRgb(c, b.vertical[k], t)),
    horizontal: a.horizontal.map((c, k) => lerpRgb(c, b.horizontal[k], t)),
    border: lerpRgb(a.border, b.border, t),
  };
}

/** Farbmodi inspiriert vom Original-Video */
export const PALETTES = [
  {
    vertical: [[255, 120, 180], [220, 80, 160], [180, 60, 200], [120, 80, 180], [80, 60, 140], [60, 80, 160], [200, 100, 120], [255, 140, 100]],
    horizontal: [[255, 80, 60], [240, 100, 80], [200, 60, 100], [160, 40, 80], [120, 30, 60], [255, 120, 90]],
    border: [120, 180, 255],
  },
  {
    vertical: [[140, 100, 180], [100, 90, 150], [80, 70, 120], [60, 60, 100], [90, 80, 130], [110, 90, 160], [70, 65, 110], [130, 100, 170]],
    horizontal: [[255, 90, 50], [230, 70, 60], [200, 50, 70], [180, 40, 55], [150, 35, 45], [255, 110, 70]],
    border: [184, 109, 194],
  },
  {
    vertical: [[60, 80, 160], [40, 60, 140], [80, 100, 180], [100, 120, 200], [50, 70, 130], [70, 90, 150], [90, 110, 170], [30, 50, 110]],
    horizontal: [[255, 100, 80], [220, 80, 100], [190, 60, 90], [160, 50, 70], [140, 40, 60], [240, 120, 100]],
    border: [100, 160, 230],
  },
  {
    vertical: [[200, 80, 140], [180, 60, 120], [160, 50, 100], [140, 70, 130], [120, 90, 150], [100, 60, 110], [220, 100, 160], [170, 80, 140]],
    horizontal: [[255, 70, 40], [240, 90, 60], [210, 60, 50], [190, 50, 70], [170, 40, 55], [255, 130, 80]],
    border: [160, 120, 255],
  },
];

export function buildBands(count, seed, drift) {
  const widths = [];
  let rem = 1;
  for (let i = 0; i < count - 1; i++) {
    const w = 0.06 + Math.abs(Math.sin(seed + i * 2.17 + drift)) * 0.12;
    widths.push(w);
    rem -= w;
  }
  widths.push(Math.max(0.04, rem));
  const sum = widths.reduce((a, b) => a + b, 0);
  let x = 0;
  return widths.map((w) => {
    const band = { x, w: w / sum };
    x += band.w;
    return band;
  });
}

export function renderImpression(ctx, w, h, time) {
  const phase = time * 0.035;
  const palette = mixPalettes(PALETTES, phase);
  const drift = time * 0.08;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  const margin = Math.floor(w * 0.028);
  const inner = w - margin * 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(margin, margin, inner, inner);
  ctx.clip();

  const vBands = buildBands(8, 1.3, drift);
  for (let i = 0; i < vBands.length; i++) {
    const b = vBands[i];
    const shift = Math.sin(drift + i * 0.7) * 0.015;
    const [r, g, bl] = palette.vertical[i % palette.vertical.length];
    ctx.fillStyle = `rgb(${r},${g},${bl})`;
    ctx.fillRect(
      margin + (b.x + shift) * inner,
      margin,
      b.w * inner * 1.05,
      inner,
    );
  }

  ctx.globalCompositeOperation = 'screen';
  const hBands = buildBands(6, 4.7, drift * 0.85);
  for (let i = 0; i < hBands.length; i++) {
    const b = hBands[i];
    const shift = Math.cos(drift * 0.9 + i * 0.5) * 0.012;
    const [r, g, bl] = palette.horizontal[i % palette.horizontal.length];
    ctx.fillStyle = `rgba(${r},${g},${bl},0.72)`;
    ctx.fillRect(
      margin,
      margin + (b.x + shift) * inner,
      inner,
      b.w * inner * 1.05,
    );
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  const [br, bg, bb] = palette.border;
  ctx.strokeStyle = `rgb(${br},${bg},${bb})`;
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.strokeRect(margin + 0.5, margin + 0.5, inner - 1, inner - 1);
}
