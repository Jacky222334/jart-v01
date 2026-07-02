import { Antrieb100LY } from './sketch.js';
import { createTimeline } from './timeline.js';
import { bindSafariPlayback, bindCanvasControls } from './mobile.js';
import { readStartPhase, launchAtPhase } from './startPhase.js';

const canvas = document.querySelector('canvas');
const art = new Antrieb100LY(canvas);
const timeline = createTimeline(art);

bindSafariPlayback(art);
bindCanvasControls(canvas, art, {
  timelineEl: timeline.el,
  isScrubbing: () => timeline.isScrubbing(),
});

const startKey = readStartPhase();
if (startKey) {
  launchAtPhase(art, startKey);
  timeline.update();
}

function bindViewport() {
  const vv = window.visualViewport;
  if (!vv) return;
  const sync = () => art.resize();
  vv.addEventListener('resize', sync);
  vv.addEventListener('scroll', sync);
}

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
  setTimeout(() => art.resize(), 150);
});

bindViewport();
art.start();
