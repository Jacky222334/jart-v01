/** Finale · Bethy + Jany · Fusion · Posturknall */
import { NEON, hash, ease, lerp } from './systems.js';

const TAU = Math.PI * 2;

function storyScale(layout) {
  return layout?.phone ? 0.88 : 1;
}

function storyY(h, layout, ratio = 0.48) {
  return layout?.phone ? h * (ratio + 0.02) : h * ratio;
}

export function drawCat(ctx, name, x, y, sc, col, earTilt, tailWag, t, astronaut = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  ctx.textAlign = 'center';

  if (astronaut) {
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.strokeRect(-24, 12, 48, 32);
    ctx.fillRect(-24, 12, 48, 32);
  }

  const wag = Math.sin(t * 3 + tailWag) * 0.3;
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 18;
  ctx.shadowColor = col;

  ctx.beginPath();
  ctx.moveTo(20, 5);
  ctx.quadraticCurveTo(35 + wag * 10, 15, 30, 30);
  ctx.stroke();

  ctx.fillStyle = col;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.ellipse(0, 8, 28, 22, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(-18, -18 + earTilt);
  ctx.lineTo(-8, -38);
  ctx.lineTo(2, -20);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(18, -18 - earTilt);
  ctx.lineTo(8, -38);
  ctx.lineTo(-2, -20);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-8, -2, 5, 0, TAU);
  ctx.arc(8, -2, 5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(-7, -2, 2.5, 0, TAU);
  ctx.arc(9, -2, 2.5, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = col;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-4, 6);
  ctx.lineTo(0, 10);
  ctx.lineTo(4, 6);
  ctx.stroke();

  if (astronaut) {
    ctx.strokeStyle = NEON.cyan;
    ctx.lineWidth = 1.5;
    ctx.fillStyle = 'rgba(200,220,240,0.12)';
    ctx.beginPath();
    ctx.arc(0, -6, 26, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = NEON.cyan;
    ctx.font = '7px monospace';
    ctx.fillText('HELM', 0, -30);
  }

  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = col;
  ctx.shadowBlur = 12;
  ctx.fillText(name.toUpperCase(), 0, astronaut ? 58 : 38);

  if (astronaut) {
    ctx.font = '7px monospace';
    ctx.fillStyle = NEON.nuclear;
    ctx.fillText('EVA-ANZUG', 0, 36);
    ctx.fillStyle = NEON.green;
    ctx.fillText('O₂ OK', 0, 46);
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

export function drawFusedCat(ctx, x, y, sc, t, local) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc * (1 + local * 0.15), sc * (1 + local * 0.15));
  const pulse = 1 + Math.sin(t * 6) * 0.08;

  for (let i = 0; i < 6; i++) {
    const r = 40 + i * 18 + Math.sin(t * 2 + i) * 8;
    ctx.strokeStyle = i % 2 ? NEON.magenta : NEON.yellow;
    ctx.globalAlpha = (1 - local * 0.3) * (0.4 - i * 0.05);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r * pulse, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  drawCat(ctx, 'Bethy♥Jany', 0, 0, 1.2, NEON.magenta, Math.sin(t) * 3, 0, t);
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = NEON.yellow;
  ctx.textAlign = 'center';
  ctx.shadowBlur = 25;
  ctx.shadowColor = NEON.magenta;
  ctx.fillText('FUSION', 0, -55);
  ctx.shadowBlur = 0;
  ctx.restore();
}

export class PosturBurst {
  constructor(w, h) {
    this.p = [];
    this.w = w;
    this.h = h;
  }

  burst(cx, cy, t, intensity = 1) {
    const chars = '♥◉✦★☆·/posture!'.split('');
    const cols = [NEON.magenta, NEON.cyan, NEON.yellow, NEON.green, NEON.white, NEON.orange];
    for (let i = 0; i < 40 * intensity; i++) {
      const ang = hash(i, t, 1) * TAU;
      const spd = 2 + hash(i, t, 2) * 12 * intensity;
      this.p.push({
        x: cx, y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        ch: chars[i % chars.length],
        color: cols[i % cols.length],
        t,
        life: 0.5 + hash(i, 1, 3) * 1.2,
        rot: hash(i, 2, 4) * TAU,
      });
    }
  }

  tick(t, ctx) {
    this.p = this.p.filter((p) => t - p.t < p.life);
    ctx.textAlign = 'center';
    for (const p of this.p) {
      const age = (t - p.t) / p.life;
      ctx.globalAlpha = 1 - age;
      ctx.fillStyle = p.color;
      ctx.font = `${10 + (1 - age) * 14}px monospace`;
      const px = p.x + p.vx * age * 35;
      const py = p.y + p.vy * age * 35 + age * age * 20;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(p.rot + age * 4);
      ctx.fillText(p.ch, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

export function drawPosturKnall(ctx, local, t, w, h, burst, layout = null) {
  const cx = w * 0.5;
  const cy = h * (layout?.phone ? 0.46 : 0.48);
  const boom = ease(local);
  const mob = layout?.phone;

  if (local > 0.05 && local < 0.15) burst.burst(cx, cy, t, 2);
  if (local > 0.35 && local < 0.45) burst.burst(cx, cy, t, 3);
  if (local > 0.6) burst.burst(cx, cy, t, 1 + local * 2);

  for (let i = 0; i < 12; i++) {
    const r = boom * (80 + i * 40) + Math.sin(t * 3 + i) * 15;
    ctx.strokeStyle = i % 3 === 0 ? NEON.magenta : i % 3 === 1 ? NEON.cyan : NEON.yellow;
    ctx.globalAlpha = (1 - boom * 0.5) * 0.35;
    ctx.lineWidth = 4 - i * 0.2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, t * 0.5 + i, t * 0.5 + i + TAU * 0.6);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.font = `700 ${mob ? 16 : 22}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = NEON.magenta;
  ctx.shadowBlur = 40;
  ctx.shadowColor = NEON.magenta;
  ctx.fillText('POSTURKNALL', cx, h * (mob ? 0.11 : 0.14));
  ctx.font = `600 ${mob ? 10 : 13}px monospace`;
  ctx.fillStyle = NEON.yellow;
  const sub = mob ? 'Bethy · Jany · fusioniert · schön' : 'Bethy · Jany · erreicht · fusioniert · wahnsinnig schön';
  ctx.fillText(sub, cx, h * (mob ? 0.11 : 0.14) + (mob ? 16 : 22));
  ctx.shadowBlur = 0;

  drawFusedCat(ctx, cx, cy, (1.4 + boom * 0.5) * storyScale(layout), t, 0.8);

  ctx.font = `${mob ? 8 : 10}px monospace`;
  ctx.fillStyle = NEON.cyan;
  ctx.fillText('♥ 100 LY · MISSION ERFÜLLT ♥', cx, h * (mob ? 0.78 : 0.82));
}

export function drawReunion(ctx, local, t, w, h, layout = null) {
  const cx = w * 0.5;
  const cy = storyY(h, layout);
  const meet = ease(local);
  const mob = layout?.phone;
  const catSc = 1.1 * storyScale(layout);

  const bethyX = lerp(w * (mob ? 0.12 : 0.18), cx - (mob ? 36 : 50), meet);
  const janyX = lerp(w * (mob ? 0.88 : 0.82), cx + (mob ? 36 : 50), meet);

  ctx.font = `700 ${mob ? 12 : 16}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = NEON.cyan;
  ctx.fillText(mob ? 'ANKUNFT · 100 LY' : 'ANKUNFT · 100 LY · SÜDEN', w * 0.5, h * (mob ? 0.1 : 0.12));
  ctx.font = `${mob ? 9 : 11}px monospace`;
  ctx.fillStyle = NEON.yellow;
  ctx.fillText(mob ? 'Bethy & Jany · Fusion' : 'Bethy und Jany nähern sich · Fusion vorbereitet', w * 0.5, h * (mob ? 0.1 : 0.12) + (mob ? 14 : 18));

  drawCat(ctx, 'Bethy', bethyX, cy, catSc, NEON.magenta, Math.sin(t * 2) * 2, 0, t);
  drawCat(ctx, 'Jany', janyX, cy, catSc, NEON.orange, Math.cos(t * 2) * 2, 1.5, t);

  if (meet > 0.7) {
    ctx.strokeStyle = NEON.yellow;
    ctx.globalAlpha = (meet - 0.7) * 3;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bethyX + 30, cy);
    ctx.lineTo(janyX - 30, cy);
    ctx.stroke();
    ctx.font = '20px monospace';
    ctx.fillStyle = NEON.magenta;
    ctx.fillText('♥', cx, cy - 30);
    ctx.globalAlpha = 1;
  }
}

export function drawFusionPhase(ctx, local, t, w, h, layout = null) {
  const cx = w * 0.5;
  const cy = storyY(h, layout);
  const mob = layout?.phone;
  const catSc = 1.1 * storyScale(layout);

  ctx.font = `700 ${mob ? 14 : 18}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = NEON.magenta;
  ctx.shadowBlur = 20;
  ctx.shadowColor = NEON.magenta;
  ctx.fillText('FUSION · BETHY + JANY', cx, h * (mob ? 0.1 : 0.12));
  ctx.shadowBlur = 0;

  const merge = ease(local);
  const spread = mob ? 56 : 80;
  if (merge < 0.5) {
    const half = merge * 2;
    drawCat(ctx, 'Bethy', cx - lerp(spread, mob ? 16 : 20, half), cy, catSc, NEON.magenta, 0, 0, t);
    drawCat(ctx, 'Jany', cx + lerp(spread, mob ? 16 : 20, half), cy, catSc, NEON.orange, 0, 1, t);
  } else {
    drawFusedCat(ctx, cx, cy, lerp(1, 1.3, (merge - 0.5) * 2) * storyScale(layout), t, (merge - 0.5) * 2);
  }
}

export function drawIntroPresentation(ctx, local, t, w, h, layout = null) {
  const cx = w * 0.5;
  const mob = layout?.phone;
  const titleIn = ease(Math.min(1, local / 0.25));
  const catsIn = ease(Math.max(0, Math.min(1, (local - 0.15) / 0.35)));
  const ready = ease(Math.max(0, Math.min(1, (local - 0.65) / 0.35)));
  const catSc = 1.15 * storyScale(layout);

  ctx.font = `700 ${mob ? 15 : 20}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = NEON.cyan;
  ctx.globalAlpha = titleIn;
  ctx.shadowBlur = 24;
  ctx.shadowColor = NEON.cyan;
  ctx.fillText('MISSION 100 LY', cx, h * (mob ? 0.08 : 0.1));
  ctx.font = `600 ${mob ? 9 : 12}px monospace`;
  ctx.fillStyle = NEON.yellow;
  ctx.fillText(mob ? 'BETHY & JANY · ASTRONAUTEN' : 'CREW · BETHY & JANY · KATZEN-ASTRONAUTEN', cx, h * (mob ? 0.08 : 0.1) + (mob ? 16 : 22));
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  const bethyX = lerp(w * (mob ? 0.18 : 0.22), w * (mob ? 0.28 : 0.32), catsIn);
  const janyX = lerp(w * (mob ? 0.82 : 0.78), w * (mob ? 0.72 : 0.68), catsIn);
  const cy = storyY(h, layout);
  const bob = Math.sin(t * 2) * (mob ? 4 : 6);

  ctx.globalAlpha = catsIn;
  drawCat(ctx, 'Bethy', bethyX, cy + bob, catSc, NEON.magenta, Math.sin(t * 1.5) * 2, 0, t, true);
  drawCat(ctx, 'Jany', janyX, cy - bob * 0.5, catSc, NEON.orange, Math.cos(t * 1.5) * 2, 1.2, t, true);
  ctx.globalAlpha = 1;

  if (catsIn > 0.5) {
    ctx.font = `${mob ? 8 : 10}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = NEON.magenta;
    ctx.fillText(mob ? 'Kommandantin' : 'Kommandantin · Navigation', bethyX, cy + (mob ? 64 : 78));
    ctx.fillStyle = NEON.orange;
    ctx.fillText(mob ? 'Pilot' : 'Pilot · Antrieb', janyX, cy + (mob ? 64 : 78));
  }

  ctx.font = `700 ${mob ? 11 : 14}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = NEON.green;
  ctx.globalAlpha = ready;
  ctx.shadowBlur = 18;
  ctx.shadowColor = NEON.green;
  ctx.fillText('▶ START SEQUENCE', cx, h * (mob ? 0.76 : 0.82));
  ctx.font = `${mob ? 8 : 10}px monospace`;
  ctx.fillStyle = NEON.cyan;
  ctx.fillText(mob ? '8 Antriebe · 100 LY · Süden' : '8 Antriebe · 100 Lichtjahre · Süden', cx, h * (mob ? 0.76 : 0.82) + (mob ? 14 : 20));
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

export function isIntroPhase(key) {
  return key === 'intro';
}

export function isFinalePhase(key) {
  return ['reunion', 'fusion', 'posturknall'].includes(key);
}

export function isStoryPhase(key) {
  return isIntroPhase(key) || isFinalePhase(key) || key === 'hailmary' || key === 'relativ' || key === 'kolonie';
}
