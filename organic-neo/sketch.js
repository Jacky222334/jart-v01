import { VOID, SPARK, NEON, hash, noise2, pick, journey } from './glyphs.js';
import {
  worldXY, sampleOrigin, sampleSolar, sampleExit, sampleGalaxy, sampleVoid,
} from './cosmos.js';

const BASE = [
  [0.28, 0.36], [0.21, 0.54], [0.34, 0.73], [0.54, 0.79],
  [0.71, 0.66], [0.67, 0.41], [0.44, 0.31],
];

function verts(t, shrink) {
  const cx = 0.5;
  const cy = 0.5;
  return BASE.map(([bx, by], i) => {
    const ph = i * 1.37;
    const dx = Math.sin(t * 0.41 + ph) * 0.022 + Math.sin(t * 0.17 + ph * 2.1) * 0.014;
    const dy = Math.cos(t * 0.33 + ph * 0.8) * 0.018 + Math.cos(t * 0.21 + ph * 1.6) * 0.012;
    const wx = bx + dx + (noise2(ph, t * 0.08, 0) - 0.5) * 0.035;
    const wy = by + dy + (noise2(ph + 9, t * 0.06 + 2, 0) - 0.5) * 0.035;
    return [cx + (wx - cx) * shrink, cy + (wy - cy) * shrink];
  });
}

function inPoly(x, y, v) {
  let inside = false;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
    const [xi, yi] = v[i];
    const [xj, yj] = v[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function distEdge(x, y, v) {
  let d = 1e9;
  for (let i = 0; i < v.length; i++) {
    const [ax, ay] = v[i];
    const [bx, by] = v[(i + 1) % v.length];
    const ex = bx - ax;
    const ey = by - ay;
    const tt = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey)));
    d = Math.min(d, Math.hypot(x - ax - ex * tt, y - ay - ey * tt));
  }
  return d;
}

function blendSamples(list, weights) {
  let ch = '';
  let r = 0;
  let g = 0;
  let b = 0;
  let glow = 0;
  let alpha = 0;
  let total = 0;

  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    const w = weights[i];
    if (!s || w <= 0.001) continue;
    total += w;
    if (!ch) ch = s.ch;
    else if (w > 0.3) ch = s.ch;
    const rgb = hexRgb(s.color);
    r += rgb[0] * w;
    g += rgb[1] * w;
    b += rgb[2] * w;
    glow = Math.max(glow, s.glow * w);
    alpha = Math.max(alpha, s.alpha * w);
  }
  if (total < 0.05 || alpha < 0.04) return null;
  return {
    ch: ch || '·',
    color: `rgb(${r / total | 0},${g / total | 0},${b / total | 0})`,
    glow,
    alpha: Math.min(1, alpha / total),
  };
}

function hexRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function drawGlyph(ctx, px, py, s) {
  ctx.globalAlpha = s.alpha;
  ctx.fillStyle = s.color;
  ctx.shadowBlur = s.glow;
  ctx.shadowColor = s.color;
  ctx.fillText(s.ch, px, py);
  if (s.glow > 12) {
    ctx.globalAlpha = s.alpha * 0.35;
    ctx.fillText(s.ch, px, py);
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

export class OrganicNeo {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.paused = false;
    this.t0 = performance.now();
    this.time = 0;
    this.raf = null;
    this.cell = 13;
    this.font = 'bold 12px "SF Mono", Consolas, "Courier New", monospace';
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.displayW = window.innerWidth;
    this.displayH = window.innerHeight;
    this.canvas.width = Math.floor(this.displayW * dpr);
    this.canvas.height = Math.floor(this.displayH * dpr);
    this.canvas.style.width = `${this.displayW}px`;
    this.canvas.style.height = `${this.displayH}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cols = Math.ceil(this.displayW / this.cell) + 1;
    this.rows = Math.ceil(this.displayH / this.cell) + 1;
  }

  draw() {
    const { ctx, time: t, cols, rows, cell } = this;
    const J = journey(t);
    const pulse = 0.55 + 0.45 * Math.sin(t * 1.4);
    const shrink = Math.max(0.08, 1 - J.w1 * 0.5 - J.w2 * 0.35 - J.w3 * 0.2);
    const v = verts(t, shrink);

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.displayW, this.displayH);
    ctx.font = this.font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const px = (col + 0.5) * cell;
        const py = (row + 0.5) * cell;
        const x = px / this.displayW;
        const y = py / this.displayH;
        const [wx, wy] = worldXY(x, y, J.zoom);
        const n = noise2(col * 0.11, row * 0.09, t * 0.35);
        const n2 = noise2(col * 0.07 + t * 0.2, row * 0.13, t * 0.28);

        const inside = inPoly(x, y, v);
        const de = distEdge(x, y, v);

        const s0 = J.w0 > 0.01 ? sampleOrigin(x, y, t, inside, de, n, n2, pulse) : null;
        const s1 = J.w1 > 0.01 ? sampleSolar(wx, wy, t, n) : null;
        const s2 = J.w2 > 0.01 ? sampleExit(wx, wy, t, n, n2) : null;
        const s3 = J.w3 > 0.01 ? sampleGalaxy(wx, wy, t, n, n2) : null;
        const s4 = J.w4 > 0.01 ? sampleVoid(wx, wy, t, n) : null;

        let sample = blendSamples(
          [s0, s1, s2, s3, s4],
          [J.w0, J.w1, J.w2, J.w3, J.w4],
        );

        if (!sample && J.w0 < 0.05 && hash(col, row, t * 0.2) > 0.985) {
          sample = {
            ch: pick(SPARK, n),
            color: NEON[Math.floor(n * NEON.length) % NEON.length],
            glow: 6,
            alpha: 0.25,
          };
        }

        if (!sample) continue;
        drawGlyph(ctx, px, py, sample);
      }
    }

    if (J.w0 > 0.15) {
      ctx.globalAlpha = (0.4 + pulse * 0.3) * J.w0;
      ctx.strokeStyle = NEON[Math.floor(t * 2) % NEON.length];
      ctx.shadowBlur = 20 * J.w0;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      v.forEach(([vx, vy], i) => {
        const sx = vx * this.displayW;
        const sy = vy * this.displayH;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    ctx.font = 'bold 11px "SF Mono", Consolas, monospace';
    ctx.fillStyle = NEON[J.phaseIdx % NEON.length];
    ctx.shadowBlur = 14;
    ctx.shadowColor = ctx.fillStyle;
    ctx.textAlign = 'left';
    ctx.fillText(`◉ ${J.name}`, 18, 28);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.font = this.font;
  }

  tick(now) {
    if (!this.raf) return;
    if (!this.paused) {
      this.time = (now - this.t0) * 0.001;
      this.draw();
    }
    this.raf = requestAnimationFrame((n) => this.tick(n));
  }

  start() {
    if (this.raf) return;
    this.t0 = performance.now() - this.time * 1000;
    this.raf = requestAnimationFrame((n) => this.tick(n));
  }

  togglePause() {
    this.paused = !this.paused;
    if (!this.paused) this.t0 = performance.now() - this.time * 1000;
  }

  saveFrame() {
    this.canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `organic-neo-cosmos-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}
