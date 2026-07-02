import {
  STATS, AFRICA, NEON, DEATHS_PER_MS, SECONDS_PER_DEATH,
  DEATHS_PER_DAY, DEATHS_PER_HOUR, DEATHS_PER_MINUTE,
} from './data.js';

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function randomInAfrica() {
  let x = 0.5;
  let y = 0.5;
  for (let i = 0; i < 40; i++) {
    x = 0.16 + Math.random() * 0.72;
    y = 0.08 + Math.random() * 0.78;
    if (inPoly(x, y, AFRICA)) return [x, y];
  }
  return [0.52, 0.48];
}

function fmt(n, digits = 0) {
  return n.toLocaleString('de-DE', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function dayStartMs(now = Date.now()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function yearStartMs(now = Date.now()) {
  return new Date(new Date(now).getFullYear(), 0, 1).getTime();
}

export class AfrikaTod {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.paused = false;
    this.t0 = performance.now();
    this.time = 0;
    this.raf = null;
    this.lastInt = -1;
    this.flashes = [];
    this.rings = [];
    this.sessionStart = Date.now();
    this.resize();
    window.addEventListener('resize', () => this.resize());
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
    this.mapCx = this.w * 0.28;
    this.mapCy = this.h * 0.52;
    this.mapScale = Math.min(this.w, this.h) * 0.72;
  }

  mapPt(nx, ny) {
    return [
      this.mapCx + (nx - 0.52) * this.mapScale,
      this.mapCy + (ny - 0.48) * this.mapScale,
    ];
  }

  onDeathTick(n) {
    const color = NEON[n % NEON.length];
    const [nx, ny] = randomInAfrica();
    const [px, py] = this.mapPt(nx, ny);
    this.flashes.push({ px, py, t: this.time, color, life: 1.2 });
    this.rings.push({ px, py, t: this.time, color, r: 0 });
    if (this.flashes.length > 120) this.flashes.shift();
    if (this.rings.length > 40) this.rings.shift();
  }

  drawAfricaOutline(ctx, alpha, color, width) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.shadowBlur = 18;
    ctx.shadowColor = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    AFRICA.forEach(([nx, ny], i) => {
      const [px, py] = this.mapPt(nx, ny);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  drawFlashes(ctx, t) {
    this.flashes = this.flashes.filter((f) => t - f.t < f.life);
    for (const f of this.flashes) {
      const age = (t - f.t) / f.life;
      const a = 1 - age;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = f.color;
      ctx.shadowBlur = 28 * a;
      ctx.shadowColor = f.color;
      ctx.font = `bold ${10 + 14 * (1 - age)}px "SF Mono", Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✕', f.px, f.py);
      ctx.restore();
    }
  }

  drawRings(ctx, t) {
    this.rings = this.rings.filter((r) => t - r.t < 1.4);
    for (const r of this.rings) {
      const age = (t - r.t) / 1.4;
      const rad = 8 + age * 55;
      ctx.save();
      ctx.globalAlpha = (1 - age) * 0.85;
      ctx.strokeStyle = r.color;
      ctx.shadowBlur = 16;
      ctx.shadowColor = r.color;
      ctx.lineWidth = 2 - age;
      ctx.beginPath();
      ctx.arc(r.px, r.py, rad, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawCounter(ctx, deathsToday, deathsYear, sessionDeaths, pulse) {
    const cx = this.w * 0.62;
    const cy = this.h * 0.46;
    const mainColor = NEON[Math.floor(this.time * 0.7) % NEON.length];
    const subColor = NEON[(Math.floor(this.time * 0.7) + 2) % NEON.length];

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    ctx.font = '600 13px "SF Mono", Consolas, monospace';
    ctx.fillStyle = subColor;
    ctx.shadowBlur = 10;
    ctx.shadowColor = subColor;
    ctx.fillText('HEUTE · AFRIKA', cx, cy - 118);
    ctx.shadowBlur = 0;

    const intToday = Math.floor(deathsToday);
    const size = Math.min(96, this.w * 0.11);
    ctx.font = `800 ${size}px "SF Mono", Consolas, monospace`;
    ctx.fillStyle = mainColor;
    ctx.shadowBlur = 32 + pulse * 24;
    ctx.shadowColor = mainColor;
    ctx.fillText(fmt(intToday), cx, cy - 28);
    ctx.shadowBlur = 0;

    ctx.font = '500 15px "SF Mono", Consolas, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.55;
    ctx.fillText(`${fmt(deathsToday, 1)} · seit Mitternacht`, cx, cy + 8);
    ctx.globalAlpha = 1;

    ctx.font = '700 22px "SF Mono", Consolas, monospace';
    ctx.fillStyle = NEON[3];
    ctx.shadowBlur = 20;
    ctx.shadowColor = ctx.fillStyle;
    ctx.fillText(`1 · alle ${SECONDS_PER_DEATH.toLocaleString('de-DE', { maximumFractionDigits: 1 })} s`, cx, cy + 58);
    ctx.shadowBlur = 0;

    ctx.font = '500 14px "SF Mono", Consolas, monospace';
    ctx.fillStyle = subColor;
    ctx.globalAlpha = 0.9;
    ctx.fillText(`${fmt(Math.floor(deathsYear))} · dieses Jahr`, cx, cy + 96);
    ctx.fillText(`${fmt(Math.floor(sessionDeaths))} · seit du schaust`, cx, cy + 122);
    ctx.globalAlpha = 1;

    ctx.font = '400 12px "SF Mono", Consolas, monospace';
    ctx.fillStyle = '#888';
    ctx.fillText(
      `≈ ${fmt(Math.floor(DEATHS_PER_DAY))}/Tag · ${fmt(Math.floor(DEATHS_PER_HOUR))}/Std · ${fmt(Math.floor(DEATHS_PER_MINUTE))}/Min`,
      cx,
      cy + 152,
    );
  }

  drawScan(ctx) {
    const y = ((this.time * 42) % (this.h + 40)) - 20;
    const g = ctx.createLinearGradient(0, y - 30, 0, y + 30);
    g.addColorStop(0, 'rgba(0,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,0,234,0.04)');
    g.addColorStop(1, 'rgba(0,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 30, this.w, 60);
  }

  draw() {
    const { ctx, time: t, w, h } = this;
    const now = Date.now();
    const pulse = 0.5 + 0.5 * Math.sin(t * 4.2);

    const deathsToday = (now - dayStartMs(now)) * DEATHS_PER_MS;
    const deathsYear = (now - yearStartMs(now)) * DEATHS_PER_MS;
    const sessionDeaths = (now - this.sessionStart) * DEATHS_PER_MS;

    const intToday = Math.floor(deathsToday);
    if (intToday !== this.lastInt && this.lastInt >= 0) {
      this.onDeathTick(intToday);
    }
    this.lastInt = intToday;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    this.drawAfricaOutline(ctx, 0.22 + pulse * 0.08, NEON[2], 1.2);
    this.drawAfricaOutline(ctx, 0.55 + pulse * 0.15, NEON[1], 2.5);
    this.drawRings(ctx, t);
    this.drawFlashes(ctx, t);
    this.drawScan(ctx);
    this.drawCounter(ctx, deathsToday, deathsYear, sessionDeaths, pulse);

    const titleColor = NEON[0];
    ctx.font = '700 15px "SF Mono", Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = titleColor;
    ctx.shadowBlur = 16;
    ctx.shadowColor = titleColor;
    ctx.fillText('◉ AFRIKA · STERBEN', 22, 34);
    ctx.shadowBlur = 0;

    ctx.font = '400 11px "SF Mono", Consolas, monospace';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'right';
    ctx.fillText(`${fmt(STATS.deathsPerYear)} / Jahr · ${STATS.source}`, w - 22, 34);
    ctx.textAlign = 'left';

    ctx.font = '400 11px "SF Mono", Consolas, monospace';
    ctx.fillStyle = '#555';
    ctx.fillText(STATS.note, 22, h - 22);
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
      a.download = `afrika-tod-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}
