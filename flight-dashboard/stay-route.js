/* Erste Reiseroute-Infos · Villa 隅田川 (Kōtō) */
(() => {
  const BASE = "media/route/villa";

  const STAY = {
    name: "Villa 隅田川",
    nameEn: "Villa Sumidagawa",
    address: "東京都江東区常盤1-5-1 · Tokiwa 1-5-1, Kōtō",
    postal: "〒135-0006",
    lat: 35.6847,
    lon: 139.7988,
    nearestStation: {
      name: "清澄白河",
      nameEn: "Kiyosumi-shirakawa",
      walkMin: 8,
      walkM: 600,
      via: "万年橋通り · Mannenbashi-dōri",
    },
  };

  const TRANSIT = [
    {
      title: "Keisei Skyaccess → Hanzōmon",
      time: "ca. 1 h 16 min",
      note: "Oft schnellste Bahn-Variante ab Narita",
      tag: "Bahn",
    },
    {
      title: "Airport Limousine Bus",
      time: "ca. 1 h 26 min",
      cost: "¥3 100",
      note: "Direkt ab Terminal · alle ~15 min",
      tag: "Bus",
    },
    {
      title: "Keisei → Shinjuku-Linie",
      time: "ca. 1 h 36 min",
      note: "Alternative mit Umstieg",
      tag: "Bahn",
    },
  ];

  const WALK = [
    "Von 清澄白河 Station südwestlich ~350 m",
    "Rechts auf 万年橋通り · über die Brücke (~190 m)",
    "Links / rechts in die Gasse Richtung Tokiwa 1-5-1 (~45 m)",
  ];

  const TIPS = [
    {
      title: "Badlüfter DRY FAN",
      jp: "乾燥",
      body: "MAX UFD-112A: 暖房 · 乾燥 · 涼風 · 換気. Rot = 停止. Grün bei 24時間換気 = Dauerlüftung an.",
      img: `${BASE}/dry-fan.png`,
    },
    {
      title: "Dachterrasse",
      jp: "屋上",
      body: "Blick auf Fluss & Wasserbus · abends Skytree-Richtung.",
      img: `${BASE}/terrace.png`,
    },
  ];

  const GALLERY = [
    { src: `${BASE}/exterior.png`, jp: "宿", title: "Eingang", cap: "villa sumidagawa tokyo" },
    { src: `${BASE}/skytree-night.png`, jp: "夜", title: "Sumida bei Nacht", cap: "Skytree · Fluss" },
    { src: `${BASE}/terrace.png`, jp: "屋上", title: "Terrasse", cap: "Holz · Stadtblick" },
    { src: `${BASE}/room-4beds.png`, jp: "部屋", title: "Schlafraum 4", cap: "Vier Betten · Shoji-Licht" },
    { src: `${BASE}/room-futon.png`, jp: "布団", title: "Futon-Zimmer", cap: "Tatami-Plattform" },
    { src: `${BASE}/tatami.png`, jp: "畳", title: "Tatami-Raum", cap: "Papierlaterne · Holz" },
    { src: `${BASE}/walk-map.png`, jp: "徒歩", title: "8 Min zu Fuss", cap: "Station → Villa" },
    { src: `${BASE}/narita-map.png`, jp: "成田", title: "Anreise NRT", cap: "Bahn / Limousine" },
    { src: `${BASE}/dry-fan.png`, jp: "換気", title: "DRY FAN", cap: "Bad · Heizen / Trocknen" },
  ];

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function openLightbox(photo) {
    const box = document.getElementById("photoLightbox");
    if (!box) return;
    const img = document.getElementById("lbImg");
    const title = document.getElementById("lbTitle");
    const cap = document.getElementById("lbCap");
    const jp = document.getElementById("lbJp");
    if (img) img.src = photo.src;
    if (title) title.textContent = photo.title || "";
    if (cap) cap.textContent = photo.cap || "";
    if (jp) jp.textContent = photo.jp || "";
    box.hidden = false;
    document.body.classList.add("lb-open");
  }

  function mount() {
    const host = document.getElementById("stayRoute");
    if (!host || host.dataset.ready) return;
    host.dataset.ready = "1";

    const st = STAY.nearestStation;

    host.innerHTML = `
      <div class="stay-hero" style="--stay-hero:url('${BASE}/skytree-night.png')">
        <div class="stay-hero-copy">
          <p class="stay-kicker">第一情報 · Erste Route</p>
          <h2>${escapeHtml(STAY.name)} <em>${escapeHtml(STAY.nameEn)}</em></h2>
          <p class="stay-addr">${escapeHtml(STAY.postal)} · ${escapeHtml(STAY.address)}</p>
          <p class="stay-lead">Basis für Tag 1–2: Narita → Kōtō → ${escapeHtml(st.walkMin)} Min Fussweg von ${escapeHtml(st.nameEn)}.</p>
        </div>
        <figure class="stay-hero-card">
          <button type="button" class="stay-shot" data-i="0" aria-label="Eingang">
            <img src="${BASE}/exterior.png" alt="Villa Sumidagawa Eingang" loading="lazy" />
          </button>
          <figcaption>villa · sumidagawa · tokyo</figcaption>
        </figure>
      </div>

      <div class="stay-grid">
        <article class="stay-block stay-transit">
          <h3>成田 → 宿 · Anreise</h3>
          <p class="stay-note">Öffentliche Beispiele (Zeiten je nach Slot):</p>
          <ul class="stay-transit-list">
            ${TRANSIT.map(
              (t) => `
              <li>
                <span class="st-tag">${escapeHtml(t.tag)}</span>
                <div>
                  <strong>${escapeHtml(t.title)}</strong>
                  <span>${escapeHtml(t.time)}${t.cost ? ` · ${escapeHtml(t.cost)}` : ""}</span>
                  <em>${escapeHtml(t.note)}</em>
                </div>
              </li>`
            ).join("")}
          </ul>
          <button type="button" class="stay-shot stay-map" data-i="7" aria-label="Narita Karte">
            <img src="${BASE}/narita-map.png" alt="Narita Transit" loading="lazy" />
          </button>
        </article>

        <article class="stay-block stay-walk">
          <h3>徒歩 · Station → Villa</h3>
          <p class="stay-walk-meta">
            <strong>${escapeHtml(st.name)}</strong> → Villa ·
            ${st.walkMin} Min · ${st.walkM} m · via ${escapeHtml(st.via)}
          </p>
          <ol class="stay-walk-steps">
            ${WALK.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}
          </ol>
          <button type="button" class="stay-shot stay-map" data-i="6" aria-label="Fussweg Karte">
            <img src="${BASE}/walk-map.png" alt="Fussweg Karte" loading="lazy" />
          </button>
        </article>

        <article class="stay-block stay-tips">
          <h3>宿 · Tipps vor Ort</h3>
          <div class="stay-tip-cards">
            ${TIPS.map(
              (tip, i) => `
              <button type="button" class="stay-tip" data-i="${i === 0 ? 8 : 2}">
                <img src="${escapeHtml(tip.img)}" alt="" loading="lazy" />
                <span>
                  <b>${escapeHtml(tip.jp)} · ${escapeHtml(tip.title)}</b>
                  <em>${escapeHtml(tip.body)}</em>
                </span>
              </button>`
            ).join("")}
          </div>
        </article>
      </div>

      <div class="stay-gallery" role="list">
        ${GALLERY.map(
          (g, i) => `
          <button type="button" class="stay-gal" role="listitem" data-i="${i}">
            <img src="${escapeHtml(g.src)}" alt="${escapeHtml(g.title)}" loading="lazy" />
            <span><b>${escapeHtml(g.jp)}</b> ${escapeHtml(g.title)}</span>
          </button>`
        ).join("")}
      </div>
    `;

    host.querySelectorAll("[data-i]").forEach((el) => {
      el.addEventListener("click", () => {
        const i = Number(el.dataset.i);
        const photo = GALLERY[i];
        if (photo) openLightbox(photo);
      });
    });
  }

  // für Timeline / andere Module
  window.StayRoute = { STAY, TRANSIT, GALLERY };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
