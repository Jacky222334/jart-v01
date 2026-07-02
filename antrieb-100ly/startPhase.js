/** Direktstart · Phase aus URL */
import { CYCLE, PHASES } from './systems.js';

const ALIASES = {
  hailmary: 'hailmary',
  hail: 'hailmary',
  rock: 'hailmary',
  rocky: 'hailmary',
  eridian: 'hailmary',
  finale: 'posturknall',
  paradies: 'posturknall',
  kolonie: 'kolonie',
  fusion: 'fusion',
  intro: 'intro',
  lunch: 'intro',
};

export function normalizePhaseKey(raw) {
  if (!raw) return null;
  const k = raw.toLowerCase().replace(/[-_\s]/g, '');
  if (ALIASES[k]) return ALIASES[k];
  return PHASES.find((p) => p.key === k)?.key ?? null;
}

export function readStartPhase() {
  const params = new URLSearchParams(location.search);
  const fromQuery = params.get('start') || params.get('phase');
  const fromHash = location.hash.replace(/^#/, '');
  return normalizePhaseKey(fromQuery || fromHash);
}

export function phaseStartTime(key, local = 0.05) {
  const ph = PHASES.find((x) => x.key === key);
  if (!ph) return 0;
  const l = Math.max(0, Math.min(1, local));
  return (ph.p0 + (ph.p1 - ph.p0) * l) * CYCLE;
}

export function launchAtPhase(art, key, local = 0.05) {
  const t = phaseStartTime(key, local);
  art.launched = true;
  art.paused = false;
  art.time = t;
  art.t0 = performance.now() - t * 1000;
  art.canvas.style.cursor = 'crosshair';
  document.getElementById('hint')?.classList.add('visible');
  return t;
}

export function phaseRange(key, pad = 0.02) {
  const ph = PHASES.find((x) => x.key === key);
  if (!ph) return null;
  return [Math.max(0, ph.p0 - pad), Math.min(1, ph.p1 + pad)];
}
