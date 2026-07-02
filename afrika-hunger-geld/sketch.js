import {
  MUSK, NEEDS, NEON, activeNeed, fmtUsd, ratio, yearsFunded, DISCLAIMER,
} from './data.js';

function lerp(a, b, t) {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

function ease(t) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export class HungerGeldSim {
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
    this.barX = this.w * 0.12;
    this.barW = this.w * 0.76;
    this.barTop = this.h * 0.28;
    this.barH = this.h * 0.42;
  }

  drawGrid(ctx) {
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = this.barTop + (i / 5) * this.barH;
      ctx.beginPath();
      ctx.moveTo(this.barX, y);
      ctx.lineTo(this.barX + this.barW, y);
      ctx.stroke();
    }
  }

  drawBar(ctx, x, y, w, h, color, alpha, label, glow) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowBlur = glow ? 24 : 0;
    ctx.shadowColor = color;
    ctx.fillRect(x, y, w, h);
    if (h > 14) {
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = alpha * 0.9;
      ctx.font = '600 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(label, x + 8, y + 14);
    }
    ctx.restore();
  }

  drawComparison(ctx, state) {
    const { need, local } = state;
    const musk = MUSK.netWorthUsd;
    const mult = ratio(musk, need.usd);
    const years = yearsFunded(musk, need.usd);
    const anim = ease(Math.min(1, local * 1.4));
    const logMax = Math.log10(musk);
    const logNeed = Math.log10(need.usd);
    const logMusk = Math.log10(musk);

    const needH = (logNeed / logMax) * this.barH * anim;
    const muskH = this.barH * anim;
    const baseY = this.barTop + this.barH;
    const gap = this.barW * 0.08;
    const bw = (this.barW - gap) / 2;
    const leftX = this.barX;
    const rightX = this.barX + bw + gap;

    this.drawGrid(ctx);

    this.drawBar(
      ctx, leftX, baseY - needH, bw, needH, need.color, 0.95,
      need.display, true,
    );
    this.drawBar(
      ctx, rightX, baseY - muskH, bw, muskH, '#aa88ff', 0.85,
      MUSK.display, false,
    );

    ctx.font = '700 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = need.color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = need.color;
    ctx.fillText(need.label, leftX + bw / 2, baseY + 28);
    ctx.fillStyle = '#aa88ff';
    ctx.shadowColor = '#aa88ff';
    ctx.fillText('ELON MUSK', rightX + bw / 2, baseY + 28);
    ctx.shadowBlur = 0;

    const multAnim = lerp(0, mult, ease(Math.max(0, (local - 0.25) * 1.5)));
    const cx = this.w * 0.5;
    const cy = this.h * 0.58;

    ctx.textAlign = 'center';
    ctx.font = '800 72px monospace';
    ctx.fillStyle = NEON[1];
    ctx.shadowBlur = 40;
    ctx.shadowColor = NEON[1];
    ctx.fillText(`×${multAnim.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`, cx, cy);
    ctx.shadowBlur = 0;

    ctx.font = '500 14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Musks Vermögen ÷ Hilfsbedarf', cx, cy + 28);

    const isYearly = need.id.includes('hunger');
    ctx.font = '700 22px monospace';
    ctx.fillStyle = NEON[0];
    ctx.shadowBlur = 16;
    ctx.shadowColor = NEON[0];
    if (isYearly) {
      ctx.fillText(
        `≈ ${yearsFunded(musk, need.usd).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Jahre finanzierbar`,
        cx,
        cy + 62,
      );
    } else {
      ctx.fillText(
        `≈ ${Math.floor(years).toLocaleString('de-DE')} Jahre WFP-Niveau finanzierbar`,
        cx,
        cy + 62,
      );
    }
    ctx.shadowBlur = 0;

    ctx.font = '500 12px monospace';
    ctx.fillStyle = '#666';
    ctx.fillText(need.sub, cx, cy + 88);
  }

  drawMiniBars(ctx, state) {
    const y0 = this.h - 72;
    const w = this.w - 48;
    const x0 = 24;
    for (let i = 0; i < NEEDS.length; i++) {
      const n = NEEDS[i];
      const seg = w / NEEDS.length;
      const on = i === state.idx;
      ctx.fillStyle = on ? n.color : '#222';
      ctx.globalAlpha = on ? 1 : 0.45;
      ctx.fillRect(x0 + i * seg + 2, y0, seg - 4, 6);
      ctx.globalAlpha = 1;
      ctx.font = '8px monospace';
      ctx.fillStyle = on ? '#fff' : '#444';
      ctx.textAlign = 'center';
      const short = n.id === 'wfp-afrika' ? 'WFP·AF'
        : n.id === 'wfp-global' ? 'WFP'
          : n.id === 'fao-notfall' ? 'FAO'
            : n.id === 'hunger-min' ? 'MIN'
              : 'VOLL';
      ctx.fillText(short, x0 + i * seg + seg / 2, y0 + 18);
    }
  }

  drawHUD(ctx, state) {
    const { need, local } = state;
    ctx.textAlign = 'left';
    ctx.font = '700 15px monospace';
    ctx.fillStyle = NEON[2];
    ctx.shadowBlur = 14;
    ctx.shadowColor = NEON[2];
    ctx.fillText('◉ HUNGER · AFRIKA · GELD', 22, 34);
    ctx.shadowBlur = 0;

    ctx.font = '500 11px monospace';
    ctx.fillStyle = '#777';
    ctx.fillText('Was kostet Hilfe — und was hat Musk?', 22, 54);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#aa88ff';
    ctx.fillText(`${MUSK.display} · ${MUSK.source}`, this.w - 22, 34);
    ctx.fillStyle = '#555';
    ctx.font = '10px monospace';
    ctx.fillText(MUSK.note, this.w - 22, 52);
    ctx.fillStyle = need.color;
    ctx.font = '11px monospace';
    ctx.fillText(`${need.display} · ${need.source}`, this.w - 22, 72);

    ctx.textAlign = 'left';
    ctx.font = '9px monospace';
    ctx.fillStyle = '#444';
    ctx.fillText(DISCLAIMER, 22, this.h - 18);

    const prog = (state.idx * 9 + local * 9) / (NEEDS.length * 9);
    ctx.fillStyle = '#333';
    ctx.fillRect(22, this.h - 38, this.w - 44, 3);
    ctx.fillStyle = need.color;
    ctx.fillRect(22, this.h - 38, (this.w - 44) * prog, 3);
  }

  draw() {
    const ctx = this.ctx;
    const state = activeNeed(this.time);

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.w, this.h);

    this.drawComparison(ctx, state);
    this.drawMiniBars(ctx, state);
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

  nextSlide() {
    const st = activeNeed(this.time);
    this.time = (st.idx + 1) * 9;
    this.t0 = performance.now() - this.time * 1000;
  }

  saveFrame() {
    this.canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `afrika-hunger-geld-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}
