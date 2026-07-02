import {
  INNER, EDGE, RIM, FLOW, VOID, SPARK, PLANET, ORBIT, WARP,
  NEBULA, DEEP, GALAXY, NEON, COSMIC, hash, noise2, pick,
} from './glyphs.js';

const ORBITS = [
  { r: 0.07, sp: 2.8, sym: 0 },
  { r: 0.11, sp: 2.1, sym: 1 },
  { r: 0.16, sp: 1.6, sym: 2 },
  { r: 0.22, sp: 1.2, sym: 3 },
  { r: 0.30, sp: 0.85, sym: 4 },
  { r: 0.40, sp: 0.55, sym: 5 },
  { r: 0.52, sp: 0.35, sym: 0 },
];

export function worldXY(x, y, zoom) {
  return [0.5 + (x - 0.5) * zoom, 0.5 + (y - 0.5) * zoom];
}

export function sampleOrigin(x, y, t, inside, de, n, n2, pulse) {
  if (!inside && de >= 0.028) return null;
  const edgeBand = de < 0.028;
  let ch, glow, alpha = 1;
  const color = NEON[Math.floor((n + n2 + t * 0.15) * NEON.length) % NEON.length];

  if (inside) {
    if (edgeBand) {
      ch = pick(RIM + EDGE, n + pulse * 0.3);
      glow = 22 + pulse * 18;
    } else {
      const flow = noise2(x * 40 + t * 0.12, y * 40 - t * 0.1, t * 0.5);
      ch = flow > 0.62 ? pick(SPARK + INNER, flow) : pick(INNER + FLOW, n2);
      glow = 10 + flow * 16 + pulse * 8;
      alpha = 0.85 + flow * 0.15;
    }
  } else {
    ch = pick(RIM + SPARK, n);
    glow = 28 + pulse * 14;
  }
  return { ch, color, glow, alpha };
}

export function sampleSolar(wx, wy, t, n) {
  const cx = wx - 0.5;
  const cy = wy - 0.5;
  const r = Math.hypot(cx, cy);
  const ang = Math.atan2(cy, cx);

  if (r < 0.035) {
    return { ch: pick('◉◎●', n), color: '#ffee00', glow: 30, alpha: 1 };
  }

  for (let i = 0; i < ORBITS.length; i++) {
    const o = ORBITS[i];
    const ring = Math.abs(r - o.r);
    if (ring < 0.012) {
      return {
        ch: pick(ORBIT, n),
        color: COSMIC[i % COSMIC.length],
        glow: 4,
        alpha: 0.35 + (1 - ring / 0.012) * 0.25,
      };
    }
    const pa = t * o.sp + o.sym * 1.7;
    const px = 0.5 + Math.cos(pa) * o.r;
    const py = 0.5 + Math.sin(pa) * o.r;
    const d = Math.hypot(wx - px, wy - py);
    if (d < 0.018) {
      const cols = ['#ff8844', '#ffcc44', '#44aaff', '#ff4466', '#aa88ff', '#66ddff', '#cccccc'];
      return {
        ch: pick(PLANET, n + o.sym),
        color: cols[i % cols.length],
        glow: 14 + (1 - d / 0.018) * 12,
        alpha: 1,
      };
    }
  }

  if (hash(wx * 80, wy * 80, t * 0.2) > 0.985) {
    return { ch: pick(DEEP, n), color: '#aaccff', glow: 8, alpha: 0.5 };
  }
  return null;
}

export function sampleExit(wx, wy, t, n, n2) {
  const cx = wx - 0.5;
  const cy = wy - 0.5;
  const r = Math.hypot(cx, cy);
  const ang = Math.atan2(cy, cx);

  const stream = Math.abs(Math.sin(ang * 3 + t * 0.4)) * (1 - smoothstep(0.05, 0.55, r));
  if (stream > 0.55 && hash(wx * 30, wy * 30, t) > 0.7) {
    return {
      ch: pick(WARP + SPARK, n),
      color: pickColor(COSMIC, n + t * 0.1),
      glow: 16,
      alpha: 0.6 + stream * 0.3,
    };
  }

  if (r > 0.45 && r < 0.72 && hash(wx * 50, wy * 50, t * 0.15) > 0.82) {
    return {
      ch: pick(DEEP + PLANET, n2),
      color: '#6688cc',
      glow: 6,
      alpha: 0.4,
    };
  }

  const oort = r > 0.55 && r < 0.95 && hash(wx * 90, wy * 90, t * 0.08) > 0.93;
  if (oort) {
    return { ch: pick('·∘°', n), color: '#8899ff', glow: 10, alpha: 0.65 };
  }

  if (r < 0.08) {
    return { ch: '◉', color: '#ffaa00', glow: 18, alpha: 0.35 - r * 2 };
  }
  return null;
}

