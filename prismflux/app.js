import { Prismflux } from './sketch.js';

const screen = document.getElementById('screen');
const art = new Prismflux(screen);
art.start();

window.addEventListener('keydown', (e) => {
  if (e.key === 's' || e.key === 'S') art.saveFrame();
  if (e.key === 'r' || e.key === 'R') art.regenerate();
});

document.addEventListener('click', () => art.regenerate());
