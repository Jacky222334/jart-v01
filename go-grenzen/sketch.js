import {
  sceneAt, STEPS, PAL, LABEL, SUB, NOTE, STEP_SEC, ease, lerp, hash,
} from './data.js';

const TAU = Math.PI * 2;

export class GoGrenzen {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.paused = false;
    this.t0 = performance.now();
    this.time = 0;
    this.raf = null;
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

  drawBg(ctx, t) {
    const g = ctx.createRadialGradient(this.w * 0.5, this.h * 0.4, 0, this.w * 0.5, this.h * 0.5, this.w * 0.7);
    g.addColorStop(0, '#101030');
    g.addColorStop(1, PAL.bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.font = '8px monospace';
    for (let i = 0; i < 60; i++) {
      ctx.globalAlpha = 0.3 + hash(i, t) * 0.4;
      ctx.fillStyle = PAL.violet;
      ctx.fillRect(hash(i, 1) * this.w, hash(i, 2) * this.h, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  drawLegoPerson(ctx, cx, cy, s, color, anim) {
    const bob = Math.sin(anim * TAU) * 3;
    cy += bob;
    ctx.fillStyle = PAL.yellow;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.fillRect(cx - 14 * s, cy - 40 * s, 28 * s, 28 * s);
    ctx.strokeRect(cx - 14 * s, cy - 40 * s, 28 * s, 28 * s);
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(cx - 5 * s, cy - 30 * s, 2 * s, 0, TAU);
    ctx.arc(cx + 5 * s, cy - 30 * s, 2 * s, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy - 22 * s, 5 * s, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.fillRect(cx - 16 * s, cy - 10 * s, 32 * s, 26 * s);
    ctx.strokeRect(cx - 16 * s, cy - 10 * s, 32 * s, 26 * s);
    ctx.fillRect(cx - 22 * s, cy - 6 * s, 8 * s, 20 * s);
    ctx.fillRect(cx + 14 * s, cy - 6 * s, 8 * s, 20 * s);
    ctx.fillStyle = PAL.yellow;
    ctx.beginPath();
    ctx.arc(cx - 18 * s, cy + 14 * s, 4 * s, 0, TAU);
    ctx.arc(cx + 18 * s, cy + 14 * s, 4 * s, 0, TAU);
    ctx.fill();
    ctx.fillRect(cx - 10 * s, cy + 14 * s, 8 * s, 18 * s);
    ctx.fillRect(cx + 2 * s, cy + 14 * s, 8 * s, 18 * s);
  }

  drawShield(ctx, cx, cy, s, t) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.strokeStyle = PAL.go;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20 * pulse;
    ctx.shadowColor = PAL.go;
    ctx.globalAlpha = 0.5 + pulse * 0.3;
    ctx.beginPath();
    ctx.arc(cx, cy, 55 * s, 0, TAU);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawScene(ctx, state, t) {
    const { step, local } = state;
    const cx = this.w * 0.5;
    const cy = this.h * 0.52;
    const s = Math.min(this.w, this.h) / 500;
    const anim = ease(Math.min(1, local * 1.3));
    const colors = [PAL.cyan, PAL.pink, PAL.yellow, PAL.violet, PAL.go, PAL.go];
    const color = colors[state.idx];

    this.drawLegoPerson(ctx, cx, cy, s * 1.2, color, local + t * 0.1);

    if (step.key === 'private' || step.key === 'no') {
      this.drawShield(ctx, cx, cy - 10 * s, s, t);
    }

    ctx.textAlign = 'center';
    ctx.font = `800 ${48 * s}px monospace`;
    ctx.fillStyle = color;
    ctx.shadowBlur = 24;
    ctx.shadowColor = color;
    ctx.globalAlpha = anim;
    if (step.key !== 'body' && step.key !== 'grow') {
      ctx.fillText(step.icon, cx, cy - 80 * s);
    }
    if (step.key === 'grow') {
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = PAL.go;
        ctx.globalAlpha = anim * (0.4 + i * 0.12);
        ctx.fillText('▲', cx - 40 * s + i * 20 * s, cy - 70 * s - i * 8);
      }
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    ctx.font = `700 ${22 * s}px monospace`;
    ctx.fillStyle = PAL.white;
    ctx.fillText(step.title, cx, cy + 70 * s);
    ctx.font = `500 ${14 * s}px monospace`;
    ctx.fillStyle = PAL.grey;
    ctx.fillText(step.line, cx, cy + 95 * s);

    if (step.key === 'go') {
      ctx.font = `800 ${80 * s}px monospace`;
      ctx.fillStyle = PAL.go;
      ctx.shadowBlur = 40;
      ctx.shadowColor = PAL.go;
      ctx.globalAlpha = 0.15 + Math.sin(t * 4) * 0.08;
      ctx.fillText('GO', cx, cy - 20 * s);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  drawHUD(ctx, state, t) {
    ctx.textAlign = 'left';
    ctx.font = '700 14px monospace';
    ctx.fillStyle = PAL.go;
    ctx.shadowBlur = 14;
    ctx.shadowColor = PAL.go;
    ctx.fillText(`◉ ${LABEL}`, 20, 32);
    ctx.shadowBlur = 0;
    ctx.font = '500 11px monospace';
    ctx.fillStyle = PAL.cyan;
    ctx.fillText(SUB, 20, 52);
    ctx.fillStyle = '#445';
    ctx.font = '9px monospace';
    ctx.fillText(NOTE, 20, 68);

    ctx.textAlign = 'right';
    ctx.fillStyle = PAL.yellow;
    ctx.font = '11px monospace';
    ctx.fillText(`SCHRITT ${state.idx + 1}/${STEPS.length}`, this.w - 20, 32);
    ctx.fillStyle = '#556';
    ctx.fillText(`${Math.floor(state.loop)}s`, this.w - 20, 50);
    ctx.textAlign = 'left';

    const y = this.h - 20;
    for (let i = 0; i < STEPS.length; i++) {
      const w = (this.w - 40) / STEPS.length;
      ctx.fillStyle = i === state.idx ? PAL.go : '#222';
      ctx.fillRect(20 + i * w, y, w - 2, 4);
    }
  }

  draw() {
    const ctx = this.ctx;
    const state = sceneAt(this.time);
    this.drawBg(ctx, this.time);
    this.drawScene(ctx, state, this.time);
    this.drawHUD(ctx, state, this.time);
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

  nextStep() {
    const st = sceneAt(this.time);
    this.time = ((st.idx + 1) % STEPS.length) * STEP_SEC;
    this.t0 = performance.now() - this.time * 1000;
  }

  saveFrame() {
    this.canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `go-grenzen-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}
