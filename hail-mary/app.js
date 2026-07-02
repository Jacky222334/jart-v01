import { HailMarySim } from './sketch.js';

const canvas = document.querySelector('canvas');
const art = new HailMarySim(canvas);

canvas.addEventListener('click', () => art.togglePause());
window.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    art.togglePause();
  }
  if (e.key === 'ArrowRight') art.skipAct();
  if (e.key === 's' || e.key === 'S') art.saveFrame();
});

art.start();