export function sampleGalaxy(wx, wy, t, n, n2) {
  const cx = wx - 0.5;
  const cy = wy - 0.5;
  const r = Math.hypot(cx, cy) * 2.2;
  const ang = Math.atan2(cy, cx);

  const arms = 3;
  let best = 1e9;
  for (let arm = 0; arm < arms; arm++) {
    const offset = (arm / arms) * Math.PI * 2;
    const spiral = ang - offset - Math.log(r + 0.15) * 1.8 - t * 0.15;
    const wrapped = Math.abs(((spiral + Math.PI) % (Math.PI * 2)) - Math.PI);
    best = Math.min(best, wrapped);
  }

  const core = r < 0.25;
  const armBand = best < 0.22 && r > 0.08 && r < 1.4;
  const neb = noise2(wx * 8, wy * 8, t * 0.2) > 0.55 && r < 1.0;

  if (core) {
    return {
      ch: pick(GALAXY + INNER, n),
      color: pickColor(COSMIC, n2),
      glow: 22,
      alpha: 0.9,
    };
  }
  if (armBand) {
    const dens = 1 - best / 0.22;
    if (hash(wx * 60, wy * 60, t * 0.3) > 0.55 - dens * 0.4) {
      return {
        ch: pick(DEEP + NEBULA, n),
        color: pickColor(COSMIC, n + dens),
        glow: 8 + dens * 18,
        alpha: 0.5 + dens * 0.5,
      };
    }
  }
  if (neb && hash(wx * 40, wy * 40, t) > 0.75) {
    return {
      ch: pick(NEBULA + FLOW, n2),
      color: '#8844ff',
      glow: 12,
      alpha: 0.35,
    };
  }
  if (hash(wx * 100, wy * 100, t * 0.1) > 0.97) {
    return { ch: pick(DEEP, n), color: '#ccdfff', glow: 6, alpha: 0.45 };
  }
  return null;
}

export function sampleVoid(wx, wy, t, n) {
  const cx = wx - 0.5;
  const cy = wy - 0.5;
  const r = Math.hypot(cx, cy) * 1.8;

  const clusters = [
    [0.15, 0.2], [0.82, 0.15], [0.7, 0.78], [0.2, 0.85], [0.55, 0.45],
  ];
  for (const [gx, gy] of clusters) {
    const d = Math.hypot(wx - gx, wy - gy);
    if (d < 0.06 + hash(gx, gy, 0) * 0.04) {
      if (hash(wx * 120, wy * 120, t * 0.05) > 0.5) {
        return {
          ch: pick(GALAXY + DEEP, n + d * 10),
          color: pickColor(COSMIC, n),
          glow: 14,
          alpha: 0.55 + (1 - d / 0.1) * 0.35,
        };
      }
    }
  }

  if (hash(wx * 200, wy * 200, t * 0.02) > 0.992) {
    return { ch: pick('✦⋆+', n), color: '#ffffff', glow: 20, alpha: 0.9 };
  }
  if (hash(wx * 150, wy * 150, t * 0.03) > 0.988) {
    return { ch: pick(DEEP, n), color: '#8899cc', glow: 4, alpha: 0.35 };
  }

  const quasar = hash(Math.floor(wx * 8), Math.floor(wy * 8), Math.floor(t * 0.4));
  if (quasar > 0.998 && r > 0.3) {
    return { ch: '◉', color: '#ff00ea', glow: 35, alpha: 1 };
  }
  return null;
}

function pickColor(arr, n) {
  return arr[Math.floor(n * arr.length) % arr.length];
}

function smoothstep(a, b, t) {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}
