import {
  generateGrid, gridToPixels, mutateRects, mulberry32,
} from './grid.js';
import { VERT, MAIN_FRAG, POST_FRAG, BLIT_FRAG } from './shaders.js';

const SLOTS = 24;
const MODES = 20;
const SEED = 4498;

function createShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(s) || 'shader compile');
  }
  return s;
}

function createProgram(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, createShader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, createShader(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(p) || 'link');
  }
  return p;
}

function createFbo(gl, w, h) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tex, fbo, w, h };
}

function uploadTexture(gl, tex, w, h, data) {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
}

export class PxlDexUltra {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.container.appendChild(this.canvas);
    this.gl = this.canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    if (!this.gl) throw new Error('WebGL2 nicht verfügbar');

    const gl = this.gl;
    gl.clearColor(0, 0, 0.05, 1);
    this.mainProg = createProgram(gl, VERT, MAIN_FRAG);
    this.postProg = createProgram(gl, VERT, POST_FRAG);
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    this.rnd = mulberry32(SEED);
    this.grid = null;
    this.rects = [];
    this.slots = [];
    this.timers = [];
    this.mutateTimer = null;
    this.running = false;
    this.paused = false;
    this.t0 = 0;
    this.fb = [null, null];
    this.baseTex = null;
    this.dpr = 1;
    this.w = 0;
    this.h = 0;

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const gl = this.gl;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(128, Math.floor((this.container.clientWidth || window.innerWidth) * this.dpr));
    this.h = Math.max(128, Math.floor((this.container.clientHeight || window.innerHeight) * this.dpr));
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';

    this.fb.forEach((f) => f && gl.deleteTexture(f.tex));
    this.fb = [createFbo(gl, this.w, this.h), createFbo(gl, this.w, this.h)];
    if (this.baseTex) gl.deleteTexture(this.baseTex);
    this.baseTex = gl.createTexture();
    this.rebuildGrid();
  }

  rebuildGrid() {
    this.rnd = mulberry32(SEED + Math.floor(Math.random() * 999));
    const result = generateGrid([this.w, this.h], SEED);
    this.grid = result.grid;
    this.rects = result.rects;
    this.refreshBase();
    this.assignSlots();
    this.scheduleMutations();
  }

  refreshBase() {
    const pixels = gridToPixels(this.grid);
    uploadTexture(this.gl, this.baseTex, this.w, this.h, pixels);
    uploadTexture(this.gl, this.fb[0].tex, this.w, this.h, pixels);
    uploadTexture(this.gl, this.fb[1].tex, this.w, this.h, pixels);
  }

  patchGrid() {
    mutateRects(this.grid, this.w, this.rects, this.rnd, 3 + Math.floor(this.rnd() * 6));
    this.refreshBase();
  }

  scheduleMutations() {
    if (this.mutateTimer) clearTimeout(this.mutateTimer);
    const tick = () => {
      this.patchGrid();
      this.mutateTimer = setTimeout(tick, 700 + this.rnd() * 900);
    };
    this.mutateTimer = setTimeout(tick, 900);
  }

  shuffleSlot(i) {
    this.slots[i].rectIdx = Math.floor(this.rnd() * Math.max(1, this.rects.length));
    this.slots[i].mode = Math.floor(this.rnd() * MODES);
  }

  assignSlots() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.slots = Array.from({ length: SLOTS }, () => ({
      rectIdx: Math.floor(this.rnd() * Math.max(1, this.rects.length)),
      mode: Math.floor(this.rnd() * MODES),
    }));

    for (let i = 0; i < SLOTS; i++) {
      const rotate = (idx) => {
        const delay = 350 + this.rnd() * 1200;
        this.timers.push(setTimeout(() => {
          this.shuffleSlot(idx);
          rotate(idx);
        }, delay));
      };
      rotate(i);
    }
  }

  bindQuad(prog) {
    const gl = this.gl;
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  drawPass(prog, uniforms, targetFbo) {
    const gl = this.gl;
    gl.useProgram(prog);
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFbo ? targetFbo.fbo : null);
    gl.viewport(0, 0, this.w, this.h);
    this.bindQuad(prog);

    for (const [name, value] of Object.entries(uniforms)) {
      const loc = gl.getUniformLocation(prog, name);
      if (loc == null) continue;
      if (typeof value === 'number') gl.uniform1f(loc, value);
      else if (value?.type === 'tex') {
        gl.activeTexture(gl.TEXTURE0 + value.unit);
        gl.bindTexture(gl.TEXTURE_2D, value.tex);
        gl.uniform1i(loc, value.unit);
      } else if (value?.type === 'rects') gl.uniform4fv(loc, value.data);
      else if (value?.type === 'modes') gl.uniform1iv(loc, value.data);
      else if (value?.type === 'vec2') gl.uniform2f(loc, value.x, value.y);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dynamics(t) {
    const density = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.41) * Math.cos(t * 0.27));
    const zoom = 0.82 + 0.22 * Math.sin(t * 0.19) + 0.08 * Math.cos(t * 0.53);
    const rot = t * 0.12 + Math.sin(t * 0.23) * 0.35;
    const beat = (t * 0.8) % 1;
    return { density, zoom, rot, beat };
  }

  frame(now) {
    if (!this.running) return;
    if (!this.paused) {
      const gl = this.gl;
      const t = (now - this.t0) * 0.001;
      const { density, zoom, rot, beat } = this.dynamics(t);
      const ping = this.fb[0];
      const pong = this.fb[1];

      const rectData = new Float32Array(96);
      const modeData = new Int32Array(SLOTS);
      for (let i = 0; i < SLOTS; i++) {
        const r = this.rects[this.slots[i].rectIdx] || [0, 0, 0, 0];
        rectData.set(r, i * 4);
        modeData[i] = this.slots[i].mode;
      }

      this.drawPass(this.mainProg, {
        u_buffer: { type: 'tex', tex: ping.tex, unit: 0 },
        u_base: { type: 'tex', tex: this.baseTex, unit: 1 },
        u_dims: { type: 'vec2', x: this.w, y: this.h },
        u_time: t,
        u_density: density,
        u_rects: { type: 'rects', data: rectData },
        u_modes: { type: 'modes', data: modeData },
      }, pong);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      this.drawPass(this.postProg, {
        u_tex: { type: 'tex', tex: pong.tex, unit: 0 },
        u_time: t,
        u_zoom: zoom,
        u_rot: rot,
        u_beat: beat,
      }, null);

      this.fb[0] = pong;
      this.fb[1] = ping;
    }
    requestAnimationFrame((n) => this.frame(n));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.t0 = performance.now();
    requestAnimationFrame((n) => this.frame(n));
  }

  togglePause() {
    this.paused = !this.paused;
    if (!this.paused) this.t0 = performance.now() - (performance.now() - this.t0);
  }

  regenerate() {
    if (this.mutateTimer) clearTimeout(this.mutateTimer);
    this.rebuildGrid();
  }

  saveFrame() {
    this.canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `pxl-dex-ultra-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  dispose() {
    this.running = false;
    this.timers.forEach(clearTimeout);
    if (this.mutateTimer) clearTimeout(this.mutateTimer);
  }
}
