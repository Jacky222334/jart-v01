/* Schmaler linker Streifen: japanische Zeichen + Python-Fragmente, fallen von oben nach unten */
(() => {
  const KATA =
    "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンヴヵヶ";
  const HIRA = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
  const DIGITS = "0123456789";
  const PY = [
    "def",
    "import",
    "gps",
    "lat",
    "lon",
    "fix",
    "yield",
    "async",
    "await",
    "class",
    "self",
    "return",
    "True",
    "None",
    "lambda",
    "print",
    "nmea",
    "snr",
    ">>>",
    "for",
    "in",
    "range",
    "while",
    "if",
    "elif",
    "else",
    "try",
    "except",
    "with",
    "open",
    "json",
    "math",
    "π",
    "→",
    "≠",
    "#",
    "=",
    "()",
    "[]",
    "{}",
    ":",
    ".",
  ];

  let canvas, ctx;
  let cols = [];
  let w = 0;
  let h = 0;
  let dpr = 1;
  let last = 0;

  function pickGlyph() {
    const r = Math.random();
    if (r < 0.55) return KATA[(Math.random() * KATA.length) | 0];
    if (r < 0.72) return HIRA[(Math.random() * HIRA.length) | 0];
    if (r < 0.82) return DIGITS[(Math.random() * DIGITS.length) | 0];
    return PY[(Math.random() * PY.length) | 0];
  }

  function makeCol(x, fontSize) {
    const len = 10 + ((Math.random() * 18) | 0);
    const glyphs = Array.from({ length: len }, () => pickGlyph());
    return {
      x,
      y: Math.random() * -h * 1.2,
      speed: 38 + Math.random() * 90,
      fontSize,
      glyphs,
      tick: 0,
      mutateEvery: 3 + ((Math.random() * 8) | 0),
    };
  }

  function resize() {
    if (!canvas || !canvas.parentElement) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.floor(rect.width));
    h = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const fontSize = 22;
    const gap = fontSize + 4;
    const n = Math.max(2, Math.floor(w / gap));
    cols = [];
    for (let i = 0; i < n; i++) {
      cols.push(makeCol(i * gap + gap * 0.35, fontSize));
    }
  }

  function draw(now) {
    requestAnimationFrame(draw);
    if (!ctx) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;

    // leichter Trail / Fade
    ctx.fillStyle = "rgba(6, 12, 11, 0.22)";
    ctx.fillRect(0, 0, w, h);

    for (const c of cols) {
      c.y += c.speed * dt;
      c.tick++;
      if (c.tick % c.mutateEvery === 0) {
        const i = (Math.random() * c.glyphs.length) | 0;
        c.glyphs[i] = pickGlyph();
      }

      const lineH = c.fontSize + 1;
      const totalH = c.glyphs.length * lineH;
      if (c.y - totalH > h) {
        c.y = -20 - Math.random() * h * 0.4;
        c.speed = 38 + Math.random() * 90;
        c.glyphs = Array.from(
          { length: 10 + ((Math.random() * 18) | 0) },
          () => pickGlyph()
        );
      }

      ctx.font = `${c.fontSize}px "IBM Plex Mono", "Hiragino Sans", "Noto Sans JP", monospace`;
      ctx.textBaseline = "top";

      for (let i = 0; i < c.glyphs.length; i++) {
        const gy = c.y - i * lineH;
        if (gy < -lineH || gy > h) continue;
        const head = i === 0;
        const t = 1 - i / Math.max(1, c.glyphs.length - 1);
        if (head) {
          ctx.fillStyle = "rgba(232, 255, 245, 0.95)";
          ctx.shadowColor = "rgba(94, 224, 200, 0.85)";
          ctx.shadowBlur = 8;
        } else if (t > 0.7) {
          ctx.fillStyle = `rgba(94, 224, 200, ${0.55 + t * 0.35})`;
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = `rgba(70, 150, 120, ${0.15 + t * 0.45})`;
          ctx.shadowBlur = 0;
        }
        ctx.fillText(c.glyphs[i], c.x, gy);
      }
      ctx.shadowBlur = 0;
    }
  }

  function init() {
    canvas = document.getElementById("codeRain");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
    requestAnimationFrame(draw);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
