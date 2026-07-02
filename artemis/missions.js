/** NASA Artemis — komprimierte Programm-Simulation (Stand 2026) */

export const NEON = [
  '#00ffff', '#ffee00', '#ff6600', '#ff0044', '#00ff55', '#aa00ff', '#ffffff',
];

export const CREW = {
  II: ['Wiseman', 'Glover', 'Koch', 'Hansen'],
};

/** Gesamter Loop ~200 s */
export const MISSIONS = [
  {
    id: 'I',
    name: 'ARTEMIS I',
    tag: 'unbemannt · SLS · Orion',
    year: 2022,
    crew: 0,
    simSec: 38,
    realDays: 25.5,
    distanceMi: 1_400_000,
    phases: [
      { p0: 0.00, p1: 0.06, key: 'pad', label: 'T-00 · PAD 39B · KSC' },
      { p0: 0.06, p1: 0.14, key: 'ascent', label: 'LIFTOFF · SLS BLOCK 1 · 8,8 MN' },
      { p0: 0.14, p1: 0.20, key: 'separation', label: 'SRB TRENnung · ICPS ZÜNDUNG' },
      { p0: 0.20, p1: 0.28, key: 'orbit', label: 'LEO · 975 s Brennen · TLI' },
      { p0: 0.28, p1: 0.48, key: 'transit', label: 'TRANSIT · MON · DRO' },
      { p0: 0.48, p1: 0.62, key: 'lunar', label: 'MONFLUG · 130 km · PERISELENIUM' },
      { p0: 0.62, p1: 0.78, key: 'return', label: 'RÜCKFLUG · ERDE · 25 Tage' },
      { p0: 0.78, p1: 0.92, key: 'reentry', label: 'WIEDEREINTRITT · 24.500 mph' },
      { p0: 0.92, p1: 1.00, key: 'splash', label: 'SPLASHDOWN · PAZIFIK · EOM' },
    ],
  },
  {
    id: 'II',
    name: 'ARTEMIS II',
    tag: '4 Crew · erster bemannter Flug',
    year: 2026,
    crew: 4,
    simSec: 36,
    realDays: 10,
    distanceMi: 480_000,
    phases: [
      { p0: 0.00, p1: 0.08, key: 'pad', label: 'T-00 · CREW · WISEMAN · GLOVER · KOCH · HANSEN' },
      { p0: 0.08, p1: 0.16, key: 'ascent', label: 'LIFTOFF · 01 APR 2026 · SLS' },
      { p0: 0.16, p1: 0.24, key: 'orbit', label: 'ERDUmlauf · SYSTEMCHECK · TLI' },
      { p0: 0.24, p1: 0.44, key: 'transit', label: 'TRANS-LUNAR · 240.000 mi' },
      { p0: 0.44, p1: 0.62, key: 'lunar', label: 'MONFLUG · 4.600 mi jenseits · FREEFLY' },
      { p0: 0.62, p1: 0.78, key: 'return', label: 'RÜCKKEHR · ORION · HEAT SHIELD TEST' },
      { p0: 0.78, p1: 0.92, key: 'reentry', label: 'WIEDEREINTRITT · CREW · 11 APR' },
      { p0: 0.92, p1: 1.00, key: 'splash', label: 'SPLASHDOWN · SAN DIEGO · EOM' },
    ],
  },
  {
    id: 'III',
    name: 'ARTEMIS III',
    tag: 'LEO · HLS · Anzug-Test',
    year: 2027,
    crew: 4,
    simSec: 32,
    realDays: 14,
    distanceMi: 0,
    phases: [
      { p0: 0.00, p1: 0.10, key: 'pad', label: 'T-00 · RISIKOREDUKTION · APOLLO-9-STIL' },
      { p0: 0.10, p1: 0.20, key: 'ascent', label: 'LIFTOFF · SLS · ORION + HLS DEMO' },
      { p0: 0.20, p1: 0.35, key: 'orbit', label: 'LEO · 400 km · DOCKING-VORBEREITUNG' },
      { p0: 0.35, p1: 0.55, key: 'docking', label: 'ANDOCKEN · HLS · BLUE MOON / STARSHIP' },
      { p0: 0.55, p1: 0.72, key: 'eva', label: 'EVA-ANZUG · CREW-TRANSFER · LEH TEST' },
      { p0: 0.72, p1: 0.86, key: 'undock', label: 'TRENNUNG · HLS · ORION AUTONOM' },
      { p0: 0.86, p1: 0.94, key: 'reentry', label: 'DEORBIT · WIEDEREINTRITT' },
      { p0: 0.94, p1: 1.00, key: 'splash', label: 'SPLASHDOWN · EOM · LANDER FREIGEGEBEN' },
    ],
  },
  {
    id: 'IV',
    name: 'ARTEMIS IV',
    tag: 'ERSTE MONDLANDUNG · SEIT APOLLO 17',
    year: 2028,
    crew: 4,
    simSec: 48,
    realDays: 30,
    distanceMi: 480_000,
    phases: [
      { p0: 0.00, p1: 0.06, key: 'pad', label: 'T-00 · ZURÜCK ZUM MOND · FRÜH 2028' },
      { p0: 0.06, p1: 0.12, key: 'ascent', label: 'LIFTOFF · SLS BLOCK 1B · ORION' },
      { p0: 0.12, p1: 0.20, key: 'transit', label: 'TLI · HLS VORAB IN LUNAR ORBIT' },
      { p0: 0.20, p1: 0.30, key: 'lunar', label: 'LUNAR ORBIT · ORION · HLS RENDEZVOUS' },
      { p0: 0.30, p1: 0.38, key: 'transfer', label: 'CREW-TRANSFER · HLS · 2 ASTRONAUTEN' },
      { p0: 0.38, p1: 0.50, key: 'descent', label: 'POWERED DESCENT · SÜDPOL · 6 MIN' },
      { p0: 0.50, p1: 0.68, key: 'surface', label: 'SURFACE OPS · EVA · WISSENSCHAFT · REGOLITH' },
      { p0: 0.68, p1: 0.78, key: 'ascent_hls', label: 'HLS ASCENT · RENDEZVOUS · ORION' },
      { p0: 0.78, p1: 0.88, key: 'return', label: 'TEI · ERDE · CREW SAFE' },
      { p0: 0.88, p1: 0.96, key: 'reentry', label: 'WIEDEREINTRITT · ORION' },
      { p0: 0.96, p1: 1.00, key: 'splash', label: 'SPLASHDOWN · APOLLO-MOMENT · EOM' },
    ],
  },
  {
    id: 'V',
    name: 'ARTEMIS V',
    tag: 'ZWEITE LANDUNG · MONDBASIS START',
    year: 2028,
    crew: 4,
    simSec: 40,
    realDays: 30,
    distanceMi: 480_000,
    phases: [
      { p0: 0.00, p1: 0.08, key: 'pad', label: 'T-00 · CADENCE · ~1 MISSION / JAHR' },
      { p0: 0.08, p1: 0.16, key: 'ascent', label: 'LIFTOFF · SLS STANDARD · GATEWAY MODUL' },
      { p0: 0.16, p1: 0.28, key: 'transit', label: 'NRHO · GATEWAY · LOGISTIK' },
      { p0: 0.28, p1: 0.38, key: 'lunar', label: 'LUNAR ORBIT · HLS · CREW TRANSFER' },
      { p0: 0.38, p1: 0.48, key: 'descent', label: 'LANDUNG · ARTEMIS BASE CAMP · REGION' },
      { p0: 0.48, p1: 0.66, key: 'surface', label: 'SURFACE · HABITAT · ISRU · 2. EVA' },
      { p0: 0.66, p1: 0.76, key: 'base', label: 'BASE BUILD · MODULE · SOLAR · ECLSS' },
      { p0: 0.76, p1: 0.86, key: 'ascent_hls', label: 'ASCENT · NRHO · GATEWAY' },
      { p0: 0.86, p1: 0.94, key: 'return', label: 'RÜCKKEHR · ORION · MARS-VORLAUF' },
      { p0: 0.94, p1: 1.00, key: 'splash', label: 'SPLASHDOWN · PROGRAMM FORTSETZUNG · VI+' },
    ],
  },
];

