/** Knallige Neon-Symbol-Sets — kosmische Evolution */

export const INNER = '◉●◎◍◌○◯✦✸✺❋❊▲▼◆◇◈⬡⬢★☆';
export const EDGE = '█▓▒░▐▌▚▞▄▀▆▇▅';
export const RIM = '╳×＋＊·﹡✴✵⊹';
export const FLOW = '≈∿〜～∾⌇⌁';
export const VOID = '▪▫─│╱╲:·';
export const SPARK = '✧✦⋆∗⁕';

export const PLANET = '○●◎◉⊕♁◌';
export const ORBIT = '◦∘°·';
export const WARP = '→⇀⇢➤➜╍━⤴';
export const NEBULA = '≋░▒▓~∿⌇';
export const DEEP = '⋆✦✧⁺∗☆+';
export const GALAXY = '╳✦◎◉☍⊛';

export const NEON = [
  '#00ffff', '#ff00ea', '#ffee00', '#00ff55',
  '#ff0044', '#aa00ff', '#00ffcc', '#ff6600',
];

export const COSMIC = [
  '#ffffff', '#aaccff', '#6688ff', '#cc44ff',
  '#00eeff', '#ff88cc', '#4466aa', '#eeddff',
];

export const PHASE_NAMES = [
  'URFORM',
  'SONNENSYSTEM',
  'HELIOPAUSE',
  'GALAXIE',
  'ZWISCHENGALAKTISCH',
];

export function hash(x, y, t) {
  const s = Math.sin(x * 127.1 + y * 311.7 + t * 47.3) * 43758.5453;
  return s - Math.floor(s);
}

export function noise2(x, y, t) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, t);
  const b = hash(ix + 1, iy, t);
  const c = hash(ix, iy + 1, t);
  const d = hash(ix + 1, iy + 1, t);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function pick(str, n) {
  return str[Math.floor(n * str.length) % str.length];
}

export function smooth(a, b, t) {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Reise 0→1 über ~100 s, endlos loop */
export const CYCLE = 100;

export function journey(t) {
  const p = (t % CYCLE) / CYCLE;
  const w0 = 1 - smooth(0.12, 0.22, p);
  const w1 = smooth(0.10, 0.20, p) * (1 - smooth(0.32, 0.42, p));
  const w2 = smooth(0.30, 0.40, p) * (1 - smooth(0.50, 0.60, p));
  const w3 = smooth(0.48, 0.58, p) * (1 - smooth(0.72, 0.82, p));
  const w4 = smooth(0.70, 0.80, p);
  const zoom = lerp(1, 3.2, smooth(0.15, 0.85, p));
  const phaseIdx = p < 0.2 ? 0 : p < 0.4 ? 1 : p < 0.58 ? 2 : p < 0.78 ? 3 : 4;
  return { p, w0, w1, w2, w3, w4, zoom, phaseIdx, name: PHASE_NAMES[phaseIdx] };
}
