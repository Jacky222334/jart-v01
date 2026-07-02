/** Paradise · Siedlung · Früchte · Wasserfälle · Happy End */
import { NEON, hash, ease, lerp } from './systems.js';
import { drawCat, drawFusedCat } from './finale.js';

const TAU = Math.PI * 2;
const FRUIT_COLS = [NEON.orange, NEON.magenta, NEON.nuclear, NEON.yellow, '#ff4466', '#88ff44'];

export function drawParadiseSky(ctx, w, h, t) {
  const g = ctx.createLinearGradient(0, 0, 0, h * 0.7);
  g.addColorStop(0, '#000828');
  g.addColorStop(0.35, '#0a1844');
  g.addColorStop(0.65, '#1a3355');
  g.addColorStop(1, '#0d2818');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.font = '8px monospace';
  for (let i = 0; i < 60; i++) {
    const x = hash(i, 0) * w;
    const y = hash(0, i) * h * 0.45;
    ctx.globalAlpha = 0.3 + hash(i, 1) * 0.6;
    ctx.fillStyle = hash(i, 2) > 0.7 ? NEON.yellow : '#fff';
    ctx.fillText('·', x, y);
  }
  ctx.globalAlpha = 1;

  const sunX = w * 0.78;
  const sunY = h * 0.14;
  const pulse = 1 + Math.sin(t * 0.8) * 0.06;
  for (let i = 4; i >= 0; i--) {
    ctx.fillStyle = `rgba(255,238,136,${0.06 + i * 0.04})`;
    ctx.beginPath();
    ctx.arc(sunX, sunY, (28 + i * 14) * pulse, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = NEON.yellow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 14 * pulse, 0, TAU);
  ctx.fill();
}

export function drawParadiseGround(ctx, cx, groundY, w, richness) {
  const r = lerp(70, 110, ease(richness));
  const grad = ctx.createRadialGradient(cx, groundY - 20, 10, cx, groundY, r * 1.3);
  grad.addColorStop(0, '#2a6644');
  grad.addColorStop(0.5, '#1a4428');
  grad.addColorStop(1, '#0a2818');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, groundY + r * 0.7, r, Math.PI, TAU);
  ctx.fill();

  ctx.fillStyle = `rgba(0,255,136,${0.2 + richness * 0.25})`;
  ctx.fillRect(0, groundY, w, 120);

  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = NEON.green;
  ctx.fillText('PLANET PARADIES · BETHY♥JANY · SIEDLUNG', cx, groundY - r - 8);
}

function h120() { return 120; }

