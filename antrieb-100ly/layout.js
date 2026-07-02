/** Responsive Layout · Desktop · Tablet · iPhone Portrait/Landscape */

function readSafeInsets() {
  const s = getComputedStyle(document.documentElement);
  const n = (v) => parseFloat(v) || 0;
  return {
    top: n(s.getPropertyValue('--sat')),
    right: n(s.getPropertyValue('--sar')),
    bottom: n(s.getPropertyValue('--sab')),
    left: n(s.getPropertyValue('--sal')),
  };
}

export function computeLayout(w, h) {
  const safe = readSafeInsets();
  const iw = w - safe.left - safe.right;
  const ih = h - safe.top - safe.bottom;
  const portrait = ih >= iw;
  const phone = Math.min(iw, ih) <= 430;
  const compact = phone || iw < 768;
  const short = ih < 520;

  const fs = phone ? 0.78 : compact ? 0.88 : 1;

  const techW = phone ? Math.min(iw * 0.44, 168) : Math.min(280, iw * 0.35);
  const techH = phone ? 82 : 110;
  const techY = safe.top + (phone ? 50 : 78);

  const sensorW = phone ? iw - techW - 24 : Math.min(220, iw * 0.28);
  const sensorRowH = phone ? 10 : 15;
  const sensorCols = phone ? 2 : 1;
  const sensorY = safe.top + (phone ? 50 : 68);

  const rocketX = safe.left + iw * (phone ? 0.5 : 0.42);
  const rocketY = safe.top + ih * (phone ? (short ? 0.4 : 0.38) : 0.52);
  const rocketSc = phone ? 0.72 : compact ? 0.82 : 0.9;

  const diagramCx = safe.left + iw * (phone ? 0.5 : 0.72);
  const diagramCy = safe.top + ih * (phone ? 0.6 : 0.55);
  const diagramR = Math.min(iw, ih) * (phone ? 0.13 : 0.18);

  const molR = Math.min(iw, ih) * (phone ? 0.1 : 0.16);
  const molX = safe.left + iw * (phone ? 0.74 : 0.72);
  const molY = safe.top + ih * (phone ? 0.54 : 0.5);

  const safetyW = phone ? Math.min(iw * 0.52, 196) : Math.min(200, iw * 0.26);
  const safetyH = 12 * 13 + 32;
  const timelinePad = phone ? 56 : 0;
  const progressBottom = safe.bottom + (phone ? 20 : 14) + timelinePad;
  const safetyY = h - progressBottom - safetyH - (phone ? 6 : 28);

  return {
    w, h, iw, ih, portrait, phone, compact, short, fs, safe,
    hud: {
      titleX: safe.left + (phone ? 8 : 20),
      titleY: safe.top + (phone ? 22 : 32),
      metaX: w - safe.right - (phone ? 8 : 20),
      titleSize: phone ? 11 : 14,
      lineSize: phone ? 8 : 11,
      speedSize: phone ? 10 : 13,
    },
    tech: { x: safe.left + (phone ? 8 : 20), y: techY, w: techW, h: techH, fs: phone ? 7 : 8 },
    sensor: {
      x: phone ? safe.left + techW + 16 : w - sensorW - 16 - safe.right,
      y: sensorY,
      w: sensorW,
      rowH: sensorRowH,
      cols: sensorCols,
      fs: phone ? 6 : 7,
      valFs: phone ? 7 : 8,
    },
    rocket: { x: rocketX, y: rocketY, sc: rocketSc },
    diagram: { cx: diagramCx, cy: diagramCy, r: diagramR },
    molecule: { x: molX, y: molY, r: molR },
    safety: { x: safe.left + (phone ? 8 : 16), y: safetyY, w: safetyW },
    capsule: {
      x: safe.left + iw * (phone ? 0.84 : 0.18),
      y: safe.top + ih * (phone ? 0.22 : 0.52),
      sc: phone ? 0.58 : 0.85,
      orbitX: safe.left + iw * (phone ? 0.78 : 0.28),
      orbitY: safe.top + ih * (phone ? 0.42 : 0.48),
    },
    progress: {
      x: safe.left + (phone ? 8 : 20),
      y: h - progressBottom,
      w: iw - (phone ? 16 : 40),
      labelMode: phone ? 'active' : 'all',
    },
    story: { fs: phone ? 0.82 : 1 },
  };
}

export function layoutCapsule(L, k) {
  if (k === 'orbit') {
    return { x: L.capsule.orbitX, y: L.capsule.orbitY, sc: L.capsule.sc };
  }
  if (isStoryKey(k)) {
    return { x: L.capsule.x, y: L.capsule.y, sc: L.capsule.sc * 0.9 };
  }
  return { x: L.capsule.x, y: L.capsule.y, sc: L.capsule.sc };
}

function isStoryKey(k) {
  return ['intro', 'hailmary', 'relativ', 'kolonie', 'reunion', 'fusion', 'posturknall'].includes(k);
}
