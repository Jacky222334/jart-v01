/** Catwalk-Lookbook · Raumanzüge · realistische Proportionen */

export const NEON = ['#ffffff', '#00ffff', '#ffee00', '#ff6600', '#ff0044', '#aa88ff'];

export const LOOKS = [
  {
    id: 'xemu-m',
    name: 'NASA xEMU',
    gender: 'M',
    tag: 'Artemis · Mond-EVA',
    colors: { suit: '#e8e8ec', trim: '#ff6600', visor: '#1a3a5c', boot: '#888' },
    shoulder: 1.12, hip: 1.0, height: 1.05, plss: 'large',
  },
  {
    id: 'xemu-f',
    name: 'NASA xEMU',
    gender: 'F',
    tag: 'Artemis · Mond-EVA · Damenpassform',
    colors: { suit: '#ece8ee', trim: '#ff6600', visor: '#1a3a5c', boot: '#888' },
    shoulder: 0.92, hip: 1.06, height: 0.96, plss: 'large',
  },
  {
    id: 'spx-m',
    name: 'SpaceX EVA',
    gender: 'M',
    tag: 'Starship · Weiß · Minimal',
    colors: { suit: '#f4f4f6', trim: '#000', visor: '#223355', boot: '#333' },
    shoulder: 1.08, hip: 0.98, height: 1.02, plss: 'slim',
  },
  {
    id: 'spx-f',
    name: 'SpaceX EVA',
    gender: 'F',
    tag: 'Starship · Damenlinie',
    colors: { suit: '#f6f4f8', trim: '#000', visor: '#223355', boot: '#333' },
    shoulder: 0.88, hip: 1.08, height: 0.94, plss: 'slim',
  },
  {
    id: 'orion-m',
    name: 'Orion IVA',
    gender: 'M',
    tag: 'Start · Reentry · orange',
    colors: { suit: '#c85a12', trim: '#1a1a1a', visor: '#2a1a0a', boot: '#222' },
    shoulder: 1.06, hip: 1.0, height: 1.0, plss: 'none',
  },
  {
    id: 'orion-f',
    name: 'Orion IVA',
    gender: 'F',
    tag: 'Crew · Artemis II',
    colors: { suit: '#c85a12', trim: '#1a1a1a', visor: '#2a1a0a', boot: '#222' },
    shoulder: 0.9, hip: 1.05, height: 0.95, plss: 'none',
  },
  {
    id: 'axiom-m',
    name: 'Axiom · AxEMU',
    gender: 'M',
    tag: 'Commercial · ISS · schwarz',
    colors: { suit: '#2a2a32', trim: '#00ffff', visor: '#112233', boot: '#111' },
    shoulder: 1.1, hip: 1.0, height: 1.03, plss: 'medium',
  },
  {
    id: 'axiom-f',
    name: 'Axiom · AxEMU',
    gender: 'F',
    tag: 'Commercial · ISS · Damen',
    colors: { suit: '#2e2e36', trim: '#00ffff', visor: '#112233', boot: '#111' },
    shoulder: 0.9, hip: 1.07, height: 0.95, plss: 'medium',
  },
];

export const WALK_SEC = 14;
export const POSE_SEC = 2.5;
export const TOTAL = LOOKS.length * (WALK_SEC + POSE_SEC);

export function showAt(t) {
  const loop = t % TOTAL;
  const block = WALK_SEC + POSE_SEC;
  const idx = Math.floor(loop / block) % LOOKS.length;
  const local = loop % block;
  const look = LOOKS[idx];
  const walking = local < WALK_SEC;
  const walkT = walking ? local / WALK_SEC : 1;
  const poseT = walking ? 0 : (local - WALK_SEC) / POSE_SEC;
  return { look, idx, walkT, poseT, walking, local, loop };
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function ease(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}
