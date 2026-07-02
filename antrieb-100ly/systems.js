/** Antrieb-100LY · Alle Raketensysteme · Interstellar · Südhemisphäre */

export const CYCLE = 150;

export const NEON = {
  void: '#000010',
  cyan: '#00ffff',
  magenta: '#ff00ea',
  laser: '#ff2244',
  quantum: '#8844ff',
  antimatter: '#cc44ff',
  nuclear: '#ffee00',
  ion: '#4488ff',
  flame: '#ff4400',
  seed: '#ffffff',
  green: '#00ff88',
  orange: '#ff8800',
  white: '#ffffff',
  yellow: '#ffee88',
};

export const SYSTEMS = {
  intro: {
    key: 'intro', name: 'CREW · BETHY & JANY', line: 'Katzen-Astronauten · Mission 100 LY · Start',
    isp: '—', thrust: '—', tech: ['Bethy', 'Jany', 'EVA', 'O₂ OK'],
  },
  overview: {
    key: 'overview', name: 'SYSTEM-ÜBERSICHT', line: '8 Antriebe · Vergleich · Mission 100 LY',
    isp: '—', thrust: '—', tech: ['Chemie', 'Luft', 'Ion', 'Laser', 'Nuklear', 'AM', 'Quant', 'Seed'],
  },
  chemical: {
    key: 'chemical', name: 'CHEMISCH · LOX/RP-1', line: 'Turbopumpe · Brennkammer · Düsenstrahl',
    isp: '450 s', thrust: '7,5 MN', speed: 7800, tech: ['LOX-Tank', 'RP-1', 'Gimbal ±5°', 'Regenerativkühlung'],
  },
  scramjet: {
    key: 'scramjet', name: 'SCRAMJET · LUFT', line: 'Luftkompressor · Überschall-Verbrennung · Luftlöcher',
    isp: '1200 s', thrust: '200 kN', speed: 25000, tech: ['Einlass-Schock', 'Stator/Rotor', 'Brenner-Rampe', 'Auslass-Düse'],
  },
  ion: {
    key: 'ion', name: 'ION · ELEKTRONEN', line: 'Xenon · Gitter · Elektronenbeschleuniger',
    isp: '3000 s', thrust: '0,5 N', speed: 42000, tech: ['Katode', 'Anode-Gitter', 'e⁻ Beschleuniger', 'Plasma-Jet'],
  },
  laser: {
    key: 'laser', name: 'LASER-SAIL · BOARD', line: 'GW-Laser · Reflektor · Photonendruck',
    isp: '∞ (photon)', thrust: '1 N / MW', speed: 200000, tech: ['Laser-Board', 'Sail 1 km²', 'Phase-Lock', 'Messerschnitt-Strahl'],
  },
  nuclear: {
    key: 'nuclear', name: 'NUKLEAR · PULS', line: 'Orion-Puls · Schockwelle · Absorber',
    isp: '6000 s', thrust: '4 MN', speed: 95000, tech: ['Spalt-Patronen', 'Pusher-Platte', 'Schock-Dämpfer', 'Magnetfeld'],
  },
  antimatter: {
    key: 'antimatter', name: 'ANTIMATERIE · e⁺e⁻', line: 'Annihilation · Magnetspiegel · Elektronenfresser-Kern',
    isp: '10000 s', thrust: '100 kN', speed: 150000, tech: ['Penning-Falle', 'e⁻ / e⁺', 'γ-Strahlung', 'Heatsink'],
  },
  quantum: {
    key: 'quantum', name: 'QUANTEN · IMPLOSION', line: 'Vakuum-Fluktuation · Casimir · Implosion → Stoß',
    isp: 'speculativ', thrust: '—', speed: 500000, tech: ['Q-Vakuum', 'Implosion-Kegel', 'Teilchen-Paar', 'Stoßfront'],
  },
  seed: {
    key: 'seed', name: 'SEED-PUNKT', line: 'Singularitäts-Keim · Raumzeit-Krümmung · Mikro-Wurmloch',
    isp: '—', thrust: 'Metrik', speed: 1000000, tech: ['Seed 10⁻³⁵ m', 'Krümmung +', 'Horizont', 'Einfall'],
  },
  boost: {
    key: 'boost', name: 'VOLLAST · ALLE SYSTEME', line: 'Kaskade · Chem → Luft → Ion → Laser → AM → Quant → Seed',
    isp: 'mix', thrust: 'MAX', speed: 29979245, tech: ['Stage 1-8', 'Handoff', 'Sync', 'Burn'],
  },
  relativ: {
    key: 'relativ', name: 'KOSMOS · RELATIVITÄT', line: 'Raumzeit · Schwarze Löcher · Abkürzung · Quantenvakuum',
    isp: '—', thrust: 'Metrik', speed: 299792458, tech: ['γ · Δt', 'Rs · BH', 'Wurmloch', 'Q-Vakuum'],
  },
  transit: {
    key: 'transit', name: 'TRANSIT · 100 LY', line: 'Alpha Centauri-Richtung · 0,1 c · 1000 Jahre → 10 Jahre',
    isp: '—', thrust: 'coast', speed: 29979245, tech: ['100 LY', '9,46×10¹⁴ km', 'Südlich', 'Ziel: α Cen'],
  },
  hailmary: {
    key: 'hailmary', name: 'HAIL MARY · KONTAKT', line: 'Extraterrestisches Leben · Rocky · spricht zu DIR',
    isp: '—', thrust: '—', speed: 29979245, tech: ['Eridian', 'Rocky', '40 Eri', 'Kontakt'],
  },
  orbit: {
    key: 'orbit', name: 'INTERSTELLAR · ORBIT', line: '100 Lichtjahre · Südliche Hemisphäre · Kreuz des Südens',
    isp: '—', thrust: '0', speed: 0, tech: ['Crux', 'α/β Cen', 'LMC', 'Canopus'],
  },
  reunion: {
    key: 'reunion', name: 'ANKUNFT · BETHY · JANY', line: '100 LY erreicht · zwei Katzen · nähern sich',
    isp: '—', thrust: '0', speed: 0, tech: ['Bethy', 'Jany', 'Süden', 'Herz'],
  },
  kolonie: {
    key: 'kolonie', name: 'KOLONIE · SIEDLUNG', line: 'Raumschiff bauen · Planet · Station · Bäume · Tanz',
    isp: '—', thrust: '—', speed: 0, tech: ['Ship', 'Landung', 'Bäume', 'Früchte'],
  },
  fusion: {
    key: 'fusion', name: 'FUSION', line: 'Bethy + Jany · verschmelzen · Liebes-Plasma',
    isp: '—', thrust: '♥', speed: 0, tech: ['Merge', 'Glow', 'Postur', 'Ready'],
  },
  posturknall: {
    key: 'posturknall', name: 'HAPPY END · PARADIES', line: 'Siedlung · Früchte · Wasserfälle · Bethy & Jany · Glück',
    isp: '∞ ♥', thrust: '♥', speed: 0, tech: ['Wasser', 'Obst', 'Station', 'Für immer'],
  },
};

