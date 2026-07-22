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
  const DRAW_MS     = opts.drawMs     ?? 2900;   // wall-clock duration of the reveal
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

  let dots = [];
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
      dots = buildContourDots(mask);
      try { container.setAttribute('data-dot-count', String(dots.length)); } catch (_) {}
      rafId = requestAnimationFrame(frame);
    })
    .catch(() => {});

  function frame() {
    if (cancelled) return;
    if (t0 === null) t0 = performance.now();
    const frac = dots.length ? Math.min((performance.now() - t0) / DRAW_MS, 1) : 0;
    const visibleCount = Math.floor(dots.length * frac);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = DOT_COLOR;
    const r = DOT_SIZE / 2;
    for (let i = 0; i < visibleCount; i++) {
      const d = dots[i];
      ctx.beginPath();
      ctx.arc(W / 2 + d.x, H / 2 - d.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!doneFired && dots.length && frac >= 1) {
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

  function buildContourDots(mask) {
    let contour = [];
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (isInsideMask(mask, x, y) && isEdgePixel(mask, x, y)) {
          contour.push({ x: x - W / 2, y: -(y - H / 2) });
        }
      }
    }
    contour = orderContour(contour);
    const out = [];
    for (let i = 0; i < contour.length; i += SAMPLE_STEP) out.push(contour[i]);
    return out;
  }

  /* Greedy nearest-neighbour ordering so the reveal draws the outline as a
     continuous stroke, starting from the topmost point. */
  function orderContour(points) {
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

  return {
    remove() {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      try { canvas.remove(); } catch (_) {}
    },
  };
}
