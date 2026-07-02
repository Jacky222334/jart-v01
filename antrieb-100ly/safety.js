/** Safety Board · Rettungskapsel · Schutz — immer aktiv */
import { hash } from './systems.js';

export function computeSafety(state, tel, t) {
  const k = state.ph.key;
  const rad = tel.radiation;
  const g = tel.gravity;
  const vib = tel.vib;

  const hazard = rad > 15 || g > 5 || vib > 1.2
    || ['nuclear', 'antimatter', 'quantum', 'seed', 'boost'].includes(k);

  const critical = rad > 35 || g > 8 || k === 'seed';

  const shieldPct = Math.max(12, 100 - rad * 0.8 - vib * 8 + Math.sin(t * 0.5) * 2);
  const hullPct = Math.max(20, 100 - tel.hullTemp / 15 - vib * 5);

  return {
    abort: critical ? 'ARMED' : hazard ? 'STANDBY' : 'SAFE',
    escapeTower: k === 'chemical' || k === 'boost' ? 'LINKED' : 'JETTISON OK',
    capsule: critical ? 'AKTIV' : 'BEREIT',
    capsuleShield: shieldPct,
    heatShield: hullPct,
    gLimit: g > 6 ? 'WARN' : 'OK',
    radShield: rad > 10 ? (rad > 30 ? 'CRIT' : 'WARN') : 'OK',
    breach: vib > 1.5 ? 'SCAN' : 'NONE',
    autoSep: hazard ? 'ARMED' : 'OFF',
    crew: critical ? 'EVAC' : k === 'kolonie' ? '♥ GLÜCK' : k === 'relativ' ? 'METRIC OK' : k === 'hailmary' ? 'ALIEN OK' : k === 'intro' ? 'CREW OK' : ['reunion', 'fusion', 'posturknall'].includes(k) ? '♥ SAFE' : tel.o2 > 95 ? 'SAFE' : 'CHECK',
    hazard,
    critical,
    chute: k === 'orbit' || k === 'chemical' ? 'PACKED' : 'STORED',
    beacon: 'ON',
  };
}

export const SAFETY_ROWS = [
  { key: 'abort', label: 'ABORT', ok: ['SAFE'], warn: ['STANDBY'], crit: ['ARMED'] },
  { key: 'escapeTower', label: 'ESCAPE TOWER', ok: ['JETTISON OK'], warn: ['LINKED'], crit: [] },
  { key: 'capsule', label: 'RETTUNGSKAPSEL', ok: ['BEREIT'], warn: [], crit: ['AKTIV'] },
  { key: 'capsuleShield', label: 'KAPSEL-SCHILD', bar: true },
  { key: 'heatShield', label: 'HITZE-SCHUTZ', bar: true },
  { key: 'gLimit', label: 'G-LIMIT', ok: ['OK'], warn: ['WARN'], crit: [] },
  { key: 'radShield', label: 'STRahl-SCHIRM', ok: ['OK'], warn: ['WARN'], crit: ['CRIT'] },
  { key: 'breach', label: 'HULL BREACH', ok: ['NONE'], warn: ['SCAN'], crit: [] },
  { key: 'autoSep', label: 'AUTO-TRENNUNG', ok: ['OFF'], warn: ['ARMED'], crit: [] },
  { key: 'crew', label: 'CREW', ok: ['SAFE'], warn: ['CHECK'], crit: ['EVAC'] },
  { key: 'chute', label: 'FALLSCHIRM', ok: ['STORED', 'PACKED'], warn: [], crit: [] },
  { key: 'beacon', label: 'NOTSENDER', ok: ['ON'], warn: [], crit: [] },
];

export function statusColor(row, val, safety, NEON) {
  if (row.bar) {
    if (val < 35) return NEON.flame;
    if (val < 65) return NEON.nuclear;
    return NEON.green;
  }
  if (row.crit?.includes(val)) return NEON.flame;
  if (row.warn?.includes(val)) return NEON.nuclear;
  if (row.ok?.includes(val)) return NEON.green;
  return NEON.cyan;
}
