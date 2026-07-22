/* Horizontale GPS-Verlaufsansicht · simulierte Reise Zürich → Tokio → Unterkunft */
(() => {
  const STOPS = [
    {
      day: 1,
      id: "zh",
      title: "Zürich",
      jp: "チューリッヒ",
      lat: 47.3769,
      lon: 8.5417,
      time: "Tag 1 · 08:40",
      note: "Start · GPS Fix stabil",
      img: "media/route/zurich.jpg",
      kind: "start",
    },
    {
      day: 1,
      id: "air",
      title: "Flugroute",
      jp: "航路",
      lat: 55.0,
      lon: 80.0,
      time: "Tag 1 · unterwegs",
      note: "Simulierte Spur · CH → JP",
      img: null,
      kind: "flight",
    },
    {
      day: 1,
      id: "tyo",
      title: "Tokio",
      jp: "東京",
      lat: 35.6762,
      lon: 139.6503,
      time: "Tag 1 · Ankunft",
      note: "Landung · Stadtlichter",
      img: "media/route/tokyo-arrive.jpg",
      kind: "city",
    },
    {
      day: 2,
      id: "stay",
      title: "City-Unterkunft",
      jp: "宿",
      lat: 35.6895,
      lon: 139.6917,
      time: "Tag 2 · Check-in",
      note: "Hotel / Wohnung · Ruhepunkt",
      img: "media/route/stay.jpg",
      kind: "stay",
    },
  ];

  // simulierte GPS-Punkte entlang der Grosskreis-ähnlichen Route
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function buildTrail() {
    const pts = [];
    const zh = STOPS[0];
    const tyo = STOPS[2];
    const stay = STOPS[3];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      // leichter Bogen nach Norden
      const lat = lerp(zh.lat, tyo.lat, t) + Math.sin(Math.PI * t) * 12;
      const lon = lerp(zh.lon, tyo.lon, t);
      pts.push({ lat, lon, day: 1, phase: "flight" });
    }
    for (let i = 1; i <= 8; i++) {
      const t = i / 8;
      pts.push({
        lat: lerp(tyo.lat, stay.lat, t) + (Math.random() - 0.5) * 0.002,
        lon: lerp(tyo.lon, stay.lon, t) + (Math.random() - 0.5) * 0.002,
        day: 2,
        phase: "city",
      });
    }
    return pts;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function project(trail, w, h) {
    let minLat = Infinity,
      maxLat = -Infinity,
      minLon = Infinity,
      maxLon = -Infinity;
    trail.forEach((p) => {
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
      minLon = Math.min(minLon, p.lon);
      maxLon = Math.max(maxLon, p.lon);
    });
    const pad = 0.08;
    const dLat = (maxLat - minLat) || 1;
    const dLon = (maxLon - minLon) || 1;
    return trail.map((p) => ({
      ...p,
      x: ((p.lon - minLon) / dLon) * (1 - 2 * pad) * w + pad * w,
      y: (1 - (p.lat - minLat) / dLat) * (1 - 2 * pad) * h + pad * h,
    }));
  }

  function drawRoute(canvas, trail, t) {
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 120;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Hintergrund wie GPS-Track
    ctx.fillStyle = "rgba(6, 10, 16, 0.9)";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(0, 240, 255, 0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const pts = project(trail, w, h);
    const day1 = pts.filter((p) => p.day === 1);
    const day2 = pts.filter((p) => p.day === 2);

    const strokePath = (arr, color, width) => {
      if (arr.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(arr[0].x, arr[0].y);
      for (let i = 1; i < arr.length; i++) ctx.lineTo(arr[i].x, arr[i].y);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
    };

    strokePath(day1, "rgba(0, 240, 255, 0.25)", 8);
    strokePath(day1, "rgba(0, 240, 255, 0.85)", 2.5);
    strokePath(day2, "rgba(255, 176, 64, 0.25)", 8);
    strokePath(day2, "rgba(255, 176, 64, 0.9)", 2.5);

    // laufender Punkt
    const all = [...day1, ...day2];
    const idx = Math.floor((t * 0.35) % all.length);
    const cur = all[idx];
    if (cur) {
      ctx.beginPath();
      ctx.arc(cur.x, cur.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cur.x, cur.y, 10 + 3 * Math.sin(t * 4), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(94, 224, 200, 0.55)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(180, 210, 200, 0.55)";
    ctx.font = "10px IBM Plex Mono, monospace";
    ctx.fillText("SIM GPS TRACK · Tag 1 Flug · Tag 2 Stadt", 10, 14);
  }

  function mount() {
    const host = document.getElementById("routeTimeline");
    if (!host || host.dataset.ready) return;
    host.dataset.ready = "1";

    const trail = buildTrail();

    host.innerHTML = `
      <div class="route-head">
        <div>
          <p class="route-kicker">経過 · GPS-Verlauf</p>
          <h2>Reise-Route <em>Zürich → 東京 → 宿</em></h2>
          <p class="route-sub">Simuliert · horizontale Spur wie bisherige GPS-Reise</p>
        </div>
        <div class="route-legend">
          <span class="rl day1"><i></i> Tag 1 · Flug</span>
          <span class="rl day2"><i></i> Tag 2 · Unterkunft</span>
        </div>
      </div>
      <canvas id="routeTrack" class="route-track" height="120"></canvas>
      <div class="route-line" role="list">
        ${STOPS.map(
          (s, i) => `
          <article class="route-stop day-${s.day} kind-${s.kind}" role="listitem" data-i="${i}">
            <div class="rs-day">Tag ${s.day}</div>
            <div class="rs-dot"></div>
            ${
              s.img
                ? `<button type="button" class="rs-photo" data-src="${escapeHtml(s.img)}" data-title="${escapeHtml(s.title)}" data-jp="${escapeHtml(s.jp)}">
                    <img src="${escapeHtml(s.img)}" alt="${escapeHtml(s.title)}" loading="lazy" />
                  </button>`
                : `<div class="rs-flight" aria-hidden="true">✈</div>`
            }
            <div class="rs-body">
              <strong>${escapeHtml(s.jp)} · ${escapeHtml(s.title)}</strong>
              <time>${escapeHtml(s.time)}</time>
              <p>${escapeHtml(s.note)}</p>
              <span class="rs-coords">${s.lat.toFixed(3)}° / ${s.lon.toFixed(3)}°</span>
            </div>
          </article>
          ${i < STOPS.length - 1 ? '<div class="route-connector" aria-hidden="true"></div>' : ""}`
        ).join("")}
      </div>
    `;

    const canvas = host.querySelector("#routeTrack");
    const start = performance.now();
    const loop = (now) => {
      drawRoute(canvas, trail, (now - start) / 1000);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    window.addEventListener("resize", () => {
      drawRoute(canvas, trail, (performance.now() - start) / 1000);
    });

    host.querySelectorAll(".rs-photo").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (window.Map3D) {
          /* optional */
        }
        // nutze Album-Lightbox falls vorhanden
        const box = document.getElementById("photoLightbox");
        if (box && typeof box !== "undefined") {
          const img = document.getElementById("lbImg");
          const title = document.getElementById("lbTitle");
          const cap = document.getElementById("lbCap");
          const jp = document.getElementById("lbJp");
          if (img) img.src = btn.dataset.src;
          if (title) title.textContent = btn.dataset.title || "";
          if (cap) cap.textContent = "GPS-Verlauf · simulierte Reise";
          if (jp) jp.textContent = btn.dataset.jp || "";
          box.hidden = false;
          document.body.classList.add("lb-open");
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
