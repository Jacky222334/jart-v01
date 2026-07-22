import { Veggakle34 } from './sketch.js';
import { createAudioDrive } from './audio.js';

const canvas = document.querySelector('canvas');
const btn = document.getElementById('audio-btn');
const statusEl = document.getElementById('status');
const tipEl = document.getElementById('tip');

const art = new Veggakle34(canvas);
const audio = createAudioDrive();
art.start();

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

function pump() {
  art.setAudio(audio.tick());
  requestAnimationFrame(pump);
}
pump();

btn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleAudio();
});

canvas.addEventListener('click', () => art.togglePause());

window.addEventListener('keydown', (e) => {
  if (e.key === 's' || e.key === 'S') art.saveFrame();
  if (e.key === ' ' || e.key === 'p') { e.preventDefault(); art.togglePause(); }
  if (e.key === 'a' || e.key === 'm') toggleAudio();
});

setUi(false);
