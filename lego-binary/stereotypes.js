/** Binäre Geschlechter-Klischees · LEGO-Bauanleitung · 8 Schritte */

export const CYCLE = 72;
export const STEP_SEC = 9;

export const LEGO = {
  yellow: '#f4cd4a',
  blue: '#0055bf',
  pink: '#ec4278',
  red: '#c91a09',
  black: '#1a1a1a',
  white: '#f5f5ee',
  grey: '#888',
  green: '#00852b',
};

export const STEPS = [
  {
    key: 'start',
    step: 1,
    title: 'BAUSTEIN 0 · 1',
    sub: 'Nur zwei Baupläne erlaubt',
    boy: { label: 'JUNGE', blocks: [] },
    girl: { label: 'MÄDCHEN', blocks: [] },
  },
  {
    key: 'farbe',
    step: 2,
    title: 'FARBE ZUWEISEN',
    sub: 'Blau · Rosa · keine Auswahl',
    boy: { torso: LEGO.blue, label: 'BLAU' },
    girl: { torso: LEGO.pink, label: 'ROSA' },
  },
  {
    key: 'kleid',
    step: 3,
    title: 'KLEIDUNG',
    sub: 'Hose · Kleid · fertig',
    boy: { torso: LEGO.blue, legs: 'pants', label: 'HOSE' },
    girl: { torso: LEGO.pink, legs: 'skirt', label: 'KLEID' },
  },
  {
    key: 'haar',
    step: 4,
    title: 'FRISUR',
    sub: 'Kurz · lang · stereotyp',
    boy: { torso: LEGO.blue, legs: 'pants', hair: 'short', label: 'KURZ' },
    girl: { torso: LEGO.pink, legs: 'skirt', hair: 'long', label: 'LANG' },
  },
  {
    key: 'spiel',
    step: 5,
    title: 'SPIELZEUG',
    sub: 'Bagger · Puppe · Klischee',
    boy: { torso: LEGO.blue, legs: 'pants', hair: 'short', prop: 'truck', label: 'BAGGER' },
    girl: { torso: LEGO.pink, legs: 'skirt', hair: 'long', prop: 'doll', label: 'PUPPE' },
  },
  {
    key: 'hobby',
    step: 6,
    title: 'HOBBY',
    sub: 'Fußball · Ballett · Rollenbild',
    boy: { torso: LEGO.blue, legs: 'pants', hair: 'short', prop: 'ball', label: 'FUßBALL' },
    girl: { torso: LEGO.pink, legs: 'skirt', hair: 'long', prop: 'tutu', label: 'BALLETT' },
  },
  {
    key: 'beruf',
    step: 7,
    title: 'TRAUMJOB',
    sub: 'Chef · Pflege · Statistik sagt…',
    boy: { torso: LEGO.blue, legs: 'pants', hair: 'short', prop: 'tie', label: 'CHEF' },
    girl: { torso: LEGO.pink, legs: 'skirt', hair: 'long', prop: 'heart', label: 'PFLEGE' },
  },
  {
    key: 'emotion',
    step: 8,
    title: 'GEFÜHL',
    sub: 'Stark · süß · brav · still',
    boy: { torso: LEGO.blue, legs: 'pants', hair: 'short', prop: 'muscle', label: 'STARK' },
    girl: { torso: LEGO.pink, legs: 'skirt', hair: 'long', prop: 'sparkle', label: 'SÜSS' },
  },
];

export function sceneAt(t) {
  const loop = t % CYCLE;
  const idx = Math.min(STEPS.length - 1, Math.floor(loop / STEP_SEC));
  const local = (loop % STEP_SEC) / STEP_SEC;
  return { step: STEPS[idx], idx, local, loop };
}

export function ease(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export const NOTE = 'Stereotype · nicht Natur · binär = Bauanleitung';
