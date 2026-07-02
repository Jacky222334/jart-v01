import { Antrieb100LY } from './sketch.js';
import { CYCLE, PHASES } from './systems.js';
import { createTimeline } from './timeline.js';

const SCENES = [
  { key: 'reunion', label: '1 · Reunion · Bethy & Jany nähern sich' },
  { key: 'kolonie', label: '2 · Kolonie · Schiff bauen & Landung', local: 0.25 },
  { key: 'kolonie', label: '3 · Siedlung · zwei Katzen tanzen', local: 0.78 },
  { key: 'fusion', label: '4 · Fusion · Bethy + Jany', local: 0.55 },
  { key: 'posturknall', label: '5 · Happy End · Paradies', local: 0.6 },
];

function timeForScene(scene) {
  const ph = PHASES.find((x) => x.key === scene.key);
  const local = scene.local ?? 0.5;
  return (ph.p0 + (ph.p1 - ph.p0) * local) * CYCLE;
}

const canvas = document.querySelector('canvas');
const titleEl = document.getElementById('scene-title');
const art = new Antrieb100LY(canvas);
const timeline = createTimeline(art, { showAfterLaunch: false });
timeline.el.classList.add('visible');

let sceneIdx = 2;

function showScene(i) {
  sceneIdx = (i + SCENES.length) % SCENES.length;
  const scene = SCENES[sceneIdx];
  art.launched = true;
  art.paused = false;
  art.time = timeForScene(scene);
  art.t0 = performance.now() - art.time * 1000;
  art.canvas.style.cursor = 'crosshair';
  titleEl.textContent = scene.label;
  timeline.update();
}

showScene(sceneIdx);
art.start();

window.addEventListener('keydown', (e) => {
  if (e.key >= '1' && e.key <= '5') {
    e.preventDefault();
    showScene(Number(e.key) - 1);
    return;
  }
  if (e.key === 'ArrowLeft' && !e.target.closest('.timeline-track')) {
    e.preventDefault();
    showScene(sceneIdx - 1);
    return;
  }
  if (e.key === 'ArrowRight' && !e.target.closest('.timeline-track')) {
    e.preventDefault();
    showScene(sceneIdx + 1);
    return;
  }
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    art.togglePause();
  }
  if (e.key === 's' || e.key === 'S') art.saveFrame();
});

canvas.addEventListener('click', () => {
  art.togglePause();
});
