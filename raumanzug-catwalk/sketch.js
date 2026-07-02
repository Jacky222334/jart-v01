import { showAt, LOOKS, NEON, WALK_SEC, POSE_SEC, lerp, ease } from './models.js';

const TAU = Math.PI * 2;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export class CatwalkSim {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.paused = false;
    this.t0 = performance.now();
    this.time = 0;
    this.raf = null;
    this.flashes = [];
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
    this.vx = this.w * 0.5;
    this.vy = this.h * 0.2;
  }

  runwayPos(walkT, poseT, walking) {
    const t = walking ? ease(walkT) : 1;
    const backY = this.h * 0.32;
    const frontY = this.h * 0.78;
    const y = lerp(backY, frontY, t);
    const scale = lerp(0.28, 1.05, t);
    const sway = walking
      ? Math.sin(walkT * TAU * 3.2) * 8 * scale
      : Math.sin(poseT * TAU) * 4 * scale;
    const x = this.vx + sway;
    const turn = walking ? 0 : lerp(0, 0.35, ease(poseT));
    return { x, y, scale, turn, depth: t };
  }

  walkCycle(walkT, walking, poseT) {
    if (!walking) {
      return {
        legL: lerp(0, -8, ease(poseT)),
        legR: lerp(0, 6, ease(poseT)),
        armL: lerp(0, -18, ease(poseT)),
        armR: lerp(0, 14, ease(poseT)),
        bob: 0,
        headTilt: lerp(0, 0.08, ease(poseT)),
      };
    }
    const ph = walkT * TAU * 2.1;
    return {
      legL: Math.sin(ph) * 28,
      legR: Math.sin(ph + Math.PI) * 28,
      armL: Math.sin(ph + Math.PI) * 18,
      armR: Math.sin(ph) * 18,
      bob: Math.abs(Math.sin(ph * 2)) * 3,
      headTilt: Math.sin(ph) * 0.04,
    };
  }

  drawRunway(ctx) {
    const { w, h, vx, vy } = this;
    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, w, h);

    const g = ctx.createRadialGradient(vx, vy, 0, vx, h * 0.5, w * 0.7);
    g.addColorStop(0, 'rgba(255,255,255,0.06)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#0a0a12';
    ctx.beginPath();
    ctx.moveTo(vx - w * 0.08, h * 0.28);
    ctx.lineTo(vx + w * 0.08, h * 0.28);
    ctx.lineTo(vx + w * 0.42, h * 0.92);
    ctx.lineTo(vx - w * 0.42, h * 0.92);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(vx - w * 0.08, h * 0.28);
    ctx.lineTo(vx - w * 0.42, h * 0.92);
    ctx.moveTo(vx + w * 0.08, h * 0.28);
    ctx.lineTo(vx + w * 0.42, h * 0.92);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0,255,255,0.15)';
    for (let i = 1; i < 8; i++) {
      const t = i / 8;
      const y = lerp(h * 0.3, h * 0.9, t);
      const half = lerp(w * 0.07, w * 0.38, t);
      ctx.beginPath();
      ctx.moveTo(vx - half, y);
      ctx.lineTo(vx + half, y);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, w * 0.12, h);
    ctx.fillRect(w * 0.88, 0, w * 0.12, h);
  }

  drawAudience(ctx, t) {
    ctx.fillStyle = '#111';
    for (let side = 0; side < 2; side++) {
      const baseX = side === 0 ? this.w * 0.04 : this.w * 0.96;
      for (let i = 0; i < 18; i++) {
        const y = this.h * 0.35 + i * 28 + Math.sin(t + i) * 2;
        ctx.globalAlpha = 0.25 + (i % 3) * 0.08;
        ctx.beginPath();
        ctx.arc(baseX + (side === 0 ? 1 : -1) * (i % 4) * 8, y, 6 + (i % 5), 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawSpotlights(ctx, x, y, scale) {
    for (let i = -1; i <= 1; i++) {
      const sx = this.vx + i * this.w * 0.25;
      const g = ctx.createRadialGradient(sx, 0, 0, x, y, 180 * scale);
      g.addColorStop(0, 'rgba(255,255,255,0.12)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }

  drawHelmet(ctx, look, s, headTilt) {
    const { colors } = look;
    const hr = 14 * s;
    ctx.save();
    ctx.rotate(headTilt);

    ctx.fillStyle = colors.suit;
    ctx.strokeStyle = colors.trim;
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.arc(0, -52 * s, hr, 0, TAU);
    ctx.fill();
    ctx.stroke();

    const vg = ctx.createRadialGradient(-4 * s, -56 * s, 2, 0, -52 * s, hr);
    vg.addColorStop(0, 'rgba(180,220,255,0.85)');
    vg.addColorStop(0.45, colors.visor);
    vg.addColorStop(1, 'rgba(0,10,30,0.95)');
    ctx.fillStyle = vg;
    ctx.beginPath();
    ctx.arc(0, -52 * s, hr * 0.82, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.arc(-5 * s, -58 * s, hr * 0.25, 0, TAU);
    ctx.stroke();

    ctx.fillStyle = colors.trim;
    ctx.fillRect(-hr * 0.9, -52 * s + hr * 0.5, hr * 1.8, 3 * s);
    ctx.restore();
  }

  drawLimb(ctx, len, w, angle, color, trim) {
    ctx.save();
    ctx.rotate((angle * Math.PI) / 180);
    ctx.fillStyle = color;
    ctx.strokeStyle = trim;
    ctx.lineWidth = 1;
    const r = w * 0.45;
    roundRect(ctx, -w / 2, 0, w, len, r);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = trim;
    ctx.fillRect(-w * 0.35, len * 0.72, w * 0.7, len * 0.22);
    ctx.restore();
  }

  drawSuit(ctx, look, cycle, turn) {
    const { colors } = look;
    const s = look.height;
    const sw = 18 * look.shoulder * s;
    const hw = 16 * look.hip * s;

    if (look.plss !== 'none') {
      const pw = look.plss === 'large' ? 22 : look.plss === 'medium' ? 18 : 14;
      ctx.fillStyle = '#555';
      ctx.strokeStyle = colors.trim;
      ctx.lineWidth = 1;
      roundRect(ctx, -pw * s * 0.5 - 2, -38 * s, pw * s, 48 * s, 4 * s);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = colors.trim;
      ctx.fillRect(-pw * s * 0.3, -30 * s, pw * s * 0.6, 3 * s);
      ctx.fillRect(-pw * s * 0.3, -18 * s, pw * s * 0.6, 3 * s);
    }

    ctx.fillStyle = colors.suit;
    ctx.strokeStyle = colors.trim;
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(-sw, -38 * s);
    ctx.lineTo(sw, -38 * s);
    ctx.lineTo(hw * 1.05, 8 * s);
    ctx.lineTo(-hw * 1.05, 8 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = colors.trim;
    ctx.fillRect(-sw * 0.85, -28 * s, sw * 1.7, 2.5 * s);
    ctx.fillRect(-sw * 0.5, -18 * s, sw, 2 * s);

    ctx.fillStyle = colors.boot;
    ctx.fillRect(-hw * 0.55, 8 * s, hw * 1.1, 5 * s);

    ctx.save();
    ctx.translate(-sw * 0.95, -34 * s);
    this.drawLimb(ctx, 36 * s, 9 * s, cycle.armL, colors.suit, colors.trim);
    ctx.restore();

    ctx.save();
    ctx.translate(sw * 0.95, -34 * s);
    this.drawLimb(ctx, 36 * s, 9 * s, cycle.armR, colors.suit, colors.trim);
    ctx.restore();

    ctx.save();
    ctx.translate(-hw * 0.35, 10 * s);
    this.drawLimb(ctx, 42 * s, 11 * s, cycle.legL, colors.suit, colors.boot);
    ctx.restore();

    ctx.save();
    ctx.translate(hw * 0.35, 10 * s);
    this.drawLimb(ctx, 42 * s, 11 * s, cycle.legR, colors.suit, colors.boot);
    ctx.restore();

    this.drawHelmet(ctx, look, s, cycle.headTilt + turn);
  }

  drawModel(ctx, state) {
    const pos = this.runwayPos(state.walkT, state.poseT, state.walking);
    const cycle = this.walkCycle(state.walkT, state.walking, state.poseT);

    ctx.save();
    ctx.translate(pos.x, pos.y + cycle.bob);
    ctx.scale(pos.scale, pos.scale);
    ctx.rotate(pos.turn);

    this.drawSpotlights(ctx, pos.x, pos.y, pos.scale);
    this.drawSuit(ctx, state.look, cycle, pos.turn);

    ctx.restore();
    return pos;
  }

  drawLabel(ctx, look, walking) {
    const cardY = this.h * 0.88;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(this.w * 0.25, cardY - 20, this.w * 0.5, 56);
    ctx.strokeStyle = walking ? NEON[1] : NEON[2];
    ctx.lineWidth = 1;
    ctx.strokeRect(this.w * 0.25, cardY - 20, this.w * 0.5, 56);

    ctx.textAlign = 'center';
    ctx.font = '700 18px monospace';
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#fff';
    ctx.fillText(
      `${look.name} · ${look.gender === 'F' ? 'DAMEN' : 'HERREN'}`,
      this.w * 0.5,
      cardY + 4,
    );
    ctx.shadowBlur = 0;
    ctx.font = '500 11px monospace';
    ctx.fillStyle = NEON[1];
    ctx.fillText(look.tag, this.w * 0.5, cardY + 24);
  }

  drawHUD(ctx, state) {
    ctx.textAlign = 'left';
    ctx.font = '700 14px monospace';
    ctx.fillStyle = NEON[0];
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#fff';
    ctx.fillText('◉ ORBIT COUTURE · FW 2026', 22, 32);
    ctx.shadowBlur = 0;
    ctx.font = '500 11px monospace';
    ctx.fillStyle = '#666';
    ctx.fillText('Raumanzüge · Catwalk · Präzisions-Animation', 22, 52);

    ctx.textAlign = 'right';
    ctx.fillStyle = state.look.gender === 'F' ? NEON[5] : NEON[1];
    ctx.fillText(
      `LOOK ${String(state.idx + 1).padStart(2, '0')} / ${LOOKS.length}`,
      this.w - 22,
      32,
    );
    ctx.fillStyle = '#555';
    ctx.fillText(
      state.walking ? '▶ CATWALK' : '◆ POSE',
      this.w - 22,
      52,
    );
  }

  drawFlashes(ctx, t, pos) {
    if (Math.random() > 0.97 && pos.depth > 0.5) {
      this.flashes.push({ t, life: 0.15 });
    }
    this.flashes = this.flashes.filter((f) => t - f.t < f.life);
    for (const f of this.flashes) {
      const a = 1 - (t - f.t) / f.life;
      ctx.globalAlpha = a * 0.35;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, this.w, this.h);
    }
    ctx.globalAlpha = 1;
  }

  drawTimeline(ctx, state) {
    const y = this.h - 14;
    const x0 = 40;
    const x1 = this.w - 40;
    for (let i = 0; i < LOOKS.length; i++) {
      const seg = (x1 - x0) / LOOKS.length;
      ctx.fillStyle = i === state.idx ? NEON[1] : '#222';
      ctx.fillRect(x0 + i * seg, y, seg - 2, 4);
    }
  }

  draw() {
    const ctx = this.ctx;
    const state = showAt(this.time);

    this.drawRunway(ctx);
    this.drawAudience(ctx, this.time);
    const pos = this.drawModel(ctx, state);
    this.drawLabel(ctx, state.look, state.walking);
    this.drawHUD(ctx, state);
    this.drawFlashes(ctx, this.time, pos);
    this.drawTimeline(ctx, state);
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

  nextLook() {
    const st = showAt(this.time);
    this.time = (st.idx + 1) * (WALK_SEC + POSE_SEC);
    this.t0 = performance.now() - this.time * 1000;
  }

  saveFrame() {
    this.canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `raumanzug-catwalk-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}
