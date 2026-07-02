import {
  NEON, LABEL, heightAt, voxelColor, rotateY,
} from './voxel.js';

const TAU = Math.PI * 2;
const SIZE = 38;
const HALF = SIZE / 2;

export class MatterhornPixel {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.paused = false;
    this.t0 = performance.now();
    this.time = 0;
    this.raf = null;
    this.stars = [];
    this.voxels = this.buildVoxels();
    this.resize();
    this.initStars();
    window.addEventListener('resize', () => { this.resize(); this.initStars(); });
  }

  buildVoxels() {
    const v = [];
    let maxH = 0;
    for (let x = -HALF; x < HALF; x++) {
      for (let z = -HALF; z < HALF; z++) {
        const h = Math.floor(heightAt(x, z));
        maxH = Math.max(maxH, h);
        for (let y = 0; y <= h; y++) {
          v.push({ x, y, z, h });
        }
      }
    }
    return { list: v, maxH };
  }

  initStars() {
    this.stars = Array.from({ length: 160 }, (_, i) => ({
      x: (Math.sin(i * 91.3) * 0.5 + 0.5) * this.w,
      y: (Math.cos(i * 47.7) * 0.5 + 0.5) * this.h * 0.55,
      s: 0.5 + (i % 5) * 0.3,
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
    this.cell = Math.max(5, Math.min(10, Math.floor(Math.min(this.w, this.h) / 90)));
    this.cx = this.w * 0.5;
    this.cy = this.h * 0.58;
  }

  drawSky(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, '#0a1030');
    g.addColorStop(0.45, NEON.sky);
    g.addColorStop(1, '#020408');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.fillStyle = NEON.star;
    for (const s of this.stars) {
      const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 1.2 + s.x * 0.01));
      ctx.globalAlpha = tw * 0.7;
      ctx.fillRect(s.x, s.y, s.s, s.s);
    }
    ctx.globalAlpha = 1;
  }

  drawMountain(ctx, angle, t) {
    const { list, maxH } = this.voxels;
    const cell = this.cell;
    const tilt = 0.42;
    const sorted = [];

    for (const v of list) {
      const r = rotateY(v.x, v.z, angle);
      const px = r.x - r.z * 0.35;
      const py = v.y - r.z * tilt * 0.22;
      const pz = r.z + v.y * 0.08;
      sorted.push({ ...v, px, py, pz });
    }
    sorted.sort((a, b) => a.pz - b.pz);

    const scale = Math.min(this.w, this.h) / (SIZE * cell * 0.95);

    for (const p of sorted) {
      const sx = this.cx + p.px * cell * scale;
      const sy = this.cy - p.py * cell * scale;
      const { fill, glow, g } = voxelColor(p.x, p.y, p.z, p.h, maxH);

      ctx.fillStyle = fill;
      if (glow && p.y === p.h) {
        ctx.shadowBlur = 8 + Math.sin(t * 2 + p.x) * 3;
        ctx.shadowColor = glow;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 0.88 + g * 0.12;
      ctx.fillRect(
        Math.floor(sx),
        Math.floor(sy),
        Math.ceil(cell * scale) - 1,
        Math.ceil(cell * scale) - 1,
      );
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawOrbitRing(ctx, angle, t) {
    const r = Math.min(this.w, this.h) * 0.36;
    ctx.strokeStyle = 'rgba(0,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 10]);
    ctx.beginPath();
    ctx.ellipse(this.cx, this.cy + 20, r, r * 0.28, angle * 0.15, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    const mx = this.cx + Math.cos(angle) * r;
    const my = this.cy + 20 + Math.sin(angle) * r * 0.28;
    ctx.fillStyle = NEON.snowGlow;
    ctx.shadowBlur = 12;
    ctx.shadowColor = NEON.snowGlow;
    ctx.beginPath();
    ctx.arc(mx, my, 3, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  drawHUD(ctx, angle) {
    ctx.textAlign = 'left';
    ctx.font = '700 14px "SF Mono", Consolas, monospace';
    ctx.fillStyle = NEON.snowGlow;
    ctx.shadowBlur = 14;
    ctx.shadowColor = NEON.snowGlow;
    ctx.fillText(`◉ ${LABEL}`, 22, 32);
    ctx.shadowBlur = 0;

    ctx.font = '500 11px monospace';
    ctx.fillStyle = '#667';
    ctx.fillText('2D · Voxel · Drehung · Zermatt', 22, 52);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#889';
    ctx.font = '500 12px monospace';
    const deg = (((angle * 180) / Math.PI) % 360).toFixed(0);
    ctx.fillText(`${deg}° · Y-Achse`, this.w - 22, 32);
    ctx.fillStyle = '#445';
    ctx.font = '10px monospace';
    ctx.fillText(`${this.voxels.list.length} Pixel-Voxel`, this.w - 22, 50);
    ctx.textAlign = 'left';
  }

  draw() {
    const ctx = this.ctx;
    const t = this.time;
    const angle = t * 0.35;

    this.drawSky(ctx, t);
    this.drawOrbitRing(ctx, angle, t);
    this.drawMountain(ctx, angle, t);
    this.drawHUD(ctx, angle);
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
      a.download = `matterhorn-pixel-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}
