import {
  MISSIONS, NEON, TOTAL_SIM, programAt, telemetry, fmtMet, fmtAlt,
} from './missions.js';

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hash(n) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

export class ArtemisSim {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.paused = false;
    this.t0 = performance.now();
    this.simTime = 0;
    this.raf = null;
    this.stars = [];
    this.particles = [];
    this.shake = 0;
    this.missionFlash = 0;
    this.lastMissionIdx = -1;
    this.resize();
    this.initStars();
    window.addEventListener('resize', () => { this.resize(); this.initStars(); });
  }

  initStars() {
    this.stars = Array.from({ length: 280 }, (_, i) => ({
      x: hash(i * 1.7) * this.w,
      y: hash(i * 2.3 + 1) * this.h,
      z: hash(i * 3.1 + 2),
      ch: '·+*'.charAt(Math.floor(hash(i) * 3)),
    }));
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * dpr);
    this.canvas.height = Math.floor(this.h * dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.earthR = Math.min(this.w, this.h) * 0.14;
    this.earthCx = this.w * 0.5;
    this.earthCy = this.h * 0.78;
  }

  spawnExhaust(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 2,
        vy: 2 + Math.random() * 5,
        life: 0.4 + Math.random() * 0.5,
        t: this.simTime,
        color,
        ch: '▓▒░≈'.charAt(Math.floor(Math.random() * 4)),
      });
    }
  }

  spawnReentry(x, y) {
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 4,
        life: 0.3 + Math.random() * 0.4,
        t: this.simTime,
        color: NEON[2],
        ch: '✦*'.charAt(Math.floor(Math.random() * 2)),
      });
    }
  }

  vehiclePos(state) {
    const { phase, local, mission, missionIdx } = state;
    const ph = phase;
    const lp = (local - ph.p0) / Math.max(0.001, ph.p1 - ph.p0);
    const k = ph.key;
    const ec = this.earthCx;
    const ey = this.earthCy - this.earthR;
    const moonOrbitR = Math.min(this.w, this.h) * 0.32;
    const moonA = this.simTime * 0.15 + missionIdx * 0.4;

    switch (k) {
      case 'pad':
        return { x: ec, y: ey - 8, angle: 0, mode: 'stack' };
      case 'ascent':
        return { x: ec, y: lerp(ey - 8, this.h * 0.25, lp), angle: 0, mode: 'stack' };
      case 'separation':
        return { x: ec + Math.sin(lp * 8) * 4, y: lerp(this.h * 0.25, this.h * 0.22, lp), angle: 0, mode: 'stack' };
      case 'orbit':
      case 'docking':
      case 'eva':
      case 'undock':
        return {
          x: ec + Math.cos(this.simTime * 1.2) * this.earthR * 1.8,
          y: ey - this.earthR * 1.6 + Math.sin(this.simTime * 1.2) * this.earthR * 0.5,
          angle: this.simTime * 1.2 + Math.PI / 2,
          mode: k === 'docking' || k === 'eva' ? 'docked' : 'orion',
        };
      case 'transit':
      case 'return':
        return {
          x: lerp(ec, ec + Math.cos(moonA) * moonOrbitR, lp),
          y: lerp(ey - this.earthR * 2, this.earthCy - this.earthR - Math.sin(moonA) * moonOrbitR * 0.5, lp),
          angle: -Math.PI / 2 + lp * 0.3,
          mode: 'orion',
        };
      case 'lunar':
      case 'transfer':
        return {
          x: ec + Math.cos(moonA) * moonOrbitR,
          y: this.earthCy - this.earthR - Math.abs(Math.sin(moonA)) * moonOrbitR * 0.45,
          angle: moonA + Math.PI / 2,
          mode: k === 'transfer' ? 'docked' : 'orion',
        };
      case 'descent':
        return {
          x: ec + Math.cos(moonA) * moonOrbitR * (1 - lp * 0.85),
          y: lerp(this.earthCy - this.earthR - moonOrbitR * 0.35, this.earthCy - this.earthR + 18, lp),
          angle: Math.PI,
          mode: 'hls',
        };
      case 'surface':
      case 'base':
        return {
          x: ec + Math.cos(moonA) * moonOrbitR * 0.12,
          y: this.earthCy - this.earthR + 22,
          angle: 0,
          mode: 'surface',
        };
      case 'ascent_hls':
        return {
          x: ec + Math.cos(moonA) * moonOrbitR * (0.12 + lp * 0.7),
          y: lerp(this.earthCy - this.earthR + 18, this.earthCy - this.earthR - moonOrbitR * 0.35, lp),
          angle: -Math.PI / 2,
          mode: 'hls',
        };
      case 'reentry':
        return {
          x: lerp(this.w * 0.72, ec, lp),
          y: lerp(this.h * 0.18, ey + 30, lp),
          angle: Math.PI / 2 + lp * 0.5,
          mode: 'orion',
        };
      case 'splash':
        return { x: ec, y: ey + 40, angle: Math.PI / 2, mode: 'capsule' };
      default:
        return { x: ec, y: this.h * 0.3, angle: 0, mode: 'orion' };
    }
  }

  drawStars(ctx, t) {
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const s of this.stars) {
      const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2 + s.z * 20));
      ctx.globalAlpha = tw * 0.7;
      ctx.fillStyle = NEON[Math.floor(s.z * NEON.length) % NEON.length];
      ctx.fillText(s.ch, s.x, s.y);
    }
    ctx.globalAlpha = 1;
  }

  drawEarth(ctx) {
    const { earthCx: cx, earthCy: cy, earthR: r } = this;
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    g.addColorStop(0, '#2244aa');
    g.addColorStop(0.6, '#002266');
    g.addColorStop(1, '#001133');
    ctx.fillStyle = g;
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#00ffff';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#00ffff';
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = '600 11px monospace';
    ctx.fillStyle = '#00ffff';
    ctx.textAlign = 'center';
    ctx.fillText('ERDE', cx, cy + r + 16);
  }

  drawMoon(ctx, state) {
    const show = ['transit', 'lunar', 'transfer', 'descent', 'surface', 'base', 'ascent_hls', 'return'].includes(state.phase.key);
    if (!show) return;
    const moonOrbitR = Math.min(this.w, this.h) * 0.32;
    const a = this.simTime * 0.15 + state.missionIdx * 0.4;
    const mx = this.earthCx + Math.cos(a) * moonOrbitR;
    const my = this.earthCy - this.earthR - Math.abs(Math.sin(a)) * moonOrbitR * 0.45;
    const mr = this.earthR * 0.28;
    ctx.fillStyle = '#cccccc';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffee00';
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffee00';
    ctx.font = '600 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MOND', mx, my + mr + 14);
  }

  drawVehicle(ctx, pos, state, color) {
    const { x, y, angle, mode } = pos;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 22;
    ctx.shadowColor = color;

    if (mode === 'stack') {
      ctx.fillStyle = color;
      ctx.font = 'bold 14px monospace';
      ctx.fillText('▲', 0, -28);
      ctx.font = 'bold 11px monospace';
      ctx.fillText('SLS', 0, -14);
      ctx.fillStyle = NEON[0];
      ctx.fillText('◉', 0, 0);
      ctx.fillStyle = NEON[1];
      ctx.font = 'bold 16px monospace';
      ctx.fillText('█', 0, 16);
      ctx.font = '10px monospace';
      ctx.fillText('▓▓▓', 0, 30);
    } else if (mode === 'orion') {
      ctx.fillStyle = color;
      ctx.font = 'bold 18px monospace';
      ctx.fillText('◉', 0, -6);
      ctx.font = 'bold 12px monospace';
      ctx.fillText('ORION', 0, 10);
      if (state.mission.crew > 0) {
        ctx.font = '10px monospace';
        ctx.fillStyle = NEON[4];
        ctx.fillText('●●●●', 0, 24);
      }
    } else if (mode === 'docked') {
      ctx.fillStyle = color;
      ctx.font = 'bold 14px monospace';
      ctx.fillText('◉═══▲', 0, 0);
      ctx.font = '9px monospace';
      ctx.fillStyle = NEON[5];
      ctx.fillText('ORION · HLS', 0, 16);
    } else if (mode === 'hls') {
      ctx.fillStyle = NEON[3];
      ctx.font = 'bold 16px monospace';
      ctx.fillText('▲', 0, -8);
      ctx.font = '10px monospace';
      ctx.fillText('HLS', 0, 8);
    } else if (mode === 'surface') {
      ctx.fillStyle = NEON[2];
      ctx.font = 'bold 14px monospace';
      ctx.fillText('▲', 0, -10);
      ctx.font = '9px monospace';
      ctx.fillText('EVA', 0, 4);
      if (state.phase.key === 'base') {
        ctx.fillStyle = NEON[0];
        ctx.fillText('▣▣▣ BASE', 0, 20);
      }
    } else {
      ctx.fillStyle = color;
      ctx.font = 'bold 20px monospace';
      ctx.fillText('◉', 0, 0);
    }
    ctx.restore();
  }

  drawTrajectory(ctx, pos, state) {
    if (state.phase.key === 'pad') return;
    ctx.strokeStyle = NEON[1];
    ctx.globalAlpha = 0.25;
    ctx.shadowBlur = 8;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(this.earthCx, this.earthCy - this.earthR);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  drawParticles(ctx, t) {
    this.particles = this.particles.filter((p) => t - p.t < p.life);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of this.particles) {
      const age = (t - p.t) / p.life;
      ctx.globalAlpha = 1 - age;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = p.color;
      ctx.font = `${8 + 6 * (1 - age)}px monospace`;
      ctx.fillText(p.ch, p.x + p.vx * age * 40, p.y + p.vy * age * 40);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  drawTimeline(ctx, state) {
    const y = this.h - 36;
    const x0 = 40;
    const x1 = this.w - 40;
    const w = x1 - x0;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();

    let acc = 0;
    for (let i = 0; i < MISSIONS.length; i++) {
      const m = MISSIONS[i];
      const segW = (m.simSec / TOTAL_SIM) * w;
      const active = i === state.missionIdx;
      ctx.fillStyle = active ? NEON[i % NEON.length] : '#222';
      ctx.globalAlpha = active ? 1 : 0.5;
      ctx.fillRect(x0 + acc, y - 4, segW, 8);
      ctx.globalAlpha = 0.9;
      ctx.font = '600 9px monospace';
      ctx.fillStyle = active ? '#fff' : '#555';
      ctx.textAlign = 'center';
      ctx.fillText(m.id, x0 + acc + segW / 2, y + 16);
      acc += segW;
    }
    const progX = x0 + (state.loopT / TOTAL_SIM) * w;
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fff';
    ctx.beginPath();
    ctx.arc(progX, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  drawHUD(ctx, state, tel) {
    const c = NEON[state.missionIdx % NEON.length];
    ctx.textAlign = 'left';
    ctx.font = '700 14px monospace';
    ctx.fillStyle = c;
    ctx.shadowBlur = 14;
    ctx.shadowColor = c;
    ctx.fillText(`◉ NASA · ${state.mission.name}`, 22, 32);
    ctx.shadowBlur = 0;

    ctx.font = '500 11px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText(`${state.mission.tag} · ${state.mission.year}`, 22, 50);

    ctx.font = '700 13px monospace';
    ctx.fillStyle = NEON[3];
    ctx.shadowBlur = 18;
    ctx.shadowColor = ctx.fillStyle;
    ctx.fillText(state.phase.label, 22, 78);
    ctx.shadowBlur = 0;

    ctx.font = '500 12px monospace';
    ctx.fillStyle = NEON[0];
    ctx.textAlign = 'right';
    ctx.fillText(`MET ${fmtMet(tel.metSec)}`, this.w - 22, 32);
    ctx.fillText(`ALT ${fmtAlt(tel.altKm)}`, this.w - 22, 52);
    ctx.fillText(`VEL ${tel.velKms.toFixed(1)} km/s`, this.w - 22, 72);
    ctx.fillText(`SIM ${Math.floor(state.loopT)}s / ${TOTAL_SIM}s`, this.w - 22, 92);
    ctx.textAlign = 'left';

    if (this.missionFlash > 0) {
      ctx.globalAlpha = this.missionFlash * 0.35;
      ctx.fillStyle = c;
      ctx.font = `800 ${48 + this.missionFlash * 20}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(state.mission.name, this.w / 2, this.h * 0.38);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }
  }

  draw() {
    const ctx = this.ctx;
    const t = this.simTime;
    const state = programAt(t);
    const tel = telemetry(state.mission, state.local, state.phase);
    const pos = this.vehiclePos(state);
    const color = NEON[state.missionIdx % NEON.length];

    if (state.missionIdx !== this.lastMissionIdx) {
      this.missionFlash = 1;
      this.lastMissionIdx = state.missionIdx;
    }
    this.missionFlash *= 0.96;

    const sx = (Math.random() - 0.5) * this.shake;
    const sy = (Math.random() - 0.5) * this.shake;
    ctx.save();
    ctx.translate(sx, sy);

    ctx.fillStyle = '#000008';
    ctx.fillRect(-10, -10, this.w + 20, this.h + 20);

    this.drawStars(ctx, t);
    this.drawEarth(ctx);
    this.drawMoon(ctx, state);
    this.drawTrajectory(ctx, pos, state);
    this.drawVehicle(ctx, pos, state, color);
    this.drawParticles(ctx, t);
    this.drawTimeline(ctx, state);
    this.drawHUD(ctx, state, tel);

    ctx.restore();

    const k = state.phase.key;
    if (k === 'ascent' || k === 'separation' || k === 'ascent_hls') {
      this.spawnExhaust(pos.x, pos.y + 24, 2, NEON[2]);
      this.shake = k === 'ascent' ? 3 : 1;
    } else if (k === 'reentry') {
      this.spawnReentry(pos.x, pos.y);
      this.shake = 1.5;
    } else if (k === 'surface' || k === 'base') {
      if (Math.random() > 0.92) {
        this.spawnExhaust(pos.x, pos.y + 10, 1, NEON[4]);
      }
      this.shake = 0;
    } else {
      this.shake *= 0.85;
    }
  }

  tick(now) {
    if (!this.raf) return;
    if (!this.paused) {
      const scale = this.timeScale || 1;
      this.simTime = (now - this.t0) * 0.001 * scale;
      // keep t0 consistent when scale changes via rebase in setTimeScale
      this.draw();
    }
    this.raf = requestAnimationFrame((n) => this.tick(n));
  }

  start() {
    if (this.raf) return;
    this.timeScale = this.timeScale || 1;
    this.t0 = performance.now() - (this.simTime * 1000) / (this.timeScale || 1);
    this.raf = requestAnimationFrame((n) => this.tick(n));
  }

  togglePause() {
    this.paused = !this.paused;
    if (!this.paused) {
      const scale = this.timeScale || 1;
      this.t0 = performance.now() - (this.simTime * 1000) / scale;
    }
  }

  setTimeScale(s) {
    const scale = Math.max(0.15, Math.min(4, Number(s) || 1));
    const now = performance.now();
    // rebase so simTime continuous
    this.t0 = now - (this.simTime * 1000) / scale;
    this.timeScale = scale;
  }

  skipMission() {
    const st = programAt(this.simTime);
    let acc = 0;
    for (let i = 0; i <= st.missionIdx; i++) acc += MISSIONS[i].simSec;
    this.simTime = acc;
    const scale = this.timeScale || 1;
    this.t0 = performance.now() - (this.simTime * 1000) / scale;
    this.missionFlash = 1;
  }

  prevMission() {
    const st = programAt(this.simTime);
    if (st.missionIdx <= 0) {
      this.simTime = 0;
    } else {
      let acc = 0;
      for (let i = 0; i < st.missionIdx; i++) acc += MISSIONS[i].simSec;
      this.simTime = Math.max(0, acc - 0.05);
    }
    const scale = this.timeScale || 1;
    this.t0 = performance.now() - (this.simTime * 1000) / scale;
    this.missionFlash = 1;
  }

  jumpMission(idx) {
    const i = ((idx % MISSIONS.length) + MISSIONS.length) % MISSIONS.length;
    let acc = 0;
    for (let k = 0; k < i; k++) acc += MISSIONS[k].simSec;
    this.simTime = acc;
    const scale = this.timeScale || 1;
    this.t0 = performance.now() - (this.simTime * 1000) / scale;
    this.missionFlash = 1;
  }

  status() {
    const st = programAt(this.simTime);
    const tel = telemetry(st.mission, st.local, st.phase);
    const k = st.phase.key;
    // abgeleitete Schiffssysteme (dynamisch nach Phase)
    const burn = ['ascent', 'separation', 'ascent_hls', 'reentry', 'descent'].includes(k);
    const space = ['orbit', 'transit', 'lunar', 'docking', 'eva', 'return', 'transfer'].includes(k);
    const tank = Math.max(0.05, Math.min(1,
      burn ? 0.95 - (st.local % 1) * 0.55
        : space ? 0.55 + 0.2 * Math.sin(this.simTime * 0.3)
        : 0.88 + 0.05 * Math.sin(this.simTime)
    ));
    const temp = burn
      ? 40 + tel.velKms * 28 + (k === 'reentry' ? 400 : 80)
      : space ? -40 + 15 * Math.sin(this.simTime * 0.2)
      : 22 + 3 * Math.sin(this.simTime * 0.5);
    const o2 = Math.max(0.2, 0.92 - (st.mission.crew > 0 ? st.local * 0.08 : 0.02) + 0.03 * Math.sin(this.simTime));
    const power = Math.max(0.25, Math.min(1,
      k === 'pad' ? 0.7 : space ? 0.85 + 0.1 * Math.sin(this.simTime * 0.4) : burn ? 0.95 : 0.75
    ));
    const cabin = 101 + 2 * Math.sin(this.simTime * 0.7);
    const gForce = burn ? Math.min(4.2, 1 + tel.velKms * 0.35) : (k === 'reentry' ? 3.5 : 1.0);
    return {
      paused: this.paused,
      simTime: this.simTime,
      timeScale: this.timeScale || 1,
      missionIdx: st.missionIdx,
      mission: st.mission.name,
      phase: st.phase.label,
      phaseKey: k,
      total: MISSIONS.length,
      altKm: tel.altKm,
      velKms: tel.velKms,
      metSec: tel.metSec,
      tank,
      temp,
      o2,
      power,
      cabin,
      gForce,
      crew: st.mission.crew || 0,
    };
  }

  saveFrame() {
    this.canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `artemis-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}
