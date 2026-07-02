/** Kosmos-Reise · Rakete · Rausch · Anzug */

export const CYCLE = 120;

export const NEON = {
  void: '#000008',
  cyan: '#00ffff',
  orange: '#ff6600',
  yellow: '#ffee00',
  magenta: '#ff00ea',
  white: '#ffffff',
  suit: '#e8e8ec',
  visor: '#1a4a7a',
  flame: '#ff4400',
};

export const PHASES = [
  { p0: 0, p1: 0.12, key: 'pad', name: 'START', line: 'T-MINUS · RAUMFAHRTANZUG · CHECK' },
  { p0: 0.12, p1: 0.22, key: 'lift', name: 'LIFTOFF', line: 'RAUSCH · 3 · 2 · 1 · GO' },
  { p0: 0.22, p1: 0.35, key: 'atmo', name: 'ATMOSPHÄRE', line: 'Durchbruch · Feuer · Geschwindigkeit' },
  { p0: 0.35, p1: 0.52, key: 'orbit', name: 'ERDUmlauf', line: 'Schwerelos · Anzug · Helm' },
  { p0: 0.52, p1: 0.68, key: 'transit', name: 'TRANSIT', line: 'Warp-Rausch · Sterne · Lichtjahre' },
  { p0: 0.68, p1: 0.82, key: 'moon', name: 'MONFLUG', line: 'Grauer Fels · Staub · EVA-READY' },
  { p0: 0.82, p1: 0.92, key: 'deep', name: 'TIEFRAUM', line: 'Nebel · Galaxie · Stille' },
  { p0: 0.92, p1: 1, key: 'home', name: 'RÜCKKEHR', line: 'Erde blau · Anzug sicher · EOM' },
];

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
