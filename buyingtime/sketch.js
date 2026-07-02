const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

const PARAMS = {
  hLen: 1, mLen: 1, sLen: 1,
  hTail: 0.7, mTail: 0.8, sTail: 0.9,
  hdReach: 1,
  frHr: 1.87, frMr: 1.93, frSr: 2,
  scl: 42,
  hdW: 1,
  useSec: true,
};

const OUTER_BASE = { r: 148, g: 132, b: 168 };
const INNER_BASE = { r: 72, g: 68, b: 132 };

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(a, b, t) {
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t)),
  };
}

function clockAngles(totalMinutes, second, useSec) {
  const wrapped = ((totalMinutes % 720) + 720) % 720;
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  const sec = useSec ? second : 0;
  return {
    hour: ((hour + minute / 60 + sec / 3600) / 12 * 360 - 90) * DEG,
    minute: ((minute + sec / 60) / 60 * 360 - 90) * DEG,
    second: (sec / 60 * 360 - 90) * DEG,
  };
}

function handEnds(angle, len, tail, reach) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const head = reach * len;
  const back = head * tail;
  return {
    ax: -c * back, ay: -s * back,
    bx: c * head, by: s * head,
    c, s,
  };
}

function addHandPoints(out, angle, len, tail, fr, halfW, reach) {
  const { ax, ay, bx, by, c, s } = handEnds(angle, len, tail, reach);
  const p = Math.max(Math.abs(c), Math.abs(s), 1e-4);
  const w = (halfW * fr) / p;

  const nx = -s * w;
  const ny = c * w;

  out.push(
    { x: ax + nx, y: ay + ny },
    { x: ax - nx, y: ay - ny },
    { x: bx + nx, y: by + ny },
    { x: bx - nx, y: by - ny },
  );

  const cap = w * 0.55;
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const a = -Math.PI / 2 + Math.PI * t;
    out.push({
      x: bx + nx * Math.cos(a) + c * cap * Math.sin(a),
      y: by + ny * Math.cos(a) + s * cap * Math.sin(a),
    });
  }
}

function cross(o, a, b) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function convexHull(points) {
  if (points.length < 3) return points.slice();
  const pts = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function buildPolygon(totalMinutes, second) {
  const ang = clockAngles(totalMinutes, second, PARAMS.useSec);
  const pts = [];
  const hw = PARAMS.hdW / 2;

  addHandPoints(pts, ang.hour, PARAMS.hLen, PARAMS.hTail, PARAMS.frHr, hw, PARAMS.hdReach);
  addHandPoints(pts, ang.minute, PARAMS.mLen, PARAMS.mTail, PARAMS.frMr, hw, PARAMS.hdReach);
  if (PARAMS.useSec) {
    addHandPoints(pts, ang.second, PARAMS.sLen, PARAMS.sTail, PARAMS.frSr, hw, PARAMS.hdReach);
  }

  return convexHull(pts);
}

function colorsForMinute(minuteIndex) {
  const t = minuteIndex / 1440;
  const phase = Math.sin(t * TAU * 2) * 0.5 + 0.5;
  const outer = lerpColor(
    OUTER_BASE,
    { r: 120, g: 108, b: 150 },
    phase,
  );
  const inner = lerpColor(
    INNER_BASE,
    { r: 45, g: 42, b: 95 },
    1 - phase,
  );
  outer.r += Math.sin(t * 17) * 8;
  outer.g += Math.cos(t * 11) * 6;
  inner.r += Math.sin(t * 23) * 5;
  return { outer, inner };
}

function formatTime(minuteIndex) {
  const h = Math.floor(minuteIndex / 60) % 24;
  const m = minuteIndex % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export class BuyingTime {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.live = true;
    this.minuteIndex = 0;
    this.second = 0;
    this.raf = null;
    this.timeLabel = document.getElementById('timeLabel');
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
    this.w = window.innerWidth;
    this.h = window.innerHeight;
  }

  syncClock() {
    const now = new Date();
    this.minuteIndex = now.getHours() * 60 + now.getMinutes();
    this.second = now.getSeconds() + now.getMilliseconds() / 1000;
    if (this.timeLabel) this.timeLabel.textContent = formatTime(this.minuteIndex);
  }

  useLive() {
    this.live = true;
    this.syncClock();
  }

  stepMinute(delta) {
    this.live = false;
    this.minuteIndex = (this.minuteIndex + delta + 1440) % 1440;
    this.second = 0;
    if (this.timeLabel) this.timeLabel.textContent = formatTime(this.minuteIndex);
  }

  draw() {
    if (this.live) this.syncClock();
    else if (PARAMS.useSec) this.second = (this.second + 1 / 60) % 60;

    const { outer, inner } = colorsForMinute(this.minuteIndex);
    const ctx = this.ctx;

    ctx.fillStyle = `rgb(${outer.r},${outer.g},${outer.b})`;
    ctx.fillRect(0, 0, this.w, this.h);

    const bandCount = 8;
    for (let i = 0; i < bandCount; i++) {
      const y0 = (this.h / bandCount) * i;
      const y1 = (this.h / bandCount) * (i + 1);
      const shade = (Math.sin((this.minuteIndex + i) * 0.17) * 0.5 + 0.5) * 0.06;
      ctx.fillStyle = `rgba(0,0,0,${shade})`;
      ctx.fillRect(0, y0, this.w, y1 - y0);
    }

    const poly = buildPolygon(this.minuteIndex, this.second);
    const cx = this.w / 2;
    const cy = this.h / 2;
    const scale = PARAMS.scl * (Math.min(this.w, this.h) / 420);

    ctx.fillStyle = `rgb(${inner.r},${inner.g},${inner.b})`;
    ctx.beginPath();
    poly.forEach((p, i) => {
      const x = cx + p.x * scale;
      const y = cy + p.y * scale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();

    const grad = ctx.createLinearGradient(cx, cy - scale * 2, cx, cy + scale * 2);
    grad.addColorStop(0, `rgba(${inner.r},${inner.g},${inner.b},0)`);
    grad.addColorStop(0.55, `rgba(${inner.r},${inner.g},${inner.b},0.15)`);
    grad.addColorStop(1, `rgba(${inner.r},${inner.g},${inner.b},0.45)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  loop() {
    this.raf = requestAnimationFrame(() => this.loop());
    this.draw();
  }

  start() {
    this.syncClock();
    if (!this.raf) this.loop();
  }

  saveFrame() {
    const link = document.createElement('a');
    link.download = `buyingtime-${formatTime(this.minuteIndex).replace(':', '')}-${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}
