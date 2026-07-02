import { BuyingTime } from './sketch.js';

const canvas = document.querySelector('canvas');
const art = new BuyingTime(canvas);

document.getElementById('prev').addEventListener('click', () => art.stepMinute(-1));
document.getElementById('next').addEventListener('click', () => art.stepMinute(1));
document.getElementById('timeLabel').addEventListener('click', () => art.useLive());
document.getElementById('liveBtn').addEventListener('click', () => art.useLive());

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') art.stepMinute(-1);
  if (e.key === 'ArrowRight') art.stepMinute(1);
  if (e.key === 'l' || e.key === 'L') art.useLive();
  if (e.key === 's' || e.key === 'S') art.saveFrame();
});

art.start();
