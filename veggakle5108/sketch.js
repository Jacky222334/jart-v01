import { FRAMES, FPS, renderFrame } from './stipple.js';

export class Veggakle34 {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.paused = false;
    this.frame = 0;
    this.lastTime = 0;
    this.raf = null;
    this.buffer = document.createElement('canvas');
    this.bufferCtx = this.buffer.getContext('2d');
    this.internalW = 640;
    this.internalH = 360;

    this.buffer.width = this.internalW;
    this.buffer.height = this.internalH;
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
  }

  draw() {
    const data = renderFrame(this.internalW, this.internalH, this.frame);
    this.bufferCtx.putImageData(new ImageData(data, this.internalW, this.internalH), 0, 0);

    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.displayW, this.displayH);

    const scale = Math.max(
      this.displayW / this.internalW,
      this.displayH / this.internalH,
    );
    const dw = this.internalW * scale;
    const dh = this.internalH * scale;
    const ox = (this.displayW - dw) / 2;
    const oy = (this.displayH - dh) / 2;

    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.buffer, ox, oy, dw, dh);
  }

  tick(now) {
    if (!this.raf) return;
    if (!this.paused) {
      if (now - this.lastTime >= 1000 / FPS) {
        this.frame = (this.frame + 1) % FRAMES;
        this.lastTime = now;
        this.draw();
      }
    }
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  start() {
    if (this.raf) return;
    this.lastTime = performance.now();
    this.draw();
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  togglePause() {
    this.paused = !this.paused;
    if (!this.paused) this.lastTime = performance.now();
  }

  saveFrame() {
    this.canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `veggakle-34-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}
