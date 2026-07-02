import {
  phaseAt, PHASES, NEON, CYCLE, SYSTEMS,
  hash, ease, lerp, formatSpeed,
} from './systems.js';
import { computeTelemetry, LEGEND_ITEMS } from './telemetry.js';
import { modelForPhase, hasFuelModel } from './molecules.js';
import { drawMolecule3D } from './molecule3d.js';
import { drawSafetyBoard, drawRescueCapsule, computeSafety } from './safetyDraw.js';
import {
  drawReunion, drawFusionPhase, drawIntroPresentation,
  isFinalePhase, isIntroPhase, isStoryPhase, PosturBurst,
} from './finale.js';
import {
  drawHailMaryContact, updateHailMaryAudio, resetHailMaryAudio, isHailMaryPhase,
} from './hailmary.js';
import { drawRelativCosmos, isRelativPhase } from './relativity.js';
import { drawColonyPhase, isKoloniePhase } from './colony.js';
import { drawHappyEnd } from './paradise.js';
import { drawLunchGate, hitLunchGate } from './lunch.js';
import { computeLayout, layoutCapsule } from './layout.js';

const TAU = Math.PI * 2;

export class Antrieb100LY {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.paused = false;
    this.t0 = performance.now();
    this.time = 0;
    this.raf = null;
    this.particles = [];
    this.lasers = [];
    this.shake = 0;
    this.posturBurst = null;
    this.lastPhaseKey = '';
    this.launched = false;
    this.splashT0 = performance.now();
    this.splashT = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const vv = window.visualViewport;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.round(vv?.width ?? window.innerWidth);
    this.h = Math.round(vv?.height ?? window.innerHeight);
    this.canvas.width = Math.floor(this.w * dpr);
    this.canvas.height = Math.floor(this.h * dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    if (vv) {
      this.canvas.style.top = `${vv.offsetTop}px`;
      this.canvas.style.left = `${vv.offsetLeft}px`;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.layout = computeLayout(this.w, this.h);
    if (!this.posturBurst) this.posturBurst = new PosturBurst(this.w, this.h);
    else { this.posturBurst.w = this.w; this.posturBurst.h = this.h; }
  }

  speedKms(state) {
    const s = state.ph.speed ?? 0;
    if (state.ph.key === 'boost') return s * (0.5 + state.local * 0.5);
    if (state.ph.key === 'chemical') return lerp(0, s, ease(state.local));
    return s;
  }

  spawnParticles(k, t, cx, cy) {
    const colors = {
      chemical: NEON.flame, scramjet: NEON.orange, ion: NEON.ion,
      laser: NEON.laser, nuclear: NEON.nuclear, antimatter: NEON.antimatter,
      quantum: NEON.quantum, seed: NEON.seed, boost: NEON.cyan,
      transit: NEON.magenta, orbit: NEON.white,
    };
    const col = colors[k] || NEON.cyan;
    const n = k === 'boost' ? 4 : 2;
    for (let i = 0; i < n; i++) {
      if (Math.random() > 0.5) continue;
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy + 20 + Math.random() * 30,
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 8,
        ch: '·◆▓⚡e⁺e⁻◉'.charAt(Math.floor(Math.random() * 8)),
        color: col,
        t,
        life: 0.2 + Math.random() * 0.5,
      });
    }
  }

  drawStars(ctx, t, spd, southern = false) {
    for (let i = 0; i < (southern ? 350 : 120); i++) {
      let bx = hash(i, 0) * this.w;
      let by = hash(i, 1) * this.h;
      if (southern && hash(i, 5) > 0.7) {
        bx = this.w * (0.3 + hash(i, 6) * 0.5);
        by = this.h * (0.55 + hash(i, 7) * 0.35);
      }
      by = (by + t * spd * 30) % (this.h + 10) - 5;
      ctx.globalAlpha = 0.2 + hash(i, 3) * 0.8;
      ctx.fillStyle = southern && i < 20 ? NEON.yellow : NEON.white;
      const sz = southern && i < 15 ? 2 : 1;
      ctx.fillRect(bx, by, sz, sz);
    }
    ctx.globalAlpha = 1;
  }

  drawSouthernSky(ctx, t) {
    const cx = this.w * 0.62;
    const cy = this.h * 0.58;
    ctx.font = '9px monospace';
    ctx.fillStyle = NEON.cyan;
    ctx.textAlign = 'center';
    ctx.fillText('SÜDLICHE HEMISPHÄRE · 100 LY', cx, this.h * 0.12);

    const stars = [
      { x: -40, y: -30, r: 3, label: 'α Cen', col: NEON.yellow },
      { x: -20, y: -10, r: 2, label: 'β Cen', col: NEON.orange },
      { x: 0, y: 20, r: 2.5, label: 'γ Cru', col: NEON.white },
      { x: 25, y: 35, r: 2, label: 'δ Cru', col: NEON.white },
      { x: -15, y: 45, r: 2, label: 'ε Cru', col: NEON.cyan },
      { x: 80, y: -60, r: 4, label: 'Canopus', col: NEON.white },
      { x: -90, y: 50, r: 2, label: 'LMC', col: '#8899aa' },
      { x: 100, y: 30, r: 1.5, label: 'SMC', col: '#778899' },
    ];

    ctx.strokeStyle = 'rgba(0,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + stars[2].x, cy + stars[2].y);
    ctx.lineTo(cx + stars[3].x, cy + stars[3].y);
    ctx.lineTo(cx + stars[4].x, cy + stars[4].y);
    ctx.lineTo(cx + stars[2].x, cy + stars[2].y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,255,255,0.15)';
    ctx.font = '8px monospace';
    ctx.fillText('CRUX · KREUZ DES SÜDENS', cx + 5, cy + 70);

    for (const s of stars) {
      ctx.fillStyle = s.col;
      ctx.shadowBlur = s.r * 4;
      ctx.shadowColor = s.col;
      ctx.beginPath();
      ctx.arc(cx + s.x + Math.sin(t * 0.3 + s.x) * 0.5, cy + s.y, s.r, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = '7px monospace';
      ctx.fillStyle = '#556';
      ctx.fillText(s.label, cx + s.x, cy + s.y + 12);
    }

    ctx.fillStyle = 'rgba(255,238,0,0.08)';
    ctx.beginPath();
    ctx.ellipse(cx - 90, cy + 50, 35, 20, -0.3, 0, TAU);
    ctx.fill();

    const ox = this.w * 0.15;
    const oy = this.h * 0.2;
    ctx.strokeStyle = 'rgba(255,100,0,0.4)';
    ctx.beginPath();
    ctx.arc(ox, oy, 4, 0, TAU);
    ctx.stroke();
    ctx.font = '8px monospace';
    ctx.fillStyle = NEON.orange;
    ctx.textAlign = 'left';
    ctx.fillText('SOL · 100 LY entfernt', ox + 10, oy + 4);
  }

  drawTechPanel(ctx, sys, t) {
    const { x: px, y: py, w: pw, h: ph, fs } = this.layout.tech;
    ctx.fillStyle = 'rgba(0,20,40,0.75)';
    ctx.strokeStyle = NEON.cyan;
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, pw, ph);
    ctx.fillRect(px, py, pw, ph);

    ctx.textAlign = 'left';
    ctx.font = `700 ${fs + 2}px monospace`;
    ctx.fillStyle = NEON.cyan;
    ctx.fillText('TECH-SCHEMATIC', px + 6, py + 12);
    ctx.font = `${fs}px monospace`;
    ctx.fillStyle = '#889';
    const lineStep = fs + 5;
    const maxLines = this.layout.phone ? 3 : 4;
    sys.tech.slice(0, maxLines).forEach((line, i) => {
      const label = line.length > (this.layout.phone ? 14 : 22) ? `${line.slice(0, 12)}…` : line;
      ctx.fillText(`▸ ${label}`, px + 6, py + 26 + i * lineStep);
    });

    ctx.font = `${fs}px monospace`;
    ctx.fillStyle = NEON.nuclear;
    ctx.fillText(`Isp: ${sys.isp}`, px + 6, py + ph - 18);
    ctx.fillStyle = NEON.orange;
    ctx.fillText(`Schub: ${sys.thrust}`, px + 6, py + ph - 6);
  }

  drawRocket(ctx, x, y, sc, k, t, active) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    ctx.textAlign = 'center';

    if (active) this.drawEngine(ctx, k, t);

    ctx.fillStyle = NEON.white;
    ctx.shadowBlur = 12;
    ctx.shadowColor = NEON.cyan;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('▲', 0, -24);
    ctx.font = '8px monospace';
    ctx.fillStyle = NEON.cyan;
    ctx.fillText('XR-100LY', 0, -12);
    ctx.fillStyle = NEON.magenta;
    ctx.font = 'bold 12px monospace';
    ctx.fillText('█', 0, 4);
    ctx.font = '7px monospace';
    ctx.fillStyle = '#889';
    ctx.fillText(k.toUpperCase().slice(0, 6), 0, 18);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawEngine(ctx, k, t) {
    const flick = 0.6 + Math.random() * 0.4;
    ctx.globalAlpha = flick;

    if (k === 'chemical') {
      ctx.fillStyle = NEON.flame;
      ctx.font = 'bold 16px monospace';
      for (let i = 0; i < 5; i++) ctx.fillText('▓', (Math.random() - 0.5) * 10, 28 + i * 6);
    } else if (k === 'scramjet') {
      ctx.fillStyle = NEON.orange;
      ctx.font = '10px monospace';
      ctx.fillText('⟨ LUFT ⟩', 0, 26);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = NEON.cyan;
        ctx.fillText('○', -18 + i * 18, 20);
      }
      ctx.fillStyle = NEON.flame;
      ctx.fillText('▓▓▓', 0, 38);
    } else if (k === 'ion') {
      ctx.fillStyle = NEON.ion;
      ctx.font = 'bold 14px monospace';
      ctx.fillText('e⁻→→→', 0, 30);
      ctx.fillText('~~~', 0, 42);
    } else if (k === 'laser') {
      ctx.strokeStyle = NEON.laser;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 20;
      ctx.shadowColor = NEON.laser;
      ctx.beginPath();
      ctx.moveTo(-this.w * 0.3, -40);
      ctx.lineTo(0, 10);
      ctx.stroke();
      ctx.font = '9px monospace';
      ctx.fillStyle = NEON.laser;
      ctx.fillText('LASER BOARD', -this.w * 0.22, -45);
      ctx.fillStyle = NEON.white;
      ctx.fillText('◆ SAIL', 0, -8);
    } else if (k === 'nuclear') {
      ctx.fillStyle = NEON.nuclear;
      ctx.font = 'bold 18px monospace';
      ctx.fillText('☢', 0, 32);
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(0, 38, 10 + i * 8 + Math.sin(t * 4) * 3, 0, TAU);
        ctx.strokeStyle = NEON.nuclear;
        ctx.stroke();
      }
    } else if (k === 'antimatter') {
      ctx.fillStyle = NEON.antimatter;
      ctx.font = 'bold 14px monospace';
      ctx.fillText('e⁺+e⁻', 0, 28);
      ctx.fillText('◈ γ', 0, 42);
    } else if (k === 'quantum') {
      for (let i = 3; i > 0; i--) {
        ctx.strokeStyle = NEON.quantum;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(0, 30, i * 8 - Math.sin(t * 5) * 2, 0, TAU);
        ctx.stroke();
      }
      ctx.fillStyle = NEON.quantum;
      ctx.font = '12px monospace';
      ctx.fillText('IMPLODE', 0, 32);
    } else if (k === 'seed') {
      ctx.fillStyle = NEON.seed;
      ctx.shadowBlur = 25;
      ctx.shadowColor = NEON.white;
      ctx.font = 'bold 20px monospace';
      ctx.fillText('·', 0, 30);
      ctx.font = '8px monospace';
      ctx.fillText('SEED', 0, 44);
      ctx.shadowBlur = 0;
    } else if (k === 'boost') {
      ['▓', '⚡', '◈', 'e⁻', '☢'].forEach((c, i) => {
        ctx.fillStyle = [NEON.flame, NEON.laser, NEON.antimatter, NEON.ion, NEON.nuclear][i];
        ctx.font = '12px monospace';
        ctx.fillText(c, (i - 2) * 12, 30 + (i % 2) * 8);
      });
    }

    ctx.globalAlpha = 1;
  }

  drawSystemDiagram(ctx, k, t, local) {
    const { cx, cy, r } = this.layout.diagram;
    const fs = this.layout.phone ? 6 : 8;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = 'rgba(0,255,255,0.3)';
    ctx.lineWidth = 1;

    if (k === 'overview') {
      PHASES.filter((p) => SYSTEMS[p.key]?.isp !== '—' || p.key === 'overview').slice(1, 9).forEach((p, i) => {
        const ang = (i / 8) * TAU - Math.PI / 2;
        const x = Math.cos(ang) * r;
        const y = Math.sin(ang) * r;
        ctx.fillStyle = NEON.cyan;
        ctx.font = '7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.name.split('·')[0].trim().slice(0, 8), x, y);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x, y);
        ctx.stroke();
      });
      ctx.fillStyle = NEON.magenta;
      ctx.font = 'bold 11px monospace';
      ctx.fillText('ANTrieb', 0, 0);
    } else if (k === 'scramjet') {
      ctx.strokeRect(-r, -r * 0.4, r * 2, r * 0.8);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = NEON.cyan;
        ctx.fillRect(-r + i * 15, -r * 0.5, 8, 8);
        ctx.font = '6px monospace';
        ctx.fillStyle = '#556';
        ctx.fillText('LOCH', -r + i * 15, -r * 0.55);
      }
      ctx.fillStyle = NEON.orange;
      ctx.font = '8px monospace';
      ctx.fillText('KOMPRESSOR', 0, -r * 0.6);
      ctx.fillText('RAMPE', 0, r * 0.5);
    } else if (k === 'ion') {
      ctx.fillStyle = NEON.ion;
      ctx.fillRect(-r * 0.8, -8, r * 1.6, 16);
      ctx.font = '8px monospace';
      ctx.fillStyle = NEON.white;
      ctx.fillText('GITTER', 0, 4);
      ctx.fillText('e⁻ FRESSER', 0, r * 0.5);
    } else if (k === 'laser') {
      ctx.fillStyle = NEON.laser;
      ctx.fillRect(-r * 1.2, -r * 0.8, r * 0.3, r * 1.6);
      ctx.font = '8px monospace';
      ctx.fillText('BOARD', -r * 1.05, 0);
      ctx.strokeStyle = NEON.laser;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.9, -r * 0.5 + i * r * 0.25);
        ctx.lineTo(r * 0.5, 0);
        ctx.stroke();
      }
      ctx.fillStyle = NEON.white;
      ctx.fillRect(r * 0.3, -r * 0.3, r * 0.4, r * 0.6);
      ctx.fillText('SAIL', r * 0.5, 4);
    } else if (k === 'quantum') {
      for (let i = 4; i >= 0; i--) {
        const sr = r * (0.2 + i * 0.18) * (1 - local * 0.3);
        ctx.strokeStyle = NEON.quantum;
        ctx.globalAlpha = 0.4 + i * 0.1;
        ctx.beginPath();
        ctx.arc(0, 0, sr, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = NEON.quantum;
      ctx.font = '9px monospace';
      ctx.fillText('Q-TEILCHEN', 0, -r * 0.7);
      ctx.fillText('→ STOSS', 0, r * 0.7);
    } else if (k === 'seed') {
      ctx.fillStyle = NEON.white;
      ctx.shadowBlur = 30;
      ctx.shadowColor = NEON.white;
      ctx.beginPath();
      ctx.arc(0, 0, 4 + Math.sin(t * 3) * 2, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.3, 0, TAU);
      ctx.arc(0, 0, r * 0.6, 0, TAU);
      ctx.stroke();
    } else if (k === 'orbit') {
      ctx.strokeStyle = NEON.cyan;
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.35, 0.2, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = NEON.magenta;
      ctx.beginPath();
      ctx.arc(r * 0.7, 0, 5, 0, TAU);
      ctx.fill();
      ctx.font = '8px monospace';
      ctx.fillStyle = NEON.cyan;
      ctx.fillText('100 LY ORBIT', 0, -r * 0.6);
    } else {
      ctx.strokeRect(-r * 0.5, -r * 0.6, r, r * 1.2);
      ctx.font = '9px monospace';
      ctx.fillStyle = NEON.cyan;
      ctx.fillText(k.toUpperCase(), 0, 0);
    }

    ctx.restore();
  }

  drawSensorLegend(ctx, tel, t) {
    const L = this.layout.sensor;
    const { x: px, y: py, w: pw, rowH, cols, fs, valFs } = L;
    const visible = LEGEND_ITEMS.filter((item) => {
      const v = tel[item.key];
      if (item.text) return v && v !== '—';
      if (typeof v === 'number' && item.key.includes('ion') && v <= 0) return false;
      if (item.key === 'laserGW' && v <= 0) return false;
      if (item.key === 'amTrap' && v <= 0) return false;
      if (item.key === 'qCoherence' && v <= 0) return false;
      if (item.key === 'seedStability' && v <= 0) return false;
      return true;
    });
    const rows = cols > 1 ? Math.ceil(visible.length / cols) : visible.length;
    const ph = rows * rowH + (this.layout.phone ? 22 : 28);

    ctx.fillStyle = 'rgba(0,8,20,0.82)';
    ctx.strokeStyle = NEON.green;
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, pw, ph);
    ctx.fillRect(px, py, pw, ph);

    ctx.textAlign = 'left';
    ctx.font = `700 ${fs + 2}px monospace`;
    ctx.fillStyle = NEON.green;
    ctx.fillText('◉ SENSOR', px + 6, py + 12);
    if (!this.layout.phone) {
      ctx.font = `${fs}px monospace`;
      ctx.fillStyle = '#445';
      ctx.fillText('Telemetrie · live', px + 6, py + 22);
    }

    visible.forEach((item, i) => {
      const colIdx = i % cols;
      const row = Math.floor(i / cols);
      const colW = pw / cols;
      const ix = px + colIdx * colW + 6;
      const y = py + (this.layout.phone ? 18 : 36) + row * rowH;
      const color = NEON[item.color] || NEON.cyan;
      const raw = tel[item.key];
      const blink = item.key === 'radiation' && raw > 20
        ? (Math.sin(t * 8) > 0 ? 1 : 0.35) : 1;

      ctx.globalAlpha = blink;
      ctx.fillStyle = color;
      ctx.font = `${fs}px monospace`;
      const shortLabel = this.layout.phone && item.label.length > 10
        ? item.label.slice(0, 8) : item.label;
      ctx.fillText(shortLabel, ix, y);

      if (item.text) {
        ctx.fillStyle = NEON.yellow;
        ctx.textAlign = 'right';
        const tx = px + (colIdx + 1) * colW - 6;
        const txt = String(raw);
        ctx.fillText(txt.length > 12 ? `${txt.slice(0, 10)}…` : txt, tx, y);
        ctx.textAlign = 'left';
      } else {
        const val = item.fmt(raw);
        const unit = item.unit ? ` ${item.unit}` : '';
        ctx.textAlign = 'right';
        ctx.fillStyle = color;
        ctx.font = `700 ${valFs}px monospace`;
        ctx.fillText(`${val}${unit}`, px + (colIdx + 1) * colW - 6, y);

        if (item.bar && typeof raw === 'number' && cols === 1) {
          const bw = pw - 16;
          const bx = px + 8;
          const by = y + 2;
          ctx.fillStyle = '#111';
          ctx.fillRect(bx, by, bw, 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = blink * 0.8;
          ctx.fillRect(bx, by, bw * Math.min(1, raw / 100), 2);
        }
        ctx.textAlign = 'left';
      }
      ctx.globalAlpha = 1;
    });

    if (!this.layout.phone) {
      ctx.font = '6px monospace';
      ctx.fillStyle = '#334';
      ctx.fillText('g · µT · mSv · kPa · LY', px + 6, py + ph - 4);
    }
  }

  drawHUD(ctx, state, kms, tel) {
    const { ph } = state;
    const H = this.layout.hud;
    const P = this.layout.progress;
    if (!tel) tel = computeTelemetry(state, this.time, kms);

    ctx.textAlign = 'left';
    ctx.font = `700 ${H.titleSize}px monospace`;
    ctx.fillStyle = NEON.magenta;
    ctx.shadowBlur = 14;
    ctx.shadowColor = NEON.magenta;
    const title = this.layout.phone && ph.name.length > 22 ? `${ph.name.slice(0, 20)}…` : ph.name;
    ctx.fillText(`◉ ${title}`, H.titleX, H.titleY);
    ctx.shadowBlur = 0;
    ctx.font = `600 ${H.lineSize}px monospace`;
    ctx.fillStyle = NEON.nuclear;
    const line = this.layout.phone && ph.line.length > 36 ? `${ph.line.slice(0, 34)}…` : ph.line;
    ctx.fillText(line, H.titleX, H.titleY + (this.layout.phone ? 12 : 20));

    ctx.textAlign = 'right';
    ctx.fillStyle = NEON.cyan;
    ctx.font = `700 ${H.speedSize}px monospace`;
    if (kms > 0) ctx.fillText(formatSpeed(kms), H.metaX, H.titleY);
    if (ph.key === 'orbit') {
      ctx.fillStyle = NEON.yellow;
      ctx.fillText(this.layout.phone ? '100 LY · SÜD' : '100 LICHTJAHRE · SÜD', H.metaX, H.titleY);
    }
    ctx.fillStyle = '#556';
    ctx.font = `${H.lineSize - 1}px monospace`;
    ctx.fillText(`MET ${Math.floor(state.t)}s / ${CYCLE}s`, H.metaX, H.titleY + (this.layout.phone ? 12 : 18));
    if (!this.layout.phone) {
      ctx.fillText(`g=${tel.gravity.toFixed(2)} · ΔV=${tel.deltaV.toFixed(2)}`, H.metaX, H.titleY + 30);
    }

    this.drawSensorLegend(ctx, tel, this.time);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#222';
    ctx.fillRect(P.x, P.y, P.w, 3);
    ctx.fillStyle = NEON.cyan;
    ctx.fillRect(P.x, P.y, P.w * state.p, 3);

    const labels = ['🐱', 'ALL', 'CH', 'LUFT', 'ION', 'LSR', 'NUK', 'AM', 'Q', 'SD', 'MAX', 'REL', '100', '👽', 'SÜD', '♀♂', '🌳', 'FUS', '♥'];
    if (P.labelMode === 'active') {
      const idx = PHASES.findIndex((p) => state.p >= p.p0 && state.p < p.p1);
      ctx.font = '7px monospace';
      ctx.fillStyle = NEON.nuclear;
      ctx.textAlign = 'center';
      ctx.fillText(labels[idx] || '·', P.x + P.w * 0.5, P.y - 4);
    } else {
      PHASES.forEach((p, i) => {
        const px = P.x + P.w * ((p.p0 + p.p1) * 0.5);
        ctx.font = '6px monospace';
        ctx.fillStyle = state.p >= p.p0 && state.p < p.p1 ? NEON.nuclear : '#333';
        ctx.textAlign = 'center';
        ctx.fillText(labels[i] || '·', px, P.y - 4);
      });
    }
  }

  drawParticles(ctx, t) {
    this.particles = this.particles.filter((p) => t - p.t < p.life);
    ctx.textAlign = 'center';
    for (const p of this.particles) {
      const age = (t - p.t) / p.life;
      ctx.globalAlpha = 1 - age;
      ctx.fillStyle = p.color;
      ctx.font = '11px monospace';
      ctx.fillText(p.ch, p.x + p.vx * age * 20, p.y + p.vy * age * 20);
    }
    ctx.globalAlpha = 1;
  }

  draw() {
    const ctx = this.ctx;
    const state = phaseAt(this.time);
    const k = state.ph.key;
    const t = this.time;
    const kms = this.speedKms(state);
    const spd = kms / 50000;
    const southern = k === 'orbit' || isStoryPhase(k);
    const finale = isFinalePhase(k);
    const intro = isIntroPhase(k);
    const hailmary = isHailMaryPhase(k);
    const relativ = isRelativPhase(k);
    const kolonie = isKoloniePhase(k);

    if (k !== this.lastPhaseKey) {
      if (this.lastPhaseKey === 'hailmary' || k === 'hailmary') resetHailMaryAudio();
      this.lastPhaseKey = k;
    }
    if (hailmary) updateHailMaryAudio(state.local, k, t);

    this.shake = finale ? 0 : intro || hailmary || relativ || kolonie ? 0 : ['boost', 'quantum', 'nuclear', 'antimatter'].includes(k) ? spd * 2 : spd * 0.5;
    if (k === 'orbit') this.shake = 0;
    if (k === 'posturknall') this.shake = 0;

    ctx.save();
    ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    ctx.fillStyle = NEON.void;
    ctx.fillRect(-5, -5, this.w + 10, this.h + 10);

    this.drawStars(ctx, t, spd, southern);
    if (southern && !finale && !intro && !hailmary && !relativ && !kolonie) this.drawSouthernSky(ctx, t);

    if (k === 'intro') {
      drawIntroPresentation(ctx, state.local, t, this.w, this.h, this.layout);
    } else if (k === 'relativ') {
      drawRelativCosmos(ctx, state.local, t, this.w, this.h, this.layout);
    } else if (k === 'hailmary') {
      drawHailMaryContact(ctx, state.local, t, this.w, this.h, this.layout);
    } else if (k === 'reunion') {
      drawReunion(ctx, state.local, t, this.w, this.h, this.layout);
    } else if (k === 'kolonie') {
      drawColonyPhase(ctx, state.local, t, this.w, this.h, this.layout);
    } else if (k === 'fusion') {
      drawFusionPhase(ctx, state.local, t, this.w, this.h, this.layout);
    } else if (k === 'posturknall') {
      drawHappyEnd(ctx, state.local, t, this.w, this.h, this.layout);
    } else {
      const { x: rx, y: ry, sc: rsc } = this.layout.rocket;
      const ryAdj = k === 'orbit' ? this.layout.capsule.orbitY : ry;
      const active = !['overview', 'orbit', 'transit'].includes(k) || k === 'boost';

      if (k !== 'orbit') {
        this.drawTechPanel(ctx, state.ph, t);
        if (hasFuelModel(k)) {
          const model = modelForPhase(k, state.local);
          const M = this.layout.molecule;
          drawMolecule3D(ctx, model, t, M.x, M.y, M.r, this.w, this.h, this.layout);
        } else {
          this.drawSystemDiagram(ctx, k, t, state.local);
        }
      }

      if (k !== 'orbit') {
        this.drawRocket(ctx, rx, ryAdj, rsc, k, t, active);
        if (active) this.spawnParticles(k, t, rx, ryAdj);
      }

      if (k === 'orbit') this.drawSouthernSky(ctx, t);

      if (k === 'transit') {
        ctx.fillStyle = NEON.magenta;
        ctx.font = `700 ${this.layout.phone ? 11 : 16}px monospace`;
        ctx.textAlign = 'center';
        ctx.shadowBlur = 20;
        ctx.shadowColor = NEON.magenta;
        const msg = this.layout.phone ? '→ 100 LY · Bethy & Jany →' : '→ 100 LICHTJAHRE · Bethy & Jany warten →';
        ctx.fillText(msg, this.w * 0.5, this.h * (this.layout.phone ? 0.16 : 0.2));
        ctx.shadowBlur = 0;
      }
    }

    this.drawParticles(ctx, t);

    const tel = computeTelemetry(state, t, kms);
    const safety = computeSafety(state, tel, t);
    drawSafetyBoard(ctx, safety, t, this.layout);

    const cap = layoutCapsule(this.layout, k);
    drawRescueCapsule(ctx, safety, t, cap.x, cap.y, cap.sc);

    this.drawHUD(ctx, state, kms, tel);
    ctx.restore();
  }

  drawLunch() {
    drawLunchGate(this.ctx, this.splashT, this.w, this.h, this.layout);
  }

  tryLaunch(x, y) {
    if (this.launched) return false;
    if (hitLunchGate(x, y, this.w, this.h, this.layout)) {
      this.launch();
      return true;
    }
    return false;
  }

  launch() {
    if (this.launched) return;
    this.launched = true;
    this.time = 0;
    this.t0 = performance.now();
    this.paused = false;
    const hint = document.getElementById('hint');
    if (hint) hint.classList.add('visible');
    this.canvas.style.cursor = 'crosshair';
  }

  tick(now) {
    if (!this.raf) return;
    if (!this.launched) {
      this.splashT = (now - this.splashT0) * 0.001;
      this.drawLunch();
    } else if (!this.paused) {
      let elapsed = (now - this.t0) * 0.001;
      if (elapsed >= CYCLE) {
        const loops = Math.floor(elapsed / CYCLE);
        this.t0 += loops * CYCLE * 1000;
        elapsed -= loops * CYCLE;
      }
      this.time = elapsed;
      this.draw();
    } else if (this.launched) {
      this.draw();
    }
    this.raf = requestAnimationFrame((n) => this.tick(n));
  }

  start() {
    if (this.raf) return;
    this.t0 = performance.now() - this.time * 1000;
    this.raf = requestAnimationFrame((n) => this.tick(n));
  }

  togglePause() {
    this.paused = !this.paused;
    if (!this.paused) this.t0 = performance.now() - this.time * 1000;
  }

  seek(seconds) {
    if (!this.launched) {
      this.launched = true;
      this.canvas.style.cursor = 'crosshair';
      document.getElementById('hint')?.classList.add('visible');
    }
    this.time = ((seconds % CYCLE) + CYCLE) % CYCLE;
    this.t0 = performance.now() - this.time * 1000;
    this.draw();
  }

  saveFrame() {
    this.canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `antrieb-100ly-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}
