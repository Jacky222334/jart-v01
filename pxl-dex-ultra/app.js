import { PxlDexUltra } from './engine.js';

const screen = document.getElementById('screen');
const art = new PxlDexUltra(screen);
art.start();

window.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    art.togglePause();
  }
  if (e.key === 's' || e.key === 'S') art.saveFrame();
  if (e.key === 'r' || e.key === 'R') art.regenerate();
});

screen.addEventListener('click', () => art.togglePause());
