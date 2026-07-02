/** Fels-Wesen · Korg-artig · bewegend · Daumen runter */
import { NEON, hash, ease, lerp } from './systems.js';

const TAU = Math.PI * 2;
const ROCK = ['#9a7b4f', '#7a5c38', '#b8956a', '#5c4528', '#c4a574'];
const ROCK_EDGE = '#3d2e1a';

function rockSlab(ctx, x, y, w, h, rot, col, crack = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = col;
  ctx.strokeStyle = ROCK_EDGE;
  ctx.lineWidth = 1.5;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  if (crack) {
    ctx.strokeStyle = 'rgba(30,20,10,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w * 0.2, -h * 0.3);
    ctx.lineTo(w * 0.1, h * 0.1);
    ctx.lineTo(-w * 0.05, h * 0.35);
    ctx.stroke();
  }
  ctx.restore();
}

/** Animiertes Fels-Wesen · Daumen runter-Geste */
export function drawRockCreature(ctx, x, y, sc, t, {
  alpha = 1,
  thumbsDown = true,
  label = 'FELS-WESEN · GAST',
} = {}) {
  if (alpha <= 0) return;

  const breathe = 1 + Math.sin(t * 1.6) * 0.035;
  const sway = Math.sin(t * 1.1) * 0.06;
  const bob = Math.sin(t * 2) * 3 * sc;
  const s = sc * breathe;

  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(sway);
  ctx.scale(s, s);
  ctx.globalAlpha = alpha;

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 52, 38, 10, 0, 0, TAU);
  ctx.fill();

  const legShift = Math.sin(t * 1.4) * 2;
  rockSlab(ctx, -16 + legShift, 38, 14, 22, 0.08, ROCK[2], true);
  rockSlab(ctx, 16 - legShift, 38, 14, 22, -0.08, ROCK[1], true);

  rockSlab(ctx, -8, 8, 28, 34, 0.05, ROCK[0], true);
  rockSlab(ctx, 10, 4, 24, 30, -0.12, ROCK[3], true);
  rockSlab(ctx, 0, -6, 36, 28, 0, ROCK[4], true);

  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * TAU - Math.PI / 2;
    const px = Math.cos(ang) * 30;
    const py = Math.sin(ang) * 22 - 4;
    ctx.fillStyle = ROCK[i % ROCK.length];
    ctx.strokeStyle = ROCK_EDGE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, 8 + hash(i, 2) * 4, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  rockSlab(ctx, 0, -32, 30, 22, Math.sin(t * 0.9) * 0.04, ROCK[2], true);
  rockSlab(ctx, -6, -40, 12, 10, -0.2, ROCK[1]);
  rockSlab(ctx, 8, -38, 10, 9, 0.15, ROCK[3]);

  ctx.fillStyle = '#e8dcc8';
  ctx.beginPath();
  ctx.arc(-8, -34, 3.5, 0, TAU);
  ctx.arc(8, -34, 3.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a2010';
  ctx.beginPath();
  ctx.arc(-8, -33, 1.8, 0, TAU);
  ctx.arc(8, -33, 1.8, 0, TAU);
  ctx.fill();

  const lArm = Math.sin(t * 1.3) * 0.08;
  ctx.save();
  ctx.translate(-34, -2);
  ctx.rotate(-0.35 + lArm);
  rockSlab(ctx, 0, 8, 12, 22, 0, ROCK[1], true);
  rockSlab(ctx, 2, 24, 10, 14, 0.1, ROCK[2]);
  ctx.restore();

  const thumbWave = thumbsDown ? Math.sin(t * 2.2) * 0.12 : 0;
  const armLift = thumbsDown ? -0.95 + thumbWave : -0.4;
  ctx.save();
  ctx.translate(34, -4);
  ctx.rotate(armLift);
  rockSlab(ctx, 0, 6, 13, 24, 0.05, ROCK[0], true);
  rockSlab(ctx, 4, 26, 11, 16, 0.15, ROCK[3]);

  if (thumbsDown) {
    ctx.fillStyle = ROCK[2];
    ctx.strokeStyle = ROCK_EDGE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(6, 38, 9, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ROCK[4];
    ctx.fillRect(2, 44, 7, 14);
    ctx.strokeRect(2, 44, 7, 14);

    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = NEON.nuclear;
    ctx.shadowBlur = 12;
    ctx.shadowColor = NEON.nuclear;
    const pulse = 1 + Math.sin(t * 4) * 0.08;
    ctx.save();
    ctx.translate(22, 42);
    ctx.scale(pulse, pulse);
    ctx.fillText('👎', 0, 0);
    ctx.restore();
    ctx.shadowBlur = 0;
  }
  ctx.restore();

  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = NEON.yellow;
  ctx.fillText(label, 0, 62);

  ctx.restore();
  ctx.globalAlpha = 1;
}

/** Für Finale-Szenen · seitlich einlaufend */
export function drawRockCreatureFinale(ctx, local, t, w, h, layout, side = 'right') {
  const mob = layout?.phone;
  const in_ = ease(Math.max(0, Math.min(1, (local - 0.15) / 0.3)));
  if (in_ <= 0) return;

  const groundY = h * (mob ? 0.7 : 0.66);
  const sc = (mob ? 0.55 : 0.72) * in_;
  const targetX = side === 'right' ? w * (mob ? 0.78 : 0.82) : w * (mob ? 0.22 : 0.18);
  const slide = mob ? 40 : 60;
  const x = side === 'right'
    ? lerp(targetX + slide, targetX, in_)
    : lerp(targetX - slide, targetX, in_);
  const y = groundY - (mob ? 8 : 12);

  drawRockCreature(ctx, x, y, sc, t, {
    alpha: in_,
    thumbsDown: true,
    label: 'FELS-WESEN · 👎',
  });
}
