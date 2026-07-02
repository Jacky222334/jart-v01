import { SHAPE } from './shape.js';

const SIZE = 1024;
const FRAMES = 300;
const FPS = 30;
const BG = '#dddddd';

const LAYER_COLORS = {
  1: { rgb: [247, 132, 140], alpha: 0.72 },
  2: { rgb: [30, 38, 51], alpha: 1 },
  3: { rgb: [214, 214, 214], alpha: 1 },
};

function hash(n) {
  n = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export class InvaderJellyfish {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.paused = false;
    this.frame = 0;
    this.lastTime = 0;
    this.raf = null;

    this.scale = 16;
    this.gridH = SHAPE.length;
    this.gridW = SHAPE[0].length;
    this.figW = this.gridW * this.scale;
    this.figH = this.gridH * this.scale;
    this.ox = Math.floor((SIZE - this.figW) / 2);
    this.oy = Math.floor((SIZE - this.figH) / 2);

    this.layers = {};
    for (const id of [1, 2, 3]) {
      const c = document.createElement('canvas');
      c.width = SIZE;
      c.height = SIZE;
      this.layers[id] = { canvas: c, ctx: c.getContext('2d') };
    }
    this.shadow = null;
    this._buildLayers();
    this._precomputeOffsets();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.displayW = window.innerWidth;
    this.displayH = window.innerHeight;
  }

  _buildLayers() {
    for (const id of [1, 2, 3]) {
      const { ctx } = this.layers[id];
      ctx.clearRect(0, 0, SIZE, SIZE);
      const col = LAYER_COLORS[id];
      ctx.fillStyle = `rgba(${col.rgb.join(',')},${col.alpha})`;

      for (let gy = 0; gy < this.gridH; gy++) {
        for (let gx = 0; gx < this.gridW; gx++) {
          if (SHAPE[gy][gx] !== id) continue;
          ctx.fillRect(
            this.ox + gx * this.scale,
            this.oy + gy * this.scale,
            this.scale,
            this.scale,
          );
        }
      }
    }
  }

  _precomputeOffsets() {
    this.offsets = Array.from({ length: FRAMES }, (_, f) => {
      const rows = [];
      let y = 0;
      while (y < SIZE) {
        const h = 1 + Math.floor(hash(y * 17.3 + 3) * 2.6);
        const base = hash(y * 0.07 + f * 0.31) * 2 - 1;
        const wave = Math.sin(f * 0.11 + y * 0.021) * 0.55 + Math.cos(f * 0.07 + y * 0.013) * 0.35;
        const jump = hash(f * 91 + y * 2.7) > 0.965 ? (hash(f + y) > 0.5 ? 1 : -1) * (25 + hash(y + f) * 35) : 0;
        const amp = y < this.oy + this.figH * 0.45 ? 58 : 38;
        rows.push({
          y,
          h: Math.min(h, SIZE - y),
          o1: Math.round((base * 0.35 + wave * 0.65) * amp + jump),
          o2: Math.round((Math.sin(f * 0.09 + y * 0.017 + 2) * 0.7 + base * 0.25) * (amp * 0.65) + jump * 0.35),
          o3: Math.round((Math.cos(f * 0.08 + y * 0.019 + 4) * 0.6 + wave * 0.2) * (amp * 0.45)),
        });
        y += h;
      }
      return rows;
    });
  }

  _renderTo(ctx, width, height, f) {
    const fit = Math.min(width / SIZE, height / SIZE);
    const dw = SIZE * fit;
    const dh = SIZE * fit;
    const dx = (width - dw) / 2;
    const dy = (height - dh) / 2;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(dx, dy);
    ctx.scale(fit, fit);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.filter = 'blur(10px)';
    ctx.globalAlpha = 0.2;
    ctx.drawImage(this.layers[2].canvas, 11, 15);
    ctx.restore();

    const temp = document.createElement('canvas');
    temp.width = SIZE;
    temp.height = SIZE;
    const tctx = temp.getContext('2d');
    const rows = this.offsets[f % FRAMES];
    const order = [2, 3, 1];

    for (const layerId of order) {
      tctx.clearRect(0, 0, SIZE, SIZE);
      const src = this.layers[layerId].canvas;
      const offKey = layerId === 1 ? 'o1' : layerId === 2 ? 'o2' : 'o3';

      for (const row of rows) {
        tctx.drawImage(
          src,
          0, row.y, SIZE, row.h,
          row[offKey], row.y, SIZE, row.h,
        );
      }

      ctx.globalAlpha = layerId === 1 ? 0.9 : 1;
      ctx.drawImage(temp, 0, 0);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _drawFrame(f) {
    this._renderTo(this.ctx, this.displayW, this.displayH, f);
  }

  loop(ts) {
    this.raf = requestAnimationFrame((t) => this.loop(t));
    if (this.paused) return;

    if (ts - this.lastTime >= 1000 / FPS) {
      this.lastTime = ts - ((ts - this.lastTime) % (1000 / FPS));
      this._drawFrame(this.frame);
      this.frame = (this.frame + 1) % FRAMES;
    }
  }

  start() {
    if (!this.raf) {
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  togglePause() {
    this.paused = !this.paused;
    if (!this.paused) this.lastTime = performance.now();
  }

  saveFrame() {
    const out = document.createElement('canvas');
    out.width = SIZE;
    out.height = SIZE;
    this._renderTo(out.getContext('2d'), SIZE, SIZE, this.frame);
    const link = document.createElement('a');
    link.download = `invader19-jellyfish-${Date.now()}.png`;
    link.href = out.toDataURL('image/png');
    link.click();
  }
}
