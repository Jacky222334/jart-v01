import { createAudioDrive } from './audio.js';
import { drawFrame } from './sketch.js';

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const btn = document.getElementById('audio-btn');
const statusEl = document.getElementById('status');
const tipEl = document.getElementById('tip');

const audio = createAudioDrive();
let running = true;
let t0 = performance.now();

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function setUi(listening) {
  btn.textContent = listening ? 'Audio stoppen' : 'Spotify hören';
  btn.classList.toggle('on', listening);
  statusEl.textContent = listening
    ? `live · ${audio.getLabel()}`
    : 'idle · Spotify';
  tipEl.hidden = listening;
}

async function toggleAudio() {
  try {
    if (audio.isActive()) {
      audio.stop();
      setUi(false);
      return;
    }
    await audio.startMic();
    setUi(true);
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Mikrofon-Zugriff verweigert';
    tipEl.hidden = false;
  }
}

function frame(now) {
  const t = (now - t0) * 0.001;
  const a = audio.tick();
  if (running) drawFrame(ctx, window.innerWidth, window.innerHeight, t, a);
  requestAnimationFrame(frame);
}

btn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleAudio();
});

canvas.addEventListener('click', () => {
  running = !running;
  statusEl.textContent = running
    ? (audio.isActive() ? `live · ${audio.getLabel()}` : 'idle · Spotify')
    : 'pause';
});

window.addEventListener('resize', resize);
window.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'p') {
    e.preventDefault();
    running = !running;
  }
  if (e.key === 'a' || e.key === 'm') toggleAudio();
});

resize();
setUi(false);
requestAnimationFrame(frame);
