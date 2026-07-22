/** Hail Mary · Eridian · Rocky · Kontakt zu DIR · Zoom · Daumen runter */
import { NEON, ease, lerp, hash } from './systems.js';
import { audioMeter } from './audioLevel.js';

const TAU = Math.PI * 2;
const ROCKY = '#aa88ff';
const ROCKY_DARK = '#6644cc';

const SPEECH = [
  { at: 0.28, line: 'SIGNAL · UNBEKANNT · ANNÄHERUNG', sub: '40 ERIDANI · ERIDIAN' },
  { at: 0.42, line: '◈ DU ◈ · HÖRST DU MICH?', sub: 'KONTAKT GESUCHT · ZU DIR' },
  { at: 0.58, line: 'ICH BIN ROCKY · ERIDIAN', sub: 'PROJECT HAIL MARY · DU BIST NICHT ALLEIN' },
  { at: 0.72, line: 'DAUMEN RUNTER · · · VERSTEHST DU?', sub: '◈◈◈ · AMPERSAND · ◈◈◈' },
  { at: 0.86, line: 'KONTAKT · ZU DIR · JETZT', sub: 'ZWEI SPEZIES · EIN PROBLEM · EINE LÖSUNG' },
];

const TTS_LINES = [
  'Kontakt gesucht. Zu dir.',
  'Hörst du mich?',
  'Daumen runter. Verstehst du?',
  'Du bist nicht allein.',
];

let ttsIdx = 0;
let lastTtsAt = -1;

export function resetHailMaryAudio() {
  ttsIdx = 0;
  lastTtsAt = -1;
  audioMeter.setCommsActive(false);
}

export function updateHailMaryAudio(local, key, t) {
  if (key !== 'hailmary' || typeof speechSynthesis === 'undefined') return;
  audioMeter.setCommsActive(true);
  const thresholds = [0.42, 0.55, 0.72, 0.88];
  while (ttsIdx < thresholds.length && local >= thresholds[ttsIdx] && lastTtsAt < thresholds[ttsIdx]) {
    lastTtsAt = thresholds[ttsIdx];
    const u = new SpeechSynthesisUtterance(TTS_LINES[ttsIdx]);
    u.lang = 'de-DE';
    u.rate = 0.88;
    u.pitch = 0.75;
    audioMeter.tapUtterance(u);
    speechSynthesis.speak(u);
    ttsIdx += 1;
  }
}

function activeSpeech(local) {
  let cur = SPEECH[0];
  for (const s of SPEECH) {
    if (local >= s.at) cur = s;
  }
  const next = SPEECH.find((s) => s.at > local);
  const fade = next
    ? ease(Math.min(1, (local - cur.at) / Math.max(0.001, (next.at - cur.at) * 0.3)))
    : ease(Math.min(1, (local - cur.at) / 0.08));
  const alpha = local >= cur.at ? Math.min(1, fade) : 0;
  return { ...cur, alpha: Math.max(0, alpha) };
}

