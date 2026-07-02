import { sceneAt, STEPS, LEGO, NOTE, ease, lerp } from './stereotypes.js';

const TAU = Math.PI * 2;

export class LegoBinarySim {
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

  snapOffset(local, delay = 0) {
    const t = ease(Math.max(0, Math.min(1, (local - delay) * 2.2)));
    return lerp(-120, 0, t);
  }

  drawStud(ctx, x, y, r) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.35, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  drawBrick(ctx, x, y, w, h, color, studs = 1, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.strokeStyle = LEGO.black;
    ctx.lineWidth = 2.5;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    const sw = w / (studs + 1);
    for (let i = 0; i < studs; i++) {
      this.drawStud(ctx, x + sw * (i + 1), y - 1, Math.min(w, h) * 0.14);
    }
    ctx.restore();
  }

  drawHead(ctx, cx, cy, s, hair, oy, hairColor) {
    const hs = 22 * s;
    this.drawBrick(ctx, cx - hs / 2, cy - hs / 2 + oy, hs, hs, LEGO.yellow, 1);

    ctx.fillStyle = LEGO.black;
    ctx.beginPath();
    ctx.arc(cx - 5 * s, cy + 2 * s + oy, 2.2 * s, 0, TAU);
    ctx.arc(cx + 5 * s, cy + 2 * s + oy, 2.2 * s, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = LEGO.black;
    ctx.lineWidth = 1.8 * s;
    ctx.beginPath();
    ctx.arc(cx, cy + 8 * s + oy, 6 * s, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    if (hair === 'short') {
      this.drawBrick(ctx, cx - hs * 0.55, cy - hs * 0.85 + oy, hs * 1.1, 8 * s, hairColor || '#4a3020', 2);
    } else if (hair === 'long') {
      this.drawBrick(ctx, cx - hs * 0.55, cy - hs * 0.85 + oy, hs * 1.1, 10 * s, hairColor || '#6a4020', 2);
      this.drawBrick(ctx, cx - hs * 0.65, cy - hs * 0.2 + oy, 6 * s, hs * 0.9, hairColor || '#6a4020', 0);
      this.drawBrick(ctx, cx + hs * 0.65 - 6 * s, cy - hs * 0.2 + oy, 6 * s, hs * 0.9, hairColor || '#6a4020', 0);
    }
  }

  drawTorso(ctx, cx, cy, s, color, oy) {
    const tw = 28 * s;
    const th = 26 * s;
    this.drawBrick(ctx, cx - tw / 2, cy + oy, tw, th, color, 2);
    this.drawBrick(ctx, cx - tw / 2 - 8 * s, cy + 4 * s + oy, 8 * s, 18 * s, color, 0);
    this.drawBrick(ctx, cx + tw / 2, cy + 4 * s + oy, 8 * s, 18 * s, color, 0);
    ctx.fillStyle = LEGO.yellow;
    ctx.beginPath();
    ctx.arc(cx - tw / 2 - 4 * s, cy + 22 * s + oy, 4 * s, 0, TAU);
    ctx.arc(cx + tw / 2 + 4 * s, cy + 22 * s + oy, 4 * s, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = LEGO.black;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  drawLegs(ctx, cx, cy, s, legs, color, oy) {
    if (legs === 'skirt') {
      this.drawBrick(ctx, cx - 16 * s, cy + oy, 32 * s, 14 * s, color, 2);
      this.drawBrick(ctx, cx - 10 * s, cy + 12 * s + oy, 8 * s, 14 * s, LEGO.yellow, 0);
      this.drawBrick(ctx, cx + 2 * s, cy + 12 * s + oy, 8 * s, 14 * s, LEGO.yellow, 0);
    } else if (legs === 'pants') {
      this.drawBrick(ctx, cx - 12 * s, cy + oy, 10 * s, 18 * s, color, 0);
      this.drawBrick(ctx, cx + 2 * s, cy + oy, 10 * s, 18 * s, color, 0);
    }
  }

  drawProp(ctx, cx, cy, s, prop, side) {
    const px = cx + side * 38 * s;
    const py = cy + 10 * s;
    ctx.save();
    ctx.translate(px, py);
    switch (prop) {
      case 'truck':
        this.drawBrick(ctx, -14 * s, 0, 28 * s, 12 * s, LEGO.yellow, 2);
        this.drawBrick(ctx, -8 * s, -8 * s, 14 * s, 8 * s, LEGO.blue, 1);
        ctx.fillStyle = LEGO.black;
        ctx.beginPath();
        ctx.arc(-6 * s, 14 * s, 3 * s, 0, TAU);
        ctx.arc(8 * s, 14 * s, 3 * s, 0, TAU);
        ctx.fill();
        break;
      case 'doll':
        this.drawHead(ctx, 0, -8 * s, 0.45 * s, 'long', 0, LEGO.pink);
        this.drawBrick(ctx, -6 * s, 4 * s, 12 * s, 14 * s, LEGO.pink, 1);
        break;
      case 'ball':
        ctx.fillStyle = LEGO.white;
        ctx.strokeStyle = LEGO.black;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 12 * s, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = LEGO.black;
        ctx.beginPath();
        ctx.arc(0, 0, 12 * s, 0.2 * Math.PI, 1.2 * Math.PI);
        ctx.stroke();
        break;
      case 'tutu':
        ctx.fillStyle = LEGO.pink;
        ctx.beginPath();
        ctx.moveTo(-16 * s, 8 * s);
        ctx.lineTo(16 * s, 8 * s);
        ctx.lineTo(22 * s, 20 * s);
        ctx.lineTo(-22 * s, 20 * s);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = LEGO.black;
        ctx.stroke();
        break;
      case 'tie':
        this.drawBrick(ctx, -4 * s, -4 * s, 8 * s, 18 * s, LEGO.red, 0);
        break;
      case 'heart':
        ctx.fillStyle = LEGO.red;
        ctx.font = `bold ${22 * s}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('♥', 0, 8 * s);
        break;
      case 'muscle':
        ctx.font = `bold ${18 * s}px monospace`;
        ctx.fillStyle = LEGO.blue;
        ctx.textAlign = 'center';
        ctx.fillText('💪', 0, 6 * s);
        break;
      case 'sparkle':
        ctx.font = `bold ${18 * s}px monospace`;
        ctx.fillStyle = LEGO.pink;
        ctx.textAlign = 'center';
        ctx.fillText('✦', 0, 6 * s);
        break;
      default:
        break;
    }
    ctx.restore();
  }

  drawFigure(ctx, cx, baseY, s, cfg, local, isGirl) {
    const parts = cfg.torso ? ['torso', 'legs', 'head', 'hair', 'prop'] : [];
    const delays = { torso: 0, legs: 0.08, head: 0.15, hair: 0.22, prop: 0.35 };
    const oy = (part) => this.snapOffset(local, delays[part] || 0);

    if (cfg.torso) {
      this.drawTorso(ctx, cx, baseY - 30 * s, s, cfg.torso, oy('torso'));
    }
    if (cfg.legs) {
      this.drawLegs(ctx, cx, baseY + 4 * s, s, cfg.legs, cfg.torso, oy('legs'));
    }
    if (cfg.torso) {
      this.drawHead(ctx, cx, baseY - 52 * s, s, cfg.hair, oy('head'), isGirl ? '#8b4513' : '#3a2510');
    }
    if (cfg.prop) {
      const po = oy('prop');
      ctx.save();
      ctx.translate(0, po);
      this.drawProp(ctx, cx, baseY, s, cfg.prop, isGirl ? 1 : -1);
      ctx.restore();
    }

    if (cfg.label && local > 0.4) {
      ctx.font = `700 ${11 * s}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = isGirl ? LEGO.pink : LEGO.blue;
      ctx.shadowBlur = 10;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fillText(cfg.label, cx, baseY + 52 * s);
      ctx.shadowBlur = 0;
    }
  }

  drawInstructionFrame(ctx) {
    ctx.fillStyle = '#12121a';
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.strokeStyle = LEGO.white;
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, this.w - 32, this.h - 32);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 12; i++) {
      const y = 80 + i * ((this.h - 160) / 12);
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(this.w - 40, y);
      ctx.stroke();
    }
  }

  drawArrow(ctx, x1, y1, x2, y2) {
    ctx.strokeStyle = LEGO.red;
    ctx.fillStyle = LEGO.red;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 10 * Math.cos(ang - 0.4), y2 - 10 * Math.sin(ang - 0.4));
    ctx.lineTo(x2 - 10 * Math.cos(ang + 0.4), y2 - 10 * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fill();
  }

  drawBinaryGate(ctx, local) {
    const cx = this.w * 0.5;
    const cy = this.h * 0.42;
    const a = ease(local);
    ctx.globalAlpha = a;
    ctx.font = '800 64px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = LEGO.blue;
    ctx.fillText('0', cx - 50, cy);
    ctx.fillStyle = LEGO.pink;
    ctx.fillText('1', cx + 50, cy);
    ctx.font = '500 14px monospace';
    ctx.fillStyle = LEGO.grey;
    ctx.fillText('BINÄR · KEIN DAZWISCHEN', cx, cy + 36);
    ctx.globalAlpha = 1;
  }

  drawHUD(ctx, state) {
    const { step, idx, local } = state;
    ctx.textAlign = 'left';
    ctx.font = '700 14px monospace';
    ctx.fillStyle = LEGO.yellow;
    ctx.shadowBlur = 12;
    ctx.shadowColor = LEGO.yellow;
    ctx.fillText(`◉ LEGO · BINÄR · KLISCHEE`, 32, 48);
    ctx.shadowBlur = 0;

    ctx.font = '800 18px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(`SCHRITT ${step.step} · ${step.title}`, 32, 76);
    ctx.font = '500 12px monospace';
    ctx.fillStyle = '#999';
    ctx.fillText(step.sub, 32, 96);

    ctx.textAlign = 'right';
    ctx.fillStyle = LEGO.grey;
    ctx.font = '11px monospace';
    ctx.fillText(`${Math.floor(state.loop)}s / 72s`, this.w - 32, 48);
    ctx.fillText(NOTE, this.w - 32, 68);

    ctx.textAlign = 'center';
    ctx.font = '700 13px monospace';
    ctx.fillStyle = LEGO.blue;
    ctx.fillText('♂ KLISCHEE · JUNGE', this.w * 0.28, this.h - 52);
    ctx.fillStyle = LEGO.pink;
    ctx.fillText('♀ KLISCHEE · MÄDCHEN', this.w * 0.72, this.h - 52);

    const barW = this.w - 80;
    for (let i = 0; i < STEPS.length; i++) {
      ctx.fillStyle = i === idx ? LEGO.yellow : '#333';
      ctx.fillRect(40 + (i / STEPS.length) * barW, this.h - 28, barW / STEPS.length - 2, 5);
    }
  }

  draw() {
    const ctx = this.ctx;
    const state = sceneAt(this.time);
    const { step, local } = state;

    this.drawInstructionFrame(ctx);

    const baseY = this.h * 0.52;
    const s = Math.min(this.w, this.h) / 520;

    if (step.key === 'start') {
      this.drawBinaryGate(ctx, local);
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(this.w * 0.5, this.h * 0.25);
      ctx.lineTo(this.w * 0.5, this.h * 0.85);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    this.drawFigure(ctx, this.w * 0.28, baseY, s * 1.1, step.boy, local, false);
    this.drawFigure(ctx, this.w * 0.72, baseY, s * 1.1, step.girl, local, true);

    if (step.key !== 'start' && local > 0.5) {
      this.drawArrow(ctx, this.w * 0.38, baseY - 20, this.w * 0.62, baseY - 20);
    }

    if (step.key === 'emotion' && local > 0.75) {
      ctx.globalAlpha = ease((local - 0.75) * 4) * 0.85;
      ctx.font = '700 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = LEGO.yellow;
      ctx.fillText('▣ ALLES NUR BAUSTEINE · KEIN NATURGESETZ ▣', this.w * 0.5, this.h * 0.18);
      ctx.globalAlpha = 1;
    }

    this.drawHUD(ctx, state);
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
    this.time = ((st.idx + 1) % STEPS.length) * 9;
    this.t0 = performance.now() - this.time * 1000;
  }

  saveFrame() {
    this.canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `lego-binary-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}
