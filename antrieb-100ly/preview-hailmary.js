import { Antrieb100LY } from './sketch.js';
import { createTimeline } from './timeline.js';
import { bindSafariPlayback, bindCanvasControls } from './mobile.js';
import { launchAtPhase, phaseRange } from './startPhase.js';

const canvas = document.querySelector('canvas');
const art = new Antrieb100LY(canvas);
const timeline = createTimeline(art, {
  range: phaseRange('hailmary', 0.04),
  showAfterLaunch: false,
});
timeline.el.classList.add('visible');

bindSafariPlayback(art);
bindCanvasControls(canvas, art, {
  timelineEl: timeline.el,
  isScrubbing: () => timeline.isScrubbing(),
});

launchAtPhase(art, 'hailmary', 0.08);
timeline.update();
art.start();
