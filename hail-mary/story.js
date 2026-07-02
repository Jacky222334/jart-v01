/** Project Hail Mary · Astrophage — cinematic story arc (~220 s) */

export const CYCLE = 220;

export const PALETTE = {
  void: '#000008',
  star: '#fff8e0',
  corona: '#ffaa44',
  ir: '#ff2200',
  irDim: '#881100',
  astro: '#ff6600',
  astroCore: '#ffee88',
  iridium: '#aaccdd',
  nemesis: '#ff0044',
  hope: '#00ffff',
  rocky: '#aa88ff',
  ship: '#ffffff',
  petrova: '#ff3300',
};

export const ACTS = [
  {
    p0: 0.00, p1: 0.07, key: 'silence', name: 'STILLE',
    line: '12 Lichtjahre · nichts bewegt sich',
    sub: 'SOL · NORMAL',
  },
  {
    p0: 0.07, p1: 0.14, key: 'petrova', name: 'PETROVA-LINIE',
    line: 'Infrarot-Anomalie · 25,9° zur Ekliptik',
    sub: 'DIE SONNE LECKT ENERGIE',
  },
  {
    p0: 0.14, p1: 0.22, key: 'first', name: 'ERSTE SPOREN',
    line: 'Mikroorganismen · Iridium-Schale · 10 µm',
    sub: 'ASTROPHAGE',
  },
  {
    p0: 0.22, p1: 0.32, key: 'swarm', name: 'SCHWARM',
    line: 'Sie fressen Photonen · speichern Infrarot',
    sub: '10,6% HELLIGKEITSVERLUST · PRO JAHR',
  },
  {
    p0: 0.32, p1: 0.40, key: 'dark', name: 'DUNKELHEIT',
    line: 'Die Erde friert · die Menschheit stirbt',
    sub: '8 JAHRE BIS EXTINCTION',
  },
  {
    p0: 0.40, p1: 0.50, key: 'launch', name: 'HAIL MARY',
    line: 'Ryland Grace · allein · Tau Ceti',
    sub: 'ASTROPHAGE-ANTRIEB · SPIN-SCHIFF',
  },
  {
    p0: 0.50, p1: 0.62, key: 'warp', name: 'INTERSTELLAR',
    line: 'Sie wandern von Stern zu Stern',
    sub: 'VEGA → SOL → TAU CETI',
  },
  {
    p0: 0.62, p1: 0.72, key: 'tauceti', name: 'TAU CETI',
    line: 'Zweiter infizierter Stern · gleiche Seuche',
    sub: '12,4 LJ ENTFERNT',
  },
  {
    p0: 0.72, p1: 0.80, key: 'rocky', name: 'AMPERSAND',
    line: 'Rocky · Eridian · 40 Eridani',
    sub: '◈ ZWEI SPEZIES · EIN PROBLEM',
  },
  {
    p0: 0.80, p1: 0.88, key: 'nemesis', name: 'NEMESIS',
    line: 'Der Jäger frisst Astrophagen',
    sub: 'DAS UNIVERSUM HAT IMMER EIN GLEICHGEWICHT',
  },
  {
    p0: 0.88, p1: 0.95, key: 'solution', name: 'LÖSUNG',
    line: 'Proben zurück zur Erde · Sonne heilt',
    sub: 'WISSENSCHAFT RETTET ALLES',
  },
  {
    p0: 0.95, p1: 1.00, key: 'dawn', name: 'MORGEN',
    line: 'Sol brennt wieder · du bist nicht allein',
    sub: 'PROJECT HAIL MARY · ENDE',
  },
];

export function storyAt(t) {
  const p = (t % CYCLE) / CYCLE;
  const act = ACTS.find((a) => p >= a.p0 && p < a.p1) || ACTS[ACTS.length - 1];
  const local = (p - act.p0) / Math.max(0.001, act.p1 - act.p0);
  return { p, act, local, t: t % CYCLE };
}

export function smooth(a, b, t) {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function hash(x, y, t = 0) {
  const s = Math.sin(x * 127.1 + y * 311.7 + t * 47.3) * 43758.5453;
  return s - Math.floor(s);
}

export function starBrightness(actKey, local, p) {
  const base = {
    silence: 1.0,
    petrova: lerp(1.0, 0.92, local),
    first: lerp(0.92, 0.85, local),
    swarm: lerp(0.85, 0.65, local),
    dark: lerp(0.65, 0.45, local),
    launch: lerp(0.45, 0.55, local),
    warp: 0.5,
    tauceti: lerp(0.5, 0.4, local),
    rocky: 0.55,
    nemesis: lerp(0.55, 0.35, local),
    solution: lerp(0.35, 0.85, local),
    dawn: lerp(0.85, 1.0, local),
  }[actKey] ?? 1;
  return base;
}

export function astrophageCount(actKey, local) {
  const n = {
    silence: 0,
    petrova: lerp(0, 80, local),
    first: lerp(80, 400, local),
    swarm: lerp(400, 2200, local),
    dark: lerp(2200, 3500, local),
    launch: lerp(3500, 1200, local),
    warp: lerp(1200, 2800, local),
    tauceti: lerp(2800, 3200, local),
    rocky: 1800,
    nemesis: lerp(1800, 800, local),
    solution: lerp(800, 200, local),
    dawn: lerp(200, 0, local),
  }[actKey] ?? 0;
  return Math.floor(n);
}

export function dimPercent(brightness) {
  return ((1 - brightness) * 100).toFixed(1);
}
