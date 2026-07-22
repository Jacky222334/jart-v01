import { FRAG, VERT, TOKEN, makeHashTable } from './shader.js';

export class SpectronNeon {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl');
    if (!this.gl) throw new Error('WebGL nicht verfügbar');
    this.paused = false;
    this.time = 0;
    this.raf = null;
    this.values = makeHashTable(TOKEN.hash);
    this.initGL();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  initGL() {
    const gl = this.gl;
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(s));
      }
      return s;
    };

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog));
    }
    this.prog = prog;
    gl.useProgram(prog);

    this.uniforms = {
      D: gl.getUniformLocation(prog, 'D'),
      m: gl.getUniformLocation(prog, 'm'),
      I: gl.getUniformLocation(prog, 'I'),
      c: gl.getUniformLocation(prog, 'c'),
      u_zoom: gl.getUniformLocation(prog, 'u_zoom'),
      u_rot: gl.getUniformLocation(prog, 'u_rot'),
      u_beat: gl.getUniformLocation(prog, 'u_beat'),
    };
    this.attr = gl.getAttribLocation(prog, 'position');
    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, -1, 1, 1, 1, 1, 1, 1, -1, -1, -1]),
      gl.STATIC_DRAW,
    );
  }

  resize() {
    const gl = this.gl;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    gl.canvas.width = Math.floor(this.w * dpr);
    gl.canvas.height = Math.floor(this.h * dpr);
    gl.canvas.style.width = `${this.w}px`;
    gl.canvas.style.height = `${this.h}px`;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  }

  dynamics(t) {
    const a = window.__jartAudio || {};
    const bass = (a.bass ?? 0) * 0.08;
    const mid = (a.mid ?? 0) * 0.06;
    const zoom = 0.92 + 0.05 * Math.sin(t * 0.035 + 0.4) + bass * 0.02;
    const rot = t * 0.012 + Math.sin(t * 0.022) * 0.06 + mid * 0.04;
    const beat = 0.5 + 0.5 * Math.sin(t * 0.018);
    return { zoom, rot, beat };
  }

  draw() {
    const gl = this.gl;
    const t = this.time;
    const { zoom, rot, beat } = this.dynamics(t);

    gl.useProgram(this.prog);
    gl.uniform2f(this.uniforms.D, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(this.uniforms.m, t * 0.0045);
    gl.uniform1f(this.uniforms.I, 0);
    gl.uniform1fv(this.uniforms.c, this.values);
    gl.uniform1f(this.uniforms.u_zoom, zoom);
    gl.uniform1f(this.uniforms.u_rot, rot);
    gl.uniform1f(this.uniforms.u_beat, beat);

    gl.enableVertexAttribArray(this.attr);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.vertexAttribPointer(this.attr, 2, gl.FLOAT, false, 0, 0);
    gl.clearColor(0, 0, 0.02, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  tick(now) {
    if (!this.raf) return;
    if (!this.paused) {
      this.time += (now - (this.last || now)) * 0.001;
      this.draw();
    }
    this.last = now;
    this.raf = requestAnimationFrame((n) => this.tick(n));
  }

  start() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame((n) => this.tick(n));
  }

  togglePause() {
    this.paused = !this.paused;
    if (!this.paused) this.last = performance.now();
  }

  saveFrame() {
    this.canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `spectron108-gemaelde-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}
