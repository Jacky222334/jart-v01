/** Safari · iPhone · Touch & Viewport */
export function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function clientX(e) {
  if (e.touches?.length) return e.touches[0].clientX;
  if (e.changedTouches?.length) return e.changedTouches[0].clientX;
  return e.clientX;
}

export function clientY(e) {
  if (e.touches?.length) return e.touches[0].clientY;
  if (e.changedTouches?.length) return e.changedTouches[0].clientY;
  return e.clientY;
}

export function bindSafariPlayback(art) {
  const resync = () => {
    if (art.launched && !art.paused) {
      art.t0 = performance.now() - art.time * 1000;
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') resync();
  });
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) resync();
  });
  window.addEventListener('focus', resync);
}

export function bindCanvasControls(canvas, art, { timelineEl, isScrubbing }) {
  let touchFromCanvas = false;
  let suppressClick = false;

  const inTimeline = (e) => {
    const y = clientY(e);
    if (timelineEl?.classList.contains('visible') && y > window.innerHeight - 80) return true;
    return timelineEl?.contains(e.target);
  };

  canvas.addEventListener('touchstart', (e) => {
    if (inTimeline(e) || isScrubbing()) return;
    touchFromCanvas = true;
    suppressClick = false;
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    if (!touchFromCanvas || inTimeline(e) || isScrubbing()) {
      touchFromCanvas = false;
      return;
    }
    if (e.changedTouches.length !== 1) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.changedTouches[0].clientX - rect.left;
    const y = e.changedTouches[0].clientY - rect.top;
    if (!art.launched) {
      art.tryLaunch(x, y);
      suppressClick = true;
      return;
    }
    art.togglePause();
    suppressClick = true;
    touchFromCanvas = false;
  }, { passive: true });

  canvas.addEventListener('click', (e) => {
    if (suppressClick) {
      suppressClick = false;
      e.preventDefault();
      return;
    }
    if (inTimeline(e) || isScrubbing()) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (!art.launched) {
      art.tryLaunch(x, y);
      return;
    }
    art.togglePause();
  });
}
