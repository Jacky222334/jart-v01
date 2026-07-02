import {
  phaseAt, PHASES, NEON, CYCLE, hash, ease, lerp,
} from './journey.js';

const TAU = Math.PI * 2;

export class KosmosReise {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.paused = false;
    this.t0 = performance.now();
    this.time = 0;
    this.raf = null;
    this.streaks = [];
    this.particles = [];
    this.shake = 0;
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
  }

  speed(state) {
    const k = state.ph.key;
    return {
      pad: 0.2, lift: 2.5, atmo: 3.5, orbit: 1.2,
      transit: 5, moon: 2, deep: 0.8, home: 1.5,
    }[k] ?? 1;
  }

  spawnRush(spd, t, state) {
    if (Math.random() > 0.4 + spd * 0.08) return;
    const fromCenter = state.ph.key === 'transit' || state.ph.key === 'atmo';
    this.streaks.push({
      x: fromCenter ? this.w * 0.5 + (Math.random() - 0.5) * 80 : Math.random() * this.w,
      y: fromCenter ? this.h * 0.55 : -10,
      len: 20 + Math.random() * (40 + spd * 30),
      vy: 4 + spd * 8 + Math.random() * 6,
      color: hash(Math.random(), t, 1) > 0.5 ? NEON.cyan : NEON.white,
      t,
      life: 0.4 + Math.random() * 0.5,
    });
    if (state.ph.key === 'lift' || state.ph.key === 'atmo') {
      this.particles.push({
        x: this.w * 0.5 + (Math.random() - 0.5) * 30,
        y: this.h * 0.62,
        vx: (Math.random() - 0.5) * 4,
        vy: 3 + Math.random() * 8,
        ch: '▓▒░≈'.charAt(Math.floor(Math.random() * 4)),
        color: NEON.flame,
        t,
        life: 0.3 + Math.random() * 0.4,
      });
    }
  }

  drawStars(ctx, t, spd) {
    ctx.fillStyle = NEON.white;
    for (let i = 0; i < 200; i++) {
      const bx = hash(i, 0) * this.w;
      const by = (hash(i, 1) * this.h + t * spd * 40 * (0.5 + hash(i, 2))) % (this.h + 20) - 10;
      const streak = spd > 2 ? spd * 3 : 0;
      ctx.globalAlpha = 0.3 + hash(i, 3) * 0.7;
      if (streak) {
        ctx.fillStyle = hash(i, 4) > 0.5 ? NEON.cyan : NEON.white;
        ctx.fillRect(bx, by, 1 + streak * 0.5, 1 + streak * 2);
      } else {
        ctx.fillRect(bx, by, 1 + (i % 2), 1 + (i % 2));
      }
    }
    ctx.globalAlpha = 1;
  }

  drawEarth(ctx, x, y, r, alpha) {
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    g.addColorStop(0, '#4488ff');
    g.addColorStop(0.7, '#2244aa');
    g.addColorStop(1, '#001133');
    ctx.fillStyle = g;
    ctx.shadowBlur = 30;
    ctx.shadowColor = NEON.cyan;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawMoon(ctx, x, y, r) {
    ctx.fillStyle = '#bbb';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  drawNebula(ctx, t) {
    for (let i = 0; i < 8; i++) {
      const nx = this.w * (0.2 + i * 0.1) + Math.sin(t * 0.3 + i) * 40;
      const ny = this.h * (0.2 + hash(i, 1) * 0.3);
      const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, 120);
      g.addColorStop(0, i % 2 ? 'rgba(255,0,234,0.15)' : 'rgba(0,255,255,0.12)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }

  drawRocket(ctx, x, y, scale, angle, flame) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (flame) {
      ctx.fillStyle = NEON.flame;
      ctx.shadowBlur = 25;
      ctx.shadowColor = NEON.orange;
      ctx.font = 'bold 18px monospace';
      for (let i = 0; i < 4; i++) {
        ctx.globalAlpha = 0.5 + Math.random() * 0.5;
        ctx.fillText('▓', (Math.random() - 0.5) * 8, 28 + i * 6);
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = NEON.white;
    ctx.shadowBlur = 15;
    ctx.shadowColor = NEON.cyan;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('▲', 0, -22);
    ctx.font = 'bold 11px monospace';
    ctx.fillText('RAKETE', 0, -8);
    ctx.fillStyle = NEON.orange;
    ctx.font = 'bold 16px monospace';
    ctx.fillText('█', 0, 6);
    ctx.font = '10px monospace';
    ctx.fillText('▓▓▓', 0, 20);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawAstronaut(ctx, x, y, s, t, showSuit) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);

    ctx.strokeStyle = NEON.cyan;
    ctx.lineWidth = 1;
    ctx.strokeRect(-42, -52, 84, 72);
    ctx.font = '8px monospace';
    ctx.fillStyle = NEON.cyan;
    ctx.textAlign = 'left';
    ctx.fillText('EVA-CAM', -38, -42);

    if (showSuit) {
      ctx.fillStyle = NEON.suit;
      ctx.strokeStyle = NEON.orange;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -18, 14, 0, TAU);
      ctx.fill();
      ctx.stroke();
      const vg = ctx.createRadialGradient(-4, -22, 1, 0, -18, 12);
      vg.addColorStop(0, 'rgba(150,220,255,0.9)');
      vg.addColorStop(1, NEON.visor);
      ctx.fillStyle = vg;
      ctx.beginPath();
      ctx.arc(0, -18, 11, 0, TAU);
      ctx.fill();
      ctx.fillStyle = NEON.suit;
      ctx.fillRect(-16, -2, 32, 28);
      ctx.strokeRect(-16, -2, 32, 28);
      ctx.fillRect(-22, 2, 8, 18);
      ctx.fillRect(14, 2, 8, 18);
      ctx.fillStyle = NEON.orange;
      ctx.fillRect(-6, 8, 12, 8);
      ctx.font = '7px monospace';
      ctx.fillStyle = NEON.cyan;
      ctx.textAlign = 'center';
      ctx.fillText('NASA', 0, 14);
    } else {
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = NEON.yellow;
      ctx.textAlign = 'center';
      ctx.fillText('◉', 0, -10);
    }

    ctx.font = '8px monospace';
    ctx.fillStyle = NEON.magenta;
    ctx.fillText(`O₂ ${(98 + Math.sin(t * 2) * 0.5).toFixed(0)}%`, 0, 38);
    ctx.restore();
  }

  drawStreaks(ctx, t) {
    this.streaks = this.streaks.filter((s) => t - s.t < s.life);
    for (const s of this.streaks) {
      const age = (t - s.t) / s.life;
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = 1 - age;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = s.color;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x, s.y + s.len);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawParticles(ctx, t) {
    this.particles = this.particles.filter((p) => t - p.t < p.life);
    ctx.textAlign = 'center';
    for (const p of this.particles) {
      const age = (t - p.t) / p.life;
      ctx.globalAlpha = 1 - age;
      ctx.fillStyle = p.color;
      ctx.font = '12px monospace';
      ctx.fillText(p.ch, p.x + p.vx * age * 20, p.y + p.vy * age * 20);
    }
    ctx.globalAlpha = 1;
  }

  rocketPos(state) {
    const { ph, local } = state;
    const cx = this.w * 0.5;
    const cy = this.h * 0.55;
    switch (ph.key) {
      case 'pad':
        return { x: cx, y: cy + 40, ang: 0, sc: 1.2, flame: false };
      case 'lift':
        return { x: cx, y: lerp(cy + 40, cy - 80, ease(local)), ang: 0, sc: 1.1, flame: true };
      case 'atmo':
        return { x: cx + Math.sin(local * 8) * 5, y: lerp(cy, this.h * 0.25, ease(local)), ang: 0, sc: 0.9, flame: true };
      case 'orbit':
        return {
          x: cx + Math.cos(this.time * 0.8) * 60,
          y: cy - 100 + Math.sin(this.time * 0.8) * 30,
          ang: this.time * 0.8 + Math.PI / 2,
          sc: 0.55,
          flame: false,
        };
      case 'transit':
        return { x: cx, y: cy - 20, ang: -Math.PI / 2, sc: 0.7, flame: true };
      case 'moon':
        return { x: cx - 80, y: cy - 60, ang: 0.2, sc: 0.5, flame: false };
      case 'deep':
        return { x: cx + 40, y: cy - 40, ang: -0.3, sc: 0.45, flame: false };
      case 'home':
        return { x: cx, y: lerp(this.h * 0.2, cy + 20, ease(local)), ang: Math.PI, sc: 0.8, flame: local > 0.7 };
      default:
        return { x: cx, y: cy, ang: 0, sc: 1, flame: false };
    }
  }

  drawHUD(ctx, state, spd) {
    const { ph } = state;
    ctx.textAlign = 'left';
    ctx.font = '700 14px monospace';
    ctx.fillStyle = NEON.cyan;
    ctx.shadowBlur = 14;
    ctx.shadowColor = NEON.cyan;
    ctx.fillText(`◉ KOSMOS-REISE · ${ph.name}`, 20, 32);
    ctx.shadowBlur = 0;
    ctx.font = '600 12px monospace';
    ctx.fillStyle = NEON.yellow;
    ctx.fillText(ph.line, 20, 54);
    ctx.textAlign = 'right';
    ctx.fillStyle = NEON.orange;
    ctx.font = '700 13px monospace';
    ctx.fillText(`RAUSCH · ${(spd * 1000).toFixed(0)}`, this.w - 20, 32);
    ctx.fillStyle = '#667';
    ctx.font = '10px monospace';
    ctx.fillText(`MET ${Math.floor(state.t)}s / ${CYCLE}s`, this.w - 20, 50);
    ctx.fillText('ANZUG · RAUMFAHRT · EVA', this.w - 20, 66);
    ctx.textAlign = 'left';

    const prog = state.p;
    ctx.fillStyle = '#222';
    ctx.fillRect(20, this.h - 18, this.w - 40, 4);
    ctx.fillStyle = NEON.magenta;
    ctx.fillRect(20, this.h - 18, (this.w - 40) * prog, 4);
  }

  draw() {
    const ctx = this.ctx;
    const state = phaseAt(this.time);
    const spd = this.speed(state);
    const t = this.time;

    if (['lift', 'atmo', 'transit'].includes(state.ph.key)) {
      this.shake = spd * 0.8;
    } else {
      this.shake *= 0.85;
    }

    ctx.save();
    ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);

    ctx.fillStyle = NEON.void;
    ctx.fillRect(-5, -5, this.w + 10, this.h + 10);

    if (state.ph.key === 'deep') this.drawNebula(ctx, t);
    this.drawStars(ctx, t, spd);

    if (state.ph.key === 'home' || state.ph.key === 'pad' || state.ph.key === 'orbit') {
      this.drawEarth(ctx, this.w * 0.75, this.h * 0.35, 45, 0.7);
    }
    if (state.ph.key === 'moon') {
      this.drawMoon(ctx, this.w * 0.72, this.h * 0.28, 35);
    }

    for (let i = 0; i < 3 + spd; i++) this.spawnRush(spd, t, state);

    const rp = this.rocketPos(state);
    this.drawRocket(ctx, rp.x, rp.y, rp.sc, rp.ang, rp.flame);

    const showSuit = !['pad', 'lift'].includes(state.ph.key);
    this.drawAstronaut(ctx, this.w * 0.22, this.h * 0.38, 1.1, t, showSuit);

    this.drawStreaks(ctx, t);
    this.drawParticles(ctx, t);
    this.drawHUD(ctx, state, spd);

    ctx.restore();
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
      a.download = `kosmos-reise-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}
