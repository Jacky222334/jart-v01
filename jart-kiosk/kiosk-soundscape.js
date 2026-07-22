/** Pi-Kiosk · dezente Kosmos-Soundkulisse · Funk · Konsole · Knistern */

function makeReverb(ctx) {
  const len = Math.floor(ctx.sampleRate * 2.8);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.2;
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf;
  return conv;
}

function cosmicCrackle(ctx, dest, vol) {
  const t = ctx.currentTime;
  const dur = 0.12 + Math.random() * 0.2;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * (Math.random() > 0.9 ? 1 : 0.2) * (1 - i / len);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 500 + Math.random() * 2000;
  bp.Q.value = 1.5;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(bp);
  bp.connect(g);
  g.connect(dest);
  src.start(t);
  src.stop(t + dur);
}

function radioStatic(ctx, dest, vol) {
  const t = ctx.currentTime;
  const dur = 0.06 + Math.random() * 0.14;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2800;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(lp);
  lp.connect(g);
  g.connect(dest);
  src.start(t);
  src.stop(t + dur);
}

function computerBlip(ctx, dest, vol) {
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'square';
  o.frequency.value = [880, 1100, 660][Math.floor(Math.random() * 3)];
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  o.connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(t + 0.04);
}

export class KioskSoundscape {
  constructor(volume = 1) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.base = this.volume;
    this.ctx = null;
    this.paused = false;
    this.t0 = 0;
    this.lastCrackle = 0;
    this.lastStatic = 0;
    this.lastBlip = 0;
  }

  async start() {
    if (this.ctx) {
      await this.ctx.resume();
      return this;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'playback' });

    const master = this.ctx.createGain();
    master.gain.value = this.base;
    master.connect(this.ctx.destination);
    this.master = master;

    const reverb = makeReverb(this.ctx);
    const rev = this.ctx.createGain();
    rev.gain.value = 0.35;
    reverb.connect(master);
    rev.connect(reverb);

    const bus = this.ctx.createGain();
    bus.gain.value = 1;
    bus.connect(master);
    bus.connect(rev);
    this.bus = bus;

    const noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    const cosmic = this.ctx.createGain();
    cosmic.gain.value = 0.16;
    cosmic.connect(bus);

    for (const f of [48, 72, 96]) {
      const o = this.ctx.createOscillator();
      o.type = f === 48 ? 'sine' : 'triangle';
      o.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.value = 0.04 + (f === 48 ? 0.03 : 0);
      o.connect(g);
      g.connect(cosmic);
      o.start();
    }

    const wind = this.ctx.createBufferSource();
    wind.buffer = noiseBuf;
    wind.loop = true;
    const wf = this.ctx.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.value = 180;
    wf.Q.value = 0.35;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.028;
    wind.connect(wf);
    wf.connect(this.windGain);
    this.windGain.connect(cosmic);
    wind.start();

    const unlock = () => {
      this.ctx.resume();
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('pointerdown', unlock);
    };
    await this.ctx.resume();
    if (this.ctx.state === 'suspended') {
      window.addEventListener('click', unlock);
      window.addEventListener('keydown', unlock);
      window.addEventListener('pointerdown', unlock);
    }
    this.t0 = performance.now();
    return this;
  }

  pause() {
    this.paused = true;
    this.ctx?.suspend();
  }

  resume() {
    this.paused = false;
    this.ctx?.resume();
  }

  tick() {
    if (!this.ctx || this.paused) return;
    const now = performance.now() / 1000;
    const t = this.ctx.currentTime;
    this.windGain?.gain.setTargetAtTime(
      0.02 + Math.sin(now * 0.13) * 0.012, t, 0.5,
    );

    if (now - this.lastCrackle > 1.6 + Math.random() * 3) {
      this.lastCrackle = now;
      cosmicCrackle(this.ctx, this.bus, 0.035 + Math.random() * 0.04);
    }
    if (now - this.lastStatic > 4 + Math.random() * 6) {
      this.lastStatic = now;
      radioStatic(this.ctx, this.bus, 0.06 + Math.random() * 0.05);
    }
    if (now - this.lastBlip > 2.5 + Math.random() * 4) {
      this.lastBlip = now;
      computerBlip(this.ctx, this.bus, 0.05 + Math.random() * 0.04);
    }
  }
}

export async function initKioskSoundscape(volume = 0.35) {
  const s = new KioskSoundscape(volume);
  await s.start();
  const loop = () => {
    s.tick();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return s;
}
