/** FFT-Bänder · Beat-Erkennung */
export function bandLevels(dataFreq, sampleRate = 44100) {
  const n = dataFreq.length;
  const hzPerBin = (sampleRate * 0.5) / n;
  let bass = 0;
  let mid = 0;
  let treble = 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const v = dataFreq[i] / 255;
    total += v;
    const hz = i * hzPerBin;
    if (hz < 180) bass += v;
    else if (hz < 2200) mid += v;
    else treble += v;
  }
  const norm = (x, d) => Math.min(1, x / d);
  return {
    bass: norm(bass, 28),
    mid: norm(mid, 42),
    treble: norm(treble, 36),
    rms: norm(total, n * 0.45),
  };
}

export function createBeatDetector({ threshold = 1.35, decay = 0.92 } = {}) {
  let avg = 0.08;
  let beat = 0;
  let lastBeat = 0;

  return function step(bass, now = performance.now()) {
    avg = avg * decay + bass * (1 - decay);
    const hit = bass > avg * threshold && bass > 0.12 && now - lastBeat > 140;
    if (hit) {
      beat = 1;
      lastBeat = now;
    } else {
      beat *= 0.86;
    }
    return { beat, avg };
  };
}