export function drawWaterfalls(ctx, w, groundY, t, intensity) {
  const falls = [
    { x: w * 0.14, h: 0.55, w: 12 },
    { x: w * 0.86, h: 0.48, w: 10 },
    { x: w * 0.38, h: 0.35, w: 8 },
    { x: w * 0.62, h: 0.42, w: 9 },
  ];
  const p = ease(intensity);

  falls.forEach((f, i) => {
    const top = groundY - w * f.h * p;
    const x = f.x;
    const fw = f.w;

    ctx.fillStyle = 'rgba(60,80,60,0.5)';
    ctx.fillRect(x - fw, top - 20, fw * 2, 18);

    ctx.fillStyle = `rgba(100,180,255,${0.35 + p * 0.35})`;
    ctx.fillRect(x - fw * 0.6, top, fw * 1.2, groundY - top);

    for (let d = 0; d < 6; d++) {
      const dy = top + ((t * 80 + d * 25 + i * 40) % (groundY - top));
      ctx.globalAlpha = 0.4 + hash(d, i) * 0.4;
      ctx.fillStyle = NEON.cyan;
      ctx.fillRect(x - 1 + Math.sin(t * 3 + d) * 2, dy, 2, 6);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(150,220,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, groundY + 4, fw * 2.5, 8, 0, 0, TAU);
    ctx.fill();

    if (p > 0.5) {
      ctx.font = '7px monospace';
      ctx.fillStyle = NEON.cyan;
      ctx.textAlign = 'center';
      ctx.fillText('💧', x, top - 8);
    }
  });
}

export function drawRichGarden(ctx, cx, groundY, w, t, richness, mob) {
  const p = ease(richness);
  const half = mob ? w * 0.38 : w * 0.44;
  const treeCount = Math.floor(lerp(4, 16, p));

  for (let i = 0; i < treeCount; i++) {
    const tx = cx - half + (i / Math.max(1, treeCount - 1)) * half * 2;
    const th = lerp(14, 38 + hash(i, 3) * 22, p);
    const sway = Math.sin(t * 1.2 + i * 0.7) * 4;
    drawParadiseTree(ctx, tx + sway, groundY, th, p, i, t, true);
  }
}

function drawParadiseTree(ctx, x, groundY, h, p, i, t, lush) {
  ctx.strokeStyle = '#5a3a22';
  ctx.lineWidth = 2 + (lush ? 1 : 0);
  ctx.beginPath();
  ctx.moveTo(x, groundY);
  ctx.lineTo(x, groundY - h);
  ctx.stroke();

  const crowns = lush ? 2 : 1;
  for (let c = 0; c < crowns; c++) {
    const cy = groundY - h - h * 0.25 * c;
    const cr = h * (0.38 - c * 0.08);
    ctx.fillStyle = `rgba(0,255,136,${0.4 + p * 0.45})`;
    ctx.beginPath();
    ctx.arc(x, cy, cr, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = NEON.green;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const fruitN = lush ? Math.floor(lerp(2, 8, p)) : Math.floor(p * 4) + 1;
  for (let f = 0; f < fruitN; f++) {
    const ang = hash(i, f * 2) * TAU + t * 0.15;
    const fr = h * 0.35;
    const fx = x + Math.cos(ang) * fr;
    const fy = groundY - h * 0.7 + Math.sin(ang) * fr * 0.5;
    ctx.fillStyle = FRUIT_COLS[(i + f) % FRUIT_COLS.length];
    ctx.beginPath();
    ctx.arc(fx, fy, 3 + hash(f, i) * 2.5, 0, TAU);
    ctx.fill();
    if (lush && f % 3 === 0) {
      ctx.font = '7px monospace';
      ctx.fillStyle = NEON.yellow;
      ctx.fillText('🍊', fx, fy - 5);
    }
  }
}

export function drawSettlement(ctx, cx, groundY, p) {
  const w = lerp(30, 120, ease(p));
  const h = lerp(15, 60, ease(p));

  ctx.fillStyle = 'rgba(200,230,255,0.2)';
  ctx.strokeStyle = NEON.cyan;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, groundY - h * 0.35, w * 0.55, h * 0.4, 0, Math.PI, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(cx - w * 0.4, groundY - h, w * 0.8, h * 0.6);
  ctx.fillStyle = 'rgba(0,255,255,0.12)';
  ctx.fillRect(cx - w * 0.4, groundY - h, w * 0.8, h * 0.6);

  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = NEON.cyan;
  ctx.fillText('STATION · OBSTGART · TRINKWASSER', cx, groundY - h - 10);
}

export function drawParadiseScene(ctx, local, t, w, h, layout, { fused = false, title = 'HAPPY END' } = {}) {
  const mob = layout?.phone;
  const cx = w * 0.5;
  const groundY = h * (mob ? 0.7 : 0.66);
  const rich = ease(local);

  drawParadiseSky(ctx, w, h, t);
  drawParadiseGround(ctx, cx, groundY, w, rich);
  drawWaterfalls(ctx, w, groundY, t, rich);
  drawSettlement(ctx, cx, groundY, rich);
  drawRichGarden(ctx, cx, groundY, w, t, rich, mob);

  const bethyX = cx - (mob ? 50 : 75) + Math.sin(t * 2.5) * 10;
  const janyX = cx + (mob ? 50 : 75) + Math.cos(t * 2.8) * 10;
  const catY = groundY - 15 - Math.abs(Math.sin(t * 3.5)) * 12;

  if (fused) {
    drawFusedCat(ctx, cx, catY - 10, 1.15, t, 0.9);
  } else {
    drawCat(ctx, 'Bethy', bethyX, catY, 0.95, NEON.magenta, Math.sin(t * 4) * 3, t, false);
    drawCat(ctx, 'Jany', janyX, catY, 0.95, NEON.orange, Math.cos(t * 4) * 3, t + 1, false);
  }

  for (let i = 0; i < 12; i++) {
    ctx.globalAlpha = 0.35 + hash(i, t) * 0.4;
    ctx.font = `${9 + i % 5}px monospace`;
    ctx.fillStyle = i % 2 ? NEON.yellow : NEON.magenta;
    ctx.textAlign = 'center';
    ctx.fillText(['♪', '♥', '🍎', '✦', '♫'][i % 5],
      cx + Math.sin(t * 1.5 + i) * (mob ? 90 : 140),
      groundY - 50 - i * 6 - Math.sin(t * 2 + i) * 10);
  }
  ctx.globalAlpha = 1;

  ctx.font = `700 ${mob ? 14 : 20}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = NEON.yellow;
  ctx.shadowBlur = 24;
  ctx.shadowColor = NEON.green;
  ctx.fillText(title, cx, h * (mob ? 0.09 : 0.1));
  ctx.font = `${mob ? 9 : 12}px monospace`;
  ctx.fillStyle = NEON.green;
  ctx.fillText('SIEDLUNG · FRÜCHTE · WASSERFÄLLE · GLÜCK', cx, h * (mob ? 0.09 : 0.1) + (mob ? 16 : 22));
  ctx.shadowBlur = 0;

  ctx.font = `${mob ? 10 : 13}px monospace`;
  ctx.fillStyle = NEON.cyan;
  ctx.fillText('♥ 100 LY · MISSION ERFÜLLT · FÜR IMMER ♥', cx, h * (mob ? 0.9 : 0.88));
  ctx.fillStyle = NEON.magenta;
  ctx.font = `${mob ? 8 : 10}px monospace`;
  ctx.fillText('Bethy · Jany · zu Hause · Happy End', cx, h * (mob ? 0.9 : 0.88) + (mob ? 14 : 18));
}

export function drawHappyEnd(ctx, local, t, w, h, layout) {
  drawParadiseScene(ctx, local, t, w, h, layout, { fused: true, title: 'HAPPY END · PARADIES' });
}
