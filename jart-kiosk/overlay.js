/** Dynamische Hochfarben-Overlays — pro Slide neues Profil, kontinuierliches Aufleuchten */

const BLENDS = ['screen', 'overlay', 'color-dodge', 'soft-light', 'hue', 'hard-light'];
const PALETTES = [
  [0, 320, 180],
  [45, 200, 280],
  [120, 300, 20],
  [200, 40, 160],
  [280, 60, 140],
  [15, 190, 255],
];

export function pickProfile(rnd = Math.random) {
  const hues = PALETTES[Math.floor(rnd() * PALETTES.length)];
  return {
    hues,
    blendA: BLENDS[Math.floor(rnd() * BLENDS.length)],
    blendB: BLENDS[Math.floor(rnd() * BLENDS.length)],
    sat: 1.25 + rnd() * 0.75,
    bright: 1.05 + rnd() * 0.2,
    contrast: 1.02 + rnd() * 0.12,
    pulseMs: 2200 + rnd() * 3800,
    driftMs: 9000 + rnd() * 12000,
    glow: 0.35 + rnd() * 0.45,
  };
}

export class ColorEngine {
  constructor(root) {
    this.root = root;
    this.profile = pickProfile();
    this.t0 = performance.now();
    this.raf = null;
    this.onProfile = null;
  }

  applyProfile(p) {
    this.profile = p;
    this.root.style.setProperty('--sat', p.sat.toFixed(3));
    this.root.style.setProperty('--bright', p.bright.toFixed(3));
    this.root.style.setProperty('--contrast', p.contrast.toFixed(3));
    this.root.style.setProperty('--glow', p.glow.toFixed(3));
    this.root.style.setProperty('--blend-a', p.blendA);
    this.root.style.setProperty('--blend-b', p.blendB);
    this.root.style.setProperty('--h1', String(p.hues[0]));
    this.root.style.setProperty('--h2', String(p.hues[1]));
    this.root.style.setProperty('--h3', String(p.hues[2]));
    this.onProfile?.(p);
  }

  randomize(rnd = Math.random) {
    this.applyProfile(pickProfile(rnd));
    this.t0 = performance.now();
  }

  start() {
    if (this.raf) return;
    const tick = (now) => {
      const p = this.profile;
      const pulse = 0.5 + 0.5 * Math.sin((now - this.t0) / p.pulseMs * Math.PI * 2);
      const drift = ((now - this.t0) / p.driftMs) % 1;
      const hueShift = drift * 360;

      this.root.style.setProperty('--pulse', pulse.toFixed(4));
      this.root.style.setProperty('--hue-shift', `${hueShift.toFixed(2)}deg`);
      this.root.style.setProperty('--glow-a', (0.15 + pulse * p.glow).toFixed(3));
      this.root.style.setProperty('--glow-b', (0.08 + (1 - pulse) * p.glow * 0.85).toFixed(3));

      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }
}
