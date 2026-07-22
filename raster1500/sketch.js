/** Raster #1500 · Wireframe-Berg · Hommage bits.raster.art · musikreaktiv */

function hash(i) {
  const n = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function heightAt(u, v, t, a) {
  const peak = Math.exp(-((u - 0.5) ** 2) * 14 - (v - 0.35) ** 2 * 6);
  const ridge =
    0.55 * Math.exp(-((u - 0.38) ** 2) * 22)
    + 0.45 * Math.exp(-((u - 0.62) ** 2) * 28)
    + 0.35 * Math.exp(-((u - 0.5) ** 2) * 9 - ((v - 0.55) ** 2) * 8);
  const jagged =
    0.08 * Math.sin(u * 28 + t * 0.7)
    + 0.05 * Math.sin(v * 22 - t * 0.5)
    + 0.04 * Math.sin((u + v) * 40 + a.mid * 4);
  const lift = a.bass * 0.35 + a.beat * 0.25;
  return (peak * 1.35 + ridge * 0.9 + jagged) * (0.85 + lift) * (1 - v * 0.15);
}

function project(u, v, h, w, hh, rotY, rotX) {
  // u,v in 0..1 grid, h = height
  const x = (u - 0.5) * 2.2;
  const z = (v - 0.45) * 2.0;
  const y = h * 1.6 - 0.35;

  // rotate
  let xr = x * Math.cos(rotY) - z * Math.sin(rotY);
  let zr = x * Math.sin(rotY) + z * Math.cos(rotY);
  let yr = y * Math.cos(rotX) - zr * Math.sin(rotX);
  zr = y * Math.sin(rotX) + zr * Math.cos(rotX);

  const f = 2.4 / (3.6 + zr);
  return [
    w * 0.5 + xr * Math.min(w, hh) * 0.32 * f,
    hh * 0.58 - yr * Math.min(w, hh) * 0.32 * f,
    f,
  ];
}

function edgeColor(i, a, t) {
  const r = hash(i + Math.floor(t * 8));
  if (a.beat > 0.5 && r > 0.55) return '#fff';
  if (r < 0.33) return `rgb(255,${40 + Math.floor(a.bass * 80)},${40})`;
  if (r < 0.66) return `rgb(${40},${200 + Math.floor(a.treble * 55)},${60})`;
  return `rgb(${200 + Math.floor(a.mid * 55)},${200},${220})`;
}

function drawNoise(ctx, w, h, a, t) {
  const n = 40 + Math.floor(a.treble * 80 + a.beat * 40);
  for (let i = 0; i < n; i++) {
    const x = (hash(i * 3.1 + t * 0.2) * w);
    const y = (hash(i * 7.7 + 2) * h * 0.55);
    const c = i % 3;
    const col = c === 0 ? '#f00' : c === 1 ? '#0f0' : '#00f';
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.35 + a.treble * 0.4;
    ctx.fillRect(x, y, 1 + (i % 2), 1 + (i % 2));
  }
  ctx.globalAlpha = 1;
}

export function drawFrame(ctx, w, h, t, a) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  drawNoise(ctx, w, h, a, t);

  const cols = 28;
  const rows = 16;
  const rotY = -0.35 + Math.sin(t * 0.15) * 0.08 + a.mid * 0.1;
  const rotX = 0.55 + a.bass * 0.08;

  const grid = [];
  for (let j = 0; j <= rows; j++) {
    const row = [];
    for (let i = 0; i <= cols; i++) {
      const u = i / cols;
      const v = j / rows;
      const ht = heightAt(u, v, t, a);
      row.push(project(u, v, ht, w, h, rotY, rotX));
    }
    grid.push(row);
  }

  // filled blue facet (lower-left face of peak) — like the thumb
  const fi = Math.floor(cols * 0.32);
  const fj = Math.floor(rows * 0.55);
  if (grid[fj] && grid[fj + 2] && grid[fj][fi] && grid[fj][fi + 3]) {
    ctx.beginPath();
    ctx.moveTo(grid[fj][fi][0], grid[fj][fi][1]);
    ctx.lineTo(grid[fj][fi + 3][0], grid[fj][fi + 3][1]);
    ctx.lineTo(grid[fj + 2][fi + 2][0], grid[fj + 2][fi + 2][1]);
    ctx.lineTo(grid[fj + 2][fi][0], grid[fj + 2][fi][1]);
    ctx.closePath();
    const blueBoost = 180 + Math.floor(a.beat * 75);
    ctx.fillStyle = `rgb(0,${60 + Math.floor(a.mid * 40)},${blueBoost})`;
    ctx.fill();
  }

  // wireframe
  ctx.lineWidth = 1;
  let edge = 0;
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a0 = grid[j][i];
      const a1 = grid[j][i + 1];
      ctx.strokeStyle = edgeColor(edge++, a, t);
      ctx.globalAlpha = 0.55 + a.rms * 0.35;
      ctx.beginPath();
      ctx.moveTo(a0[0], a0[1]);
      ctx.lineTo(a1[0], a1[1]);
      ctx.stroke();
    }
  }
  for (let i = 0; i <= cols; i++) {
    for (let j = 0; j < rows; j++) {
      const a0 = grid[j][i];
      const a1 = grid[j + 1][i];
      ctx.strokeStyle = edgeColor(edge++, a, t);
      ctx.globalAlpha = 0.55 + a.rms * 0.35;
      ctx.beginPath();
      ctx.moveTo(a0[0], a0[1]);
      ctx.lineTo(a1[0], a1[1]);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  // peak vertex sparkles on beat
  if (a.beat > 0.3) {
    const tip = grid[0][Math.floor(cols / 2)];
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = a.beat;
    ctx.fillRect(tip[0] - 1, tip[1] - 1, 3, 3);
    ctx.globalAlpha = 1;
  }
}
