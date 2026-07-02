/** Raketen-Wahn · Nuklear · Antimaterie · Mars · Venus · Interstellar */

export const CYCLE = 120;

export const NEON = {
  void: '#00000c',
  cyan: '#00ffff',
  magenta: '#ff00ea',
  antimatter: '#cc44ff',
  nuclear: '#ffee00',
  orange: '#ff6600',
  flame: '#ff2200',
  venus: '#ffcc44',
  mars: '#ff4422',
  white: '#ffffff',
  sun: '#fff4aa',
  yellow: '#ffee88',
};

export const PHASES = [
  { p0: 0, p1: 0.08, key: 'ignite', name: 'ANTIMATERIE', line: 'Kern · Annihilation · Sicherheitsfeld AN' },
  { p0: 0.08, p1: 0.16, key: 'launch', name: 'ZÜNDUNG', line: 'Nuklear-Puls · 3 · 2 · 1 · WAHNSINN' },
  { p0: 0.16, p1: 0.30, key: 'venus', name: 'VENUS', line: 'Vorbeiflug · 87.000 km/h · Schwefelsäure-Wolken' },
  { p0: 0.30, p1: 0.46, key: 'mars', name: 'MARS', line: 'Roter Planet · Landungsscan · Phobos-Orbit' },
  { p0: 0.46, p1: 0.58, key: 'outer', name: 'ÄUSSERES SYSTEM', line: 'Jupiter · Saturn · Ringe · Blitz' },
  { p0: 0.58, p1: 0.72, key: 'heliopause', name: 'HELIOPAUSE', line: 'Sonne schrumpft · Grenze · Stille' },
  { p0: 0.72, p1: 0.88, key: 'warp', name: 'INTERSTELLAR', line: '0,42 c · Antimaterie · Lichtjahre' },
  { p0: 0.88, p1: 1, key: 'beyond', name: 'AUSSERHALB', line: 'Sonnensystem verlassen · Nebel · Unendlich' },
];

/** km/s — dramatisiert, nicht physikalisch exakt */
export const SPEED_KMS = {
  ignite: 0,
  launch: 2800,
  venus: 87000,
  mars: 120000,
  outer: 450000,
  heliopause: 1200000,
  warp: 126000000,
  beyond: 299792458,
};

export function phaseAt(t) {
  const p = (t % CYCLE) / CYCLE;
  const ph = PHASES.find((x) => p >= x.p0 && p < x.p1) || PHASES[PHASES.length - 1];
  const local = (p - ph.p0) / Math.max(0.001, ph.p1 - ph.p0);
  return { p, ph, local, t: t % CYCLE };
}

export function hash(x, y, t = 0) {
  const s = Math.sin(x * 127.1 + y * 311.7 + t * 47.3) * 43758.5453;
  return s - Math.floor(s);
}

export function ease(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function formatSpeed(kms) {
  if (kms >= 299792) return `${(kms / 299792).toFixed(2)} c`;
  if (kms >= 1000000) return `${(kms / 1000).toFixed(0)} M km/s`;
  if (kms >= 1000) return `${(kms / 1000).toFixed(1)} M km/s`;
  return `${Math.floor(kms).toLocaleString('de-DE')} km/s`;
}