export const TOTAL_SIM = MISSIONS.reduce((s, m) => s + m.simSec, 0);

export function programAt(t) {
  const loop = t % TOTAL_SIM;
  let acc = 0;
  for (let i = 0; i < MISSIONS.length; i++) {
    const m = MISSIONS[i];
    if (loop < acc + m.simSec) {
      const local = (loop - acc) / m.simSec;
      const phase = m.phases.find((ph) => local >= ph.p0 && local < ph.p1)
        || m.phases[m.phases.length - 1];
      return { mission: m, missionIdx: i, local, phase, loopT: loop };
    }
    acc += m.simSec;
  }
  return { mission: MISSIONS[0], missionIdx: 0, local: 0, phase: MISSIONS[0].phases[0], loopT: 0 };
}

export function telemetry(mission, local, phase) {
  const k = phase.key;
  const pl = (local - phase.p0) / Math.max(0.001, phase.p1 - phase.p0);
  const alt = {
    pad: 0, ascent: lerp(0, 450, ease(pl)), separation: lerp(450, 180, ease(pl)),
    orbit: lerp(180, 400, ease(pl)), transit: lerp(400, 380_000, ease(pl)),
    lunar: lerp(380_000, 384_400, ease(pl)), docking: 400, eva: 400, undock: 400,
    transfer: 384_400, descent: lerp(384_400, 0, ease(pl)), surface: 0, base: 0,
    ascent_hls: lerp(0, 384_400, ease(pl)), return: lerp(384_400, 400, ease(pl)),
    reentry: lerp(400, 40, ease(pl)), splash: 0,
  }[k] ?? 400;

  const vel = {
    pad: 0, ascent: lerp(0, 7.8, ease(pl)), separation: 7.2, orbit: 7.8,
    transit: lerp(7.8, 0.8, ease(pl)), lunar: 1.6, docking: 7.7, eva: 7.7,
    transfer: 1.6, descent: lerp(1.6, 0, ease(pl)), surface: 0, base: 0,
    ascent_hls: lerp(0, 1.8, ease(pl)), return: lerp(0.8, 11, ease(pl)),
    reentry: lerp(11, 0.3, ease(pl)), splash: 0,
  }[k] ?? 1;

  const metSec = phase.key === 'pad'
    ? 0
    : Math.floor(local * mission.realDays * 86400);
  return { altKm: Math.max(0, alt), velKms: Math.max(0, vel), metSec };
}

function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function ease(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export function fmtMet(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function fmtAlt(km) {
  if (km >= 1000) return `${(km / 1000).toFixed(1)} Mio km`;
  return `${Math.round(km)} km`;
}
