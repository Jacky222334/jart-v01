import {
  storyAt, PALETTE, ACTS, CYCLE, hash, lerp, starBrightness, astrophageCount, dimPercent,
} from './story.js';

function pick(str, n) {
  return str[Math.floor(n * str.length) % str.length];
}

export class HailMarySim {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.paused = false;
    this.t0 = performance.now();
    this.time = 0;
    this.raf = null;
    this.stars = [];
    this.astro = [];
    this.trails = [];
    this.bursts = [];
    this.shake = 0;
    this.flash = 0;
    this.lastAct = '';
    this.resize();
    this.initStars();
    window.addEventListener('resize', () => { this.resize(); this.initStars(); });
  }

  initStars() {
    this.stars = Array.from({ length: 420 }, (_, i) => ({
      x: hash(i, 0) * this.w,
      y: hash(0, i) * this.h,
      z: hash(i, i),
      ch: pick('·+*✦', hash(i * 2, i * 3)),
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
    this.cx = this.w * 0.5;
    this.cy = this.h * 0.46;
  }

  syncAstro(count, starX, starY, starR, t, actKey) {
    while (this.astro.length < count) {
      const a = hash(this.astro.length, t, 1);
      this.astro.push({
        angle: a * Math.PI * 2,
        r: starR * (1.1 + hash(a, 2) * 1.8),
        speed: 0.3 + hash(a, 3) * 1.2,
        heat: hash(a, 4),
        drift: hash(a, 5) * 0.5,
        star: actKey === 'tauceti' || actKey === 'warp' ? hash(a, 6) > 0.5 ? 1 : 0 : 0,
      });
    }
    if (this.astro.length > count) this.astro.length = count;
    for (const a of this.astro) {
      a.angle += a.speed * 0.016 * (actKey === 'swarm' ? 2.5 : 1);
      if (actKey === 'warp') a.r += Math.sin(t + a.heat * 10) * 0.8;
    }
  }

  spawnBurst(x, y, color, n = 8) {
    for (let i = 0; i < n; i++) {
      this.bursts.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        t: this.time,
        life: 0.5 + Math.random() * 0.6,
        color,
        ch: pick('✦◉·', Math.random()),
      });
    }
  }

  drawBg(ctx, t, act) {
    const g = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, this.w * 0.8);
    const warmth = act.key === 'dark' ? 0.02 : act.key === 'dawn' ? 0.12 : 0.06;
    g.addColorStop(0, `rgba(20,30,80,${warmth})`);
    g.addColorStop(0.5, '#030510');
    g.addColorStop(1, PALETTE.void);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const s of this.stars) {
      const tw = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(t * 1.5 + s.z * 30));
      const streak = act.key === 'warp' ? 3 : 0;
      ctx.globalAlpha = tw * 0.75;
      ctx.fillStyle = streak ? PALETTE.hope : `hsl(${200 + s.z * 80},80%,${50 + s.z * 40}%)`;
      if (streak) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(-0.3);
        ctx.fillRect(-streak * 8, 0, streak * 16, 1);
        ctx.restore();
      }
      ctx.fillText(s.ch, s.x, s.y);
    }
    ctx.globalAlpha = 1;
  }

  drawWarpTunnel(ctx, local, t) {
    const intensity = Math.sin(local * Math.PI) * 0.85;
    ctx.save();
    ctx.translate(this.cx, this.cy);
    for (let i = 0; i < 48; i++) {
      const ang = (i / 48) * Math.PI * 2 + t * 0.2;
      const len = this.w * (0.2 + (i % 7) * 0.06);
      ctx.strokeStyle = i % 3 === 0 ? PALETTE.hope : i % 3 === 1 ? PALETTE.astro : '#ffffff';
      ctx.globalAlpha = intensity * (0.08 + (i % 5) * 0.04);
      ctx.lineWidth = 1 + (i % 3);
      ctx.shadowBlur = 12;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * 20, Math.sin(ang) * 20);
      ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  drawStar(ctx, x, y, r, bright, act, local, label) {
    const ir = act.key !== 'silence' && act.key !== 'dawn';
    const irAmt = ['petrova', 'first', 'swarm', 'dark', 'tauceti'].includes(act.key)
      ? lerp(0.2, 1, local) : act.key === 'solution' ? lerp(1, 0.1, local) : 0.4;

    for (let i = 5; i >= 0; i--) {
      const rr = r * (1 + i * 0.35) * bright;
      ctx.globalAlpha = (0.08 - i * 0.01) * bright;
      ctx.fillStyle = i > 2 ? PALETTE.corona : PALETTE.star;
      ctx.shadowBlur = 40 + i * 15;
      ctx.shadowColor = ctx.fillStyle;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.fill();
    }

    if (ir && irAmt > 0.05) {
      ctx.globalAlpha = irAmt * 0.35;
      ctx.fillStyle = PALETTE.ir;
      ctx.shadowBlur = 60;
      ctx.shadowColor = PALETTE.ir;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = irAmt * 0.7;
      ctx.strokeStyle = PALETTE.petrova;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 2.8, r * 0.12, 0.25, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = bright;
    ctx.fillStyle = PALETTE.star;
    ctx.shadowBlur = 50 * bright;
    ctx.shadowColor = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55 * bright, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    if (label) {
      ctx.font = '600 11px monospace';
      ctx.fillStyle = PALETTE.hope;
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y + r * 2.6);
    }
  }

  drawAstrophage(ctx, t, act, starX, starY, starR) {
    const count = astrophageCount(act.key, storyAt(t).local);
    this.syncAstro(count, starX, starY, starR, t, act.key);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const a of this.astro) {
      const sx = act.key === 'warp'
        ? lerp(starX, this.cx + Math.cos(a.angle) * a.r * 1.5, 0.5 + Math.sin(t + a.heat * 8) * 0.3)
        : starX + Math.cos(a.angle) * a.r;
      const sy = act.key === 'warp'
        ? lerp(starY, this.cy + Math.sin(a.angle) * a.r * 0.8, 0.5 + Math.cos(t + a.heat * 6) * 0.3)
        : starY + Math.sin(a.angle) * a.r * 0.65;
      const pulse = 0.6 + 0.4 * Math.sin(t * 8 + a.heat * 20);
      const nemesis = act.key === 'nemesis' && a.heat > 0.7;

      ctx.globalAlpha = pulse * 0.9;
      ctx.shadowBlur = nemesis ? 20 : 14;
      ctx.shadowColor = nemesis ? PALETTE.nemesis : PALETTE.astro;
      ctx.fillStyle = nemesis ? PALETTE.nemesis : PALETTE.astroCore;
      ctx.font = `${nemesis ? 10 : 7 + a.heat * 4}px monospace`;
      ctx.fillText(nemesis ? '✕' : '◉', sx, sy);

      if (!nemesis && act.key !== 'dawn') {
        ctx.globalAlpha = pulse * 0.4;
        ctx.strokeStyle = PALETTE.iridium;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(sx, sy, 5 + a.heat * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawShip(ctx, t, act, local) {
    if (!['launch', 'warp', 'tauceti', 'rocky', 'solution'].includes(act.key)) return;
    const prog = act.key === 'launch' ? local : 0.7;
    const x = lerp(this.w * 0.15, this.cx, prog);
    const y = lerp(this.h * 0.8, this.cy - 80, prog);
    const spin = t * 2.5;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin * 0.08);
    ctx.strokeStyle = PALETTE.ship;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 20;
    ctx.shadowColor = PALETTE.hope;
    ctx.globalAlpha = 0.9;

    ctx.beginPath();
    ctx.moveTo(-55, 0);
    ctx.lineTo(55, 0);
    ctx.moveTo(0, -55);
    ctx.lineTo(0, 55);
    ctx.stroke();

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = PALETTE.hope;
    ctx.textAlign = 'center';
    ctx.fillText('◉', 0, 0);
    ctx.font = '8px monospace';
    ctx.fillText('HAIL MARY', 0, -68);

    if (act.key === 'launch' || act.key === 'warp') {
      ctx.fillStyle = PALETTE.astro;
      ctx.font = '10px monospace';
      for (let i = 0; i < 5; i++) {
        ctx.globalAlpha = 0.5 + Math.random() * 0.5;
        ctx.fillText('▓', -20 + i * 10, 40 + Math.sin(t * 10 + i) * 4);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  drawRocky(ctx, act, local) {
    if (act.key !== 'rocky' && act.key !== 'solution') return;
    const a = act.key === 'rocky' ? local : 1;
    const x = this.cx + 120;
    const y = this.cy - 40;
    ctx.globalAlpha = a;
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = PALETTE.rocky;
    ctx.shadowBlur = 30;
    ctx.shadowColor = PALETTE.rocky;
    ctx.textAlign = 'center';
    ctx.fillText('◈', x, y);
    ctx.font = '10px monospace';
    ctx.fillText('ROCKY · ERIDIAN', x, y + 28);
    ctx.font = '9px monospace';
    ctx.fillStyle = PALETTE.hope;
    ctx.fillText('"◈◈◈ · AMPERSAND · ◈◈◈"', x, y + 46);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawEarth(ctx, act, bright) {
    if (!['dark', 'launch', 'solution', 'dawn'].includes(act.key)) return;
    const ex = this.w * 0.82;
    const ey = this.h * 0.72;
    const er = 22;
    const cold = act.key === 'dark';
    ctx.fillStyle = cold ? '#112233' : '#2244aa';
    ctx.shadowBlur = cold ? 5 : 25;
    ctx.shadowColor = cold ? '#224' : PALETTE.hope;
    ctx.globalAlpha = cold ? 0.5 : 0.85;
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '9px monospace';
    ctx.fillStyle = cold ? '#556' : PALETTE.hope;
    ctx.textAlign = 'center';
    ctx.fillText(cold ? 'ERDE · KALT' : 'ERDE', ex, ey + er + 14);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawBursts(ctx, t) {
    this.bursts = this.bursts.filter((b) => t - b.t < b.life);
    ctx.textAlign = 'center';
    for (const b of this.bursts) {
      const age = (t - b.t) / b.life;
      ctx.globalAlpha = 1 - age;
      ctx.fillStyle = b.color;
      ctx.shadowBlur = 16;
      ctx.shadowColor = b.color;
      ctx.font = `${10 + 8 * (1 - age)}px monospace`;
      ctx.fillText(b.ch, b.x + b.vx * age * 30, b.y + b.vy * age * 30);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawHUD(ctx, state, bright) {
    const { act, local, p, t } = state;
    const titleColor = act.key === 'dark' ? PALETTE.nemesis
      : act.key === 'dawn' ? PALETTE.hope
        : act.key === 'rocky' ? PALETTE.rocky
          : PALETTE.astro;

    ctx.textAlign = 'left';
    ctx.font = '700 15px monospace';
    ctx.fillStyle = titleColor;
    ctx.shadowBlur = 18;
    ctx.shadowColor = titleColor;
    ctx.fillText(`◉ ${act.name}`, 22, 34);
    ctx.shadowBlur = 0;

    ctx.font = '600 12px monospace';
    ctx.fillStyle = '#ccc';
    ctx.fillText(act.line, 22, 58);
    ctx.font = '500 11px monospace';
    ctx.fillStyle = titleColor;
    ctx.globalAlpha = 0.85;
    ctx.fillText(act.sub, 22, 78);
    ctx.globalAlpha = 1;

    ctx.textAlign = 'right';
    ctx.font = '500 11px monospace';
    ctx.fillStyle = PALETTE.ir;
    if (bright < 0.98) {
      ctx.fillText(`SONNE · −${dimPercent(bright)}%`, this.w - 22, 34);
    }
    ctx.fillStyle = PALETTE.hope;
    ctx.fillText(`ASTROPHAGEN · ${astrophageCount(act.key, local)}`, this.w - 22, 54);
    ctx.fillStyle = '#666';
    ctx.fillText(`${Math.floor(t)}s / ${CYCLE}s`, this.w - 22, 74);

    if (act.key === 'dark') {
      ctx.fillStyle = PALETTE.nemesis;
      ctx.font = '700 13px monospace';
      ctx.fillText('8 JAHRE · EXTINCTION', this.w - 22, 98);
    }

    ctx.textAlign = 'left';

    if (this.flash > 0.02) {
      ctx.globalAlpha = this.flash * 0.4;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.globalAlpha = 1;
    }
  }

  drawTimeline(ctx, state) {
    const y = this.h - 28;
    const x0 = 24;
    const x1 = this.w - 24;
    const w = x1 - x0;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();

    for (const a of ACTS) {
      const ax = x0 + a.p0 * w;
      const aw = (a.p1 - a.p0) * w;
      const on = state.act.key === a.key;
      ctx.fillStyle = on ? PALETTE.astro : '#1a1a2e';
      ctx.globalAlpha = on ? 1 : 0.6;
      ctx.fillRect(ax, y - 3, Math.max(2, aw), 6);
    }
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x0 + state.p * w, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  draw() {
    const ctx = this.ctx;
    const t = this.time;
    const state = storyAt(t);
    const { act, local } = state;
    const bright = starBrightness(act.key, local, state.p);
    const starR = Math.min(this.w, this.h) * 0.11 * (0.85 + bright * 0.15);

    if (act.key !== this.lastAct) {
      if (this.lastAct) {
        this.flash = 1;
        if (['swarm', 'dark', 'nemesis', 'solution', 'dawn'].includes(act.key)) {
          this.shake = act.key === 'dark' ? 4 : 2;
        }
      }
      this.lastAct = act.key;
    }
    this.flash *= 0.92;
    this.shake *= 0.9;

    const sx = (Math.random() - 0.5) * this.shake;
    const sy = (Math.random() - 0.5) * this.shake;
    ctx.save();
    ctx.translate(sx, sy);

    this.drawBg(ctx, t, act);

    if (act.key === 'warp') this.drawWarpTunnel(ctx, local, t);

    const star2 = act.key === 'warp' && local > 0.4;
    const solX = star2 ? this.w * 0.28 : this.cx;
    const solY = star2 ? this.cy + 40 : this.cy;
    const tauX = star2 ? this.w * 0.72 : this.cx + 200;
    const tauY = star2 ? this.cy - 30 : this.cy;

    this.drawStar(ctx, solX, solY, starR, bright, act, local, star2 ? 'SOL' : 'SOL');
    if (['warp', 'tauceti', 'rocky'].includes(act.key)) {
      this.drawStar(ctx, tauX, tauY, starR * 0.85, bright * 0.75, act, local, 'TAU CETI');
    }

    this.drawAstrophage(ctx, t, act, solX, solY, starR);
    if (star2) this.drawAstrophage(ctx, t + 1.3, act, tauX, tauY, starR * 0.85);

    this.drawEarth(ctx, act, bright);
    this.drawShip(ctx, t, act, local);
    this.drawRocky(ctx, act, local);
    this.drawBursts(ctx, t);
    this.drawTimeline(ctx, state);
    this.drawHUD(ctx, state, bright);

    if (act.key === 'swarm' && Math.random() > 0.95) {
      this.spawnBurst(solX + (Math.random() - 0.5) * starR * 4, solY + (Math.random() - 0.5) * starR * 2, PALETTE.astro);
    }
    if (act.key === 'solution' && local > 0.5 && Math.random() > 0.92) {
      this.spawnBurst(solX, solY, PALETTE.hope, 4);
    }

    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    const vig = ctx.createRadialGradient(this.cx, this.cy, this.w * 0.2, this.cx, this.cy, this.w * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,8,0.65)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, this.w, this.h);
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

  skipAct() {
    const st = storyAt(this.time);
    const next = ACTS.find((a) => a.p0 > st.act.p0) || ACTS[0];
    this.time = next.p0 * CYCLE;
    this.t0 = performance.now() - this.time * 1000;
  }

  saveFrame() {
    this.canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `hail-mary-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}
