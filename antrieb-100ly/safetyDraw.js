/** Safety Board + Rettungskapsel · Zeichnen */
import { computeSafety, SAFETY_ROWS, statusColor } from './safety.js';
import { NEON } from './systems.js';

const TAU = Math.PI * 2;

export function drawSafetyBoard(ctx, safety, t, layout) {
  const { x: px, y: py, w: pw } = layout.safety;
  const ph = SAFETY_ROWS.length * (layout.phone ? 11 : 13) + (layout.phone ? 26 : 32);
  const rowStep = layout.phone ? 11 : 13;
  const labelFs = layout.phone ? 6 : 7;

  const borderCol = safety.critical ? NEON.flame : safety.hazard ? NEON.nuclear : NEON.green;
  const blink = safety.critical && Math.sin(t * 10) > 0;

  ctx.save();
  ctx.fillStyle = 'rgba(0,16,8,0.9)';
  ctx.strokeStyle = borderCol;
  ctx.globalAlpha = blink ? 0.85 : 1;
  ctx.lineWidth = safety.critical ? 2 : 1;
  ctx.strokeRect(px, py, pw, ph);
  ctx.fillRect(px, py, pw, ph);

  ctx.font = `700 ${labelFs + 2}px monospace`;
  ctx.fillStyle = borderCol;
  ctx.textAlign = 'left';
  ctx.fillText('◉ SAFETY', px + 6, py + 12);
  ctx.font = `${labelFs}px monospace`;
  ctx.fillStyle = safety.critical ? NEON.flame : '#556';
  const statusLine = safety.critical ? '⚠ EVAC' : safety.hazard ? '● WARN' : '● NOMINAL';
  ctx.fillText(statusLine, px + 6, py + 22);

  SAFETY_ROWS.forEach((row, i) => {
    const y = py + (layout.phone ? 32 : 38) + i * rowStep;
    const val = safety[row.key];
    const col = statusColor(row, val, safety, NEON);

    ctx.font = `${labelFs}px monospace`;
    ctx.fillStyle = '#556';
    const lbl = layout.phone && row.label.length > 12 ? row.label.slice(0, 10) : row.label;
    ctx.fillText(lbl, px + 6, y);

    if (row.bar) {
      const bw = pw - 70;
      const bx = px + pw - bw - 10;
      const by = y - 5;
      ctx.fillStyle = '#111';
      ctx.fillRect(bx, by, bw, 4);
      ctx.fillStyle = col;
      ctx.fillRect(bx, by, bw * (val / 100), 4);
      ctx.textAlign = 'right';
      ctx.fillStyle = col;
      ctx.font = '700 7px monospace';
      ctx.fillText(`${Math.floor(val)}%`, px + pw - 8, y);
      ctx.textAlign = 'left';
    } else {
      ctx.textAlign = 'right';
      ctx.fillStyle = col;
      ctx.font = '700 7px monospace';
      ctx.fillText(String(val), px + pw - 8, y);
      ctx.textAlign = 'left';
    }
  });

  ctx.restore();
}

export function drawRescueCapsule(ctx, safety, t, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const shieldR = 38 + Math.sin(t * 2) * 2;
  const shieldPct = safety.capsuleShield / 100;
  const active = safety.capsule === 'AKTIV' || safety.critical;

  ctx.font = '7px monospace';
  ctx.fillStyle = active ? NEON.flame : NEON.green;
  ctx.textAlign = 'center';
  ctx.fillText('RETTUNGSKAPSEL', 0, -52);
  ctx.fillStyle = '#667';
  ctx.fillText('SCHUTZ · ESCAPE', 0, -42);

  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = active ? NEON.flame : NEON.cyan;
    ctx.globalAlpha = (0.25 + shieldPct * 0.4) * (1 - i * 0.2);
    ctx.lineWidth = active ? 2 : 1;
    ctx.beginPath();
    ctx.arc(0, 0, shieldR + i * 6, t * 0.4 + i * 0.5, t * 0.4 + i * 0.5 + TAU * 0.7);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(0,255,255,0.08)';
  ctx.beginPath();
  ctx.arc(0, 0, shieldR, 0, TAU);
  ctx.fill();

  ctx.fillStyle = NEON.white;
  ctx.strokeStyle = NEON.cyan;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 20, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = NEON.cyan;
  ctx.font = 'bold 8px monospace';
  ctx.fillText('ESC', 0, 4);

  ctx.fillStyle = NEON.orange;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(-6, -28);
  ctx.lineTo(6, -28);
  ctx.closePath();
  ctx.fill();

  ctx.font = '7px monospace';
  ctx.fillStyle = active ? NEON.flame : NEON.green;
  ctx.fillText(safety.capsule, 0, 38);
  ctx.fillStyle = NEON.cyan;
  ctx.fillText(`Schild ${Math.floor(safety.capsuleShield)}%`, 0, 48);

  if (active) {
    ctx.fillStyle = NEON.nuclear;
    ctx.font = 'bold 8px monospace';
    const blink = Math.sin(t * 12) > 0;
    if (blink) ctx.fillText('◉ SCHUTZ AN', 0, 60);
  }

  ctx.restore();
}

export { computeSafety };
