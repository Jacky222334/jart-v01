import { ArtemisSim } from './sketch.js';

const canvas = document.querySelector('canvas');
const art = new ArtemisSim(canvas);
window.artemis = art;

canvas.addEventListener('click', () => art.togglePause());
window.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    art.togglePause();
  }
  if (e.key === 'ArrowRight') art.skipMission();
  if (e.key === 'ArrowLeft') art.prevMission();
  if (e.key === 's' || e.key === 'S') art.saveFrame();
  if (e.key === '+' || e.key === '=') art.setTimeScale((art.timeScale || 1) * 1.15);
  if (e.key === '-' || e.key === '_') art.setTimeScale((art.timeScale || 1) / 1.15);
});

// Push-/Bridge-Befehle: window.artemisCmd({op:...})
window.artemisCmd = (cmd) => {
  if (!cmd || !cmd.op) return art.status();
  switch (cmd.op) {
    case 'pause':
      art.togglePause();
      break;
    case 'next':
      art.skipMission();
      break;
    case 'prev':
      art.prevMission();
      break;
    case 'jump':
      art.jumpMission(cmd.i | 0);
      break;
    case 'speed':
      art.setTimeScale(cmd.v);
      break;
    case 'save':
      art.saveFrame();
      break;
    default:
      break;
  }
  return art.status();
};

art.start();

const hint = document.getElementById('hint');
if (hint) {
  hint.textContent = 'push · pause · mission ←→ · tempo · s speichern';
}
