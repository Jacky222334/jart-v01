import { catmullRom } from './tracker.js';

function drawDotted(ctx, x1, y1, x2, y2, gap = 8) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return;
  const ux = dx / dist;
  const uy = dy / dist;
  const dash = gap / 2;
  let d = 0;
  ctx.beginPath();
  while (d < dist) {
    const a = d;
    const b = Math.min(d + dash, dist);
    ctx.moveTo(x1 + ux * a, y1 + uy * a);
    ctx.lineTo(x1 + ux * b, y1 + uy * b);
    d += gap;
  }
  ctx.stroke();
}

export function drawOverlay(ctx, w, h, track, opts) {
  const {
    outline = '#ff3b4a',
    trail = '#ff8a9a',
    useBrackets = true,
    bracketLength = 0.28,
    drawTrails = true,
    drawConnections = true,
    useDotted = false,
    showIds = true,
    showMetrics = true,
    showGrid = false,
    gridSpacing = 48,
    lineSmoothness = 8,
    thickness = 2,
    clear = false,
  } = opts;

  // Overlay-Modus: Video bleibt stehen — kein clearRect
  if (clear) ctx.clearRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  if (showGrid) {
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  const { centers, sizes, ids, confidence, trails, count } = track;

  // connections
  if (drawConnections && count > 1) {
    const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const maxDist = avg * 3.5;
    ctx.strokeStyle = outline;
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = Math.max(1.5, thickness * 0.7);
    ctx.shadowColor = outline;
    ctx.shadowBlur = 6;
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const d = Math.hypot(centers[j][0] - centers[i][0], centers[j][1] - centers[i][1]);
        if (d > maxDist) continue;
        if (useDotted) {
          drawDotted(ctx, centers[i][0], centers[i][1], centers[j][0], centers[j][1]);
        } else {
          ctx.beginPath();
          ctx.moveTo(centers[i][0], centers[i][1]);
          ctx.lineTo(centers[j][0], centers[j][1]);
          ctx.stroke();
        }
      }
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // trails
  if (drawTrails) {
    ctx.strokeStyle = trail;
    ctx.lineWidth = 1.75;
    ctx.lineJoin = 'round';
    ctx.shadowColor = trail;
    ctx.shadowBlur = 4;
    for (const [, pts] of trails) {
      if (pts.length < 2) continue;
      let path = pts;
      if (pts.length >= 4) path = catmullRom(pts, lineSmoothness);
      ctx.beginPath();
      ctx.moveTo(path[0][0], path[0][1]);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0], path[i][1]);
      if (useDotted) {
        ctx.strokeStyle = trail;
        for (let i = 0; i < path.length - 1; i++) {
          drawDotted(ctx, path[i][0], path[i][1], path[i + 1][0], path[i + 1][1], 6);
        }
      } else {
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
  }

  // blobs
  ctx.strokeStyle = outline;
  ctx.fillStyle = outline;
  ctx.lineWidth = thickness;
  ctx.font = '11px "IBM Plex Mono", ui-monospace, monospace';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 3;

  for (let i = 0; i < count; i++) {
    const [cx, cy] = centers[i];
    const half = sizes[i] * 0.5;
    const x0 = cx - half;
    const y0 = cy - half;
    const x1 = cx + half;
    const y1 = cy + half;
    const bw = x1 - x0;
    const bh = y1 - y0;

    if (useBrackets) {
      const bx = bw * bracketLength;
      const by = bh * bracketLength;
      ctx.beginPath();
      // TL
      ctx.moveTo(x0, y0 + by); ctx.lineTo(x0, y0); ctx.lineTo(x0 + bx, y0);
      // TR
      ctx.moveTo(x1 - bx, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + by);
      // BL
      ctx.moveTo(x0, y1 - by); ctx.lineTo(x0, y1); ctx.lineTo(x0 + bx, y1);
      // BR
      ctx.moveTo(x1 - bx, y1); ctx.lineTo(x1, y1); ctx.lineTo(x1, y1 - by);
      ctx.stroke();
    } else {
      ctx.strokeRect(x0, y0, bw, bh);
    }

    // center cross
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy);
    ctx.lineTo(cx + 4, cy);
    ctx.moveTo(cx, cy - 4);
    ctx.lineTo(cx, cy + 4);
    ctx.stroke();

    if (showIds) {
      const id = ids[i];
      const xn = (cx / w).toFixed(2);
      const yn = (cy / h).toFixed(2);
      const label = `ID ${id}  ${xn},${yn}`;
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x0, Math.max(12, y0 - 6));
      ctx.fillStyle = outline;
    }
  }

  ctx.shadowBlur = 0;

  if (showMetrics) {
    // lesbare Metrics-Box über Video
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(6, 4, 320, Math.min(h - 8, 20 + count * 14 + 8));
    ctx.fillStyle = outline;
    ctx.globalAlpha = 1;
    let y = 18;
    ctx.fillText('TRACKING DATA', 12, y);
    y += 16;
    ctx.fillStyle = '#eee';
    for (let i = 0; i < count; i++) {
      const id = ids[i];
      const conf = confidence.get(id) || 0;
      const line = `ID:${id} X:${(centers[i][0] / w).toFixed(2)} Y:${(centers[i][1] / h).toFixed(2)} SZ:${Math.round(sizes[i])} CONF:${conf}`;
      ctx.fillText(line, 12, y);
      y += 14;
      if (y > h - 20) break;
    }
  }

  ctx.restore();
}