export const PHASES = [
  { p0: 0, p1: 0.048, key: 'intro' },
  { p0: 0.048, p1: 0.115, key: 'overview' },
  { p0: 0.115, p1: 0.185, key: 'chemical' },
  { p0: 0.185, p1: 0.265, key: 'scramjet' },
  { p0: 0.265, p1: 0.345, key: 'ion' },
  { p0: 0.345, p1: 0.425, key: 'laser' },
  { p0: 0.425, p1: 0.505, key: 'nuclear' },
  { p0: 0.505, p1: 0.585, key: 'antimatter' },
  { p0: 0.585, p1: 0.665, key: 'quantum' },
  { p0: 0.665, p1: 0.745, key: 'seed' },
  { p0: 0.745, p1: 0.798, key: 'boost' },
  { p0: 0.798, p1: 0.838, key: 'relativ' },
  { p0: 0.838, p1: 0.858, key: 'transit' },
  { p0: 0.858, p1: 0.885, key: 'hailmary' },
  { p0: 0.885, p1: 0.902, key: 'orbit' },
  { p0: 0.902, p1: 0.916, key: 'reunion' },
  { p0: 0.916, p1: 0.962, key: 'kolonie' },
  { p0: 0.962, p1: 0.978, key: 'fusion' },
  { p0: 0.978, p1: 1, key: 'posturknall' },
].map((p) => ({ ...p, ...SYSTEMS[p.key] }));

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
  const c = 299792.458;
  if (kms >= c * 0.01) return `${(kms / c).toFixed(3)} c`;
  if (kms >= 1000) return `${(kms / 1000).toFixed(1)} M km/s`;
  return `${Math.floor(kms).toLocaleString('de-DE')} km/s`;
}
