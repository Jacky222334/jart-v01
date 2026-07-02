import { NightImpressionIV } from './sketch.js';

const canvas = document.querySelector('canvas');
const art = new NightImpressionIV(canvas);
art.start();

canvas.addEventListener('click', () => art.togglePause());

window.addEventListener('keydown', (e) => {
  if (e.key === 's' || e.key === 'S') art.saveFrame();
  if (e.key === ' ') { e.preventDefault(); art.togglePause(); }
});
