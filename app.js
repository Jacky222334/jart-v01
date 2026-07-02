import App from './sketch.js';

const params = new URLSearchParams(window.location.search);
const seed = params.has('seed')
  ? Number(params.get('seed'))
  : Math.floor(Math.random() * 1_000_000);

const canvas = document.querySelector('canvas');
const seedLabel = document.getElementById('seed');
if (seedLabel) seedLabel.textContent = `seed ${seed}`;

const app = new App(canvas, seed);
app.start();

canvas.addEventListener('click', () => {
  const nextSeed = Math.floor(Math.random() * 1_000_000);
  const url = new URL(window.location.href);
  url.searchParams.set('seed', String(nextSeed));
  window.location.href = url.toString();
});
