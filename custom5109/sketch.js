/** Retro-Würfel · Hommage an custom5109 · musikreaktiv */

function hsl(h, s, l, a = 1) {
  return `hsla(${h % 360} ${s}% ${l}% / ${a})`;
}

function project(x, y, z, cx, cy, size, rot) {
  const xr = x * Math.cos(rot) - z * Math.sin(rot);
  const zr = x * Math.sin(rot) + z * Math.cos(rot);
  const f = 2.2 / (3.2 + zr);
  return [cx + xr * size * f, cy + y * size * f * 0.92];
}

function drawStars(ctx, w, h, t, a) {
  const n = 120 + Math.floor(a.treble * 80);
  for (let i = 0; i < n; i++) {
    const x = ((i * 97.13 + t * (8 + a.bass * 40) * (i % 5)) % w + w) % w;
    const y = ((i * 53.71 + Math.sin(t + i) * a.mid * 20) % h + h) % h;
    const c = [0, 60, 120, 180, 280, 320][i % 6];
    const s = 1 + (i % 3) + a.beat * 2;
    ctx.fillStyle = hsl(c, 90, 65 + a.treble * 20, 0.35 + a.treble * 0.5);
    ctx.fillRect(x, y, s, s);
  }
}

function drawWireCube(ctx, cx, cy, size, rot, color, lineW) {
  const pts = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
  ].map(([x, y, z]) => project(x, y, z, cx, cy, size, rot));

  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  ctx.strokeStyle = color;
  ctx.lineWidth = lineW;
  ctx.beginPath();
  for (const [a, b] of edges) {
    ctx.moveTo(pts[a][0], pts[a][1]);
    ctx.lineTo(pts[b][0], pts[b][1]);
  }
  ctx.stroke();
}

function facePath(ctx, pts, idxs) {
  ctx.beginPath();
  ctx.moveTo(pts[idxs[0]][0], pts[idxs[0]][1]);
  for (let i = 1; i < idxs.length; i++) ctx.lineTo(pts[idxs[i]][0], pts[idxs[i]][1]);
  ctx.closePath();
}

function drawInnerBox(ctx, cx, cy, size, rot, style, a, t) {
  const s = size * (0.42 + a.bass * 0.08 + a.beat * 0.06);
  const pts3 = [
    [-1, -1, -0.2], [1, -1, -0.2], [1, 1, -0.2], [-1, 1, -0.2],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
  ].map(([x, y, z]) => project(x, y, z, cx, cy, s, rot));

  // top
  facePath(ctx, pts3, [0, 1, 5, 4]);
  if (style === 'left') {
    const g = ctx.createLinearGradient(pts3[0][0], pts3[0][1], pts3[1][0], pts3[5][1]);
    for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, hsl(i * 50 + t * 40 + a.mid * 80, 95, 55));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = '#666';
  }
  ctx.fill();

  if (style === 'right') {
    const xs = pts3.map((p) => p[0]);
    const ys = pts3.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    const x1 = Math.max(...xs);
    const y1 = Math.max(...ys);
    for (let i = 0; i < 60 + a.treble * 40; i++) {
      const g = 100 + ((i * 37 + Math.floor(t * 20)) % 100);
      ctx.fillStyle = `rgba(${g},${g},${g},0.4)`;
      ctx.fillRect(x0 + Math.random() * (x1 - x0), y0 + Math.random() * (y1 - y0) * 0.35, 2, 2);
    }
  }

  // left face
  facePath(ctx, pts3, [0, 3, 7, 4]);
  if (style === 'left') {
    ctx.fillStyle = '#f2f2f2';
    ctx.fill();
    const bx = Math.min(pts3[0][0], pts3[4][0]);
    const by = Math.min(pts3[0][1], pts3[3][1]);
    const bw = Math.abs(pts3[3][0] - pts3[0][0]) + 24;
    const bh = Math.abs(pts3[7][1] - pts3[0][1]);
    for (let y = 0; y < bh; y += 3) {
      for (let x = 0; x < bw; x += 3) {
        if ((x + y + Math.floor(t * 10)) % 5 < 2 + a.mid * 2) {
          ctx.fillStyle = '#111';
          ctx.fillRect(bx + x, by + y, 2, 2);
        }
      }
    }
  } else {
    ctx.fillStyle = hsl(0, 85, 42 + a.bass * 15);
    ctx.fill();
  }

  // right tunnel face
  facePath(ctx, pts3, [1, 2, 6, 5]);
  ctx.fillStyle = '#0a0a0a';
  ctx.fill();
  const tunnel = 5 + Math.floor(a.beat * 3);
  const ox = Math.cos(rot) * s * 0.2;
  for (let i = tunnel; i >= 1; i--) {
    const u = i / tunnel;
    const shrink = 1 - u * (0.55 + a.mid * 0.15);
    ctx.save();
    ctx.translate(cx + ox, cy);
    ctx.scale(shrink, shrink);
    ctx.translate(-(cx + ox), -cy);
    facePath(ctx, pts3, [1, 2, 6, 5]);
    if (style === 'left') {
      ctx.strokeStyle = `rgba(255,255,255,${0.25 + u * 0.5})`;
    } else {
      ctx.strokeStyle = hsl(280 - i * 40 + t * 30, 95, 60, 0.5 + u * 0.4);
    }
    ctx.lineWidth = 2 + a.treble * 2;
    ctx.stroke();
    ctx.restore();
  }
}

export function drawFrame(ctx, w, h, t, a) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  drawStars(ctx, w, h, t, a);

  const leftX = w * 0.30;
  const rightX = w * 0.70;
  const cy = h * 0.50;
  const size = Math.min(w, h) * (0.28 + a.rms * 0.04);

  const rotL = -0.55 + Math.sin(t * 0.4) * 0.08 + a.mid * 0.12;
  const rotR = 0.55 + Math.sin(t * 0.35 + 1) * 0.08 - a.mid * 0.1;
  const pulse = 1 + a.beat * 0.12 + a.bass * 0.06;

  ctx.save();
  ctx.translate(leftX, cy);
  ctx.scale(pulse, pulse);
  ctx.translate(-leftX, -cy);
  drawWireCube(ctx, leftX, cy, size * 1.15, rotL, hsl(300 + a.treble * 40, 95, 60, 0.85), 1.5 + a.treble * 2);
  drawInnerBox(ctx, leftX, cy, size, rotL, 'left', a, t);
  ctx.restore();

  ctx.save();
  ctx.translate(rightX, cy);
  ctx.scale(pulse * (1 - a.beat * 0.03), pulse);
  ctx.translate(-rightX, -cy);
  drawWireCube(ctx, rightX, cy, size * 1.15, rotR, hsl(0, 0, 55 + a.bass * 25, 0.9), 1.5 + a.bass * 2);
  drawInnerBox(ctx, rightX, cy, size, rotR, 'right', a, t);
  ctx.restore();

  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
