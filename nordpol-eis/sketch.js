import { PAL, LABEL, TAG, hash, noise2, lerp, pick } from './data.js';

const TAU = Math.PI * 2;
const ICE_CHARS = '▪▫░▒▓█◆◇';
const STAR_CHARS = '·+*';

export class NordpolEis {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.paused = false;
    this.t0 = performance.now();
    this.time = 0;
    this.raf = null;
    this.cell = 8;
    this.cols = 0;
    this.rows = 0;
    this.crystals = [];
    this.cracks = [];
    this.resize();
    this.init();
    window.addEventListener('resize', () => { this.resize(); this.init(); });
  }

  init() {
    this.crystals = Array.from({ length: 90 }, (_, i) => ({
      x: hash(i, 1) * this.w,
      y: hash(i, 2) * this.h * 0.7,
      z: hash(i, 3),
      sp: 0.2 + hash(i, 4) * 0.8,
      ch: pick('◆◇▪▫', hash(i, 5)),
    }));
    this.cracks = Array.from({ length: 12 }, (_, i) => ({
      x0: hash(i, 10) * this.w,
      y0: this.h * 0.55 + hash(i, 11) * this.h * 0.15,
      len: 80 + hash(i, 12) * 200,
      ang: -0.3 + hash(i, 13) * 0.6,
      w: 2 + hash(i, 14) * 5,
    }));
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * dpr);
    this.canvas.height = Math.floor(this.h * dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cell = Math.max(6, Math.min(12, Math.floor(this.w / 120)));
    this.cols = Math.ceil(this.w / this.cell) + 1;
    this.rows = Math.ceil(this.h / this.cell) + 1;
  }

  auroraColor(col, row, t) {
    const wave = Math.sin(col * 0.08 + t * 1.8) * 0.5 + Math.sin(row * 0.05 - t * 1.2) * 0.5;
    const hot = Math.sin(t * 3.5 + col * 0.12) * 0.5 + 0.5;
    if (hot > 0.65) return PAL.auroraB;
    if (wave > 0.3) return PAL.auroraA;
    if (wave > -0.2) return PAL.auroraC;
    return PAL.iceDeep;
  }

  drawSky(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, this.h * 0.55);
    g.addColorStop(0, PAL.void);
    g.addColorStop(0.4, PAL.sky);
    g.addColorStop(1, '#0a2040');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.font = `${this.cell - 1}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 100; i++) {
      const sx = hash(i, 20) * this.w;
      const sy = hash(i, 21) * this.h * 0.45;
      const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2 + i));
      ctx.globalAlpha = tw * 0.8;
      ctx.fillStyle = PAL.white;
      ctx.fillText(pick(STAR_CHARS, hash(i, 22)), sx, sy);
    }
    ctx.globalAlpha = 1;
  }

  drawAurora(ctx, t) {
    const top = this.h * 0.08;
    const bot = this.h * 0.48;
    for (let row = 0; row < 22; row++) {
      for (let col = 0; col < this.cols; col++) {
        const px = col * this.cell;
        const py = top + row * ((bot - top) / 22);
        const n = noise2(col * 0.15, row * 0.2, t * 0.4);
        const curtain = Math.sin(col * 0.06 + t * 2.2 + row * 0.3) * 0.5 + 0.5;
        if (n * curtain < 0.35) continue;
        const c = this.auroraColor(col, row, t);
        ctx.globalAlpha = 0.25 + n * 0.55;
        ctx.fillStyle = c;
        ctx.shadowBlur = 8;
        ctx.shadowColor = c;
        ctx.fillRect(px, py, this.cell - 1, this.cell - 1);
      }
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawIceField(ctx, t) {
    const horizon = this.h * 0.52;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const px = col * this.cell;
        const py = row * this.cell;
        if (py < horizon - this.cell * 2) continue;

        const depth = (py - horizon) / (this.h - horizon);
        const n = noise2(col * 0.2, row * 0.15, t * 0.15);
        const ridge = Math.sin(col * 0.25 + t * 0.3) * 0.15;

        if (n + ridge < 0.28 - depth * 0.1) {
          const wg = 0.4 + Math.sin(t * 2 + col) * 0.3;
          ctx.globalAlpha = 0.5 + depth * 0.4;
          ctx.fillStyle = PAL.water;
          ctx.fillRect(px, py, this.cell, this.cell);
          if (hash(col, row, t * 0.5) > 0.92) {
            ctx.fillStyle = PAL.waterGlow;
            ctx.globalAlpha = wg * 0.6;
            ctx.fillRect(px, py, this.cell, this.cell);
          }
          continue;
        }

        const shade = 0.5 + n * 0.5 - depth * 0.2;
        ctx.globalAlpha = 0.85;
        if (shade > 0.75) ctx.fillStyle = PAL.ice;
        else if (shade > 0.5) ctx.fillStyle = PAL.iceDeep;
        else ctx.fillStyle = PAL.iceShadow;
        ctx.fillRect(px, py, this.cell - 1, this.cell - 1);

        if (hash(col + t, row, 1) > 0.94) {
          ctx.fillStyle = PAL.white;
          ctx.globalAlpha = 0.9;
          ctx.fillText('◆', px + this.cell / 2, py + this.cell / 2);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  drawCracks(ctx, t) {
    for (const c of this.cracks) {
      ctx.save();
      ctx.translate(c.x0, c.y0);
      ctx.rotate(c.ang + Math.sin(t + c.x0 * 0.01) * 0.05);
      const len = c.len + Math.sin(t * 1.5) * 20;
      for (let i = 0; i < len; i += 4) {
        const glow = Math.sin(i * 0.08 - t * 4) * 0.5 + 0.5;
        ctx.strokeStyle = glow > 0.5 ? PAL.waterGlow : PAL.auroraA;
        ctx.globalAlpha = 0.4 + glow * 0.5;
        ctx.lineWidth = c.w;
        ctx.shadowBlur = 12;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.beginPath();
        ctx.moveTo(i, Math.sin(i * 0.05 + t) * 3);
        ctx.lineTo(i + 4, Math.sin(i * 0.05 + t + 1) * 3);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawIcePOV(ctx, t) {
    const h = this.h;
    const g = ctx.createLinearGradient(0, h * 0.65, 0, h);
    g.addColorStop(0, 'rgba(216,244,255,0.05)');
    g.addColorStop(0.5, 'rgba(126,200,232,0.18)');
    g.addColorStop(1, 'rgba(0,170,255,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, h * 0.55, this.w, h * 0.45);

    ctx.font = `bold ${this.cell + 2}px monospace`;
    ctx.textAlign = 'center';
    for (const cr of this.crystals) {
      cr.y += Math.sin(t * cr.sp + cr.z * 10) * 0.3;
      cr.x += Math.cos(t * cr.sp * 0.7) * 0.2;
      const par = 0.3 + cr.z * 0.7;
      const px = lerp(this.w * 0.5, cr.x, par);
      const py = lerp(h * 0.85, cr.y, par);
      const col = hash(cr.z, t) > 0.5 ? PAL.ice : PAL.auroraA;
      ctx.globalAlpha = 0.15 + cr.z * 0.45;
      ctx.fillStyle = col;
      ctx.shadowBlur = 14 * cr.z;
      ctx.shadowColor = col;
      ctx.fillText(cr.ch, px, py);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let i = 0; i < 6; i++) {
      const y = h * 0.58 + i * 18 + Math.sin(t + i) * 4;
      ctx.fillRect(0, y, this.w, 2);
    }
  }

  drawScan(ctx, t) {
    const y = ((t * 90) % (this.h + 40)) - 20;
    const g = ctx.createLinearGradient(0, y - 20, 0, y + 20);
    g.addColorStop(0, 'rgba(0,255,204,0)');
    g.addColorStop(0.5, 'rgba(255,0,234,0.08)');
    g.addColorStop(1, 'rgba(0,255,204,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 20, this.w, 40);
  }

  drawHUD(ctx, t) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    ctx.textAlign = 'left';
    ctx.font = '700 14px monospace';
    ctx.fillStyle = PAL.auroraA;
    ctx.shadowBlur = 16 * pulse;
    ctx.shadowColor = PAL.auroraA;
    ctx.fillText(`◉ ${LABEL}`, 20, 32);
    ctx.shadowBlur = 0;

    ctx.font = '600 12px monospace';
    ctx.fillStyle = PAL.auroraB;
    ctx.fillText(TAG, 20, 54);
    ctx.font = '500 11px monospace';
    ctx.fillStyle = PAL.hot;
    ctx.fillText('MANIA · HOT · GO · ◆', 20, 74);

    ctx.textAlign = 'right';
    ctx.fillStyle = PAL.ice;
    ctx.font = '500 11px monospace';
    ctx.fillText(`90°N · ${(-35 + Math.sin(t) * 2).toFixed(0)}°C`, this.w - 20, 32);
    ctx.fillStyle = '#556';
    ctx.fillText(`EIS-POV · ${this.cols}×${this.rows} px`, this.w - 20, 52);
    ctx.textAlign = 'left';

    ctx.font = '700 10px monospace';
    ctx.fillStyle = `rgba(0,255,204,${0.3 + pulse * 0.4})`;
    ctx.fillText('DU BIST DAS EIS · BLICK NACH OBEN', this.w * 0.5 - 100, this.h - 24);
  }

  draw() {
    const ctx = this.ctx;
    const t = this.time;
    this.drawSky(ctx, t);
    this.drawAurora(ctx, t);
    this.drawIceField(ctx, t);
    this.drawCracks(ctx, t);
    this.drawIcePOV(ctx, t);
    this.drawScan(ctx, t);
    this.drawHUD(ctx, t);
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
      a.download = `nordpol-eis-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}
