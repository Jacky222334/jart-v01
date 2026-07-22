/** Kiosk · Headless-Audioanalyse · Musik steuert Animation */
import { bandLevels, createBeatDetector } from './audio-analysis.js';

export function createKioskAudioMeter(_root) {
  let ctx = null;
  let analyser = null;
  let bus = null;
  let kickGain = null;
  let dataTime = null;
  let dataFreq = null;
  let tapped = new WeakSet();
  let drive = { bass: 0, mid: 0, treble: 0, beat: 0, rms: 0, l: 0, r: 0 };
  let liveOn = false;
  let liveIframe = null;
  const beatDetect = createBeatDetector();
  const driveListeners = new Set();
  let lastKick = 0;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    bus = ctx.createGain();
    bus.gain.value = 1;
    kickGain = ctx.createGain();
    kickGain.gain.value = 0;
    kickGain.connect(bus);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.45;
    bus.connect(analyser);
    analyser.connect(ctx.destination);
    dataTime = new Uint8Array(analyser.fftSize);
    dataFreq = new Uint8Array(analyser.frequencyBinCount);
  }

  async function resume() {
    ensure();
    if (ctx?.state === 'suspended') await ctx.resume();
  }

  function tapMedia(node) {
    ensure();
    if (!node || tapped.has(node)) return;
    try {
      const src = ctx.createMediaElementSource(node);
      src.connect(bus);
      tapped.add(node);
    } catch { /* */ }
  }

  function injectScripts(iframe) {
    liveIframe = iframe;
    iframe.addEventListener('load', () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        doc.querySelectorAll('audio, video').forEach((m) => {
          if (!m.muted) tapMedia(m);
          m.addEventListener('play', () => tapMedia(m));
        });
        for (const src of ['/jart-kiosk/audio-bridge.js', '/jart-kiosk/audio-reactive.js']) {
          if (doc.querySelector(`script[src="${src}"]`)) continue;
          const s = doc.createElement('script');
          s.src = src;
          doc.head.appendChild(s);
        }
      } catch { /* */ }
    });
  }

  function pulseKick(strength = 1) {
    if (!kickGain || !ctx) return;
    const t = ctx.currentTime;
    kickGain.gain.cancelScheduledValues(t);
    kickGain.gain.setValueAtTime(0.35 * strength, t);
    kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  }

  function startLive(colorEngine) {
    if (liveOn) return;
    liveOn = true;
    ensure();
    resume();

    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 320;
    noiseFilter.Q.value = 1.1;

    const bassOsc = ctx.createOscillator();
    bassOsc.type = 'sine';
    bassOsc.frequency.value = 55;

    const padOsc = ctx.createOscillator();
    padOsc.type = 'triangle';
    padOsc.frequency.value = 110;

    const liveGain = ctx.createGain();
    liveGain.gain.value = 0.035;

    noise.connect(noiseFilter);
    noiseFilter.connect(liveGain);
    bassOsc.connect(liveGain);
    padOsc.connect(liveGain);
    liveGain.connect(bus);

    const kickOsc = ctx.createOscillator();
    kickOsc.type = 'sine';
    kickOsc.frequency.value = 48;
    kickOsc.connect(kickGain);
    kickOsc.start();

    noise.start();
    bassOsc.start();
    padOsc.start();

    let bpmPhase = 0;
    const modulate = (now) => {
      if (!liveOn) return;
      bpmPhase += (now - (modulate.last || now)) / 480; // ~125 BPM
      modulate.last = now;
      if (bpmPhase >= 1) {
        bpmPhase -= 1;
        pulseKick(0.8 + drive.bass * 0.4);
        lastKick = now;
      }

      const t = ctx.currentTime;
      const b = drive.bass;
      const m = drive.mid;
      liveGain.gain.setTargetAtTime(0.02 + b * 0.05 + drive.beat * 0.04, t, 0.06);
      bassOsc.frequency.setTargetAtTime(44 + m * 40 + (colorEngine?.audio?.treble ?? 0) * 30, t, 0.1);
      padOsc.frequency.setTargetAtTime(88 + b * 60, t, 0.12);
      noiseFilter.frequency.setTargetAtTime(200 + m * 500 + drive.beat * 200, t, 0.08);
      requestAnimationFrame(modulate);
    };
    modulate.last = performance.now();
    requestAnimationFrame(modulate);

    colorEngine.onProfile = (p) => {
      bassOsc.frequency.setTargetAtTime(40 + p.hues[0] * 0.35, ctx.currentTime, 0.4);
    };

  }

  function broadcastDrive() {
    const payload = { type: 'jart-audio-drive', ...drive };
    driveListeners.forEach((fn) => fn(drive));
    if (liveIframe?.contentWindow) {
      liveIframe.contentWindow.postMessage(payload, '*');
    }
  }

  function onMessage(e) {
    if (e.data?.type !== 'jart-audio-level') return;
    drive.l = Math.max(drive.l, e.data.l ?? 0);
    drive.r = Math.max(drive.r, e.data.r ?? 0);
  }

  function tick() {
    const now = performance.now();
    if (analyser) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      analyser.getByteTimeDomainData(dataTime);
      analyser.getByteFrequencyData(dataFreq);

      let sumL = 0;
      let sumR = 0;
      const half = dataTime.length >> 1;
      for (let i = 0; i < dataTime.length; i++) {
        const v = (dataTime[i] - 128) / 128;
        if (i < half) sumL += v * v;
        else sumR += v * v;
      }
      const l = Math.sqrt(sumL / half);
      const r = Math.sqrt(sumR / half);
      const rms = Math.sqrt((sumL + sumR) / dataTime.length);

      const bands = bandLevels(dataFreq, ctx.sampleRate);
      const { beat } = beatDetect(bands.bass, now);
      drive = {
        bass: bands.bass,
        mid: bands.mid,
        treble: bands.treble,
        rms: Math.max(bands.rms, rms),
        beat,
        l,
        r,
      };
      broadcastDrive();
    }

    requestAnimationFrame(tick);
  }

  window.addEventListener('message', onMessage);
  resume();
  setInterval(() => resume(), 3000);
  requestAnimationFrame(tick);

  return {
    hookIframe: injectScripts,
    resume,
    startLive,
    onDrive(fn) {
      driveListeners.add(fn);
      return () => driveListeners.delete(fn);
    },
    getDrive: () => ({ ...drive }),
  };
}
