/** Kosmos · Relativitätstheorie · Schwarze Löcher · Abkürzung durch Quantenvakuum */
import { NEON, hash, ease, lerp } from './systems.js';

const TAU = Math.PI * 2;

function act(local) {
  if (local < 0.34) return { key: 'srt', t: local / 0.34 };
  if (local < 0.68) return { key: 'bh', t: (local - 0.34) / 0.34 };
  return { key: 'worm', t: (local - 0.68) / 0.32 };
}

function drawSpacetimeGrid(ctx, cx, cy, t, w, h, warp, mob) {
  const cols = mob ? 14 : 22;
  const rows = mob ? 10 : 14;
  const gw = w * 0.72;
  const gh = h * 0.38;
  const x0 = cx - gw / 2;
  const y0 = cy - gh / 2 + h * 0.04;

  const wells = [
    { x: cx - gw * 0.22, y: cy + h * 0.02, m: 1.2 },
    { x: cx + gw * 0.18, y: cy + h * 0.04, m: 0.9 },
  ];

  ctx.strokeStyle = 'rgba(0,255,255,0.22)';
  ctx.lineWidth = 1;

  for (let i = 0; i <= cols; i++) {
    ctx.beginPath();
    for (let j = 0; j <= rows; j++) {
      const bx = x0 + (i / cols) * gw;
      const by = y0 + (j / rows) * gh;
      let dz = 0;
      for (const well of wells) {
        const dx = bx - well.x;
        const dy = by - well.y;
        const d2 = dx * dx + dy * dy + 800;
        dz -= (well.m * 9000 * warp) / d2;
      }
      dz += Math.sin(t * 0.8 + i * 0.3) * 4 * warp;
      const px = bx;
      const py = by + dz * 0.018;
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  for (let j = 0; j <= rows; j++) {
    ctx.beginPath();
    for (let i = 0; i <= cols; i++) {
      const bx = x0 + (i / cols) * gw;
      const by = y0 + (j / rows) * gh;
      let dz = 0;
      for (const well of wells) {
        const dx = bx - well.x;
        const dy = by - well.y;
        const d2 = dx * dx + dy * dy + 800;
        dz -= (well.m * 9000 * warp) / d2;
      }
      const px = bx;
      const py = by + dz * 0.018;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
}

function drawLightBend(ctx, cx, cy, t, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = NEON.yellow;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 12;
  ctx.shadowColor = NEON.yellow;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    const y0 = cy - 80 + i * 35;
    ctx.moveTo(cx - 200, y0);
    ctx.quadraticCurveTo(cx - 20, y0 + 40 + Math.sin(t + i) * 8, cx + 30, y0 + 15);
    ctx.quadraticCurveTo(cx + 80, y0 - 10, cx + 220, y0 + 5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBlackHole(ctx, cx, cy, t, local, mob) {
  const r = Math.min(mob ? 28 : 38, Math.min(cx, cy) * 0.12) * (0.85 + local * 0.15);
  const spin = t * 0.4;

  for (let i = 8; i >= 0; i--) {
    const ar = r * (2.2 + i * 0.35);
    ctx.strokeStyle = i % 2 ? NEON.orange : NEON.nuclear;
    ctx.globalAlpha = 0.08 + i * 0.03;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, ar, ar * 0.28, spin + i * 0.1, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const diskGrad = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 3.5);
  diskGrad.addColorStop(0, 'rgba(255,100,0,0)');
  diskGrad.addColorStop(0.35, 'rgba(255,80,0,0.55)');
  diskGrad.addColorStop(0.6, 'rgba(255,200,50,0.25)');
  diskGrad.addColorStop(1, 'rgba(255,50,0,0)');
  ctx.fillStyle = diskGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 3.2, r * 0.9, spin * 0.3, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#000008';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = NEON.white;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.5, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.font = `${mob ? 7 : 9}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = NEON.cyan;
  ctx.fillText('EREIGNISHORIZONT · Rs', cx, cy - r - (mob ? 14 : 18));
  ctx.fillStyle = NEON.yellow;
  ctx.fillText('PHOTONENSphäre · 1,5 Rs', cx, cy + r + (mob ? 22 : 28));

  for (let i = 0; i < 12; i++) {
    const ang = hash(i, 1) * TAU + t * 0.6;
    const dist = r * (1.8 + hash(i, 2) * 2.5);
    ctx.globalAlpha = 0.4 + hash(i, 3) * 0.5;
    ctx.fillStyle = hash(i, 4) > 0.5 ? NEON.orange : '#fff';
    ctx.fillRect(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist * 0.35, 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawWormhole(ctx, cx, cy, t, local, w, mob) {
  const open = ease(Math.min(1, local / 0.45));
  const mouth = Math.min(w * 0.14, 55) * open;
  const mouthX = mob ? 90 : 130;

  ctx.save();
  ctx.translate(cx, cy);

  for (let side = -1; side <= 1; side += 2) {
    const sxPos = side * mouthX * open;
    ctx.strokeStyle = side < 0 ? NEON.quantum : NEON.cyan;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.35 * open;
    for (let ring = 0; ring < 6; ring++) {
      const rr = mouth + ring * 12;
      ctx.beginPath();
      ctx.ellipse(sxPos, 0, rr, rr * 0.55, t * 0.2 * side, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = NEON.magenta;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 20;
  ctx.shadowColor = NEON.magenta;
  ctx.beginPath();
  for (let u = 0; u <= 40; u++) {
    const p = u / 40;
    const x = lerp(-mouthX, mouthX, p) * open;
    const y = Math.sin(p * Math.PI) * mouth * 0.5 * (1 + Math.sin(t * 2 + p * 6) * 0.08);
    if (u === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.beginPath();
  for (let u = 0; u <= 40; u++) {
    const p = u / 40;
    const x = lerp(-mouthX, mouthX, p) * open;
    const y = -Math.sin(p * Math.PI) * mouth * 0.5;
    if (u === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.font = `${mob ? 8 : 10}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = NEON.quantum;
  ctx.fillText('QUANTENVAKUUM', -mouthX * open, -mouth - 20);
  ctx.fillStyle = NEON.cyan;
  ctx.fillText('RAUMZEIT', mouthX * open, -mouth - 20);
  ctx.fillStyle = NEON.green;
  ctx.fillText('ABKÜRZUNG · 100 LY → 1 SPRUNG', 0, mouth + (mob ? 28 : 36));

  for (let i = 0; i < 20; i++) {
    const p = (hash(i, t) + t * 0.15) % 1;
    const x = lerp(-mouthX * 0.92, mouthX * 0.92, p) * open;
    const y = Math.sin(p * Math.PI) * 8 * (hash(i, 2) > 0.5 ? 1 : -1);
    ctx.fillStyle = NEON.white;
    ctx.globalAlpha = 0.5;
    ctx.fillText('·', x, y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawRelativHUD(ctx, cx, y, actKey, actT, t, mob) {
  const lines = {
    srt: [
      ['SPEZIELLE RELATIVITÄT', 'Lorentz · γ · Raumzeit'],
      [`γ = 1/√(1−v²/c²)`, `Δt′ = γ · Δt · ${(1 + actT * 4).toFixed(2)}`],
      ['LÄNGENKONTRAKTION', `L′ = L/γ · Licht krümmt sich`],
    ],
    bh: [
      ['ALLGEMEINE RELATIVITÄT', 'Einstein · gμν · Krümmung'],
      ['SCHWARZES LOCH', `Rs = 2GM/c² · Spin ${(t * 0.3 % 1).toFixed(2)}`],
      ['ZEITDILATATION ∞', 'Am Horizont · Information paradox?'],
    ],
    worm: [
      ['QUANTENVAKUUM · CASIMIR', 'Fluktuation · negative Energie'],
      ['WURMLOCH · ER-Rosen', 'Abkürzung durch Raumzeit-Falte'],
      ['100 LY → 1 TRANSIT', 'Stabilität · Exotische Materie nötig'],
    ],
  };
  const block = lines[actKey];
  const idx = Math.min(2, Math.floor(actT * 3.01));

  ctx.font = `700 ${mob ? 9 : 11}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = actKey === 'bh' ? NEON.orange : actKey === 'worm' ? NEON.quantum : NEON.cyan;
  ctx.shadowBlur = 14;
  ctx.shadowColor = ctx.fillStyle;
  ctx.fillText(block[idx][0], cx, y);
  ctx.font = `${mob ? 8 : 10}px monospace`;
  ctx.fillStyle = NEON.yellow;
  ctx.fillText(block[idx][1], cx, y + (mob ? 14 : 18));
  ctx.shadowBlur = 0;
}

export function drawRelativCosmos(ctx, local, t, w, h, layout = null) {
  const cx = w * 0.5;
  const cy = h * (layout?.phone ? 0.42 : 0.44);
  const mob = layout?.phone;
  const A = act(local);
  const fadeIn = ease(Math.min(1, local * 4));
  const cross = A.key === 'srt' ? 1
    : A.key === 'bh' ? ease(A.t) * (1 - ease(Math.max(0, (A.t - 0.85) / 0.15)))
      : ease(A.t);

  ctx.font = `700 ${mob ? 11 : 14}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = NEON.cyan;
  ctx.globalAlpha = fadeIn;
  ctx.fillText('KOSMOS · RELATIVITÄTSTHEORIE', cx, h * (mob ? 0.07 : 0.08));
  ctx.font = `${mob ? 8 : 10}px monospace`;
  ctx.fillStyle = NEON.quantum;
  const actLabel = A.key === 'srt' ? 'I · GEKRÜMMTE RAUMZEIT'
    : A.key === 'bh' ? 'II · SCHWARZE LÖCHER'
      : 'III · ABKÜRZUNG · QUANTENVAKUUM';
  ctx.fillText(actLabel, cx, h * (mob ? 0.07 : 0.08) + (mob ? 14 : 18));
  ctx.globalAlpha = 1;

  if (A.key === 'srt' || A.key === 'bh') {
    const warp = A.key === 'bh' ? lerp(0.6, 1.4, A.t) : 0.5 + A.t * 0.8;
    drawSpacetimeGrid(ctx, cx, cy, t, w, h, warp * cross, mob);
    drawLightBend(ctx, cx, cy - h * 0.06, t, cross * 0.7);
  }

  if (A.key === 'bh') {
    ctx.globalAlpha = cross;
    drawBlackHole(ctx, cx, cy + h * 0.02, t, A.t, mob);
    ctx.globalAlpha = 1;
  }

  if (A.key === 'worm') {
    drawSpacetimeGrid(ctx, cx, cy, t, w, h, 0.3, mob);
    drawWormhole(ctx, cx, cy, t, A.t, w, mob);
  }

  drawRelativHUD(ctx, cx, h * (mob ? 0.78 : 0.82), A.key, A.t, t, mob);

  ctx.font = `${mob ? 7 : 9}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#445';
  ctx.fillText('E=mc² · gμν · Hawking · Einstein-Rosen · zwischen den Antrieben', cx, h * (mob ? 0.9 : 0.92));
}

export function isRelativPhase(key) {
  return key === 'relativ';
}

export function isCosmosPhase(key) {
  return key === 'relativ';
}
