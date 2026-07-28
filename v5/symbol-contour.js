/* symbol-contour.js — animated dotted CONTOUR of an OBJ, rendered on a plain 2D
   canvas (NO p5 / NO WebGL). Faithful port of the user's contour algorithm:
   fill a mask from the OBJ faces → extract the edge (contour) pixels → order
   them into a single path → sample every Nth point → reveal them progressively
   (the "drawing" effect), time-based so it completes reliably at any frame rate.

   A 2D canvas is used deliberately: the interface already hosts several WebGL
   canvases, and adding another p5/WebGL context made the contour intermittently
   fail to render (context limits / instance issues). 2D has none of that.

   Usage:
     import { mountSymbolContour } from './symbol-contour.js';
     const inst = mountSymbolContour(containerEl, '/hamsa.obj', { onComplete });
     // …later:
     inst.remove();
*/

export function mountSymbolContour(container, objPath, opts = {}) {
  const OBJ_SCALE   = opts.objScale   ?? 640;   // larger → symbol dominates the window
  const DOT_SIZE    = opts.dotSize    ?? 2.5;
  const DOT_COLOR   = opts.dotColor   ?? '#f5f5ed';
  const SAMPLE_STEP = opts.sampleStep ?? 7;
  // The reveal runs at a CONSTANT drawing rate (dots per second), so simple and
  // intricate symbols alike draw at the same visual pace — a fixed wall-clock
  // duration made dot-heavy symbols rush. Clamped so no symbol feels endless
  // or instant. (drawMs, if passed, still overrides.)
  const DOTS_PER_SEC = opts.dotsPerSec ?? 250;
  let DRAW_MS = opts.drawMs ?? 2000;             // resolved per-symbol once dots exist
  // Some OBJs are authored facing a non-frontal axis (e.g. a wheel whose face
  // lies in the YZ plane). The contour is a silhouette along Z, so such a model
  // would come out edge-on. rotateY/rotateX (radians) reorient it to its frontal
  // view BEFORE the silhouette is taken.
  const ROT_Y = opts.rotateY ?? 0;
  const ROT_X = opts.rotateX ?? 0;
  const W = opts.size ?? 1000;
  const H = opts.size ?? 1000;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  container.appendChild(canvas);

  let layers = [];
  let totalDots = 0;
  let t0 = null;
  let doneFired = false;
  let rafId = null;
  let cancelled = false;

  // Load + process the OBJ, then start the reveal.
  fetch(objPath)
    .then(r => r.text())
    .then(text => {
      if (cancelled) return;
      const { vertices, faces } = parseOBJ(text);
      if (ROT_Y) rotateY(vertices, ROT_Y);
      if (ROT_X) rotateX(vertices, ROT_X);
      normalizeModel(vertices, OBJ_SCALE);
      const mask = buildMask(vertices, faces);
      const components = buildContourComponents(mask);
      layers = groupConcentricLayers(components);
      totalDots = layers.reduce((acc, l) => acc + l.reduce((cAcc, c) => cAcc + c.length, 0), 0);
      
      if (!totalDots) {
        if (!doneFired) { doneFired = true; if (typeof opts.onComplete === 'function') opts.onComplete(); }
        return;
      }

      // Fast, snappy pace: duration follows dot count clamped between 1500ms and 2200ms.
      if (opts.drawMs == null) DRAW_MS = Math.max(1500, Math.min(2200, (totalDots / DOTS_PER_SEC) * 1000));
      try { container.setAttribute('data-dot-count', String(totalDots)); } catch (_) {}
      rafId = requestAnimationFrame(frame);
    })
    .catch(() => {
      if (!doneFired) { doneFired = true; if (typeof opts.onComplete === 'function') opts.onComplete(); }
    });

  function frame() {
    if (cancelled) return;
    if (t0 === null) t0 = performance.now();
    const frac = totalDots ? Math.min((performance.now() - t0) / DRAW_MS, 1) : 0;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = DOT_COLOR;
    const r = DOT_SIZE / 2;

    const numLayers = layers.length;
    layers.forEach((layerComps, lIdx) => {
      let start = 0, end = 1;
      if (numLayers === 2) {
        start = lIdx === 0 ? 0 : 0.35;
        end = lIdx === 0 ? 0.65 : 1.0;
      } else if (numLayers >= 3) {
        if (lIdx === 0) { start = 0; end = 0.45; }
        else if (lIdx === 1) { start = 0.30; end = 0.75; }
        else { start = 0.60; end = 1.0; }
      }

      const layerFrac = Math.max(0, Math.min(1, (frac - start) / (end - start)));
      if (layerFrac <= 0) return;

      const easedFrac = layerFrac;

      layerComps.forEach(comp => {
        if (!comp || !comp.length) return;
        const visibleCount = Math.floor(comp.length * easedFrac);
        for (let i = 0; i < visibleCount; i++) {
          const d = comp[i];
          if (!d) continue;
          ctx.beginPath();
          ctx.arc(W / 2 + d.x, H / 2 - d.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });

    if (!doneFired && totalDots && frac >= 1) {
      doneFired = true;
      if (typeof opts.onComplete === 'function') opts.onComplete();
    }
    rafId = requestAnimationFrame(frame);   // keep the finished contour painted
  }

  /* ── OBJ → geometry ── */
  function parseOBJ(text) {
    const vertices = [];
    const faces = [];
    for (let line of text.split('\n')) {
      line = line.trim();
      if (line.startsWith('v ')) {
        const p = line.split(/\s+/);
        vertices.push({ x: parseFloat(p[1]), y: parseFloat(p[2]), z: parseFloat(p[3]) });
      } else if (line.startsWith('f ')) {
        const p = line.split(/\s+/).slice(1);
        const ids = p.map(part => parseInt(part.split('/')[0], 10) - 1);
        for (let i = 1; i < ids.length - 1; i++) faces.push([ids[0], ids[i], ids[i + 1]]);
      }
    }
    return { vertices, faces };
  }

  function rotateY(vertices, a) {
    const c = Math.cos(a), s = Math.sin(a);
    for (const v of vertices) { const x = v.x, z = v.z; v.x = x * c + z * s; v.z = -x * s + z * c; }
  }
  function rotateX(vertices, a) {
    const c = Math.cos(a), s = Math.sin(a);
    for (const v of vertices) { const y = v.y, z = v.z; v.y = y * c - z * s; v.z = y * s + z * c; }
  }

  function normalizeModel(vertices, scale) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const v of vertices) {
      if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
      if (v.z < minZ) minZ = v.z; if (v.z > maxZ) maxZ = v.z;
    }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
    const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
    const k = scale / size;
    for (const v of vertices) { v.x = (v.x - cx) * k; v.y = (v.y - cy) * k; v.z = (v.z - cz) * k; }
  }

  /* Fill the silhouette (white on black) into an offscreen 2D canvas, then read
     back its pixels as the mask. */
  function buildMask(vertices, faces) {
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const octx = off.getContext('2d');
    octx.fillStyle = '#000'; octx.fillRect(0, 0, W, H);
    octx.fillStyle = '#fff';
    for (const f of faces) {
      const a = vertices[f[0]], b = vertices[f[1]], c = vertices[f[2]];
      octx.beginPath();
      octx.moveTo(W / 2 + a.x, H / 2 - a.y);
      octx.lineTo(W / 2 + b.x, H / 2 - b.y);
      octx.lineTo(W / 2 + c.x, H / 2 - c.y);
      octx.closePath();
      octx.fill();
    }
    return octx.getImageData(0, 0, W, H).data;   // RGBA; R channel is the mask
  }

  function isInsideMask(mask, x, y) {
    return mask[4 * (y * W + x)] > 10;
  }

  function isEdgePixel(mask, x, y) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (!isInsideMask(mask, x + dx, y + dy)) return true;
      }
    }
    return false;
  }

  function buildContourComponents(mask) {
    const contour = [];
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (isInsideMask(mask, x, y) && isEdgePixel(mask, x, y)) {
          contour.push({ x: x - W / 2, y: -(y - H / 2) });
        }
      }
    }
    const components = splitComponents(contour).map(orderComponent);
    return components;
  }

  function groupConcentricLayers(components) {
    if (!components.length) return [];
    
    let maxR = 0;
    const compData = components.map(comp => {
      const sampled = [];
      for (let i = 0; i < comp.length; i += SAMPLE_STEP) sampled.push(comp[i]);
      let rSum = 0;
      sampled.forEach(p => {
        const r = Math.hypot(p.x, p.y);
        rSum += r;
        if (r > maxR) maxR = r;
      });
      const avgR = sampled.length ? rSum / sampled.length : 0;
      return { comp: sampled, avgR };
    });

    if (maxR === 0) maxR = 1;
    compData.forEach(item => { item.normR = item.avgR / maxR; });

    // Group into 3 concentric layers: Outer (normR >= 0.62), Mid (0.32 <= normR < 0.62), Inner (normR < 0.32)
    const layer0 = [], layer1 = [], layer2 = [];
    compData.forEach(item => {
      if (item.comp.length === 0) return;
      if (item.normR >= 0.62) layer0.push(item.comp);
      else if (item.normR >= 0.32) layer1.push(item.comp);
      else layer2.push(item.comp);
    });

    const layers = [];
    if (layer0.length) layers.push(layer0);
    if (layer1.length) layers.push(layer1);
    if (layer2.length) layers.push(layer2);

    if (!layers.length) return [compData.map(d => d.comp)];
    return layers;
  }

  /* Group contour pixels into connected components (grid-hash BFS; pixels within
     ~2px of each other belong to the same line). */
  function splitComponents(points) {
    const CELL = 2, LINK2 = 2.5 * 2.5;
    const grid = new Map();
    const keyOf = (p) => ((Math.round(p.x / CELL) + 4096) << 13) | (Math.round(p.y / CELL) + 4096);
    points.forEach((p, i) => {
      const k = keyOf(p);
      const arr = grid.get(k);
      if (arr) arr.push(i); else grid.set(k, [i]);
    });
    const seen = new Uint8Array(points.length);
    const comps = [];
    for (let s = 0; s < points.length; s++) {
      if (seen[s]) continue;
      const comp = [], queue = [s];
      seen[s] = 1;
      while (queue.length) {
        const i = queue.pop();
        const p = points[i];
        comp.push(p);
        const cx = Math.round(p.x / CELL), cy = Math.round(p.y / CELL);
        for (let gy = cy - 1; gy <= cy + 1; gy++) {
          for (let gx = cx - 1; gx <= cx + 1; gx++) {
            const arr = grid.get(((gx + 4096) << 13) | (gy + 4096));
            if (!arr) continue;
            for (const j of arr) {
              if (seen[j]) continue;
              const q = points[j], dx = q.x - p.x, dy = q.y - p.y;
              if (dx * dx + dy * dy <= LINK2) { seen[j] = 1; queue.push(j); }
            }
          }
        }
      }
      comps.push(comp);
    }
    return comps;
  }

  /* Order ONE component as a continuous stroke: greedy nearest-neighbour walk
     starting from its topmost point (pixels along a line are adjacent, so the
     walk simply follows it). */
  function orderComponent(points) {
    if (points.length < 2) return points;
    const remaining = points.slice();
    let startIndex = 0, bestY = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].y > bestY) { bestY = remaining[i].y; startIndex = i; }
    }
    const ordered = [remaining.splice(startIndex, 1)[0]];
    while (remaining.length > 0) {
      const last = ordered[ordered.length - 1];
      let nearestIndex = 0, nearestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const p = remaining[i];
        const dx = p.x - last.x, dy = p.y - last.y;
        const d = dx * dx + dy * dy;
        if (d < nearestDist) { nearestDist = d; nearestIndex = i; }
      }
      ordered.push(remaining.splice(nearestIndex, 1)[0]);
    }
    return ordered;
  }

  /* Draw order of the lines: start with the one holding the topmost point, then
     always continue to the line whose start is nearest to where the pen stopped. */
  function chainComponents(comps) {
    if (comps.length <= 1) return comps;
    const remaining = comps.slice();
    let bestI = 0, bestY = -Infinity;
    remaining.forEach((c, i) => { if (c[0] && c[0].y > bestY) { bestY = c[0].y; bestI = i; } });
    const ordered = [remaining.splice(bestI, 1)[0]];
    while (remaining.length) {
      const end = ordered[ordered.length - 1][ordered[ordered.length - 1].length - 1];
      let ni = 0, nd = Infinity;
      remaining.forEach((c, i) => {
        const dx = c[0].x - end.x, dy = c[0].y - end.y, d = dx * dx + dy * dy;
        if (d < nd) { nd = d; ni = i; }
      });
      ordered.push(remaining.splice(ni, 1)[0]);
    }
    return ordered;
  }

  return {
    remove() {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      try { canvas.remove(); } catch (_) {}
    },
  };
}
