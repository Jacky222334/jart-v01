/** Interaktiver Zeitstrahl · scrub · Phasen-Markierungen */
import { CYCLE, PHASES, phaseAt } from './systems.js';

const FINALE_KEYS = new Set(['reunion', 'kolonie', 'fusion', 'posturknall']);

export function createTimeline(art, {
  range = null,
  showAfterLaunch = true,
} = {}) {
  const root = document.createElement('div');
  root.id = 'timeline';
  root.className = 'timeline';
  root.innerHTML = `
    <div class="timeline-meta">
      <span class="timeline-phase">—</span>
      <span class="timeline-clock">0:00 / ${fmt(CYCLE)}</span>
    </div>
    <div class="timeline-track" role="slider" aria-label="Zeitstrahl" tabindex="0"
         aria-valuemin="0" aria-valuemax="${CYCLE}" aria-valuenow="0">
      <div class="timeline-segments"></div>
      <div class="timeline-thumb"></div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .timeline {
      position: fixed; left: 0; right: 0; bottom: 0; z-index: 20;
      padding: 0.45rem max(0.65rem, env(safe-area-inset-right))
               max(0.55rem, env(safe-area-inset-bottom))
               max(0.65rem, env(safe-area-inset-left));
      background: linear-gradient(transparent, #000010f0 35%, #000010fa);
      font-family: "SF Mono", ui-monospace, Consolas, monospace;
      font-size: 10px; color: #8cf;
      opacity: 0; pointer-events: none;
      transition: opacity 0.5s ease;
      touch-action: none;
    }
    .timeline.visible { opacity: 1; pointer-events: auto; }
    .timeline-meta {
      display: flex; justify-content: space-between; gap: 0.5rem;
      margin-bottom: 0.35rem; align-items: baseline;
    }
    .timeline-phase { color: #ff0; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .timeline-clock { color: #6af; flex-shrink: 0; }
    .timeline-track {
      position: relative; height: 22px; border-radius: 11px;
      background: #0a1428; border: 1px solid #234;
      cursor: pointer; outline: none;
    }
    .timeline-track:focus-visible { box-shadow: 0 0 0 2px #0af8; }
    .timeline-segments {
      position: absolute; inset: 3px 4px; border-radius: 8px; overflow: hidden;
      display: flex;
    }
    .timeline-seg {
      height: 100%; opacity: 0.55; border-right: 1px solid #00001088;
    }
    .timeline-seg.finale { opacity: 0.85; }
    .timeline-thumb {
      position: absolute; top: 50%; width: 14px; height: 14px;
      margin-left: -7px; margin-top: -7px; border-radius: 50%;
      background: #0ff; border: 2px solid #fff;
      box-shadow: 0 0 10px #0ff, 0 0 20px #0ff8;
      pointer-events: none; left: 0%;
      transition: left 0.05s linear;
    }
    .timeline.scrubbing .timeline-thumb { transition: none; }
    @media (max-width: 430px) {
      .timeline { font-size: 9px; padding-bottom: max(0.75rem, env(safe-area-inset-bottom)); }
      .timeline-track { height: 30px; -webkit-tap-highlight-color: transparent; }
      .timeline-thumb { width: 18px; height: 18px; margin-left: -9px; margin-top: -9px; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(root);

  const track = root.querySelector('.timeline-track');
  const segments = root.querySelector('.timeline-segments');
  const thumb = root.querySelector('.timeline-thumb');
  const phaseEl = root.querySelector('.timeline-phase');
  const clockEl = root.querySelector('.timeline-clock');

  let tMin = 0;
  let tMax = CYCLE;
  let dragging = false;
  let wasPlaying = false;

  const COLORS = {
    intro: '#4488ff', overview: '#6688aa', chemical: '#ff4400', scramjet: '#ff8800',
    ion: '#4488ff', laser: '#ff2244', nuclear: '#ffee00', antimatter: '#cc44ff',
    quantum: '#8844ff', seed: '#ffffff', boost: '#00ffff', relativ: '#8844ff',
    transit: '#00ffff', hailmary: '#ff00ea', orbit: '#4488ff', reunion: '#ff00ea',
    kolonie: '#00ff88', fusion: '#ff00ea', posturknall: '#ffee88',
  };

  function setRange(r) {
    if (!r) {
      tMin = 0;
      tMax = CYCLE;
    } else {
      tMin = r[0] * CYCLE;
      tMax = r[1] * CYCLE;
    }
    buildSegments();
    update();
  }

  function buildSegments() {
    segments.innerHTML = '';
    const span = tMax - tMin;
    PHASES.forEach((ph) => {
      const start = ph.p0 * CYCLE;
      const end = ph.p1 * CYCLE;
      if (end <= tMin || start >= tMax) return;
      const seg = document.createElement('div');
      seg.className = 'timeline-seg' + (FINALE_KEYS.has(ph.key) ? ' finale' : '');
      seg.style.flex = String((Math.min(end, tMax) - Math.max(start, tMin)) / span);
      seg.style.background = COLORS[ph.key] || '#345';
      seg.title = ph.name;
      segments.appendChild(seg);
    });
  }

  function fmt(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function normTime(t) {
    return ((t % CYCLE) + CYCLE) % CYCLE;
  }

  function clampTime(t) {
    const n = normTime(t);
    if (tMax >= CYCLE - 0.001 && tMin <= 0.001) return n;
    return Math.max(tMin, Math.min(tMax, n));
  }

  function posToTime(clientX) {
    const rect = track.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return tMin + p * (tMax - tMin);
  }

  function timeToPct(t) {
    const span = tMax - tMin;
    return span > 0 ? ((clampTime(t) - tMin) / span) * 100 : 0;
  }

  function seek(t, { redraw = true } = {}) {
    if (!art.launched) {
      art.launched = true;
      art.canvas.style.cursor = 'crosshair';
      document.getElementById('hint')?.classList.add('visible');
    }
    art.time = clampTime(t);
    art.t0 = performance.now() - art.time * 1000;
    if (redraw) art.draw();
    update();
  }

  function update() {
    if (showAfterLaunch && !art.launched) {
      root.classList.remove('visible');
      return;
    }
    root.classList.add('visible');
    const { ph } = phaseAt(art.time);
    phaseEl.textContent = ph.name;
    clockEl.textContent = `${fmt(art.time)} / ${fmt(CYCLE)}`;
    thumb.style.left = `${timeToPct(art.time)}%`;
    track.setAttribute('aria-valuenow', String(Math.round(art.time)));
  }

  function onScrubStart(e) {
    if (e) e.stopPropagation();
    dragging = true;
    wasPlaying = art.launched && !art.paused;
    art.paused = true;
    root.classList.add('scrubbing');
  }

  function onScrub(clientX, e) {
    if (e) e.stopPropagation();
    seek(posToTime(clientX));
  }

  function onScrubEnd(e) {
    if (e) e.stopPropagation();
    if (!dragging) return;
    dragging = false;
    root.classList.remove('scrubbing');
    if (wasPlaying) {
      art.paused = false;
      art.t0 = performance.now() - art.time * 1000;
      wasPlaying = false;
    }
  }

  function px(e) {
    if (e.touches?.length) return e.touches[0].clientX;
    if (e.changedTouches?.length) return e.changedTouches[0].clientX;
    return e.clientX;
  }

  root.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    onScrubStart(e);
    onScrub(px(e), e);
  }, { passive: false });
  root.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    e.preventDefault();
    e.stopPropagation();
    onScrub(px(e), e);
  }, { passive: false });
  root.addEventListener('touchend', (e) => {
    e.stopPropagation();
    onScrubEnd(e);
  });
  root.addEventListener('touchcancel', (e) => onScrubEnd(e));

  track.addEventListener('lostpointercapture', onScrubEnd);
  window.addEventListener('pointerup', onScrubEnd);
  window.addEventListener('pointercancel', onScrubEnd);

  track.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (track.setPointerCapture) track.setPointerCapture(e.pointerId);
    onScrubStart(e);
    onScrub(e.clientX, e);
  });
  track.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    e.stopPropagation();
    onScrub(e.clientX, e);
  });
  track.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    if (track.releasePointerCapture) track.releasePointerCapture(e.pointerId);
    onScrubEnd(e);
  });
  track.addEventListener('pointercancel', onScrubEnd);

  track.addEventListener('keydown', (e) => {
    if (!art.launched) return;
    const step = e.shiftKey ? 5 : 1;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      seek(art.time - step);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      seek(art.time + step);
    }
  });

  function sync() {
    if (!dragging) update();
    requestAnimationFrame(sync);
  }
  requestAnimationFrame(sync);

  setRange(range);
  return {
    seek, update, setRange, el: root,
    isScrubbing: () => dragging,
  };
}
