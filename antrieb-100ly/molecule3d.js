/** Canvas-3D · kompakt · rotierend · Props-Karussell (nicht statisch) */
import { NEON } from './systems.js';

const TAU = Math.PI * 2;

function rotX(p, a) {
  const [x, y, z] = p;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x, y * c - z * s, y * s + z * c];
}

function rotY(p, a) {
  const [x, y, z] = p;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c + z * s, y, -x * s + z * c];
}

function project(p, scale, cx, cy, fov = 4) {
  const z = p[2] + fov;
  const s = scale / z;
  return { x: cx + p[0] * s, y: cy + p[1] * s, z: p[2], s };
}

function boxSize(w, h, layout) {
  const phone = layout?.phone;
  return {
    w: phone ? Math.min(148, w * 0.36) : Math.min(240, w * 0.3),
    h: phone ? Math.min(132, h * 0.19) : Math.min(188, h * 0.28),
    propsVisible: phone ? 2 : 3,
    header: phone ? 34 : 44,
    propsH: phone ? 22 : 26,
  };
}

function drawScanLine(ctx, bx, by, bw, bh, t) {
  const y = by + 12 + ((t * 45) % (bh - 24));
  ctx.strokeStyle = 'rgba(0,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bx + 4, y);
  ctx.lineTo(bx + bw - 4, y);
  ctx.stroke();
}

function drawPropsCarousel(ctx, model, t, bx, by, boxH, cfg) {
  const n = model.props.length;
  if (!n) return;
  const slot = Math.floor(t / 2.4) % n;
  const fade = (t % 2.4) / 2.4;
  const blend = fade < 0.15 ? fade / 0.15 : fade > 0.85 ? (1 - fade) / 0.15 : 1;

  const py0 = by + boxH - cfg.propsVisible * cfg.propsH - 6;
  ctx.font = '7px monospace';
  ctx.fillStyle = NEON.green;
  ctx.textAlign = 'left';
  ctx.fillText('◉ LIVE', bx + 8, py0 - 2);

  for (let i = 0; i < cfg.propsVisible; i++) {
    const idx = (slot + i) % n;
    const [k, v] = model.props[idx];
    const py = py0 + i * cfg.propsH;
    const rowFade = i === 0 ? blend : 1;
    ctx.globalAlpha = rowFade;
    ctx.fillStyle = '#556';
    ctx.textAlign = 'left';
    const key = k.length > 12 ? `${k.slice(0, 10)}…` : k;
    ctx.fillText(key, bx + 8, py);
    ctx.textAlign = 'right';
    ctx.fillStyle = NEON.white;
    const val = v.length > 14 ? `${v.slice(0, 12)}…` : v;
    ctx.fillText(val, bx + cfg.w - 8, py);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';

  const dots = 4;
  const dx0 = bx + cfg.w / 2 - (dots * 8) / 2;
  for (let d = 0; d < dots; d++) {
    ctx.fillStyle = d === slot % dots ? NEON.cyan : '#223';
    ctx.fillRect(dx0 + d * 8, by + boxH - 4, 4, 2);
  }
}

export function drawMolecule3D(ctx, model, t, cx, cy, scale, w, h, layout = null) {
  if (!model) return;

  const cfg = boxSize(w, h, layout);
  const boxW = cfg.w;
  const boxH = cfg.h;
  const bx = cx - boxW / 2;
  const by = cy - boxH / 2;
  const molCy = by + cfg.header + (boxH - cfg.header - cfg.propsVisible * cfg.propsH) * 0.45;
  const molScale = scale * (layout?.phone ? 0.72 : 0.88);

  const ay = t * 1.35;
  const ax = Math.sin(t * 0.62) * 0.55 + 0.4;
  const wobble = Math.sin(t * 2.8) * 0.06;

  ctx.save();

  ctx.fillStyle = 'rgba(0,12,28,0.9)';
  ctx.strokeStyle = NEON.cyan;
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, by, boxW, boxH);
  ctx.fillRect(bx, by, boxW, boxH);
  drawScanLine(ctx, bx, by, boxW, boxH, t);

  ctx.font = `700 ${layout?.phone ? 8 : 9}px monospace`;
  ctx.fillStyle = NEON.cyan;
  ctx.textAlign = 'center';
  ctx.fillText('3D · MOLEKÜL', cx, by + 11);
  ctx.font = `700 ${layout?.phone ? 9 : 10}px monospace`;
  ctx.fillStyle = NEON.yellow;
  const title = model.title.length > 22 ? `${model.title.slice(0, 20)}…` : model.title;
  ctx.fillText(title, cx, by + 24);
  ctx.font = '7px monospace';
  ctx.fillStyle = '#667';
  ctx.fillText(model.subtitle, cx, by + 34);

  if (model.wave) {
    drawPhotonWave(ctx, t, cx, molCy, molScale * 0.65);
  } else if (model.atoms.length) {
    drawAtomModel(ctx, model, t, ax, ay + wobble, cx, molCy, molScale);
  }

  drawPropsCarousel(ctx, model, t, bx, by, boxH, cfg);
  ctx.restore();
}