function drawZoomTunnel(ctx, cx, cy, local, t, w, h) {
  const z = ease(Math.min(1, local / 0.65));
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 36; i++) {
    const ang = (i / 36) * TAU + t * 0.15;
    const len = lerp(w * 0.05, w * 0.55, z) * (0.5 + (i % 5) * 0.12);
    ctx.strokeStyle = i % 3 === 0 ? ROCKY : i % 3 === 1 ? NEON.cyan : NEON.quantum;
    ctx.globalAlpha = (1 - z * 0.4) * 0.12;
    ctx.lineWidth = 1 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * 8, Math.sin(ang) * 8);
    ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawRocky(ctx, x, y, sc, t, local) {
  const breathe = 1 + Math.sin(t * 2.2) * 0.04;
  const s = sc * breathe;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  ctx.shadowBlur = 28;
  ctx.shadowColor = ROCKY;

  ctx.fillStyle = ROCKY_DARK;
  ctx.strokeStyle = ROCKY;
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * TAU - Math.PI / 2;
    const px = Math.cos(ang) * 38;
    const py = Math.sin(ang) * 32;
    ctx.beginPath();
    ctx.arc(px, py, 14 + hash(i, 1) * 6, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = ROCKY;
  ctx.beginPath();
  ctx.ellipse(0, 0, 42, 36, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = NEON.white;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = NEON.cyan;
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('◈', -14, 4);
  ctx.fillText('◈', 14, 4);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-14, 2, 3, 0, TAU);
  ctx.arc(14, 2, 3, 0, TAU);
  ctx.fill();

  const armWave = Math.sin(t * 3) * 0.15;
  ctx.strokeStyle = ROCKY;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-38, 8);
  ctx.quadraticCurveTo(-58, -20 + armWave * 20, -48, -38);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(38, 8);
  ctx.quadraticCurveTo(58, -20 - armWave * 20, 48, -38);
  ctx.stroke();

  ctx.font = '8px monospace';
  ctx.fillStyle = ROCKY;
  ctx.fillText('ROCKY · ERIDIAN', 0, 58);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawThumbsDown(ctx, x, y, sc, t, local) {
  if (local < 0.68) return;
  const in_ = ease(Math.min(1, (local - 0.68) / 0.12));
  const pulse = 1 + Math.sin(t * 5) * 0.06;

  ctx.save();
  ctx.translate(x + 55 * sc, y - 70 * sc);
  ctx.scale(sc * pulse * in_, sc * pulse * in_);
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = NEON.nuclear;
  ctx.shadowBlur = 24;
  ctx.shadowColor = NEON.nuclear;
  ctx.fillText('👎', 0, 0);
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = NEON.yellow;
  ctx.fillText('DAUMEN RUNTER', 0, 28);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawContactPulse(ctx, cx, cy, local, t, w) {
  if (local < 0.4) return;
  const p = ease(Math.min(1, (local - 0.4) / 0.5));
  for (let i = 0; i < 5; i++) {
    const r = p * (80 + i * 55) + Math.sin(t * 2 + i) * 8;
    ctx.strokeStyle = i % 2 ? ROCKY : NEON.cyan;
    ctx.globalAlpha = (1 - p * 0.5) * (0.35 - i * 0.05);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  if (local > 0.5) {
    ctx.font = `700 ${11 + p * 4}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = NEON.cyan;
    ctx.shadowBlur = 20;
    ctx.shadowColor = NEON.cyan;
    ctx.globalAlpha = p;
    ctx.fillText('▶▶ KONTAKT · ZU DIR ◀◀', cx, cy + w * 0.22);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

function drawSpeechBox(ctx, cx, y, text, sub, alpha, mob) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const tw = mob ? 280 : 420;
  ctx.fillStyle = 'rgba(0,20,40,0.88)';
  ctx.strokeStyle = ROCKY;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - tw / 2, y - 36, tw, mob ? 52 : 58);
  ctx.fillRect(cx - tw / 2, y - 36, tw, mob ? 52 : 58);

  ctx.font = `700 ${mob ? 10 : 13}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = NEON.cyan;
  ctx.fillText(text, cx, y - 12);
  ctx.font = `${mob ? 8 : 10}px monospace`;
  ctx.fillStyle = ROCKY;
  ctx.fillText(sub, cx, y + (mob ? 6 : 8));
  ctx.restore();
}

export function drawHailMaryContact(ctx, local, t, w, h, layout = null) {
  const cx = w * 0.5;
  const cy = h * (layout?.phone ? 0.44 : 0.46);
  const mob = layout?.phone;

  const zoom = ease(Math.min(1, local / 0.62));
  const alienSc = lerp(mob ? 0.35 : 0.2, mob ? 1.05 : 1.35, zoom);

  ctx.font = `700 ${mob ? 11 : 15}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = ROCKY;
  ctx.shadowBlur = 16;
  ctx.shadowColor = ROCKY;
  ctx.fillText('HAIL MARY · EXTRATERRESTISCHES LEBEN', cx, h * (mob ? 0.08 : 0.09));
  ctx.font = `${mob ? 8 : 10}px monospace`;
  ctx.fillStyle = NEON.quantum;
  ctx.fillText('SIGNAL · 40 ERIDANI · ZOOM · DIREKTER KONTAKT', cx, h * (mob ? 0.08 : 0.09) + (mob ? 14 : 18));
  ctx.shadowBlur = 0;

  drawZoomTunnel(ctx, cx, cy, local, t, w, h);
  drawContactPulse(ctx, cx, cy, local, t, w);

  const starSpread = lerp(1, 2.8, zoom);
  for (let i = 0; i < 40; i++) {
    const ang = hash(i, 0) * TAU;
    const dist = (60 + hash(i, 1) * 200) * starSpread;
    ctx.globalAlpha = 0.15 + hash(i, 2) * 0.5;
    ctx.fillStyle = hash(i, 3) > 0.5 ? ROCKY : '#fff';
    ctx.fillRect(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist * 0.6, 1, 1);
  }
  ctx.globalAlpha = 1;

  drawRocky(ctx, cx, cy, alienSc, t, local);
  drawThumbsDown(ctx, cx, cy, alienSc, t, local);

  const sp = activeSpeech(local);
  drawSpeechBox(ctx, cx, h * (mob ? 0.72 : 0.76), sp.line, sp.sub, sp.alpha, mob);

  if (local > 0.35) {
    const wave = Math.sin(t * 8) * 0.5 + 0.5;
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = NEON.green;
    ctx.globalAlpha = 0.5 + wave * 0.5;
    ctx.fillText('◉ ◉ ◉ · SPRICHT · ZU · DIR · ◉ ◉ ◉', cx, h * (mob ? 0.64 : 0.68));
    ctx.globalAlpha = 1;
  }
}

export function isHailMaryPhase(key) {
  return key === 'hailmary';
}
