(() => {
  const $ = (id) => document.getElementById(id);

  let map = null;
  let marker = null;
  let accuracyCircle = null;
  let trail = null;
  const trailLatLngs = [];

  function fmt(v, d = 2) {
    if (v == null || Number.isNaN(v)) return "—";
    return Number(v).toFixed(d);
  }

  const TOKYO = { lat: 35.6762, lon: 139.6503 };

  function ensureMap() {
    if (map || typeof L === "undefined") return;
    map = L.map("map", { zoomControl: false, attributionControl: false }).setView(
      [TOKYO.lat, TOKYO.lon],
      12
    );
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      className: "neon-tiles",
    }).addTo(map);
    trail = L.polyline([], {
      color: "#ff2bd6",
      weight: 3,
      opacity: 0.85,
      className: "neon-trail",
    }).addTo(map);
    // Beispiel-Pin Tokio bis echter GPS-Fix
    const icon = L.divIcon({
      className: "",
      html: '<div class="gps-marker neon"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    marker = L.marker([TOKYO.lat, TOKYO.lon], { icon }).addTo(map);
  }

  function approxAccuracyM(hdop) {
    if (hdop == null || hdop <= 0) return null;
    return Math.max(3, hdop * 5);
  }

  function updateMap(lat, lon, accM) {
    ensureMap();
    if (!map || lat == null || lon == null) return;
    const ll = [lat, lon];
    if (!marker) {
      const icon = L.divIcon({
        className: "",
        html: '<div class="gps-marker neon"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      marker = L.marker(ll, { icon }).addTo(map);
      map.setView(ll, 14);
    } else {
      marker.setLatLng(ll);
      map.setView(ll, map.getZoom() < 13 ? 14 : map.getZoom(), { animate: true });
    }
    if (accM != null) {
      if (!accuracyCircle) {
        accuracyCircle = L.circle(ll, {
          radius: accM,
          color: "#00f0ff",
          fillColor: "#ff2bd6",
          fillOpacity: 0.12,
          weight: 2,
          className: "neon-acc",
        }).addTo(map);
      } else {
        accuracyCircle.setLatLng(ll);
        accuracyCircle.setRadius(accM);
      }
    }
    const last = trailLatLngs[trailLatLngs.length - 1];
    if (
      !last ||
      Math.abs(last[0] - lat) > 1e-6 ||
      Math.abs(last[1] - lon) > 1e-6
    ) {
      trailLatLngs.push(ll);
      if (trailLatLngs.length > 400) trailLatLngs.shift();
      trail.setLatLngs(trailLatLngs);
    }
  }

  function signalScore(gps, sats) {
    const snrs = sats.map((s) => s.snr).filter((v) => v != null && v > 0);
    const snrAvg = snrs.length
      ? snrs.reduce((a, b) => a + b, 0) / snrs.length
      : 0;
    let score = 0;
    if (gps.fix) score += 30;
    score += Math.min(30, (gps.satellites || 0) * 4);
    if (gps.hdop != null && gps.hdop > 0) {
      score += Math.max(0, Math.min(25, (3 / gps.hdop) * 25));
    }
    score += Math.min(15, (snrAvg / 45) * 15);
    score = Math.round(Math.max(0, Math.min(100, score)));
    let label = "schwach";
    let cls = "q-bad";
    if (score >= 70) {
      label = "gut";
      cls = "q-good";
    } else if (score >= 40) {
      label = "mittel";
      cls = "q-mid";
    }
    return { score, label, cls, snrAvg };
  }

  function setBar(el, pct, color) {
    el.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    if (color) el.style.background = color;
  }

  function applyGps(gps) {
    ensureMap();
    const ok = !!gps.connected;
    const fix = !!gps.fix;
    const sats = gps.sats_in_view || [];
    const q = signalScore(gps, sats);
    const accM = approxAccuracyM(gps.hdop);

    $("gpsDot").className = "dot " + (fix ? "ok" : ok ? "wait" : "off");
    $("gpsText").textContent = gps.message || (ok ? "GPS" : "GPS offline");

    $("lat").textContent = gps.lat != null ? `${fmt(gps.lat, 6)}°` : "—";
    $("lon").textContent = gps.lon != null ? `${fmt(gps.lon, 6)}°` : "—";
    $("utc").textContent = [gps.utc, gps.date].filter(Boolean).join(" · ") || "—";

    $("fix").textContent = fix ? `Q${gps.fix_quality}` : "kein";
    $("sats").textContent = gps.satellites != null ? String(gps.satellites) : "—";
    $("hdop").textContent = gps.hdop != null ? fmt(gps.hdop, 2) : "—";
    $("snrAvg").textContent = q.snrAvg ? `${fmt(q.snrAvg, 0)} dB` : "—";
    $("alt").textContent = gps.alt_m != null ? `${fmt(gps.alt_m, 1)} m` : "—";
    $("speed").textContent =
      gps.speed_kmh != null ? `${fmt(gps.speed_kmh, 1)} km/h` : "—";
    $("course").textContent = gps.course != null ? `${fmt(gps.course, 0)}°` : "—";
    $("acc").textContent = accM != null ? `±${fmt(accM, 0)} m` : "—";

    $("qualityScore").textContent = String(q.score);
    $("qualityLabel").textContent = q.label;
    $("qualityRing").className = "quality-ring " + q.cls;

    setBar($("barFix"), fix ? 100 : 10, fix ? "#3dcf7a" : "#e05a5a");
    setBar($("barSats"), Math.min(100, (gps.satellites || 0) * 12.5), "#5ee0c8");
    const hdopPct =
      gps.hdop != null && gps.hdop > 0
        ? Math.max(5, Math.min(100, (2.5 / gps.hdop) * 100))
        : 0;
    setBar(
      $("barHdop"),
      hdopPct,
      gps.hdop != null && gps.hdop <= 2
        ? "#3dcf7a"
        : gps.hdop != null && gps.hdop <= 5
          ? "#e0b34a"
          : "#e05a5a"
    );
    setBar($("barSnr"), Math.min(100, (q.snrAvg / 45) * 100), "#3dcf7a");

    if (gps.lat != null && gps.lon != null) {
      updateMap(gps.lat, gps.lon, accM);
      if (window.GpsGlobe) window.GpsGlobe.setPosition(gps.lat, gps.lon, true);
      const city = document.querySelector(".map-city");
      if (city) city.textContent = "GPS LIVE";
    } else {
      const city = document.querySelector(".map-city");
      if (city) city.textContent = "東京 · TOKYO";
      $("lat").textContent = `${TOKYO.lat.toFixed(4)}°`;
      $("lon").textContent = `${TOKYO.lon.toFixed(4)}°`;
    }

    $("snrBars").innerHTML = sats
      .slice(0, 8)
      .map((s) => {
        const snr = s.snr || 0;
        const pct = Math.min(100, (snr / 50) * 100);
        const col = snr > 30 ? "#3dcf7a" : snr > 20 ? "#e0b34a" : "#8aa198";
        return `<div class="snr-row">
          <span>#${s.prn}</span>
          <div class="track"><i style="width:${pct}%;background:${col}"></i></div>
          <b>${snr ? snr + " dB" : "—"}</b>
        </div>`;
      })
      .join("");
  }

  const peakHold = { mic1: 0, mic2: 0, mic3: 0, mic4: 0 };

  function dbToHeight(db) {
    // -60..0 dB → 0..100%
    if (db == null) return 0;
    const clamped = Math.max(-60, Math.min(0, db));
    return ((clamped + 60) / 60) * 100;
  }

  function applyMic(mic) {
    const ok = !!mic.connected;
    $("micDot").className = "dot " + (ok ? "ok" : "off");
    $("micText").textContent = mic.message || (ok ? "4 Kanäle" : "Mic offline");

    for (let i = 1; i <= 4; i++) {
      const m = mic[`mic${i}`] || {};
      const h = dbToHeight(m.db);
      const bar = $(`mic${i}Bar`);
      const dbEl = $(`mic${i}Db`);
      const peakEl = $(`mic${i}Peak`);
      if (bar) bar.style.height = `${h}%`;
      if (dbEl) dbEl.textContent = m.db != null ? `${m.db} dB` : "— dB";
      const key = `mic${i}`;
      peakHold[key] = Math.max(h, peakHold[key] * 0.92);
      if (peakEl) peakEl.style.bottom = `${peakHold[key]}%`;
    }
  }

  let listening = false;
  const audio = $("liveAudio");
  const listenBtn = $("listenBtn");
  const micPanel = $("micPanel");

  function setListening(on) {
    listening = on;
    listenBtn.classList.toggle("on", on);
    micPanel.classList.toggle("listening", on);
    listenBtn.textContent = on ? "■ Stop" : "▶ Live hören";
    $("micHint").textContent = on
      ? "Live-Audio läuft · nochmal klicken zum Stoppen"
      : "Klick zum Abhören · Pegel immer aktiv";
    if (on) {
      // Cache-Buster, damit Stream neu startet
      audio.src = `/api/audio/live?t=${Date.now()}`;
      audio.play().catch((err) => {
        $("micHint").textContent = "Autoplay blockiert – nochmal klicken";
        console.warn(err);
      });
    } else {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
  }

  function toggleListen() {
    setListening(!listening);
  }

  listenBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleListen();
  });
  micPanel.addEventListener("click", (e) => {
    if (e.target === listenBtn) return;
    toggleListen();
  });
  audio.addEventListener("error", () => {
    if (listening) {
      $("micHint").textContent = "Stream-Fehler – Mic/ffmpeg prüfen";
    }
  });

  async function poll() {
    try {
      const res = await fetch("/api/telemetry", { cache: "no-store" });
      const data = await res.json();
      applyGps(data.gps || {});
      applyMic(data.mic || {});
    } catch {
      $("gpsText").textContent = "Server offline";
      $("gpsDot").className = "dot off";
      $("micDot").className = "dot off";
      $("micText").textContent = "Server offline";
    }
  }

  ensureMap();
  setInterval(poll, 120);
  poll();
  window.addEventListener("resize", () => {
    if (map) setTimeout(() => map.invalidateSize(), 100);
  });
})();