function drawAtomModel(ctx, model, t, ax, ay, cx, cy, scale) {
  const maxAtoms = 16;
  const atoms = model.atoms.length > maxAtoms ? model.atoms.filter((_, i) => i % 2 === 0) : model.atoms;

  const pts = atoms.map((a) => {
    let p = rotY(rotX(a.pos, ax), ay);
    if (model.orbit) {
      const r = 0.85;
      const ang = t * 3.2 + (a.el === 'e⁺' ? Math.PI : 0);
      p = [Math.cos(ang) * r, Math.sin(ang * 0.7) * 0.3, Math.sin(ang) * r];
    }
    if (model.flicker && Math.sin(t * 14 + a.pos[0] * 5) > 0.55) {
      p = p.map((v) => v * 0.25);
    }
    return { ...a, proj: project(p, scale, cx, cy) };
  });

  const bonds = model.bonds || [];
  bonds.forEach(([i, j], bi) => {
    const a = pts[i];
    const b = pts[j];
    if (!a || !b) return;
    const order = (model.bondOrders && model.bondOrders[bi]) || 1;
    ctx.strokeStyle = 'rgba(0,255,255,0.55)';
    ctx.lineWidth = 1 + order * 0.4;
    ctx.beginPath();
    ctx.moveTo(a.proj.x, a.proj.y);
    ctx.lineTo(b.proj.x, b.proj.y);
    ctx.stroke();
  });

  pts.sort((a, b) => a.proj.z - b.proj.z);

  for (const a of pts) {
    const r = a.r * a.proj.s * 0.11;
    const rr = Math.max(3, r);
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.arc(a.proj.x, a.proj.y, rr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(a.proj.x - rr * 0.25, a.proj.y - rr * 0.25, rr * 0.35, 0, TAU);
    ctx.fill();

    if (model.shell && a.el === 'Xe') {
      ctx.strokeStyle = 'rgba(136,68,255,0.45)';
      ctx.lineWidth = 1;
      for (let s = 1; s <= 2; s++) {
        ctx.beginPath();
        ctx.arc(a.proj.x, a.proj.y, rr * (1.2 + s * 0.4), t * 1.2 + s, t * 1.2 + s + TAU * 0.6);
        ctx.stroke();
      }
    }

    if (model.nucleus && a.el === 'U') {
      const n = 8;
      for (let k = 0; k < n; k++) {
        const ang = k * (TAU / n) + t * 2;
        const rad = rr * 0.65;
        ctx.fillStyle = k % 2 ? NEON.nuclear : NEON.orange;
        ctx.fillRect(a.proj.x + Math.cos(ang) * rad - 1, a.proj.y + Math.sin(ang) * rad - 1, 2, 2);
      }
    }

    if (rr > 5) {
      ctx.font = `bold ${Math.max(6, rr * 0.5)}px monospace`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(a.el.length > 2 ? a.el.slice(0, 2) : a.el, a.proj.x, a.proj.y);
    }
  }
  ctx.textBaseline = 'alphabetic';
}

function drawPhotonWave(ctx, t, cx, cy, scale) {
  ctx.strokeStyle = NEON.laser;
  ctx.lineWidth = 1.5;
  for (let lane = 0; lane < 3; lane++) {
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const x = cx - scale + (i / 48) * scale * 2;
      const phase = t * 6 + i * 0.2 + lane * 2;
      const y = cy + Math.sin(phase) * (scale * 0.22) + (lane - 1) * 10;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.globalAlpha = 0.45 + lane * 0.18;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = NEON.laser;
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('γ', cx, cy);
}
