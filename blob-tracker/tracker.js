/**
 * Blob Tracker — Port von
 * https://github.com/nicholaspjm/touchdesigner-blobtracker
 * (CPU-basiert, Webcam statt TouchDesigner)
 */

const BASIS = [
  [0, 2, 0, 0],
  [-1, 0, 1, 0],
  [2, -5, 4, -1],
  [-1, 3, -3, 1],
].map((row) => row.map((v) => v * 0.5));

export function catmullRom(centers, resolution = 8) {
  if (centers.length < 4) return centers;
  const t = Array.from({ length: resolution }, (_, i) => i / (resolution - 1));
  const basisT = t.map((ti) => {
    const t2 = ti * ti;
    const t3 = t2 * ti;
    const row = [1, ti, t2, t3];
    return BASIS.map((_, j) => row[0] * BASIS[0][j] + row[1] * BASIS[1][j] + row[2] * BASIS[2][j] + row[3] * BASIS[3][j]);
  });
  // Actually: basis_matrix @ control_points where basis_matrix = [1,t,t2,t3] @ BASIS
  const basisMatrix = t.map((ti) => {
    const t2 = ti * ti;
    const t3 = t2 * ti;
    const v = [1, ti, t2, t3];
    return [
      v[0] * BASIS[0][0] + v[1] * BASIS[1][0] + v[2] * BASIS[2][0] + v[3] * BASIS[3][0],
      v[0] * BASIS[0][1] + v[1] * BASIS[1][1] + v[2] * BASIS[2][1] + v[3] * BASIS[3][1],
      v[0] * BASIS[0][2] + v[1] * BASIS[1][2] + v[2] * BASIS[2][2] + v[3] * BASIS[3][2],
      v[0] * BASIS[0][3] + v[1] * BASIS[1][3] + v[2] * BASIS[2][3] + v[3] * BASIS[3][3],
    ];
  });

  const result = [];
  for (let i = 1; i < centers.length - 2; i++) {
    const cps = [centers[i - 1], centers[i], centers[i + 1], centers[i + 2]];
    for (const b of basisMatrix) {
      result.push([
        b[0] * cps[0][0] + b[1] * cps[1][0] + b[2] * cps[2][0] + b[3] * cps[3][0],
        b[0] * cps[0][1] + b[1] * cps[1][1] + b[2] * cps[2][1] + b[3] * cps[3][1],
      ]);
    }
  }
  return result;
}

export function matchBlobs(currentCenters, currentSizes, previousCenters, previousIds, maxDistance = 120) {
  if (!previousCenters.length || !currentCenters.length) {
    return {
      centers: currentCenters,
      sizes: currentSizes,
      ids: currentCenters.map((_, i) => i),
    };
  }

  const maxDistSq = maxDistance * maxDistance;
  const used = new Set();
  let nextId = Math.max(...previousIds, -1) + 1;
  const centers = [];
  const sizes = [];
  const ids = [];

  for (let i = 0; i < currentCenters.length; i++) {
    const [cx, cy] = currentCenters[i];
    let best = maxDistSq;
    let bestIdx = -1;
    for (let j = 0; j < previousCenters.length; j++) {
      if (used.has(j)) continue;
      const dx = cx - previousCenters[j][0];
      const dy = cy - previousCenters[j][1];
      const d = dx * dx + dy * dy;
      if (d < best) {
        best = d;
        bestIdx = j;
      }
    }
    centers.push(currentCenters[i]);
    sizes.push(currentSizes[i]);
    if (bestIdx >= 0) {
      ids.push(previousIds[bestIdx]);
      used.add(bestIdx);
    } else {
      ids.push(nextId++);
    }
  }
  return { centers, sizes, ids };
}

/**
 * Threshold + connected components (SimpleBlobDetector-Ersatz)
 * imgData: ImageData grayscale-ish (uses luminance)
 */
