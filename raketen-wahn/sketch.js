import {
  phaseAt, PHASES, NEON, CYCLE, SPEED_KMS,
  hash, ease, lerp, formatSpeed,
} from './journey.js';

const TAU = Math.PI * 2;
const C = 299792458;

export class RaketenWahn {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.paused = false;
    this.t0 = performance.now();
    this.time = 0;
    this.raf = null;
    this.streaks = [];
    this.pulses = [];
    this.sparks = [];
    this.shake = 0;
    this.warpT = 0;
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
    const base = SPEED_KMS[k] ?? 1000;
    const boost = state.ph.key === 'warp' ? 1 + Math.sin(this.time * 4) * 0.15 : 1;
    return (base * boost) / 10000;
  }

  speedKms(state) {
    const k = state.ph.key;
    const base = SPEED_KMS[k] ?? 1000;
    if (k === 'warp') return base * (1 + Math.sin(this.time * 4) * 0.1);
    if (k === 'launch') return lerp(0, base, ease(state.local));
    return base;
  }

  spawnEffects(spd, t, state) {
    const k = state.ph.key;
    const rate = 0.3 + spd * 0.12;

    if (Math.random() < rate) {
      const cx = this.w * 0.5;
      const cy = this.rocketY(state);
      this.streaks.push({
        x: cx + (Math.random() - 0.5) * (k === 'warp' ? 400 : 120),
        y: cy + (Math.random() - 0.5) * 40,
        len: 30 + Math.random() * (80 + spd * 60),
        vy: 6 + spd * 14,
        color: k === 'warp' ? NEON.antimatter : (hash(Math.random(), t, 1) > 0.5 ? NEON.cyan : NEON.white),
        t,
        life: 0.25 + Math.random() * 0.4,
        w: 1 + spd * 0.8,
      });
    }

    if (['launch', 'venus', 'mars', 'warp'].includes(k) && Math.random() < 0.25 + spd * 0.05) {
      this.pulses.push({
        x: this.w * 0.5,
        y: this.rocketY(state) + 35,
        r: 8,
        maxR: 40 + spd * 30,
        color: k === 'warp' ? NEON.antimatter : NEON.nuclear,
        t,
        life: 0.35,
      });
    }

    if (['ignite', 'launch', 'warp'].includes(k) && Math.random() < 0.35) {
      this.sparks.push({
        x: this.w * 0.5 + (Math.random() - 0.5) * 24,
        y: this.rocketY(state) + 20 + Math.random() * 20,
        vx: (Math.random() - 0.5) * 6,
        vy: 4 + Math.random() * 10,
        ch: '◆◇▓▒≈⚡'.charAt(Math.floor(Math.random() * 6)),
        color: k === 'ignite' ? NEON.antimatter : NEON.nuclear,
        t,
        life: 0.2 + Math.random() * 0.35,
      });
    }
  }

  rocketY(state) {
    const { ph, local } = state;
    const cy = this.h * 0.52;
    switch (ph.key) {
      case 'ignite': return cy + 30;
      case 'launch': return lerp(cy + 30, cy - 60, ease(local));
      case 'venus': return lerp(cy, this.h * 0.35, ease(local * 0.5));
      case 'mars': return this.h * 0.38 + Math.sin(this.time * 2) * 8;
      case 'outer': return this.h * 0.42;
      case 'heliopause': return lerp(this.h * 0.45, this.h * 0.35, ease(local));
      case 'warp': return this.h * 0.5;
      case 'beyond': return this.h * 0.48 + Math.sin(this.time * 0.5) * 12;
      default: return cy;
    }
  }

  drawStars(ctx, t, spd, warp) {
    const n = warp ? 400 : 180;
    for (let i = 0; i < n; i++) {
      const bx = hash(i, 0) * this.w;
      let by = (hash(i, 1) * this.h + t * spd * 60 * (0.4 + hash(i, 2))) % (this.h + 30) - 15;
      const streak = spd > 1.5 ? spd * (warp ? 8 : 4) : 0;
      ctx.globalAlpha = 0.25 + hash(i, 3) * 0.75;
      if (streak) {
        const col = warp
          ? (hash(i, 4) > 0.6 ? NEON.antimatter : NEON.cyan)
          : (hash(i, 4) > 0.5 ? NEON.cyan : NEON.white);
        ctx.fillStyle = col;
        ctx.fillRect(bx, by, 1 + streak * 0.4, 2 + streak * 3);
      } else {
        ctx.fillStyle = NEON.white;
        ctx.fillRect(bx, by, 1 + (i % 2), 1 + (i % 2));
      }
    }
    ctx.globalAlpha = 1;
  }

  drawWarpTunnel(ctx, t, local) {
    const cx = this.w * 0.5;
    const cy = this.h * 0.5;
    for (let i = 0; i < 24; i++) {
      const phase = ((t * 2.5 + i * 0.08) % 1);
      const r = phase * Math.max(this.w, this.h) * 0.8;
      ctx.strokeStyle = i % 3 === 0 ? NEON.antimatter : NEON.cyan;
      ctx.globalAlpha = (1 - phase) * 0.35;
      ctx.lineWidth = 2 + (1 - phase) * 4;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawPlanet(ctx, x, y, r, color, glow, label, detail) {
    ctx.save();
    ctx.globalAlpha = 0.95;
    const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(0.6, color);
    g.addColorStop(1, '#000');
    ctx.fillStyle = g;
    ctx.shadowBlur = 35;
    ctx.shadowColor = glow;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = '700 11px monospace';
    ctx.fillStyle = glow;
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + r + 16);
    if (detail) {
      ctx.font = '9px monospace';
      ctx.fillStyle = '#889';
      ctx.fillText(detail, x, y + r + 30);
    }
    ctx.restore();
  }

  drawSun(ctx, x, y, r, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.3, NEON.sun);
    g.addColorStop(0.7, NEON.orange);
    g.addColorStop(1, 'rgba(255,100,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = NEON.sun;
    ctx.shadowBlur = 50;
    ctx.shadowColor = NEON.orange;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = '9px monospace';
    ctx.fillStyle = NEON.nuclear;
    ctx.textAlign = 'center';
    ctx.fillText('SONNE', x, y + r + 14);
    ctx.restore();
  }

  drawScenePlanets(ctx, state) {
    const { ph, local } = state;
    const t = this.time;

    if (ph.key === 'venus') {
      const vx = lerp(this.w * 1.2, this.w * 0.35, ease(local));
      this.drawPlanet(ctx, vx, this.h * 0.42, 55 + local * 20, NEON.venus, NEON.venus, 'VENUS', '462°C · Schwefel');
      if (local > 0.4 && local < 0.7) {
        ctx.fillStyle = NEON.nuclear;
        ctx.font = '700 14px monospace';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 20;
        ctx.shadowColor = NEON.nuclear;
        ctx.fillText('◉ VORBEIFLUG · WAHNSINN', this.w * 0.5, this.h * 0.15);
        ctx.shadowBlur = 0;
      }
    }

    if (ph.key === 'mars') {
      const mx = lerp(this.w * 0.85, this.w * 0.62, ease(local));
      this.drawPlanet(ctx, mx, this.h * 0.38, 48, NEON.mars, NEON.mars, 'MARS', 'Olympus Mons · Staub');
      ctx.strokeStyle = 'rgba(255,68,34,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(mx, this.h * 0.38, 90, 30, 0, 0, TAU);
      ctx.stroke();
    }

    if (ph.key === 'outer') {
      this.drawPlanet(ctx, this.w * 0.78, this.h * 0.32, 70, '#cc8844', NEON.orange, 'JUPITER', 'Großer Roter Fleck');
      this.drawPlanet(ctx, this.w * 0.55, this.h * 0.55, 45, '#ddaa66', NEON.yellow, 'SATURN', 'Ringe');
      ctx.strokeStyle = 'rgba(255,200,100,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(this.w * 0.55, this.h * 0.55, 80, 18, -0.2, 0, TAU);
      ctx.stroke();
    }

    if (ph.key === 'heliopause' || ph.key === 'beyond') {
      const sr = lerp(80, 12, ph.key === 'heliopause' ? ease(local) : 1);
      const sx = lerp(this.w * 0.8, this.w * 0.92, ph.key === 'heliopause' ? ease(local) : 1);
      this.drawSun(ctx, sx, this.h * 0.25, sr, 0.5 + (1 - local) * 0.3);
    }

    if (ph.key === 'beyond') {
      for (let i = 0; i < 6; i++) {
        const nx = this.w * hash(i, 1) + Math.sin(t * 0.2 + i) * 30;
        const ny = this.h * (0.15 + hash(i, 2) * 0.5);
        const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, 100);
        g.addColorStop(0, i % 2 ? 'rgba(204,68,255,0.2)' : 'rgba(0,255,255,0.15)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, this.w, this.h);
      }
    }
  }

  drawRocket(ctx, x, y, scale, angle, engine) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (engine) {
      const flicker = 0.6 + Math.random() * 0.4;
      ctx.globalAlpha = flicker;
      ctx.shadowBlur = 35;
      ctx.shadowColor = NEON.antimatter;
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = NEON.antimatter;
      for (let i = 0; i < 6; i++) {
        ctx.fillText('◆', (Math.random() - 0.5) * 14, 32 + i * 7);
      }
      ctx.fillStyle = NEON.nuclear;
      ctx.shadowColor = NEON.nuclear;
      ctx.font = 'bold 16px monospace';
      ctx.fillText('⚡', 0, 38);
      ctx.fillStyle = NEON.flame;
      ctx.shadowColor = NEON.flame;
      ctx.font = 'bold 14px monospace';
      for (let i = 0; i < 3; i++) {
        ctx.fillText('▓', (Math.random() - 0.5) * 10, 48 + i * 5);
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = NEON.white;
    ctx.shadowBlur = 18;
    ctx.shadowColor = NEON.cyan;
    ctx.font = 'bold 16px monospace';
    ctx.fillText('▲', 0, -28);
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = NEON.cyan;
    ctx.fillText('AM-1', 0, -14);
    ctx.fillStyle = NEON.magenta;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('█', 0, 2);
    ctx.font = '8px monospace';
    ctx.fillStyle = NEON.nuclear;
    ctx.fillText('NUKLEAR', 0, 16);
    ctx.fillStyle = NEON.antimatter;
    ctx.fillText('◈ AM', 0, 28);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawAntimatterCore(ctx, x, y, t, active) {
    if (!active) return;
    ctx.save();
    ctx.translate(x, y);
    for (let i = 0; i < 3; i++) {
      const r = 20 + i * 12 + Math.sin(t * 3 + i) * 4;
      ctx.strokeStyle = i === 0 ? NEON.antimatter : NEON.magenta;
      ctx.globalAlpha = 0.4 - i * 0.1;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.stroke();
    }
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = NEON.antimatter;
    ctx.shadowBlur = 25;
    ctx.shadowColor = NEON.antimatter;
    ctx.textAlign = 'center';
    ctx.fillText('◈', 0, 6);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawPulses(ctx, t) {
    this.pulses = this.pulses.filter((p) => t - p.t < p.life);
    for (const p of this.pulses) {
      const age = (t - p.t) / p.life;
      const r = lerp(p.r, p.maxR, age);
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 1 - age;
      ctx.lineWidth = 3 - age * 2;
      ctx.shadowBlur = 15;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, TAU);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawStreaks(ctx, t) {
    this.streaks = this.streaks.filter((s) => t - s.t < s.life);
    for (const s of this.streaks) {
      const age = (t - s.t) / s.life;
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = 1 - age;
      ctx.lineWidth = s.w;
      ctx.shadowBlur = 10;
      ctx.shadowColor = s.color;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x, s.y + s.len);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawSparks(ctx, t) {
    this.sparks = this.sparks.filter((p) => t - p.t < p.life);
    ctx.textAlign = 'center';
    for (const p of this.sparks) {
      const age = (t - p.t) / p.life;
      ctx.globalAlpha = 1 - age;
      ctx.fillStyle = p.color;
      ctx.font = '14px monospace';
      ctx.fillText(p.ch, p.x + p.vx * age * 25, p.y + p.vy * age * 25);
    }
    ctx.globalAlpha = 1;
  }

  drawHUD(ctx, state, kms) {
    const { ph } = state;
    ctx.textAlign = 'left';
    ctx.font = '700 15px monospace';
    ctx.fillStyle = NEON.magenta;
    ctx.shadowBlur = 16;
    ctx.shadowColor = NEON.magenta;
    ctx.fillText(`◉ RAKETEN-WAHN · ${ph.name}`, 20, 32);
    ctx.shadowBlur = 0;
    ctx.font = '600 12px monospace';
    ctx.fillStyle = NEON.nuclear;
    ctx.fillText(ph.line, 20, 54);

    ctx.textAlign = 'right';
    ctx.fillStyle = NEON.cyan;
    ctx.font = '700 14px monospace';
    ctx.shadowBlur = 12;
    ctx.shadowColor = NEON.cyan;
    ctx.fillText(formatSpeed(kms), this.w - 20, 32);
    ctx.shadowBlur = 0;

    const pctC = kms / C;
    if (pctC > 0.01) {
      ctx.fillStyle = NEON.antimatter;
      ctx.font = '700 12px monospace';
      ctx.fillText(`${(pctC * 100).toFixed(1)}% LICHTGESCHWINDIGKEIT`, this.w - 20, 52);
    } else {
      ctx.fillStyle = NEON.orange;
      ctx.font = '11px monospace';
      ctx.fillText('ANTIMATERIE · NUKLEAR-PULS', this.w - 20, 52);
    }

    ctx.fillStyle = '#556';
    ctx.font = '10px monospace';
    ctx.fillText(`MET ${Math.floor(state.t)}s / ${CYCLE}s`, this.w - 20, 70);
    ctx.fillText('MARS · VENUS · INTERSTELLAR', this.w - 20, 84);

    ctx.textAlign = 'left';
    const prog = state.p;
    ctx.fillStyle = '#222';
    ctx.fillRect(20, this.h - 18, this.w - 40, 4);
    const grad = ctx.createLinearGradient(20, 0, this.w - 20, 0);
    grad.addColorStop(0, NEON.magenta);
    grad.addColorStop(0.5, NEON.antimatter);
    grad.addColorStop(1, NEON.cyan);
    ctx.fillStyle = grad;
    ctx.fillRect(20, this.h - 18, (this.w - 40) * prog, 4);

    const phaseLabels = ['AM', 'GO', '♀', '♂', 'OUT', 'HEL', 'WARP', '∞'];
    PHASES.forEach((p, i) => {
      const px = 20 + (this.w - 40) * ((p.p0 + p.p1) * 0.5);
      ctx.font = '8px monospace';
      ctx.fillStyle = state.p >= p.p0 && state.p < p.p1 ? NEON.nuclear : '#334';
      ctx.textAlign = 'center';
      ctx.fillText(phaseLabels[i] || '·', px, this.h - 24);
    });
  }

  draw() {
    const ctx = this.ctx;
    const state = phaseAt(this.time);
    const spd = this.speed(state);
    const kms = this.speedKms(state);
    const t = this.time;
    const k = state.ph.key;
    const warp = k === 'warp';

    if (['launch', 'venus', 'mars', 'warp'].includes(k)) {
      this.shake = spd * 1.2;
    } else if (k === 'ignite') {
      this.shake = 2 + Math.sin(t * 8) * 2;
    } else {
      this.shake *= 0.82;
    }

    ctx.save();
    ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);

    ctx.fillStyle = NEON.void;
    ctx.fillRect(-5, -5, this.w + 10, this.h + 10);

    if (warp) this.drawWarpTunnel(ctx, t, state.local);
    this.drawStars(ctx, t, spd, warp);
    this.drawScenePlanets(ctx, state);

    for (let i = 0; i < 2 + spd * 2; i++) this.spawnEffects(spd, t, state);

    const rx = this.w * 0.5 + (k === 'venus' ? Math.sin(t * 6) * 6 : 0);
    const ry = this.rocketY(state);
    const ang = k === 'warp' ? -Math.PI / 2 : (k === 'heliopause' ? -0.15 : 0);
    const sc = k === 'beyond' ? 0.35 : (k === 'heliopause' ? 0.45 : 0.85);
    const engine = ['ignite', 'launch', 'venus', 'mars', 'outer', 'warp'].includes(k);

    if (k === 'ignite') {
      this.drawAntimatterCore(ctx, rx, ry + 10, t, true);
    }

    this.drawRocket(ctx, rx, ry, sc, ang, engine);
    this.drawPulses(ctx, t);
    this.drawStreaks(ctx, t);
    this.drawSparks(ctx, t);
    this.drawHUD(ctx, state, kms);

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
      a.download = `raketen-wahn-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}
