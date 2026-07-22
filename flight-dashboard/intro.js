/* Super-Start-Intro · 4 Agenten · japanische Schrift · Code-Rain */
(() => {
  const AGENTS = [
    { agent: "ROTA", kana: "ロタ", kanji: "露多", person: "Lotta", hue: 160 },
    { agent: "ANDŌ", kana: "アンドー", kanji: "安凛", person: "Andrin", hue: 35 },
    { agent: "YUSTO", kana: "ユスト", kanji: "祐斗", person: "Justus", hue: 200 },
    { agent: "YAN", kana: "ヤン", kanji: "漸", person: "Jan", hue: 280 },
  ];

  const KATA =
    "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
  const HIRA = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
  const EXTRA = "露多安凛祐斗漸東京家族円日本任務";

  let root, canvas, ctx, cols = [], raf = 0, done = false;
  let w = 0, h = 0, dpr = 1, t0 = 0;

  function pick() {
    const r = Math.random();
    if (r < 0.5) return KATA[(Math.random() * KATA.length) | 0];
    if (r < 0.75) return HIRA[(Math.random() * HIRA.length) | 0];
    if (r < 0.9) return EXTRA[(Math.random() * EXTRA.length) | 0];
    return "0123456789アイ"[((Math.random() * 12) | 0)];
  }

  function resize() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fontSize = Math.max(14, Math.min(22, w / 70));
    const gap = fontSize + 6;
    const n = Math.ceil(w / gap) + 2;
    cols = [];
    for (let i = 0; i < n; i++) {
      const len = 12 + ((Math.random() * 22) | 0);
      cols.push({
        x: i * gap + 4,
        y: Math.random() * -h,
        speed: 60 + Math.random() * 160,
        fontSize,
        glyphs: Array.from({ length: len }, pick),
        tick: 0,
      });
    }
  }

  function drawRain(now) {
    if (done || !ctx) return;
    raf = requestAnimationFrame(drawRain);
    const dt = Math.min(0.05, (now - (drawRain._last || now)) / 1000);
    drawRain._last = now;

    ctx.fillStyle = "rgba(4, 6, 12, 0.18)";
    ctx.fillRect(0, 0, w, h);

    for (const c of cols) {
      c.y += c.speed * dt;
      c.tick++;
      if (c.tick % 4 === 0) {
        c.glyphs[(Math.random() * c.glyphs.length) | 0] = pick();
      }
      const lineH = c.fontSize + 2;
      if (c.y - c.glyphs.length * lineH > h) {
        c.y = -40 - Math.random() * h * 0.3;
        c.speed = 60 + Math.random() * 160;
      }
      ctx.font = `${c.fontSize}px "Noto Sans JP", "IBM Plex Mono", monospace`;
      ctx.textBaseline = "top";
      for (let i = 0; i < c.glyphs.length; i++) {
        const gy = c.y - i * lineH;
        if (gy < -lineH || gy > h) continue;
        const head = i === 0;
        const fade = 1 - i / c.glyphs.length;
        if (head) {
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.shadowColor = "rgba(0,240,255,0.9)";
          ctx.shadowBlur = 12;
        } else if (fade > 0.65) {
          ctx.fillStyle = `rgba(0, 240, 255, ${0.45 + fade * 0.4})`;
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = `rgba(255, 43, 214, ${0.12 + fade * 0.35})`;
          ctx.shadowBlur = 0;
        }
        ctx.fillText(c.glyphs[i], c.x, gy);
      }
      ctx.shadowBlur = 0;
    }
  }

  function finish() {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    root.classList.add("is-out");
    document.body.classList.remove("intro-lock");
    setTimeout(() => {
      root.remove();
      window.dispatchEvent(new CustomEvent("jart-intro-done"));
    }, 900);
  }

  function mount() {
    // ?nointro=1 zum Überspringen
    if (new URLSearchParams(location.search).has("nointro")) return;

    root = document.createElement("div");
    root.id = "bootIntro";
    root.className = "boot-intro";
    root.innerHTML = `
      <canvas id="introRain" class="intro-rain" aria-hidden="true"></canvas>
      <div class="intro-vignette" aria-hidden="true"></div>
      <div class="intro-scan" aria-hidden="true"></div>
      <div class="intro-inner">
        <p class="intro-kicker">起動 · SYSTEM BOOT</p>
        <h1 class="intro-title">
          <span class="jp">家族で日本へ</span>
          <span class="en">We Family Go Japan</span>
        </h1>
        <div class="intro-agents" id="introAgents">
          ${AGENTS.map(
            (a, i) => `
            <article class="intro-agent" style="--i:${i}; --hue:${a.hue}">
              <div class="ia-kanji">${a.kanji}</div>
              <div class="ia-kana">${a.kana}</div>
              <div class="ia-code">${a.agent}</div>
              <div class="ia-person">${a.person}</div>
              <div class="ia-bar"></div>
            </article>`
          ).join("")}
        </div>
        <p class="intro-foot">ROTA · ANDŌ · YUSTO · YAN — 任務開始</p>
        <button type="button" class="intro-go" id="introGo">クリックで開始 · Start</button>
      </div>
    `;
    document.body.prepend(root);
    document.body.classList.add("intro-lock");

    canvas = root.querySelector("#introRain");
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
    t0 = performance.now();
    raf = requestAnimationFrame(drawRain);

    // Stagger reveal
    requestAnimationFrame(() => root.classList.add("is-on"));

    const go = () => finish();
    root.querySelector("#introGo").addEventListener("click", (e) => {
      e.stopPropagation();
      go();
    });
    // Klick irgendwo aufs Intro → weiter
    root.addEventListener("click", go);
    document.addEventListener("keydown", (e) => {
      if (done) return;
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        e.preventDefault();
        go();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
