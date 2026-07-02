import { Antrieb100LY } from './sketch.js';

const canvas = document.querySelector('canvas');
const art = new Antrieb100LY(canvas);
let touchPause = false;

canvas.style.cursor = 'pointer';

function pointerXY(e) {
  const rect = canvas.getBoundingClientRect();
  const src = e.changedTouches?.[0] ?? e.touches?.[0] ?? e;
  return { x: src.clientX - rect.left, y: src.clientY - rect.top };
}

function bindViewport() {
  const vv = window.visualViewport;
  if (!vv) return;
  vv.addEventListener('resize', () => art.resize());
  vv.addEventListener('scroll', () => art.resize());
}

canvas.addEventListener('touchstart', () => { touchPause = false; }, { passive: true });
canvas.addEventListener('touchend', (e) => {
  if (e.changedTouches.length !== 1) return;
  const { x, y } = pointerXY(e);
  if (!art.launched) {
    art.tryLaunch(x, y);
    return;
  }
  touchPause = true;
  art.togglePause();
}, { passive: true });

canvas.addEventListener('click', (e) => {
  const { x, y } = pointerXY(e);
  if (!art.launched) {
    art.tryLaunch(x, y);
    return;
  }
  if (touchPause) {
    touchPause = false;
    return;
  }
  art.togglePause();
});

window.addEventListener('keydown', (e) => {
  if (!art.launched && (e.key === ' ' || e.key === 'Enter')) {
    e.preventDefault();
    art.launch();
    return;
  }
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    art.togglePause();
  }
  if (e.key === 's' || e.key === 'S') art.saveFrame();
});

window.addEventListener('orientationchange', () => {
  setTimeout(() => art.resize(), 120);
});

bindViewport();
art.start();
