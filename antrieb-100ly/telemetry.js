/** Telemetrie · Sensoren · phasenabhängig (dramatisiert) */
import { hash, lerp, ease } from './systems.js';

function isFinale(k) {
  return ['reunion', 'fusion', 'posturknall'].includes(k);
}

function isIntro(k) {
  return k === 'intro' || k === 'hailmary' || k === 'relativ' || k === 'kolonie';
}

export function computeTelemetry(state, t, kms) {
  const k = state.ph.key;
  const local = state.local;

  const gBase = {
    intro: 1.0,
    overview: 1.0, chemical: 3.2, scramjet: 2.1, ion: 0.02,
    laser: 0.001, nuclear: 4.5, antimatter: 0.8, quantum: 12,
    seed: 0.0, boost: 6.0, transit: 0.0, relativ: 0.0, hailmary: 0.0, orbit: 0.0,
    reunion: 0.0, kolonie: 0.0, fusion: 0.0, posturknall: 0.0,
  }[k] ?? 0.5;

  const gravity = gBase + Math.sin(t * 1.7) * 0.08 * (k === 'orbit' || isFinale(k) || isIntro(k) ? 0 : 1);
  const accel = (k === 'orbit' || isFinale(k) || isIntro(k)) ? 0 : lerp(0, gBase * 9.81, k === 'chemical' ? ease(local) : 0.7);
  const radiation = {
    intro: 0.1,
    overview: 0.3, chemical: 0.5, scramjet: 0.8, ion: 2.1,
    laser: 1.2, nuclear: 45, antimatter: 18, quantum: 8,
    seed: 99, boost: 22, relativ: 0.01, transit: 0.05, hailmary: 0.02, orbit: 0.02,
    reunion: 0.01, kolonie: 0.0, fusion: 0.5, posturknall: 2,
  }[k] ?? 1;

  const distSunLy = {
    intro: 0,
    overview: 0, chemical: 0, scramjet: 0, ion: 0.0001,
    laser: 0.001, nuclear: 0.01, antimatter: 0.05, quantum: 0.5,
    seed: 2, boost: 10, relativ: 25, transit: 50, hailmary: 55, orbit: 100,
    reunion: 100, kolonie: 100, fusion: 100, posturknall: 100,
  }[k] ?? 0;

  const distTarget = isFinale(k)
    ? Math.max(0, 100 * (1 - local))
    : Math.max(0, 100 - distSunLy);

  return {
    gravity,
    accel,
    radiation: radiation + hash(1, t, 2) * 0.4,
    hullTemp: 22 + (k === 'scramjet' ? 800 : 0) + (k === 'nuclear' ? 400 : 0) + hash(2, t) * 15,
    cabinPress: k === 'scramjet' ? 85 : 101.3,
    o2: 98.2 - hash(3, t) * 0.3,
    co2: 0.4 + hash(4, t) * 0.2,
    gyro: (k === 'orbit' || isFinale(k) ? 0.002 : 0.05 + kms / 500000) * (1 + Math.sin(t * 2)),
    magField: 25 + hash(5, t) * 10 + (k === 'quantum' ? 200 : 0),
    distSunLy,
    distTargetLy: distTarget,
    deltaV: kms / 1000,
    fuelPct: Math.max(5, 100 - state.p * 95),
    ionPower: k === 'ion' ? 120 + local * 80 : (k === 'boost' ? 200 : 0),
    laserGW: k === 'laser' ? 50 + local * 450 : (k === 'boost' ? 100 : 0),
    amTrap: k === 'antimatter' ? 4.2 : 0,
    qCoherence: k === 'quantum' ? 60 + local * 35 : 0,
    seedStability: k === 'seed' ? 70 + Math.sin(t * 3) * 20 : 0,
    vib: 0.1 + spdFactor(kms) * 2 + (k === 'nuclear' ? 1.5 : 0),
    starTrack: k === 'kolonie' ? 'BETHY · JANY · GARTEN' : k === 'relativ' ? 'gμν · WURMLOCH · Q-VAK' : k === 'hailmary' ? '40 ERIDANI · ROCKY · DU' : k === 'intro' ? 'BETHY · JANY · CREW' : k === 'orbit' || k === 'reunion' ? 'CRUX · Bethy · Jany' : isFinale(k) ? 'FUSION ♥' : '—',
  };
}

function spdFactor(kms) {
  return Math.min(1, kms / 100000);
}

export const LEGEND_ITEMS = [
  { key: 'gravity', label: 'GRAVITÄT', unit: 'g', color: 'yellow', fmt: (v) => v.toFixed(2) },
  { key: 'accel', label: 'BESCHLEUNIGUNG', unit: 'm/s²', color: 'orange', fmt: (v) => v.toFixed(1) },
  { key: 'radiation', label: 'STRAHLUNG', unit: 'mSv/h', color: 'nuclear', fmt: (v) => v.toFixed(1) },
  { key: 'hullTemp', label: 'HÜLLE TEMP', unit: '°C', color: 'flame', fmt: (v) => Math.floor(v) },
  { key: 'cabinPress', label: 'KABINE DRUCK', unit: 'kPa', color: 'cyan', fmt: (v) => v.toFixed(1) },
  { key: 'o2', label: 'O₂ SENS', unit: '%', color: 'green', fmt: (v) => v.toFixed(1) },
  { key: 'co2', label: 'CO₂ SENS', unit: 'mmHg', color: 'green', fmt: (v) => v.toFixed(2) },
  { key: 'gyro', label: 'GYRO', unit: '°/s', color: 'cyan', fmt: (v) => v.toFixed(3) },
  { key: 'magField', label: 'MAGNETOMETER', unit: 'µT', color: 'ion', fmt: (v) => v.toFixed(0) },
  { key: 'distSunLy', label: 'DIST SONNE', unit: 'LY', color: 'orange', fmt: (v) => v.toFixed(2) },
  { key: 'distTargetLy', label: 'DIST ZIEL', unit: 'LY', color: 'magenta', fmt: (v) => v.toFixed(1) },
  { key: 'deltaV', label: 'ΔV', unit: 'M km/s', color: 'cyan', fmt: (v) => v.toFixed(2) },
  { key: 'fuelPct', label: 'TREIBSTOFF', unit: '%', color: 'nuclear', fmt: (v) => Math.floor(v), bar: true },
  { key: 'ionPower', label: 'ION LEISTUNG', unit: 'kW', color: 'ion', fmt: (v) => v.toFixed(0) },
  { key: 'laserGW', label: 'LASER BOARD', unit: 'GW', color: 'laser', fmt: (v) => v.toFixed(0) },
  { key: 'amTrap', label: 'AM-FALLE', unit: 'T', color: 'antimatter', fmt: (v) => v.toFixed(1) },
  { key: 'qCoherence', label: 'Q-KOHÄRENZ', unit: '%', color: 'quantum', fmt: (v) => v.toFixed(0), bar: true },
  { key: 'seedStability', label: 'SEED STAB', unit: '%', color: 'white', fmt: (v) => v.toFixed(0), bar: true },
  { key: 'vib', label: 'VIBRATION', unit: 'g RMS', color: 'magenta', fmt: (v) => v.toFixed(2) },
  { key: 'starTrack', label: 'STERN SENSOR', unit: '', color: 'yellow', fmt: (v) => v, text: true },
];
