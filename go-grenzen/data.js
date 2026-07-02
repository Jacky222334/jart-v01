/** GO · Körper · Grenzen — altersgerecht · neutral */

export const PAL = {
  bg: '#080818',
  go: '#00ff88',
  cyan: '#00ffff',
  pink: '#ff66aa',
  yellow: '#ffee00',
  violet: '#aa88ff',
  white: '#ffffff',
  grey: '#667',
};

export const LABEL = 'GO · KÖRPER · GRENZEN';
export const SUB = 'PRIVAT · NEIN · VERTRAUEN · WACHSTUM';

export const STEPS = [
  { key: 'body', title: 'MEIN KÖRPER', line: 'Gehört mir · einzigartig · OK', icon: '◉' },
  { key: 'private', title: 'PRIVAT', line: 'Unter der Badehose · nur ich', icon: '▣' },
  { key: 'no', title: 'NEIN SAGEN', line: 'Grenze · Stopp · respektiert', icon: '◼' },
  { key: 'trust', title: 'VERTRAUEN', line: 'Erzählen · Eltern · Lehrperson', icon: '♥' },
  { key: 'grow', title: 'WACHSTUM', line: 'Pubertät kommt · normal · alle', icon: '▲' },
  { key: 'go', title: 'GO', line: 'Du bestimmst · du bist sicher', icon: '◆' },
];

export const STEP_SEC = 8;
export const CYCLE = STEPS.length * STEP_SEC;

export function sceneAt(t) {
  const loop = t % CYCLE;
  const idx = Math.floor(loop / STEP_SEC) % STEPS.length;
  const local = (loop % STEP_SEC) / STEP_SEC;
  return { step: STEPS[idx], idx, local, loop };
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

export const NOTE = 'Sexualkunde · sachlich · ohne Details · Klasse 4/5';
