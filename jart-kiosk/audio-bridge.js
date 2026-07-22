/** In iframe · Media + postMessage Pegel an Kiosk-Parent */
(function jartAudioBridge() {
  if (window.__jartAudioBridge) return;
  window.__jartAudioBridge = true;

  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;

  let ctx = null;
  let analyser = null;
  let bus = null;
  let dataTime = null;
  const tapped = new WeakSet();

  function ensure() {
    if (ctx) return;
    ctx = new AC();
    bus = ctx.createGain();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    bus.connect(analyser);
    analyser.connect(ctx.destination);
    dataTime = new Uint8Array(analyser.fftSize);
    ctx.resume().catch(() => {});
  }

  function tapMedia(el) {
    ensure();
    if (!el || tapped.has(el)) return;
    try {
      const src = ctx.createMediaElementSource(el);
      src.connect(bus);
      src.connect(ctx.destination);
      tapped.add(el);
    } catch { /* */ }
  }

  function scanMedia() {
    document.querySelectorAll('audio, video').forEach((el) => {
      if (!el.muted && !el.paused) tapMedia(el);
      el.addEventListener('play', () => tapMedia(el), { once: false });
    });
  }

  function send() {
    if (!analyser) {
      requestAnimationFrame(send);
      return;
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    analyser.getByteTimeDomainData(dataTime);
    let sumL = 0;
    let sumR = 0;
    let peak = 0;
    const half = dataTime.length >> 1;
    for (let i = 0; i < dataTime.length; i++) {
      const v = (dataTime[i] - 128) / 128;
      peak = Math.max(peak, Math.abs(v));
      if (i < half) sumL += v * v;
      else sumR += v * v;
    }
    window.parent.postMessage({
      type: 'jart-audio-level',
      l: Math.sqrt(sumL / half),
      r: Math.sqrt(sumR / half),
      peak,
      rms: Math.sqrt((sumL + sumR) / dataTime.length),
    }, '*');
    requestAnimationFrame(send);
  }

  scanMedia();
  setInterval(scanMedia, 2500);
  requestAnimationFrame(send);
})();
