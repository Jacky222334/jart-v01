import { renderImpression } from './impression.js';

export class NightImpressionIV {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.paused = false;
    this.t0 = 0;
    this.time = 0;
    this.raf = null;

    this.buffer = document.createElement('canvas');
    this.bufferCtx = this.buffer.getContext('2d');
    this.internalSize = 512;

    this.buffer.width = this.internalSize;
    this.buffer.height = this.internalSize;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.displayW = window.innerWidth;
    this.displayH = window.innerHeight;
    this.draw();
  }

  draw() {
    renderImpression(this.bufferCtx, this.internalSize, this.internalSize, this.time);

    this.ctx.fillStyle = '#030303';
    this.ctx.fillRect(0, 0, this.displayW, this.displayH);

    const size = Math.min(this.displayW, this.displayH) * 0.92;
    const ox = (this.displayW - size) / 2;
    const oy = (this.displayH - size) / 2;

    this.ctx.filter = 'blur(18px) saturate(1.15)';
    this.ctx.drawImage(this.buffer, ox, oy, size, size);
    this.ctx.filter = 'blur(6px) saturate(1.1)';
    this.ctx.globalAlpha = 0.85;
    this.ctx.drawImage(this.buffer, ox, oy, size, size);
    this.ctx.globalAlpha = 1;
    this.ctx.filter = 'none';
    this.ctx.drawImage(this.buffer, ox, oy, size, size);
  }

  tick(now) {
    if (!this.raf) return;
    if (!this.paused) {
      this.time = (now - this.t0) * 0.001;
      this.draw();
    }
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  start() {
    if (this.raf) return;
    this.t0 = performance.now();
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  togglePause() {
    this.paused = !this.paused;
    if (!this.paused) {
      this.t0 = performance.now() - this.time * 1000;
    }
  }

  saveFrame() {
    this.canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `night-impression-iv-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}
