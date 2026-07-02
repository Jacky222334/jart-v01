import { PAL, LABEL, SUB, hash, noise2, lerp, auroraHue } from './data.js';

const TAU = Math.PI * 2;

export class PolarlichterGo {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.paused = false;
    this.t0 = performance.now();
    this.time = 0;
    this.raf = null;
    this.cell = 7;
    this.cols = 0;
    this.rows = 0;
    this.streams = [];
    this.resize();
    this.initStreams();
    window.addEventListener('resize', () => { this.resize(); this.initStreams(); });
  }

  initStreams() {
    this.streams = Array.from({ length: 24 }, (_, i) => ({
      x: hash(i, 0) * this.w,
      phase: hash(i, 1) * TAU,
      speed: 0.4 + hash(i, 2) * 1.2,
      amp: 40 + hash(i, 3) * 120,
      col: i % 5,
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
    this.cell = Math.max(5, Math.min(11, Math.floor(this.w / 140)));
    this.cols = Math.ceil(this.w / this.cell) + 1;
    this.rows = Math.ceil(this.h / this.cell) + 1;
  }

  curtainIntensity(col, row, t) {
    const x = col * 0.09;
    const y = row * 0.07;
    const wave = Math.sin(x + t * 1.4) * Math.cos(y * 1.3 - t * 0.9);
    const ripple = Math.sin(x * 2.5 - t * 2.8 + y) * 0.4;
    const n = noise2(col * 0.12, row * 0.1, t * 0.35);
    const band = Math.sin(col * 0.15 + t * 0.6) * 0.5 + 0.5;
    return Math.max(0, wave * 0.45 + ripple + n * 0.55 + band * 0.25 - 0.15);
  }

  drawSky(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, '#000510');
    g.addColorStop(0.35, PAL.bg);
    g.addColorStop(0.7, '#041830');
    g.addColorStop(1, '#020810');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);

    for (let i = 0; i < 120; i++) {
      const sx = hash(i, 5) * this.w;
      const sy = hash(i, 6) * this.h * 0.5;
      const tw = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(t * 1.8 + i));
      ctx.globalAlpha = tw * 0.7;
      ctx.fillStyle = PAL.white;
      ctx.fillRect(sx, sy, 1 + (i % 2), 1 + (i % 2));
    }
    ctx.globalAlpha = 1;
  }

  drawCurtain(ctx, t) {
    const maxRow = Math.floor(this.rows * 0.72);
    for (let row = 0; row < maxRow; row++) {
      for (let col = 0; col < this.cols; col++) {
        const inten = this.curtainIntensity(col, row, t);
        if (inten < 0.12) continue;
        const px = col * this.cell;
        const py = row * this.cell + Math.sin(col * 0.2 + t * 1.5) * 3;
        const c = auroraHue(t + row * 0.02, col, row);
        ctx.globalAlpha = Math.min(1, inten * 0.95);
        ctx.fillStyle = c;
        ctx.shadowBlur = inten > 0.5 ? 14 : 6;
        ctx.shadowColor = c;
        const h = this.cell + (inten > 0.6 ? 1 : 0);
        ctx.fillRect(px, py, this.cell - 1, h);
      }
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawStreams(ctx, t) {
    ctx.lineCap = 'round';
    for (const s of this.streams) {
      const colors = [PAL.green, PAL.cyan, PAL.magenta, PAL.violet, PAL.yellow];
      const c = colors[s.col];
      ctx.strokeStyle = c;
      ctx.shadowBlur = 20;
      ctx.shadowColor = c;
      ctx.lineWidth = 2 + Math.sin(t * s.speed + s.phase) * 1;
      ctx.globalAlpha = 0.35 + Math.sin(t * 2 + s.phase) * 0.25;
      ctx.beginPath();
      for (let y = 0; y < this.h * 0.75; y += 6) {
        const x = s.x + Math.sin(y * 0.012 + t * s.speed + s.phase) * s.amp;
        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawHorizon(ctx, t) {
    const hy = this.h * 0.78;
    const g = ctx.createLinearGradient(0, hy - 40, 0, this.h);
    g.addColorStop(0, 'rgba(0,255,136,0.08)');
    g.addColorStop(0.5, 'rgba(0,40,60,0.6)');
    g.addColorStop(1, '#010508');
    ctx.fillStyle = g;
    ctx.fillRect(0, hy - 40, this.w, this.h - hy + 40);

    ctx.strokeStyle = 'rgba(0,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < this.w; x += 8) {
      const y = hy + Math.sin(x * 0.02 + t * 0.5) * 4 + noise2(x * 0.05, t, 0) * 8;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    for (let col = 0; col < this.cols; col++) {
      if (hash(col, t * 0.3) > 0.93) {
        ctx.fillStyle = PAL.cyan;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(col * this.cell, hy + 4, this.cell - 1, 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  drawGoPulse(ctx, t) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    ctx.font = '800 72px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = PAL.green;
    ctx.shadowBlur = 40 + pulse * 30;
    ctx.shadowColor = PAL.cyan;
    ctx.globalAlpha = 0.08 + pulse * 0.06;
    ctx.fillText('GO', this.w * 0.5, this.h * 0.38);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawScan(ctx, t) {
    const y = ((t * 110) % (this.h + 50)) - 25;
    const g = ctx.createLinearGradient(0, y - 25, 0, y + 25);
    g.addColorStop(0, 'rgba(0,255,136,0)');
    g.addColorStop(0.5, 'rgba(255,0,234,0.1)');
    g.addColorStop(1, 'rgba(0,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 25, this.w, 50);
  }

  drawHUD(ctx, t) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    ctx.textAlign = 'left';
    ctx.font = '800 16px monospace';
    ctx.fillStyle = PAL.green;
    ctx.shadowBlur = 18 * pulse;
    ctx.shadowColor = PAL.cyan;
    ctx.fillText(`◉ ${LABEL}`, 20, 34);
    ctx.shadowBlur = 0;

    ctx.font = '600 12px monospace';
    ctx.fillStyle = PAL.magenta;
    ctx.fillText(SUB, 20, 56);
    ctx.fillStyle = PAL.yellow;
    ctx.font = '700 11px monospace';
    ctx.fillText(`KP ${(3 + Math.sin(t * 0.7) * 2).toFixed(0)} · STARK`, 20, 76);

    ctx.textAlign = 'right';
    ctx.fillStyle = PAL.cyan;
    ctx.font = '500 11px monospace';
    ctx.fillText(`${this.cols * this.rows} px · 60–80 km`, this.w - 20, 34);
    ctx.fillStyle = '#556';
    ctx.fillText(`SOLARWIND · ${(420 + Math.sin(t * 1.1) * 80).toFixed(0)} km/s`, this.w - 20, 54);
    ctx.textAlign = 'left';
  }

  draw() {
    const ctx = this.ctx;
    const t = this.time;
    this.drawSky(ctx, t);
    this.drawStreams(ctx, t);
    this.drawCurtain(ctx, t);
    this.drawGoPulse(ctx, t);
    this.drawHorizon(ctx, t);
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
      a.download = `polarlichter-go-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}
