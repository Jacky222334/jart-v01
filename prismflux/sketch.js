import { generateGrid, gridToPixels, mutateRects } from './grid-generator.js';

const VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_buffer;
uniform sampler2D u_base;
uniform vec2 u_dims;
uniform float u_time;
uniform vec4 u_rects[16];
uniform int u_modes[16];
in vec2 v_uv;
out vec4 outColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

bool inRect(vec2 uv, vec4 r) {
  vec2 a = r.xy / u_dims;
  vec2 b = (r.xy + r.zw) / u_dims;
  return uv.x >= a.x && uv.y >= a.y && uv.x < b.x && uv.y < b.y;
}

vec3 sampleBuf(vec2 uv) {
  return texture(u_buffer, uv).rgb;
}

vec3 sampleBase(vec2 uv) {
  return texture(u_base, uv).rgb;
}

void main() {
  vec2 uv = v_uv;
  vec3 rgb = sampleBuf(uv);
  vec2 px = vec2(1.0) / u_dims;
  vec2 cell = floor(uv * u_dims);

  for (int i = 0; i < 16; i++) {
    vec4 r = u_rects[i];
    if (r.z <= 0.0) continue;
    if (!inRect(uv, r)) continue;

    vec2 local = cell - r.xy;
    int mode = u_modes[i];

    // Rausch-Verschiebung
    if (mode == 0) {
      vec2 n = vec2(
        noise(uv * 18.0 + u_time * 1.1),
        noise(uv * 14.0 - u_time * 0.95)
      ) - 0.5;
      rgb = sampleBuf(uv + n * px * 5.0);
    }
    // Perlin-artige Welle horizontal
    else if (mode == 1) {
      float x = (noise(vec2(uv.y * 90.0, u_time * 2.4)) - 0.5) * 6.0 * px.x;
      float y = (noise(vec2(u_time * 1.8, uv.x * 53.0)) - 0.5) * 6.0 * px.y;
      rgb = sampleBuf(uv + vec2(x, y));
    }
    // FBM-artiger Shift
    else if (mode == 2) {
      float x = (noise(vec2(uv.x * 2.0, u_time * 5.0)) - 0.5) * 8.0 * px.x;
      float y = (noise(vec2(u_time * 3.5, uv.y * 4.0)) - 0.5) * 8.0 * px.y;
      rgb = sampleBuf(uv + vec2(x, y));
    }
    // Pixel +1 x
    else if (mode == 3) {
      rgb = sampleBuf(uv + vec2(px.x, 0.0));
    }
    // Pixel -1 x
    else if (mode == 4) {
      rgb = sampleBuf(uv - vec2(px.x, 0.0));
    }
    // Pixel +1 y
    else if (mode == 5) {
      rgb = sampleBuf(uv + vec2(0.0, px.y));
    }
    // Pixel -1 y
    else if (mode == 6) {
      rgb = sampleBuf(uv - vec2(0.0, px.y));
    }
    // Scanline-Shift (abwechselnde Zeilen)
    else if (mode == 7) {
      float step = floor(mod(u_time * 24.0, 16.0));
      if (mod(local.y, 2.0) == 0.0 && step < 8.0) {
        rgb = sampleBuf(uv + vec2(px.x, 0.0));
      } else if (mod(local.y, 2.0) == 1.0 && step >= 8.0) {
        rgb = sampleBuf(uv - vec2(px.x, 0.0));
      }
    }
    // Checkerboard-Shift
    else if (mode == 8) {
      float step = floor(mod(u_time * 60.0, 4.0));
      if (step == 0.0) {
        if (mod(local.x + local.y, 2.0) == 0.0) rgb = sampleBuf(uv + vec2(px.x, 0.0));
        else rgb = sampleBuf(uv + vec2(0.0, px.y));
      }
    }
    // Diagonal-Shift
    else if (mode == 9) {
      if (mod(local.x + local.y, 2.0) == 0.0) {
        rgb = sampleBuf(uv + vec2(px.x, -px.y));
      } else {
        rgb = sampleBuf(uv + vec2(-px.x, px.y));
      }
    }
    // Sinus-Welle
    else if (mode == 10) {
      float sx = sin(local.y * 0.12 + u_time * 3.5) * px.x * 2.5;
      rgb = sampleBuf(uv + vec2(sx, 0.0));
    }
    // Reset-Blitze aus Basis-Textur
    else if (mode == 11) {
      if (hash(uv + floor(u_time * 8.0)) < 0.07) {
        rgb = sampleBase(uv);
      }
    }
    // Spalten-Sweep Reset
    else if (mode == 12) {
      float step = floor(mod(u_time * 50.0, 16.0));
      if (mod(local.x, 16.0) == step) rgb = sampleBase(uv);
    }
    // Zeilen-Sweep Reset
    else if (mode == 13) {
      float step = floor(mod(u_time * 50.0, 16.0));
      if (mod(local.y, 16.0) == step) rgb = sampleBase(uv);
    }
    // Chromatische Verschiebung
    else if (mode == 14) {
      float c = sin(u_time * 4.0 + uv.x * 30.0) * px.x * 2.0;
      rgb.r = sampleBuf(uv + vec2(c, 0.0)).r;
      rgb.b = sampleBuf(uv - vec2(c, 0.0)).b;
    }
    // Schneller Drift
    else if (mode == 15) {
      rgb = sampleBuf(uv + vec2(
        sin(u_time * 6.0 + float(i)) * px.x * 3.0,
        cos(u_time * 5.0 + float(i) * 0.7) * px.y * 3.0
      ));
    }
  }

  outColor = vec4(clamp(rgb, 0.0, 1.0), 1.0);
}`;

const PASsthrough = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
in vec2 v_uv;
out vec4 outColor;
void main() { outColor = texture(u_tex, v_uv); }`;

function createShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderInfoLog(s)) return s;
  throw new Error(gl.getShaderInfoLog(s));
}

function createProgram(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, createShader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, createShader(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramInfoLog(p)) return p;
  throw new Error(gl.getProgramInfoLog(p));
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

const SLOT_COUNT = 16;
const MODE_COUNT = 16;

export class Prismflux {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.container.appendChild(this.canvas);
    this.gl = this.canvas.getContext('webgl2', { antialias: false, alpha: false });
    if (!this.gl) throw new Error('WebGL2 nicht verfügbar');

    this.gl.clearColor(0.02, 0.02, 0.04, 1);
    this.program = createProgram(this.gl, VERT, FRAG);
    this.blit = createProgram(this.gl, VERT, PASsthrough);
    this.quad = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quad);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), this.gl.STATIC_DRAW);

    this.grid = null;
    this.rects = [];
    this.slots = [];
    this.timers = [];
    this.mutateTimer = null;
    this.running = false;
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
    this.w = Math.max(64, Math.floor((this.container.clientWidth || window.innerWidth) * this.dpr));
    this.h = Math.max(64, Math.floor((this.container.clientHeight || window.innerHeight) * this.dpr));
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
    const result = generateGrid([this.w, this.h]);
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
    mutateRects(this.grid, this.w, this.rects, 2 + Math.floor(Math.random() * 4));
    this.refreshBase();
  }

  scheduleMutations() {
    if (this.mutateTimer) clearTimeout(this.mutateTimer);
    const tick = () => {
      this.patchGrid();
      this.mutateTimer = setTimeout(tick, 1200 + Math.random() * 1800);
    };
    this.mutateTimer = setTimeout(tick, 1500);
  }

  shuffleSlot(i) {
    this.slots[i].rectIdx = Math.floor(Math.random() * this.rects.length);
    this.slots[i].mode = Math.floor(Math.random() * MODE_COUNT);
  }

  assignSlots() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.slots = Array.from({ length: SLOT_COUNT }, () => ({
      rectIdx: Math.floor(Math.random() * Math.max(1, this.rects.length)),
      mode: Math.floor(Math.random() * MODE_COUNT),
    }));

    for (let i = 0; i < SLOT_COUNT; i++) {
      const rotate = (idx) => {
        const delay = 600 + Math.random() * 1800;
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
      } else if (value?.type === 'rects') {
        gl.uniform4fv(loc, value.data);
      } else if (value?.type === 'modes') {
        gl.uniform1iv(loc, value.data);
      } else if (value?.type === 'vec2') {
        gl.uniform2f(loc, value.x, value.y);
      }
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  frame(now) {
    if (!this.running) return;
    const gl = this.gl;
    const t = (now - this.t0) * 0.001;
    const ping = this.fb[0];
    const pong = this.fb[1];

    const rectData = new Float32Array(64);
    const modeData = new Int32Array(SLOT_COUNT);
    for (let i = 0; i < SLOT_COUNT; i++) {
      const r = this.rects[this.slots[i].rectIdx] || [0, 0, 0, 0];
      rectData.set(r, i * 4);
      modeData[i] = this.slots[i].mode;
    }

    this.drawPass(this.program, {
      u_buffer: { type: 'tex', tex: ping.tex, unit: 0 },
      u_base: { type: 'tex', tex: this.baseTex, unit: 1 },
      u_dims: { type: 'vec2', x: this.w, y: this.h },
      u_time: t,
      u_rects: { type: 'rects', data: rectData },
      u_modes: { type: 'modes', data: modeData },
    }, pong);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.drawPass(this.blit, {
      u_tex: { type: 'tex', tex: pong.tex, unit: 0 },
    }, null);

    this.fb[0] = pong;
    this.fb[1] = ping;
    requestAnimationFrame((n) => this.frame(n));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.t0 = performance.now();
    requestAnimationFrame((n) => this.frame(n));
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
      a.download = `prismflux-${Date.now()}.png`;
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
