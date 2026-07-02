/** Kolonie · Bethy & Jany · Raumschiff · Siedlung · Paradise */
import { NEON, hash, ease, lerp } from './systems.js';
import { drawCat } from './finale.js';
import {
  drawParadiseSky, drawWaterfalls, drawSettlement,
  drawRichGarden, drawParadiseGround,
} from './paradise.js';
import { drawRockCreatureFinale } from './rockCreature.js';

const TAU = Math.PI * 2;

function act(local) {
  if (local < 0.18) return { key: 'build', t: local / 0.18 };
  if (local < 0.34) return { key: 'land', t: (local - 0.18) / 0.16 };
  if (local < 0.58) return { key: 'station', t: (local - 0.34) / 0.24 };
  return { key: 'dance', t: (local - 0.58) / 0.42 };
}

/** Langsameres Tempo · Siedlung · Tanz */
function slowT(t, scale = 0.42) {
  return t * scale;
}

function drawColonyShip(ctx, x, y, prog, t) {
  const p = ease(prog);
  ctx.save();
  ctx.translate(x, y - lerp(40, 0, p));
  ctx.globalAlpha = 0.4 + p * 0.6;

  ctx.strokeStyle = NEON.cyan;
  ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(0,255,255,0.12)';
  ctx.beginPath();
  ctx.moveTo(0, -30 * p);
  ctx.lineTo(-18 * p, 20 * p);
  ctx.lineTo(18 * p, 20 * p);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = NEON.magenta;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('▲', 0, -8 * p);
  ctx.font = '7px monospace';
  ctx.fillStyle = NEON.green;
  ctx.fillText('KOLONIE-SHIP', 0, 32 * p);

  if (p > 0.3) {
    ctx.fillStyle = NEON.orange;
    ctx.font = '8px monospace';
    ctx.fillText('█'.repeat(Math.floor(p * 5)), 0, 18 * p);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawPlanet(ctx, cx, groundY, w, t, grow) {
  const g = ease(grow);
  const r = lerp(50, 90, g);

  const grad = ctx.createRadialGradient(cx - 20, groundY - r * 0.3, 10, cx, groundY, r * 1.2);
  grad.addColorStop(0, '#2244aa');
  grad.addColorStop(0.6, '#113322');
  grad.addColorStop(1, '#0a1a10');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, groundY + r * 0.85, r, Math.PI, TAU);
  ctx.fill();

  ctx.fillStyle = `rgba(0,255,136,${0.15 + g * 0.2})`;
  ctx.fillRect(0, groundY, w, 200);

  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = NEON.green;
  ctx.fillText('PLANET XR-100LY · SÜDHEMISPHÄRE', cx, groundY - r - 12);
}

function drawStation(ctx, cx, groundY, prog, t) {
  const p = ease(prog);
  const w = lerp(20, 100, p);
  const h = lerp(10, 55, p);

  ctx.fillStyle = 'rgba(200,220,255,0.15)';
  ctx.strokeStyle = NEON.cyan;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, groundY - h * 0.3, w * 0.5, h * 0.35, 0, Math.PI, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.strokeRect(cx - w * 0.35, groundY - h, w * 0.7, h * 0.55);
  ctx.fillStyle = 'rgba(0,255,255,0.1)';
  ctx.fillRect(cx - w * 0.35, groundY - h, w * 0.7, h * 0.55);

  ctx.font = '8px monospace';
  ctx.fillStyle = NEON.cyan;
  ctx.textAlign = 'center';
  ctx.fillText('STATION · BETHY♥JANY', cx, groundY - h - 8);

  const treeCount = Math.floor(p * 9) + 2;
  for (let i = 0; i < treeCount; i++) {
    const tx = cx - w * 0.6 + (i / Math.max(1, treeCount - 1)) * w * 1.2;
    const th = lerp(8, 28 + hash(i, 1) * 18, p);
    const sway = Math.sin(t * 1.5 + i) * 3;
    drawTree(ctx, tx + sway, groundY, th, p, i, t);
  }
}

function drawTree(ctx, x, groundY, h, p, i, t) {
  ctx.strokeStyle = '#664422';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, groundY);
  ctx.lineTo(x, groundY - h);
  ctx.stroke();

  const crownR = h * 0.45;
  ctx.fillStyle = `rgba(0,255,136,${0.35 + p * 0.45})`;
  ctx.beginPath();
  ctx.arc(x, groundY - h - crownR * 0.3, crownR, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = NEON.green;
  ctx.lineWidth = 1;
  ctx.stroke();

  if (p > 0.4) {
    const fruits = Math.floor(p * 4) + 1;
    for (let f = 0; f < fruits; f++) {
      const ang = hash(i, f) * TAU + t * 0.2;
      const fr = crownR * 0.55;
      const fx = x + Math.cos(ang) * fr;
      const fy = groundY - h - crownR * 0.3 + Math.sin(ang) * fr * 0.6;
      const col = f % 3 === 0 ? NEON.orange : f % 3 === 1 ? NEON.magenta : NEON.nuclear;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(fx, fy, 3 + hash(f, i) * 2, 0, TAU);
      ctx.fill();
    }
  }
}

function drawDancingCats(ctx, cx, groundY, t, prog, layout) {
  const p = ease(prog);
  const st = slowT(t);
  const mob = layout?.phone;
  const sc = 0.95 * (layout?.phone ? 0.85 : 1);

  const bethyX = cx - (mob ? 45 : 65) + Math.sin(st * 1.6) * 10 * p;
  const janyX = cx + (mob ? 45 : 65) + Math.cos(st * 1.7) * 10 * p;
  const bethyY = groundY - 20 - Math.abs(Math.sin(st * 2.2)) * 14 * p;
  const janyY = groundY - 18 - Math.abs(Math.cos(st * 2.3)) * 12 * p;

  drawCat(ctx, 'Bethy', bethyX, bethyY, sc, NEON.magenta, Math.sin(st * 2.8) * 3, st, false);
  drawCat(ctx, 'Jany', janyX, janyY, sc, NEON.orange, Math.cos(st * 2.8) * 3, st + 1, false);

  const notes = ['♪', '♫', '★', '♥', '✦'];
  for (let i = 0; i < 8; i++) {
    const nx = cx + Math.sin(st * 1.1 + i) * (mob ? 80 : 120);
    const ny = groundY - 60 - i * 8 - Math.sin(st * 1.5 + i * 2) * 12;
    ctx.globalAlpha = p * (0.4 + hash(i, t) * 0.5);
    ctx.font = `${10 + i % 4}px monospace`;
    ctx.fillStyle = i % 2 ? NEON.yellow : NEON.cyan;
    ctx.textAlign = 'center';
    ctx.fillText(notes[i % notes.length], nx, ny);
  }
  ctx.globalAlpha = 1;

  ctx.font = `700 ${mob ? 12 : 16}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = NEON.yellow;
  ctx.shadowBlur = 20;
  ctx.shadowColor = NEON.magenta;
  ctx.fillText('GLÜCKSELIG · TANZ · PARADIES · ♥', cx, groundY - (mob ? 75 : 95));
  ctx.shadowBlur = 0;
}

export function drawColonyPhase(ctx, local, t, w, h, layout = null) {
  const cx = w * 0.5;
  const groundY = h * (layout?.phone ? 0.72 : 0.68);
  const mob = layout?.phone;
  const A = act(local);

  ctx.font = `700 ${mob ? 11 : 14}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = NEON.green;
  ctx.fillText('KOLONIE · KATZEN-ASTRONAUTEN', cx, h * (mob ? 0.08 : 0.09));
  ctx.font = `${mob ? 8 : 10}px monospace`;
  ctx.fillStyle = NEON.cyan;
  const sub = {
    build: 'I · RAUMSCHIFF BAUEN',
    land: 'II · LANDUNG · NEUER PLANET',
    station: 'III · STATION · BÄUME · FRÜCHTE',
    dance: 'IV · GLÜCKSELIG TANZEN',
  }[A.key];
  ctx.fillText(sub, cx, h * (mob ? 0.08 : 0.09) + (mob ? 14 : 18));

  const planetVis = A.key === 'build' ? 0.15 : A.key === 'land' ? ease(A.t) * 0.7 : 1;
  if (planetVis > 0.05) {
    drawPlanet(ctx, cx, groundY, w, t, planetVis);
  }

  if (A.key === 'build') {
    drawColonyShip(ctx, cx - (mob ? 50 : 80), groundY - 10, A.t, t);
    drawColonyShip(ctx, cx + (mob ? 30 : 50), groundY - 5, Math.max(0, A.t - 0.15), t);
    drawCat(ctx, 'Bethy', cx - (mob ? 70 : 110), groundY - 8, 0.85, NEON.magenta, 0, 0, t, false);
    drawCat(ctx, 'Jany', cx + (mob ? 55 : 90), groundY - 6, 0.85, NEON.orange, 0, 1, t, false);
    ctx.font = '9px monospace';
    ctx.fillStyle = NEON.nuclear;
    ctx.fillText('🔧 BAUEN · KOLONIE-SHIP XR-KAT', cx, groundY - (mob ? 55 : 70));
  }

  if (A.key === 'land') {
    const shipY = lerp(h * 0.15, groundY - 45, ease(A.t));
    const shipX = cx + Math.sin(A.t * Math.PI) * 30;
    drawColonyShip(ctx, shipX, shipY, 1, t);
    if (A.t > 0.6) {
      ctx.fillStyle = NEON.orange;
      ctx.globalAlpha = (A.t - 0.6) * 2;
      ctx.font = '12px monospace';
      ctx.fillText('▓▓ LANDUNG ▓▓', shipX, shipY + 40);
      ctx.globalAlpha = 1;
    }
  }

  if (A.key === 'station' || A.key === 'dance') {
    const stProg = A.key === 'station' ? A.t : 1;
    const animT = A.key === 'dance' ? slowT(t) : slowT(t, 0.55);
    if (A.key === 'dance') {
      drawParadiseSky(ctx, w, h, animT);
      drawParadiseGround(ctx, cx, groundY, w, 1);
      drawWaterfalls(ctx, w, groundY, animT, 1);
    }
    drawSettlement(ctx, cx, groundY, stProg);
    drawRichGarden(ctx, cx, groundY, w, animT, stProg, mob);
    if (A.key === 'station') {
      drawCat(ctx, 'Bethy', cx - 40, groundY - 5, 0.8, NEON.magenta, 0, 0, animT, false);
      drawCat(ctx, 'Jany', cx + 40, groundY - 3, 0.8, NEON.orange, 0, 1, animT, false);
      ctx.font = '9px monospace';
      ctx.fillStyle = NEON.green;
      ctx.fillText('🌳 Bäume · 🍊 Früchte · 💧 Wasser', cx, h * (mob ? 0.2 : 0.18));
    }
  }

  if (A.key === 'dance') {
    drawDancingCats(ctx, cx, groundY, slowT(t), A.t, layout);
    drawRockCreatureFinale(ctx, A.t, slowT(t), w, h, layout, 'left');
  }
}

export function isKoloniePhase(key) {
  return key === 'kolonie';
}
