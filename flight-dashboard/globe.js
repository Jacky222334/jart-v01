/* Globus-Animation: Ort · Zürich · Näfels/Mollis · Distanz · Verlauf */
(() => {
  const ZURICH = { lat: 47.3769, lon: 8.5417, name: "Zürich" };
  /** Glarus Nord – zwischen Näfels und Mollis */
  const NAFELS_MOLLIS = { lat: 47.097, lon: 9.071, name: "Näfels · Mollis" };
  /** Beispiel-Ort wenn noch kein GPS-Fix */
  const TOKYO = { lat: 35.6762, lon: 139.6503, name: "東京 · Tokio" };
  const R_EARTH_KM = 6371;
  const TRAIL_MAX = 180;

  const state = {
    lat: null,
    lon: null,
    trail: [],
    ready: false,
  };

  let THREE, renderer, scene, camera, earth, atmosphere, stars, milkyWay, brightStars;
  let youMarker, zhMarker, glMarker, jpMarker, homeRing, arcZh, arcGl, trailLine, pulseRing;
  let sunLight, ambLight, nightShade, sunDirLocal;
  let wrap, canvas;
  let streetOverlay, streetMap, streetMarker;
  let streetReady = false;
  let streetLastLat = null;
  let streetLastLon = null;
  let streetWasVisible = false;
  let animId = 0;
  let lastW = 0;
  let lastH = 0;
  const CYCLE = 26; // Zoom Ort → Straßen → Erdkugel → Sterne

  function easeInOut(x) {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  }

  /** 0 = nah am Ort, 1 = weite Erdkugel/Kosmos */
  function zoomPhase(t) {
    const u = (t % CYCLE) / CYCLE;
    // 0–0.14 rein · 0.14–0.42 nah/Straßen · 0.42–0.56 raus · 0.56–0.82 Kosmos · 0.82–1 Anflug
    if (u < 0.14) return 1 - easeInOut(u / 0.14);
    if (u < 0.42) return 0;
    if (u < 0.56) return easeInOut((u - 0.42) / 0.14);
    if (u < 0.82) return 1;
    return 1 - easeInOut((u - 0.82) / 0.18);
  }

  /** Sichtbarkeit echte Straßenkarte (0–1), nur im Nahzoom */
  function streetReveal(t) {
    const u = (t % CYCLE) / CYCLE;
    if (u < 0.12) return 0;
    if (u < 0.18) return easeInOut((u - 0.12) / 0.06);
    if (u < 0.38) return 1;
    if (u < 0.45) return 1 - easeInOut((u - 0.38) / 0.07);
    return 0;
  }

  function phaseLabel(t) {
    const u = (t % CYCLE) / CYCLE;
    if (u < 0.14) return "Zoom zum GPS-Ort…";
    if (u < 0.18) return "3D-Karte…";
    if (u < 0.38) return "3D Neon · Standort";
    if (u < 0.45) return "3D-Fade…";
    if (u < 0.56) return "Zurück zur Erdkugel…";
    if (u < 0.82) return "Kosmos · Milchstraße";
    return "Anflug Ort…";
  }

  function initStreetMap() {
    streetOverlay = document.getElementById("streetOverlay");
    const el = document.getElementById("streetMap");
    if (!streetOverlay || !el || typeof L === "undefined") return;

    streetMap = L.map(el, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      tap: false,
    }).setView([TOKYO.lat, TOKYO.lon], 15);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
      className: "neon-tiles",
    }).addTo(streetMap);

    const icon = L.divIcon({
      className: "",
      html: '<div class="neon-pin"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    streetMarker = L.marker([TOKYO.lat, TOKYO.lon], { icon }).addTo(streetMap);
    streetReady = true;
  }

  function updateStreetOverlay(t) {
    if (!streetOverlay || !streetReady) return;
    const reveal = streetReveal(t);
    streetOverlay.style.opacity = String(reveal);
    streetOverlay.style.transform = `scale(${0.9 + 0.1 * reveal})`;
    streetOverlay.setAttribute("aria-hidden", reveal > 0.05 ? "false" : "true");
    streetOverlay.classList.toggle("is-visible", reveal > 0.05);

    const lat = state.lat != null ? state.lat : TOKYO.lat;
    const lon = state.lon != null ? state.lon : TOKYO.lon;
    const visible = reveal > 0.08;

    if (visible) {
      const moved =
        streetLastLat == null ||
        Math.abs(streetLastLat - lat) > 0.00005 ||
        Math.abs(streetLastLon - lon) > 0.00005;
      if (moved || !streetWasVisible) {
        streetMap.setView([lat, lon], 16, { animate: false });
        streetMarker.setLatLng([lat, lon]);
        streetLastLat = lat;
        streetLastLon = lon;
        streetMap.invalidateSize({ animate: false });
      }
    }
    streetWasVisible = visible;

    if (window.Map3D) {
      if (visible) window.Map3D.setCenter(lat, lon);
      window.Map3D.setReveal(reveal);
    }

    // 3D-Globus etwas abdunkeln, wenn Nahkarte voll da ist
    if (canvas) canvas.style.opacity = String(1 - 0.55 * reveal);
  }

  function deg2rad(d) {
    return (d * Math.PI) / 180;
  }

  function latLonToVec3(lat, lon, radius) {
    const phi = deg2rad(90 - lat);
    const theta = deg2rad(lon + 180);
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const r1 = deg2rad(lat1);
    const r2 = deg2rad(lat2);
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(r1) * Math.cos(r2) * Math.sin(dLon / 2) ** 2;
    return 2 * R_EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  function greatCirclePoints(lat1, lon1, lat2, lon2, n, radius) {
    const pts = [];
    const a = latLonToVec3(lat1, lon1, 1).normalize();
    const b = latLonToVec3(lat2, lon2, 1).normalize();
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = new THREE.Vector3().copy(a).lerp(b, t).normalize().multiplyScalar(radius);
      // leicht anheben für sichtbaren Bogen
      const lift = 1 + 0.08 * Math.sin(Math.PI * t);
      p.multiplyScalar(lift);
      pts.push(p);
    }
    return pts;
  }

  function loadTrail() {
    try {
      const raw = localStorage.getItem("gps-globe-trail");
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) state.trail = arr.slice(-TRAIL_MAX);
    } catch (_) {}
  }

  function saveTrail() {
    try {
      localStorage.setItem("gps-globe-trail", JSON.stringify(state.trail.slice(-TRAIL_MAX)));
    } catch (_) {}
  }

  function makeGlowSprite(color, size) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, color);
    g.addColorStop(0.35, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(size, size, 1);
    return spr;
  }

  /** Equirectangular · passt zu latLonToVec3 / Sphere UV */
  function latLonToXY(lat, lon, w, h) {
    return {
      x: ((lon + 180) / 360) * w,
      y: ((90 - lat) / 180) * h,
    };
  }

  function drawPoly(ctx, rings, w, h, fill, stroke, lineW) {
    const drawRing = (pts, close) => {
      if (!pts.length) return;
      const p0 = latLonToXY(pts[0][1], pts[0][0], w, h);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < pts.length; i++) {
        const p = latLonToXY(pts[i][1], pts[i][0], w, h);
        ctx.lineTo(p.x, p.y);
      }
      if (close) ctx.closePath();
    };
    rings.forEach((ring) => {
      drawRing(ring, true);
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineW;
        ctx.lineJoin = "round";
        ctx.stroke();
      }
    });
  }

  function buildEarthTexture() {
    const w = 2048;
    const h = 1024;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    // Ozean
    const ocean = ctx.createLinearGradient(0, 0, 0, h);
    ocean.addColorStop(0, "#0a2a40");
    ocean.addColorStop(0.5, "#123d55");
    ocean.addColorStop(1, "#0a2a40");
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, w, h);
    // Land-Noise (stilisierte Kontinente)
    for (let i = 0; i < 22000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const n =
        Math.sin(x * 0.01) * Math.cos(y * 0.015) +
        Math.sin(x * 0.025 + y * 0.01) * 0.5;
      if (n > 0.35) {
        ctx.fillStyle = `rgba(${40 + n * 40},${90 + n * 70},${55 + n * 30},${0.35 + n * 0.4})`;
        ctx.fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3);
      }
    }
    // Grid
    ctx.strokeStyle = "rgba(180,230,220,0.08)";
    ctx.lineWidth = 1;
    for (let lon = 0; lon <= w; lon += w / 24) {
      ctx.beginPath();
      ctx.moveTo(lon, 0);
      ctx.lineTo(lon, h);
      ctx.stroke();
    }
    for (let lat = 0; lat <= h; lat += h / 12) {
      ctx.beginPath();
      ctx.moveTo(0, lat);
      ctx.lineTo(w, lat);
      ctx.stroke();
    }

    // Europa leicht
    ctx.fillStyle = "rgba(120,200,160,0.12)";
    ctx.beginPath();
    const eu = latLonToXY(50, 10, w, h);
    ctx.ellipse(eu.x, eu.y, 90, 70, 0, 0, Math.PI * 2);
    ctx.fill();

    // ——— Schweiz = Heimat (klarer Umriss) ———
    // [lon, lat] vereinfachte Landesgrenze
    const switzerland = [
      [
        [5.96, 45.82],
        [6.8, 46.15],
        [7.05, 45.92],
        [7.7, 45.9],
        [8.4, 46.05],
        [9.0, 46.25],
        [10.23, 46.23],
        [10.49, 46.52],
        [10.45, 46.85],
        [9.67, 47.55],
        [9.56, 47.6],
        [8.7, 47.7],
        [8.4, 47.8],
        [7.6, 47.6],
        [7.0, 47.5],
        [6.8, 47.45],
        [6.1, 46.9],
        [5.96, 46.5],
        [5.96, 45.82],
      ],
    ];
    drawPoly(ctx, switzerland, w, h, "rgba(0, 240, 255, 0.45)", null, 0);
    drawPoly(ctx, switzerland, w, h, null, "rgba(255, 255, 255, 0.95)", 3.5);
    drawPoly(ctx, switzerland, w, h, null, "rgba(0, 240, 255, 1)", 2.2);
    const chLabel = latLonToXY(46.8, 8.2, w, h);
    ctx.font = "bold 22px Syne, sans-serif";
    ctx.fillStyle = "rgba(0, 240, 255, 0.95)";
    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    ctx.lineWidth = 4;
    ctx.strokeText("Heimat · スイス", chLabel.x - 70, chLabel.y - 14);
    ctx.fillText("Heimat · スイス", chLabel.x - 70, chLabel.y - 14);
    ctx.font = "15px IBM Plex Mono, monospace";
    ctx.fillStyle = "rgba(200, 255, 245, 0.9)";
    ctx.fillText("Schweiz", chLabel.x - 28, chLabel.y + 6);

    // ——— Japan = deutlicher Landesumriss ———
    const japan = [
      // Hokkaido
      [
        [140.0, 41.5],
        [141.5, 41.6],
        [145.8, 43.3],
        [145.5, 45.5],
        [141.9, 45.5],
        [140.0, 43.5],
        [139.7, 42.0],
        [140.0, 41.5],
      ],
      // Honshu
      [
        [130.95, 33.9],
        [132.5, 34.3],
        [134.0, 34.0],
        [135.5, 34.5],
        [136.9, 35.0],
        [138.0, 34.7],
        [139.0, 35.0],
        [140.2, 35.5],
        [140.9, 36.0],
        [141.0, 37.5],
        [141.0, 39.5],
        [140.5, 40.7],
        [139.8, 41.3],
        [138.5, 40.5],
        [137.5, 37.5],
        [136.5, 36.5],
        [135.5, 35.6],
        [134.0, 35.5],
        [132.5, 35.2],
        [131.0, 34.5],
        [130.95, 33.9],
      ],
      // Kyushu
      [
        [129.7, 31.4],
        [131.5, 31.2],
        [131.9, 32.8],
        [130.8, 33.9],
        [129.5, 33.5],
        [129.3, 32.5],
        [129.7, 31.4],
      ],
      // Shikoku
      [
        [132.4, 32.9],
        [134.4, 33.2],
        [134.6, 34.2],
        [133.0, 34.3],
        [132.2, 33.6],
        [132.4, 32.9],
      ],
    ];
    // Füllung + doppelter Umriss (sehr sichtbar)
    drawPoly(ctx, japan, w, h, "rgba(255, 80, 140, 0.42)", null, 0);
    drawPoly(ctx, japan, w, h, null, "rgba(255, 255, 220, 0.95)", 5);
    drawPoly(ctx, japan, w, h, null, "rgba(255, 43, 214, 1)", 3.2);
    // innere Kontur
    drawPoly(ctx, japan, w, h, null, "rgba(0, 240, 255, 0.75)", 1.4);

    const jpLabel = latLonToXY(37.5, 138.5, w, h);
    ctx.font = "bold 36px Syne, sans-serif";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.fillStyle = "rgba(255, 220, 120, 0.98)";
    ctx.strokeText("日本", jpLabel.x - 30, jpLabel.y);
    ctx.fillText("日本", jpLabel.x - 30, jpLabel.y);
    ctx.font = "18px IBM Plex Mono, monospace";
    ctx.fillStyle = "rgba(255, 180, 220, 0.95)";
    ctx.fillText("Japan", jpLabel.x - 28, jpLabel.y + 22);

    return new THREE.CanvasTexture(c);
  }

  /**
   * Subsolar-Punkt (wo die Sonne senkrecht steht) → echte Tag/Nacht-Grenze.
   * Vereinfachte astronomische Näherung aus UTC-Zeit.
   */
  function getSubsolarLatLon(date = new Date()) {
    const rad = Math.PI / 180;
    const deg = 180 / Math.PI;
    const jd = date.getTime() / 86400000 + 2440587.5;
    const n = jd - 2451545.0;
    const L = (((280.46 + 0.9856474 * n) % 360) + 360) % 360;
    const g = (((357.528 + 0.9856003 * n) % 360) + 360) % 360;
    const lambda =
      (L + 1.915 * Math.sin(g * rad) + 0.02 * Math.sin(2 * g * rad)) * rad;
    const eps = (23.439 - 4e-7 * n) * rad;
    const alpha = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
    const delta = Math.asin(Math.sin(eps) * Math.sin(lambda));
    // Greenwich Mean Sidereal Time (Stunden → Grad)
    let gmst = (18.697374558 + 24.06570982441908 * n) % 24;
    if (gmst < 0) gmst += 24;
    const gmstDeg = gmst * 15;
    let lon = alpha * deg - gmstDeg;
    lon = ((((lon + 180) % 360) + 360) % 360) - 180;
    return { lat: delta * deg, lon };
  }

  function updateDayNight() {
    if (!sunLight || !earth) return;
    const sub = getSubsolarLatLon(new Date());
    // Sonnenrichtung in Erde-Objektkoordinaten (Textur/Marker-Raum)
    sunDirLocal = latLonToVec3(sub.lat, sub.lon, 1).normalize();
    // Licht weit „oben“ über der Tagseite
    const worldSun = sunDirLocal.clone().applyQuaternion(earth.quaternion);
    sunLight.position.copy(worldSun.multiplyScalar(8));
    sunLight.target.position.set(0, 0, 0);
    if (sunLight.target.parent !== scene) scene.add(sunLight.target);
    sunLight.target.updateMatrixWorld();

    if (nightShade && nightShade.material && nightShade.material.uniforms) {
      nightShade.material.uniforms.uSunDir.value.copy(sunDirLocal);
      nightShade.rotation.copy(earth.rotation);
    }
  }

  function makeNightShade() {
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      },
      vertexShader: `
        varying vec3 vNormalObj;
        void main() {
          vNormalObj = normalize(normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        varying vec3 vNormalObj;
        void main() {
          vec3 n = normalize(vNormalObj);
          vec3 s = normalize(uSunDir);
          float day = dot(n, s);
          // weiche Terminator-Linie
          float night = 1.0 - smoothstep(-0.08, 0.18, day);
          // leichter Dämmerungsstreifen
          float term = 1.0 - smoothstep(0.0, 0.22, abs(day));
          vec3 nightCol = vec3(0.01, 0.02, 0.07);
          vec3 glow = vec3(1.0, 0.55, 0.25) * term * 0.22;
          // dezente „Stadtlichter“ auf der Nachtseite
          float lights = night * night * 0.08 * (0.5 + 0.5 * sin(n.x * 40.0) * sin(n.z * 55.0));
          vec3 col = nightCol + glow + vec3(0.9, 0.85, 0.5) * lights;
          float alpha = night * 0.78 + term * 0.12;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.004, 96, 96), mat);
    mesh.renderOrder = 2;
    return mesh;
  }

  function init() {
    THREE = window.THREE;
    if (!THREE) return;
    wrap = document.getElementById("globeWrap");
    canvas = document.getElementById("globe");
    if (!wrap || !canvas) return;

    loadTrail();
    initStreetMap();

    const w = wrap.clientWidth || 800;
    const h = wrap.clientHeight || 480;
    lastW = w;
    lastH = h;

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    camera.position.set(0, 0.6, 3.4);

    // Wenig Ambient → Nachtseite dunkel; Sonne liefert echte Tagseite
    ambLight = new THREE.AmbientLight(0x334466, 0.18);
    scene.add(ambLight);
    sunLight = new THREE.DirectionalLight(0xfff1c8, 1.85);
    sunLight.position.set(5, 2, 3);
    scene.add(sunLight);
    const rim = new THREE.DirectionalLight(0x2244aa, 0.15);
    rim.position.set(-3, -1, -2);
    scene.add(rim);

    const earthTex = buildEarthTexture();
    try {
      if ("colorSpace" in earthTex && THREE.SRGBColorSpace) {
        earthTex.colorSpace = THREE.SRGBColorSpace;
      }
    } catch (_) {}
    earth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 96, 96),
      new THREE.MeshStandardMaterial({
        map: earthTex,
        roughness: 0.88,
        metalness: 0.04,
      })
    );
    scene.add(earth);

    nightShade = makeNightShade();
    scene.add(nightShade);

    atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.045, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0x7ec8ff,
        transparent: true,
        opacity: 0.14,
        side: THREE.BackSide,
      })
    );
    scene.add(atmosphere);

    updateDayNight();

    // Sternenhimmel
    const starGeo = new THREE.BufferGeometry();
    const starN = 2200;
    const starPos = new Float32Array(starN * 3);
    const starCol = new Float32Array(starN * 3);
    for (let i = 0; i < starN; i++) {
      const r = 22 + Math.random() * 28;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = r * Math.cos(ph);
      starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      const warm = Math.random();
      starCol[i * 3] = 0.75 + warm * 0.25;
      starCol[i * 3 + 1] = 0.85 + warm * 0.1;
      starCol[i * 3 + 2] = 1.0;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starCol, 3));
    stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        size: 0.055,
        transparent: true,
        opacity: 0.85,
        vertexColors: true,
        depthWrite: false,
      })
    );
    scene.add(stars);

    // Hellere „Hauptsterne“
    const bGeo = new THREE.BufferGeometry();
    const bN = 120;
    const bPos = new Float32Array(bN * 3);
    for (let i = 0; i < bN; i++) {
      const r = 20 + Math.random() * 24;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      bPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      bPos[i * 3 + 1] = r * Math.cos(ph);
      bPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    bGeo.setAttribute("position", new THREE.BufferAttribute(bPos, 3));
    brightStars = new THREE.Points(
      bGeo,
      new THREE.PointsMaterial({
        color: 0xfff6d5,
        size: 0.12,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    scene.add(brightStars);

    // Milchstraße – dichter Band aus Partikeln
    const mwGeo = new THREE.BufferGeometry();
    const mwN = 1800;
    const mwPos = new Float32Array(mwN * 3);
    const mwCol = new Float32Array(mwN * 3);
    for (let i = 0; i < mwN; i++) {
      const a = (i / mwN) * Math.PI * 2 + Math.random() * 0.05;
      const band = (Math.random() - 0.5) * 0.55;
      const r = 26 + Math.random() * 6;
      // Band in einer geneigten Ebene
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * 0.35 * r + band * 4;
      const z = Math.sin(a) * r * 0.85 + band * 2;
      mwPos[i * 3] = x;
      mwPos[i * 3 + 1] = y * 0.7;
      mwPos[i * 3 + 2] = z;
      const c = 0.55 + Math.random() * 0.45;
      mwCol[i * 3] = 0.65 * c + 0.2;
      mwCol[i * 3 + 1] = 0.55 * c + 0.25;
      mwCol[i * 3 + 2] = 0.95 * c;
    }
    mwGeo.setAttribute("position", new THREE.BufferAttribute(mwPos, 3));
    mwGeo.setAttribute("color", new THREE.BufferAttribute(mwCol, 3));
    milkyWay = new THREE.Points(
      mwGeo,
      new THREE.PointsMaterial({
        size: 0.14,
        transparent: true,
        opacity: 0.55,
        vertexColors: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    milkyWay.rotation.z = 0.55;
    milkyWay.rotation.x = 0.35;
    scene.add(milkyWay);

    zhMarker = makeGlowSprite("rgba(0,240,255,1)", 0.22);
    zhMarker.position.copy(latLonToVec3(ZURICH.lat, ZURICH.lon, 1.02));
    earth.add(zhMarker);

    // Heimat-Ring Schweiz
    homeRing = new THREE.Mesh(
      new THREE.RingGeometry(0.055, 0.085, 48),
      new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      })
    );
    homeRing.position.copy(latLonToVec3(46.8, 8.2, 1.018));
    homeRing.lookAt(0, 0, 0);
    earth.add(homeRing);

    glMarker = makeGlowSprite("rgba(255,180,60,1)", 0.2);
    glMarker.position.copy(latLonToVec3(NAFELS_MOLLIS.lat, NAFELS_MOLLIS.lon, 1.02));
    earth.add(glMarker);

    // Japan-Marker (Land deutlich)
    jpMarker = makeGlowSprite("rgba(255,80,180,1)", 0.32);
    jpMarker.position.copy(latLonToVec3(36.5, 138.0, 1.025));
    earth.add(jpMarker);
    const jpCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff2bd6 })
    );
    jpCore.position.copy(latLonToVec3(36.5, 138.0, 1.016));
    earth.add(jpCore);

    youMarker = makeGlowSprite("rgba(80,255,200,1)", 0.28);
    youMarker.visible = false;
    earth.add(youMarker);

    pulseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.04, 0.07, 48),
      new THREE.MeshBasicMaterial({
        color: 0x5dffc8,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      })
    );
    pulseRing.visible = false;
    earth.add(pulseRing);

    arcZh = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.85,
      })
    );
    earth.add(arcZh);

    arcGl = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({
        color: 0xffc14d,
        transparent: true,
        opacity: 0.85,
      })
    );
    earth.add(arcGl);

    trailLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({
        color: 0x5ee0c8,
        transparent: true,
        opacity: 0.85,
      })
    );
    earth.add(trailLine);

    const zhCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    zhCore.position.copy(latLonToVec3(ZURICH.lat, ZURICH.lon, 1.015));
    earth.add(zhCore);

    const glCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.014, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffb040 })
    );
    glCore.position.copy(latLonToVec3(NAFELS_MOLLIS.lat, NAFELS_MOLLIS.lon, 1.015));
    earth.add(glCore);

    state.ready = true;
    rebuildTrailGeom();
    if (state.trail.length) {
      const last = state.trail[state.trail.length - 1];
      setPosition(last.lat, last.lon, false);
    } else {
      // Beispiel: Tokio bis echter Fix
      setPosition(TOKYO.lat, TOKYO.lon, false);
    }
    loop();
  }

  function rebuildArc() {
    if (!state.ready || state.lat == null) return;
    const ptsZh = greatCirclePoints(
      state.lat,
      state.lon,
      ZURICH.lat,
      ZURICH.lon,
      64,
      1.02
    );
    const ptsGl = greatCirclePoints(
      state.lat,
      state.lon,
      NAFELS_MOLLIS.lat,
      NAFELS_MOLLIS.lon,
      64,
      1.025
    );
    arcZh.geometry.dispose();
    arcZh.geometry = new THREE.BufferGeometry().setFromPoints(ptsZh);
    arcGl.geometry.dispose();
    arcGl.geometry = new THREE.BufferGeometry().setFromPoints(ptsGl);
  }

  function softKm(el, km) {
    if (!el) return;
    const cur = parseFloat(el.dataset.v || "0");
    const shown = cur + (km - cur) * 0.12;
    el.dataset.v = String(shown);
    el.textContent = `${shown.toFixed(1)} km`;
  }

  function rebuildTrailGeom() {
    if (!state.ready || state.trail.length < 2) {
      if (trailLine) trailLine.visible = false;
      return;
    }
    const pts = state.trail.map((p) => latLonToVec3(p.lat, p.lon, 1.018));
    trailLine.geometry.dispose();
    trailLine.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    trailLine.visible = true;
  }

  function setPosition(lat, lon, pushTrail) {
    if (lat == null || lon == null) return;
    const moved =
      state.lat == null ||
      Math.abs(state.lat - lat) > 1e-5 ||
      Math.abs(state.lon - lon) > 1e-5;
    state.lat = lat;
    state.lon = lon;

    if (!state.ready) return;

    const pos = latLonToVec3(lat, lon, 1.02);
    youMarker.position.copy(pos);
    youMarker.visible = true;
    pulseRing.position.copy(latLonToVec3(lat, lon, 1.016));
    pulseRing.lookAt(0, 0, 0);
    pulseRing.visible = true;

    if (pushTrail !== false && moved) {
      const last = state.trail[state.trail.length - 1];
      if (
        !last ||
        Math.abs(last.lat - lat) > 3e-5 ||
        Math.abs(last.lon - lon) > 3e-5
      ) {
        state.trail.push({ lat, lon, t: Date.now() });
        if (state.trail.length > TRAIL_MAX) state.trail.shift();
        saveTrail();
        rebuildTrailGeom();
      }
    }

    rebuildArc();
    updateHud();
  }

  function updateHud() {
    const zhEl = document.getElementById("zhDist");
    const glEl = document.getElementById("glDist");
    const subEl = document.getElementById("destSub");
    const youEl = document.getElementById("globeYou");
    const phase = phaseLabel(performance.now() * 0.001);
    if (state.lat == null) {
      if (zhEl)
        zhEl.textContent = `${haversineKm(TOKYO.lat, TOKYO.lon, ZURICH.lat, ZURICH.lon).toFixed(0)} km`;
      if (glEl)
        glEl.textContent = `${haversineKm(TOKYO.lat, TOKYO.lon, NAFELS_MOLLIS.lat, NAFELS_MOLLIS.lon).toFixed(0)} km`;
      if (subEl) subEl.textContent = `Beispiel ${TOKYO.name} · ${phase}`;
      if (youEl) youEl.textContent = `${TOKYO.name}`;
      return;
    }
    softKm(zhEl, haversineKm(state.lat, state.lon, ZURICH.lat, ZURICH.lon));
    softKm(glEl, haversineKm(state.lat, state.lon, NAFELS_MOLLIS.lat, NAFELS_MOLLIS.lon));
    if (subEl) {
      subEl.textContent = `CH · ${state.trail.length} Pts · ${phase}`;
    }
    if (youEl) {
      youEl.textContent = `${state.lat.toFixed(4)}°, ${state.lon.toFixed(4)}°`;
    }
  }

  function resize() {
    if (!renderer || !wrap) return;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (w < 10 || h < 10) return;
    if (w === lastW && h === lastH) return;
    lastW = w;
    lastH = h;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function loop() {
    animId = requestAnimationFrame(loop);
    resize();
    const t = performance.now() * 0.001;
    const z = zoomPhase(t); // 0 nah, 1 weit

    // Echte Erdrotation (~15°/h) – Tag/Nacht bleibt geographisch korrekt
    if (earth) earth.rotation.y += (Math.PI * 2) / 86400;
    if (nightShade) nightShade.rotation.y = earth.rotation.y;
    updateDayNight();
    if (stars) stars.rotation.y -= 0.00008 + z * 0.00012;
    if (brightStars) {
      brightStars.rotation.y -= 0.00005;
      brightStars.material.opacity = 0.55 + 0.4 * z;
    }
    if (milkyWay) {
      milkyWay.rotation.y += 0.00025;
      milkyWay.material.opacity = 0.15 + 0.55 * z;
    }
    if (atmosphere) {
      atmosphere.material.opacity = 0.08 + 0.05 * Math.sin(t * 1.3) + 0.04 * (1 - z);
    }
    if (stars && stars.material) {
      stars.material.opacity = 0.35 + 0.55 * z;
      stars.material.size = 0.04 + 0.04 * z;
    }

    // Puls am Standort – stärker im Nahzoom
    const pulseAmp = 0.35 + 0.65 * (1 - z);
    if (pulseRing && pulseRing.visible) {
      const s = 1 + 0.7 * pulseAmp * (0.5 + 0.5 * Math.sin(t * 3.2));
      pulseRing.scale.set(s, s, s);
      pulseRing.material.opacity =
        0.2 + 0.55 * pulseAmp * (0.5 + 0.5 * Math.sin(t * 3.2 + 1));
    }
    if (youMarker && youMarker.visible) {
      const p = (0.18 + 0.14 * (1 - z)) * (1 + 0.08 * Math.sin(t * 2.4));
      youMarker.scale.set(p, p, 1);
    }
    if (zhMarker) {
      const p = 0.16 + 0.08 * z + 0.04 * Math.sin(t * 2.1 + 0.7);
      zhMarker.scale.set(p, p, 1);
    }
    if (homeRing) {
      const s = 1 + 0.12 * Math.sin(t * 2.2);
      homeRing.scale.set(s, s, s);
      homeRing.material.opacity = 0.55 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.2));
    }
    if (jpMarker) {
      const p = 0.22 + 0.1 * z + 0.05 * Math.sin(t * 1.8 + 0.3);
      jpMarker.scale.set(p, p, 1);
    }
    if (glMarker) {
      const p = 0.14 + 0.07 * z + 0.04 * Math.sin(t * 2.4 + 1.1);
      glMarker.scale.set(p, p, 1);
    }

    // Kamera: Zoom zum Ort ↔ weite Erdkugel / Kosmos
    const focusLat = state.lat != null ? state.lat : TOKYO.lat;
    const focusLon = state.lon != null ? state.lon : TOKYO.lon;
    const focus = latLonToVec3(focusLat, focusLon, 1).normalize();

    // nahe: entlang Oberflächennormale · weit: Orbit um Erde + Sterne
    const nearDist = 1.28;
    const farDist = 5.2;
    const dist = nearDist + (farDist - nearDist) * z;

    const orbit = t * (0.05 + 0.12 * z);
    const side = new THREE.Vector3(0, 1, 0).cross(focus);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    const up = focus.clone().cross(side).normalize();

    // nahe: fast frontal auf den Ort; weit: schräger Orbit + Milchstraße sichtbar
    const nearPos = focus
      .clone()
      .multiplyScalar(dist)
      .add(side.clone().multiplyScalar(0.08 * Math.sin(t * 0.4)))
      .add(up.clone().multiplyScalar(0.05));
    const farPos = new THREE.Vector3(
      Math.cos(orbit) * dist * 0.85,
      1.1 + 0.6 * Math.sin(t * 0.25),
      Math.sin(orbit) * dist * 0.85
    );
    const camTarget = nearPos.clone().lerp(farPos, easeInOut(z));

    camera.position.lerp(camTarget, 0.045);
    const lookNear = focus.clone().multiplyScalar(0.92);
    const lookFar = new THREE.Vector3(0, 0, 0);
    const look = lookNear.clone().lerp(lookFar, easeInOut(z));
    camera.lookAt(look);
    // FOV atmet mit Zoom
    const wantFov = 38 + 12 * z;
    camera.fov += (wantFov - camera.fov) * 0.04;
    camera.updateProjectionMatrix();

    const arcOp = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2)) * (0.4 + 0.6 * z);
    if (arcZh && arcZh.material) arcZh.material.opacity = arcOp;
    if (arcGl && arcGl.material) arcGl.material.opacity = arcOp * 0.9;

    updateHud();
    updateStreetOverlay(t);
    renderer.render(scene, camera);

    const sweep = document.getElementById("globeSweep");
    if (sweep) {
      const streets = streetReveal(t);
      sweep.style.opacity = String((0.25 + 0.55 * z) * (1 - streets));
      sweep.style.transform = `rotate(${(t * 18) % 360}deg)`;
    }
  }

  window.GpsGlobe = {
    init,
    setPosition,
    getTrail: () => state.trail.slice(),
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      // warte kurz auf THREE
      const wait = setInterval(() => {
        if (window.THREE) {
          clearInterval(wait);
          init();
        }
      }, 30);
    });
  } else {
    const wait = setInterval(() => {
      if (window.THREE) {
        clearInterval(wait);
        init();
      }
    }, 30);
  }
})();
