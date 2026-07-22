/* Vier simulierte Live-Kameras – später echte Streams einhängen */
(() => {
  // Vier Personen → japanisch klingende Agenten-Codename + Cam
  const CAMS = [
    {
      id: "cam1",
      person: "Lotta",
      agent: "ROTA",
      kana: "ロタ",
      kanji: "露多",
      name: "CAM-01 · ROTA",
      hue: 160,
      mode: "city",
    },
    {
      id: "cam2",
      person: "Andrin",
      agent: "ANDŌ",
      kana: "アンドー",
      kanji: "安凛",
      name: "CAM-02 · ANDŌ",
      hue: 35,
      mode: "road",
    },
    {
      id: "cam3",
      person: "Justus",
      agent: "YUSTO",
      kana: "ユスト",
      kanji: "祐斗",
      name: "CAM-03 · YUSTO",
      hue: 200,
      mode: "grid",
    },
    {
      id: "cam4",
      person: "Jan",
      agent: "YAN",
      kana: "ヤン",
      kanji: "漸",
      name: "CAM-04 · YAN",
      hue: 280,
      mode: "scan",
    },
  ];

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function clockStr() {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(
      d.getMilliseconds()
    ).padStart(3, "0")}`;
  }

  function drawFrame(cam, canvas, t) {
    const ctx = canvas.getContext("2d", { alpha: false });
    const w = canvas.width;
    const h = canvas.height;
    const hue = cam.hue;

    // Basis
    ctx.fillStyle = `hsl(${hue}, 18%, 8%)`;
    ctx.fillRect(0, 0, w, h);

    if (cam.mode === "city") {
      // Skyline drift
      const drift = (t * 40) % w;
      for (let i = 0; i < 18; i++) {
        const x = ((i * 47 + drift) % (w + 40)) - 20;
        const bh = 30 + ((i * 37) % 90);
        ctx.fillStyle = `hsla(${hue}, 25%, ${12 + (i % 5) * 3}%, 0.9)`;
        ctx.fillRect(x, h - bh - 20, 28 + (i % 3) * 8, bh);
        // Fenster blinken
        if ((Math.floor(t * 3) + i) % 5 === 0) {
          ctx.fillStyle = `hsla(${hue + 40}, 80%, 60%, 0.35)`;
          ctx.fillRect(x + 6, h - bh, 6, 6);
        }
      }
      // „Auto“-Licht
      const carX = (t * 120) % (w + 60) - 30;
      ctx.fillStyle = "rgba(255,220,120,0.7)";
      ctx.fillRect(carX, h - 28, 18, 5);
    } else if (cam.mode === "road") {
      // Straße mit Fahrbahnmarkierung
      ctx.fillStyle = `hsl(${hue}, 10%, 14%)`;
      ctx.fillRect(0, h * 0.45, w, h * 0.55);
      ctx.strokeStyle = `hsla(${hue + 20}, 80%, 70%, 0.55)`;
      ctx.lineWidth = 3;
      ctx.setLineDash([16, 18]);
      ctx.lineDashOffset = -t * 140;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.45);
      ctx.lineTo(w * 0.5, h);
      ctx.stroke();
      ctx.setLineDash([]);
      // Gegenverkehr-Punkte
      for (let i = 0; i < 4; i++) {
        const y = h * 0.5 + ((t * 90 + i * 50) % (h * 0.5));
        ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.5)`;
        ctx.fillRect(w * 0.35 + (i % 2) * w * 0.22, y, 14, 8);
      }
    } else if (cam.mode === "grid") {
      const zoom = 18 + 4 * Math.sin(t * 0.7);
      ctx.strokeStyle = `hsla(${hue}, 60%, 55%, 0.35)`;
      ctx.lineWidth = 1;
      const off = (t * 30) % zoom;
      for (let x = -zoom; x < w + zoom; x += zoom) {
        ctx.beginPath();
        ctx.moveTo(x + off, 0);
        ctx.lineTo(x + off, h);
        ctx.stroke();
      }
      for (let y = -zoom; y < h + zoom; y += zoom) {
        ctx.beginPath();
        ctx.moveTo(0, y + off * 0.6);
        ctx.lineTo(w, y + off * 0.6);
        ctx.stroke();
      }
      // Radar-Blob
      const bx = w * (0.3 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.9)));
      const by = h * (0.35 + 0.3 * (0.5 + 0.5 * Math.cos(t * 1.1)));
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, 40);
      g.addColorStop(0, `hsla(${hue}, 90%, 60%, 0.55)`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx, by, 40, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // scan lines + noise
      const img = ctx.createImageData(w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = (Math.random() * 40) | 0;
        img.data[i] = n;
        img.data[i + 1] = n + 20;
        img.data[i + 2] = n + 30;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      const scanY = ((t * 80) % h) | 0;
      ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.18)`;
      ctx.fillRect(0, scanY, w, 10);
      // Crosshair
      ctx.strokeStyle = `hsla(${hue}, 70%, 65%, 0.5)`;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 20, h / 2);
      ctx.lineTo(w / 2 + 20, h / 2);
      ctx.moveTo(w / 2, h / 2 - 20);
      ctx.lineTo(w / 2, h / 2 + 20);
      ctx.stroke();
    }

    // Film grain overlay light
    ctx.fillStyle = `rgba(255,255,255,${0.015 + 0.01 * Math.sin(t * 20)})`;
    ctx.fillRect(0, 0, w, h);

    // Vignette
    const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75);
    vig.addColorStop(0, "transparent");
    vig.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    // HUD text · Agent
    ctx.fillStyle = "rgba(180,240,220,0.85)";
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.fillText("● LIVE · AGENT", 10, 18);
    ctx.fillStyle = "rgba(255,220,140,0.9)";
    ctx.fillText(`${cam.kanji} ${cam.kana}`, 10, 34);
    ctx.fillStyle = "rgba(180,240,220,0.85)";
    ctx.fillText(`${cam.agent} · ${cam.person}`, 10, h - 12);
    ctx.textAlign = "right";
    ctx.fillText(clockStr(), w - 10, 18);
    ctx.fillText(`F${((t * 25) % 1000) | 0}`, w - 10, h - 12);
    ctx.textAlign = "left";
  }

  function mount() {
    const grid = document.getElementById("camGrid");
    if (!grid) return;
    grid.innerHTML = CAMS.map(
      (c) => `
      <article class="cam-tile" data-cam="${c.id}" data-agent="${c.agent}" data-person="${c.person}">
        <canvas id="${c.id}" width="320" height="180"></canvas>
        <div class="cam-agent-tag">
          <b>${c.kanji}</b>
          <span>${c.kana}</span>
        </div>
        <div class="cam-meta">
          <span class="cam-live">LIVE</span>
          <span class="cam-name"><em>${c.agent}</em> · ${c.person}</span>
          <span class="cam-badge">${c.kana}</span>
        </div>
      </article>`
    ).join("");

    CAMS.forEach((cam) => {
      const canvas = document.getElementById(cam.id);
      if (!canvas) return;
      const start = performance.now();
      let last = 0;
      const loop = (now) => {
        // ~18 fps – genug für SIM, schonend für den Pi
        if (now - last > 55) {
          last = now;
          drawFrame(cam, canvas, (now - start) / 1000);
        }
        cam._raf = requestAnimationFrame(loop);
      };
      cam._raf = requestAnimationFrame(loop);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
