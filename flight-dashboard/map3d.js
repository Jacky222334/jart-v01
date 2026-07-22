/* 3D-Neon-Karte am GPS-Ort (Tokio-Beispiel) – Tiles + extrudierte Blöcke */
(() => {
  const Z = 16;
  const GRID = 3; // 3×3 Tiles
  const TILE = 256;

  let THREE;
  let canvas, renderer, scene, camera, root, ground, pin, buildings;
  let ready = false;
  let reveal = 0;
  let center = { lat: 35.6762, lon: 139.6503 };
  let lastKey = "";
  let animId = 0;
  let t0 = 0;

  function lon2tile(lon, z) {
    return Math.floor(((lon + 180) / 360) * 2 ** z);
  }
  function lat2tile(lat, z) {
    const r = (lat * Math.PI) / 180;
    return Math.floor(
      ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z
    );
  }
  function tile2lon(x, z) {
    return (x / 2 ** z) * 360 - 180;
  }
  function tile2lat(y, z) {
    const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  }

  function hash(i, j) {
    const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function loadTile(x, y, z) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      const s = "abcd"[(x + y) % 4];
      img.src = `https://${s}.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`;
    });
  }

  async function buildGroundTexture(lat, lon) {
    const tx = lon2tile(lon, Z);
    const ty = lat2tile(lat, Z);
    const half = Math.floor(GRID / 2);
    const c = document.createElement("canvas");
    c.width = c.height = GRID * TILE;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, c.width, c.height);

    const jobs = [];
    for (let dy = 0; dy < GRID; dy++) {
      for (let dx = 0; dx < GRID; dx++) {
        const x = tx - half + dx;
        const y = ty - half + dy;
        jobs.push(
          loadTile(x, y, Z).then((img) => {
            if (img) ctx.drawImage(img, dx * TILE, dy * TILE, TILE, TILE);
          })
        );
      }
    }
    await Promise.all(jobs);

    // Neon-Grade
    ctx.globalCompositeOperation = "saturation";
    ctx.fillStyle = "rgba(0, 255, 220, 0.35)";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "rgba(255, 40, 180, 0.08)";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = "source-over";

    // Grid overlay
    ctx.strokeStyle = "rgba(0, 240, 255, 0.12)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * TILE, 0);
      ctx.lineTo(i * TILE, c.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * TILE);
      ctx.lineTo(c.width, i * TILE);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace || tex.colorSpace;
    tex.anisotropy = 4;
    return { tex, tx, ty, half };
  }

  function clearBuildings() {
    if (!buildings) return;
    while (buildings.children.length) {
      const ch = buildings.children.pop();
      if (ch.geometry) ch.geometry.dispose();
      if (ch.material) {
        if (Array.isArray(ch.material)) ch.material.forEach((m) => m.dispose());
        else ch.material.dispose();
      }
    }
  }

  function placeBuildings(meta) {
    clearBuildings();
    const world = GRID * 10; // plane size
    const cell = world / 18;
    const matA = new THREE.MeshStandardMaterial({
      color: 0x1a2a35,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.18,
      metalness: 0.4,
      roughness: 0.45,
    });
    const matB = new THREE.MeshStandardMaterial({
      color: 0x2a1528,
      emissive: 0xff2bd6,
      emissiveIntensity: 0.22,
      metalness: 0.35,
      roughness: 0.5,
    });
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.35,
    });

    for (let i = 0; i < 18; i++) {
      for (let j = 0; j < 18; j++) {
        const hRand = hash(i + meta.tx, j + meta.ty);
        if (hRand < 0.38) continue; // Straßen / Lücken
        // Zentrum freilassen (Pin)
        const cx = (i + 0.5) * cell - world / 2;
        const cz = (j + 0.5) * cell - world / 2;
        if (Math.hypot(cx, cz) < cell * 1.1) continue;

        const h = 0.4 + hRand * 3.8 + (hash(j, i) > 0.85 ? 2.5 : 0);
        const w = cell * (0.45 + hash(i * 3, j) * 0.4);
        const d = cell * (0.45 + hash(j * 3, i) * 0.4);
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, hRand > 0.55 ? matB : matA);
        mesh.position.set(cx, h / 2, cz);
        mesh.castShadow = false;
        buildings.add(mesh);

        if (hRand > 0.7) {
          const edges = new THREE.EdgesGeometry(geo);
          const line = new THREE.LineSegments(edges, edgeMat);
          line.position.copy(mesh.position);
          buildings.add(line);
        }
      }
    }
  }

  async function rebuild(lat, lon) {
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    if (key === lastKey && ground) return;
    lastKey = key;
    center = { lat, lon };

    const meta = await buildGroundTexture(lat, lon);
    if (!ground) return;

    if (ground.material.map) ground.material.map.dispose();
    ground.material.map = meta.tex;
    ground.material.needsUpdate = true;
    placeBuildings(meta);
  }

  function resize() {
    if (!canvas || !renderer || !camera) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth || 300;
    const h = parent.clientHeight || 300;
    if (w < 8 || h < 8) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function loop(now) {
    animId = requestAnimationFrame(loop);
    if (!ready || reveal < 0.02) return;
    resize();
    const t = (now - t0) * 0.001;
    const dist = 14 - reveal * 3.5;
    const ang = t * 0.18;
    camera.position.set(
      Math.cos(ang) * dist,
      7.5 + Math.sin(t * 0.4) * 0.4,
      Math.sin(ang) * dist
    );
    camera.lookAt(0, 0.6, 0);
    if (pin) {
      pin.position.y = 0.35 + Math.sin(t * 3) * 0.08;
      pin.rotation.y += 0.02;
    }
    if (buildings) buildings.rotation.y = Math.sin(t * 0.05) * 0.02;
    renderer.render(scene, camera);
  }

  function init() {
    THREE = window.THREE;
    canvas = document.getElementById("map3d");
    if (!THREE || !canvas) return;

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050510, 0.035);

    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    camera.position.set(12, 8, 12);

    root = new THREE.Group();
    scene.add(root);

    const amb = new THREE.AmbientLight(0x6688aa, 0.55);
    scene.add(amb);
    const neon = new THREE.PointLight(0x00f0ff, 1.2, 40);
    neon.position.set(4, 10, 2);
    scene.add(neon);
    const neon2 = new THREE.PointLight(0xff2bd6, 0.9, 40);
    neon2.position.set(-5, 8, -3);
    scene.add(neon2);

    const gSize = GRID * 10;
    ground = new THREE.Mesh(
      new THREE.PlaneGeometry(gSize, gSize),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
        metalness: 0.1,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    root.add(ground);

    // leichte Glasplatte / Glow-Ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(gSize * 0.48, gSize * 0.5, 64),
      new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    root.add(ring);

    buildings = new THREE.Group();
    root.add(buildings);

    pin = new THREE.Mesh(
      new THREE.ConeGeometry(0.25, 0.7, 6),
      new THREE.MeshBasicMaterial({ color: 0xff2bd6 })
    );
    pin.position.set(0, 0.4, 0);
    pin.rotation.x = Math.PI;
    root.add(pin);
    const pinCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    pinCore.position.set(0, 0.15, 0);
    root.add(pinCore);

    ready = true;
    t0 = performance.now();
    resize();
    rebuild(center.lat, center.lon);
    requestAnimationFrame(loop);
    window.addEventListener("resize", resize);
  }

  window.Map3D = {
    init,
    setCenter(lat, lon) {
      if (lat == null || lon == null) return;
      rebuild(lat, lon);
    },
    setReveal(v) {
      reveal = Math.max(0, Math.min(1, v));
      if (canvas) {
        canvas.style.opacity = String(reveal);
        canvas.style.visibility = reveal > 0.02 ? "visible" : "hidden";
      }
    },
    ready: () => ready,
  };

  function boot() {
    const wait = setInterval(() => {
      if (window.THREE) {
        clearInterval(wait);
        init();
      }
    }, 30);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
