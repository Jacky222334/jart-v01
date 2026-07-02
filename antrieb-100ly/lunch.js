/** Lunch-Gate · Katzennapf · Start · Extraterrestrial Adventure */
import { NEON, ease } from './systems.js';

const TAU = Math.PI * 2;

export function drawLunchGate(ctx, t, w, h, layout = null) {
  const mob = layout?.phone;
  const cx = w * 0.5;
  const cy = h * (mob ? 0.48 : 0.46);
  const pulse = 0.92 + Math.sin(t * 2.2) * 0.05;
  const hover = 0.85 + Math.sin(t * 3.5) * 0.15;

  ctx.fillStyle = '#000010';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 80; i++) {
    const x = (Math.sin(i * 12.7 + t * 0.1) * 0.5 + 0.5) * w;
    const y = (Math.cos(i * 8.3 + t * 0.08) * 0.5 + 0.5) * h;
    ctx.globalAlpha = 0.15 + (i % 5) * 0.08;
    ctx.fillStyle = i % 3 === 0 ? NEON.cyan : '#fff';
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;

  ctx.font = `700 ${mob ? 10 : 12}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = NEON.magenta;
  ctx.shadowBlur = 16;
  ctx.shadowColor = NEON.magenta;
  ctx.fillText('BETHY · JANY · KATZEN-ASTRONAUTEN', cx, h * (mob ? 0.1 : 0.12));
  ctx.shadowBlur = 0;

  const bowlW = (mob ? 200 : 280) * pulse;
  const bowlH = (mob ? 52 : 68) * pulse;
  const bowlY = cy;

  ctx.save();
  ctx.translate(cx, bowlY);

  ctx.shadowBlur = 28 * hover;
  ctx.shadowColor = NEON.cyan;
  ctx.strokeStyle = NEON.cyan;
  ctx.lineWidth = 2.5;
  ctx.fillStyle = 'rgba(0,40,60,0.55)';
  ctx.beginPath();
  ctx.ellipse(0, 0, bowlW * 0.5, bowlH * 0.45, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = NEON.magenta;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-bowlW * 0.42, -bowlH * 0.1);
  ctx.quadraticCurveTo(0, bowlH * 0.55, bowlW * 0.42, -bowlH * 0.1);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,136,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, -bowlH * 0.05, bowlW * 0.38, bowlH * 0.22, 0, 0, TAU);
  ctx.fill();

  ctx.font = `${mob ? 7 : 8}px monospace`;
  ctx.fillStyle = NEON.orange;
  ctx.fillText('◉ ◉ ◉  Miau-Fuel  ◉ ◉ ◉', 0, -bowlH * 0.02);

  ctx.shadowBlur = 0;
  ctx.font = `700 ${mob ? 13 : 17}px monospace`;
  ctx.fillStyle = NEON.yellow;
  ctx.fillText('LUNCH', 0, bowlH * 0.22);

  ctx.font = `700 ${mob ? 9 : 11}px monospace`;
  ctx.fillStyle = NEON.cyan;
  ctx.fillText('EXTRATERRESTRIAL', 0, bowlH * 0.42);
  ctx.fillStyle = NEON.green;
  ctx.fillText('ADVENTURE', 0, bowlH * 0.58);

  ctx.font = `${mob ? 7 : 8}px monospace`;
  ctx.fillStyle = NEON.magenta;
  const line3 = mob ? 'LOGE·STORY·BODY·MIND' : 'LOGE · STORY · BODY · MIND';
  ctx.fillText(line3, 0, bowlH * 0.78);
  ctx.fillStyle = NEON.white;
  ctx.fillText('INKLUSION', 0, bowlH * 0.95);

  ctx.restore();

  const btnY = bowlY + bowlH * 0.75 + (mob ? 28 : 36);
  const btnW = bowlW * 0.85;
  const btnH = mob ? 28 : 34;
  const glow = ease((Math.sin(t * 2) + 1) * 0.5);

  ctx.fillStyle = `rgba(0,255,136,${0.12 + glow * 0.15})`;
  ctx.strokeStyle = NEON.green;
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH);
  ctx.fillRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH);

  ctx.font = `700 ${mob ? 10 : 12}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = NEON.green;
  ctx.shadowBlur = 12 + glow * 12;
  ctx.shadowColor = NEON.green;
  ctx.fillText('▶ TIPPEN · START · LUNCH', cx, btnY + 4);
  ctx.shadowBlur = 0;

  ctx.font = `${mob ? 8 : 9}px monospace`;
  ctx.fillStyle = '#556';
  ctx.fillText('Mission 100 LY · Bethy & Jany · für alle', cx, h * (mob ? 0.88 : 0.9));

  return { cx, cy: btnY, w: btnW, h: btnH, bowlCx: cx, bowlCy: bowlY, bowlW, bowlH };
}

export function hitLunchGate(x, y, w, h, layout) {
  const mob = layout?.phone;
  const cx = w * 0.5;
  const cy = h * (mob ? 0.48 : 0.46);
  const bowlW = mob ? 200 : 280;
  const bowlH = mob ? 52 : 68;
  const btnY = cy + bowlH * 0.75 + (mob ? 28 : 36);
  const btnW = bowlW * 0.85;
  const btnH = mob ? 28 : 34;

  const inBtn = x >= cx - btnW / 2 && x <= cx + btnW / 2
    && y >= btnY - btnH / 2 && y <= btnY + btnH / 2;
  const inBowl = ((x - cx) / (bowlW * 0.55)) ** 2 + ((y - cy) / (bowlH * 0.6)) ** 2 <= 1.2;
  const inZone = x > w * 0.06 && x < w * 0.94 && y > h * 0.18 && y < h * 0.88;
  return inBtn || inBowl || inZone;
}