export function detectBlobs(imageData, w, h, {
  minArea = 80,
  maxArea = 12000,
  maxBlobs = 40,
  threshold = 140,
  invert = false,
} = {}) {
  const src = imageData.data;
  const bin = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < src.length; i += 4, p++) {
    const y = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
    const on = invert ? y < threshold : y > threshold;
    bin[p] = on ? 1 : 0;
  }

  const visited = new Uint8Array(w * h);
  const blobs = [];
  const qx = new Int32Array(w * h);
  const qy = new Int32Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const start = y * w + x;
      if (!bin[start] || visited[start]) continue;

      let head = 0;
      let tail = 0;
      qx[tail] = x;
      qy[tail] = y;
      tail++;
      visited[start] = 1;

      let sumX = 0;
      let sumY = 0;
      let count = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;

      while (head < tail) {
        const cx = qx[head];
        const cy = qy[head];
        head++;
        sumX += cx;
        sumY += cy;
        count++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const ni = ny * w + nx;
            if (!bin[ni] || visited[ni]) continue;
            visited[ni] = 1;
            qx[tail] = nx;
            qy[tail] = ny;
            tail++;
          }
        }
      }

      if (count < minArea || count > maxArea) continue;
      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      const size = Math.max(bw, bh);
      blobs.push({
        x: sumX / count,
        y: sumY / count,
        size,
        area: count,
      });
    }
  }

  blobs.sort((a, b) => b.area - a.area);
  const top = blobs.slice(0, maxBlobs);
  return {
    centers: top.map((b) => [b.x, b.y]),
    sizes: top.map((b) => b.size),
  };
}

export function createTracker(defaults = {}) {
  const state = {
    smoothedCenters: [],
    smoothedSizes: [],
    blobIds: [],
    confidence: new Map(),
    trails: new Map(), // id -> [[x,y],...]
    frame: 0,
  };

  const params = {
    minArea: 80,
    maxArea: 12000,
    maxBlobs: 40,
    threshold: 140,
    invert: false,
    maxDistance: 120,
    motionSmoothing: 0.55,
    sizeSmoothing: 0.55,
    trailLength: 24,
    frameSkip: 1,
    ...defaults,
  };

  function update(imageData, w, h) {
    state.frame++;
    const shouldDetect = state.frame % Math.max(1, params.frameSkip) === 0;

    let rawCenters = state.smoothedCenters;
    let rawSizes = state.smoothedSizes;

    if (shouldDetect) {
      const det = detectBlobs(imageData, w, h, params);
      const matched = matchBlobs(
        det.centers,
        det.sizes,
        state.smoothedCenters,
        state.blobIds,
        params.maxDistance,
      );

      const conf = state.confidence;
      for (const id of matched.ids) {
        conf.set(id, Math.min(10, (conf.get(id) || 0) + 1));
      }

      const prevById = new Map();
      const prevSizeById = new Map();
      state.blobIds.forEach((id, i) => {
        if (state.smoothedCenters[i]) prevById.set(id, state.smoothedCenters[i]);
        if (state.smoothedSizes[i] != null) prevSizeById.set(id, state.smoothedSizes[i]);
      });

      const centers = [];
      const sizes = [];
      matched.ids.forEach((id, i) => {
        const c = matched.centers[i];
        const s = matched.sizes[i];
        const blobConf = conf.get(id) || 1;
        const alphaPos = blobConf >= 3
          ? 0.4 + params.motionSmoothing * 0.3
          : 0.2 + params.motionSmoothing * 0.2;
        const alphaSize = blobConf >= 3
          ? 0.4 + params.sizeSmoothing * 0.3
          : 0.2 + params.sizeSmoothing * 0.2;

        if (prevById.has(id)) {
          const p = prevById.get(id);
          centers.push([
            alphaPos * c[0] + (1 - alphaPos) * p[0],
            alphaPos * c[1] + (1 - alphaPos) * p[1],
          ]);
        } else {
          centers.push(c);
        }
        if (prevSizeById.has(id)) {
          sizes.push(alphaSize * s + (1 - alphaSize) * prevSizeById.get(id));
        } else {
          sizes.push(s);
        }

        // trails
        const trail = state.trails.get(id) || [];
        trail.push([...centers[centers.length - 1]]);
        while (trail.length > params.trailLength) trail.shift();
        state.trails.set(id, trail);
      });

      // prune trails
      const live = new Set(matched.ids);
      for (const id of state.trails.keys()) {
        if (!live.has(id)) state.trails.delete(id);
      }
      for (const id of conf.keys()) {
        if (!live.has(id)) conf.delete(id);
      }

      state.smoothedCenters = centers;
      state.smoothedSizes = sizes;
      state.blobIds = matched.ids;
      rawCenters = centers;
      rawSizes = sizes;
    }

    return {
      centers: rawCenters,
      sizes: rawSizes,
      ids: state.blobIds,
      confidence: state.confidence,
      trails: state.trails,
      count: rawCenters.length,
    };
  }

  return { update, params, state };
}
