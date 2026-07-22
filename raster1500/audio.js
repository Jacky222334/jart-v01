/** Mac-Mikrofon / System-Eingang → Analyser-Bänder */

async function pickMacMicId() {
  // braucht einmalige Permission, sonst sind Labels oft leer
  try {
    const tmp = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    tmp.getTracks().forEach((t) => t.stop());
  } catch {
    /* Permission kommt gleich nochmal im echten Start */
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const inputs = devices.filter((d) => d.kind === 'audioinput');
  if (!inputs.length) return null;

  const score = (label) => {
    const l = (label || '').toLowerCase();
    if (/blackhole|loopback|soundflower|aggregate|multi-output|virtual/.test(l)) return 0;
    if (/built[- ]?in|macbook|interne|internal|mikrofon|microphone/.test(l)) return 100;
    if (/default|standard/.test(l)) return 80;
    return 40;
  };

  inputs.sort((a, b) => score(b.label) - score(a.label));
  return inputs[0];
}

export function createAudioDrive() {
  let ctx = null;
  let analyser = null;
  let source = null;
  let stream = null;
  let data = null;
  let levels = { bass: 0, mid: 0, treble: 0, beat: 0, rms: 0 };
  let prevBass = 0;
  let beatEnv = 0;
  let active = false;
  let label = 'kein Audio';

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.55;
    data = new Uint8Array(analyser.frequencyBinCount);
  }

  async function resume() {
    ensure();
    if (ctx.state === 'suspended') await ctx.resume();
  }

  async function startMic() {
    ensure();
    await resume();
    stop();

    const mic = await pickMacMicId();
    const audioConstraints = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    };
    if (mic?.deviceId) {
      audioConstraints.deviceId = { exact: mic.deviceId };
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });
    } catch {
      // Fallback: System-Default-Mikrofon
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
    }

    source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    active = true;
    const trackLabel = stream.getAudioTracks()[0]?.label || mic?.label || 'Mac-Mikrofon';
    label = trackLabel;
  }

  function stop() {
    try { source?.disconnect(); } catch { /* */ }
    source = null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    active = false;
    label = 'kein Audio';
  }

  function tick() {
    if (!analyser || !data || !active) {
      const t = performance.now() * 0.001;
      levels = {
        bass: 0.15 + Math.sin(t * 1.2) * 0.05,
        mid: 0.12 + Math.sin(t * 2.1) * 0.04,
        treble: 0.1 + Math.sin(t * 3.3) * 0.03,
        beat: 0,
        rms: 0.12,
      };
      return levels;
    }
    analyser.getByteFrequencyData(data);
    const n = data.length;
    const bEnd = Math.floor(n * 0.08);
    const mEnd = Math.floor(n * 0.35);
    let bass = 0;
    let mid = 0;
    let treble = 0;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const v = data[i] / 255;
      sum += v;
      if (i < bEnd) bass += v;
      else if (i < mEnd) mid += v;
      else treble += v;
    }
    bass /= Math.max(1, bEnd);
    mid /= Math.max(1, mEnd - bEnd);
    treble /= Math.max(1, n - mEnd);
    const rms = sum / n;

    const rise = Math.max(0, bass - prevBass);
    prevBass = bass * 0.65 + prevBass * 0.35;
    beatEnv = Math.max(beatEnv * 0.82, rise * 4.5);
    if (beatEnv > 1) beatEnv = 1;

    // etwas empfindlicher für Raum-/Lautsprecher-Pickup übers Mic
    levels = {
      bass: Math.min(1, bass * 2.1),
      mid: Math.min(1, mid * 2.0),
      treble: Math.min(1, treble * 2.2),
      beat: beatEnv,
      rms: Math.min(1, rms * 2.8),
    };
    return levels;
  }

  return {
    startMic,
    stop,
    resume,
    tick,
    isActive: () => active,
    getLabel: () => label,
    getLevels: () => levels,
  };
}
