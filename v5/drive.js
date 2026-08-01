/* ────────────────────────────────────────────────────────────────────────
   Stage 7 — "מה מניע אותך?"  ·  the word cluster.

   Every word is drawn as LETTERS MADE OF DOTS — each label is rasterised once
   into the interface's own dot pitch, so the type is the same material as the
   grid, the tiles and the frames. One canvas paints them all.

   The stage opens as ONE dense typographic block: the words stacked over each
   other, enormous, layered, deliberately unreadable — everything that can drive
   a person, tangled together. The visitor puts a finger on the block and DRAGS:
   the whole system answers at once, each word easing out along its own path
   with its own small delay, shrinking from enormous to readable, until they
   settle into an open composition with room to press. A tap hands the chosen
   word back to the questionnaire, which runs the interface's existing symbol
   flow (window + jewel) unchanged.

   Touch screen: no hover anywhere. Words, families and symbol pools live in
   drive-words.js.
   ──────────────────────────────────────────────────────────────────────── */

import { DISPLAY_WORDS } from './drive-words.js';

const INK = '#282828';
const DOT_R = 1.15;          // dot RADIUS — the interface's own dot weight
const PITCH = 4.0;           // gap between the dots that build a letter
const SETTLE_MS = 1250;      // the rest of the unravelling once the hand lets go
const DRIFT_PX = 3.5;        // how far a settled word may breathe

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = t => 1 - Math.pow(1 - t, 3);
const rnd = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

/* Rasterise a label into dot offsets around its own centre (once per word).
   Hebrew stays exact — the real glyphs are sampled, not approximated. */
function dotsForLabel(label, fontPx, pitch = PITCH) {
  const pad = Math.ceil(fontPx * 0.35);
  const c = document.createElement('canvas');
  const g = c.getContext('2d', { willReadFrequently: true });
  const font = `500 ${fontPx}px ArbelG, sans-serif`;
  g.font = font;
  const w = Math.ceil(g.measureText(label).width) + pad * 2;
  const h = Math.ceil(fontPx * 1.5) + pad * 2;
  c.width = w; c.height = h;
  g.font = font; g.textBaseline = 'middle'; g.textAlign = 'center'; g.direction = 'rtl';
  g.fillStyle = '#000';
  g.fillText(label, w / 2, h / 2);
  const px = g.getImageData(0, 0, w, h).data;
  const pts = [];
  for (let y = 0; y < h; y += pitch) {
    for (let x = 0; x < w; x += pitch) {
      if (px[((y | 0) * w + (x | 0)) * 4 + 3] > 110) pts.push({ x: x - w / 2, y: y - h / 2 });
    }
  }
  return { pts, w, h };
}

export function mountDrive(host, opts = {}) {
  const onSelect = opts.onSelect || (() => {});

  document.getElementById('drive-field')?.remove();
  const field = document.createElement('div');
  field.id = 'drive-field';
  field.dir = 'rtl';
  const canvas = document.createElement('canvas');
  canvas.className = 'drive-canvas';
  field.appendChild(canvas);
  (document.getElementById('app-viewport') || document.body).appendChild(field);
  const ctx = canvas.getContext('2d');

  const R = rnd(0x5EED17);
  const words = DISPLAY_WORDS.map((w, i) => ({
    ...w, i,
    fs: 26 + Math.round(R() * 10),      // readable size — slight variety, no hierarchy
    bigMul: 5.4 + R() * 2.6,            // its size at the start: enormous
    delay: R(),                         // its own moment in the unravelling
    driftA: R() * Math.PI * 2,
    driftS: 0.18 + R() * 0.16,
    cache: null,
  }));

  let W = 0, H = 0, dpr = 1;
  let spread = 0;                       // 0 = one block · 1 = settled composition
  let dragging = false, drag = null, dragAcc = 0, released = false;
  let chosen = -1, chosenAt = 0;
  let raf = 0; const t0 = performance.now(); let settleStart = 0;

  /* The settled composition: seeded scatter, then relaxation so nothing
     overlaps and every word keeps a finger-sized margin. */
  function layout() {
    const r = field.getBoundingClientRect();
    W = Math.max(2, r.width); H = Math.max(2, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const L = rnd(0x1234abcd);
    for (const w of words) {
      if (!w.cache) {
        // Rasterised at BOTH sizes, each at the same dot pitch — so the letters
        // are equally dense whether the word is enormous inside the block or
        // small and readable afterwards (scaling one set would just spread its
        // dots apart and the type would fall to pieces).
        w.cache = dotsForLabel(w.label, w.fs);
        // The huge one is sampled at a PROPORTIONALLY coarser pitch and drawn
        // with proportionally bigger dots: the same letter in the same dotted
        // material, not a cloud of thousands of specks.
        w.big = dotsForLabel(w.label, Math.round(w.fs * w.bigMul), PITCH * w.bigMul * 0.85);
      }
      w.hw = w.cache.w / 2; w.hh = w.cache.h / 2;
      w.x = w.hw + 12 + L() * Math.max(1, W - 2 * w.hw - 24);
      w.y = w.hh + 10 + L() * Math.max(1, H - 2 * w.hh - 20);
      // where the giant word stands at the start — spread over the whole canvas
      w.bx = W * (0.18 + 0.64 * L());
      w.by = H * (0.16 + 0.68 * L());
    }
    const PAD = 26;
    for (let it = 0; it < 240; it++) {
      for (let a = 0; a < words.length; a++) for (let b = a + 1; b < words.length; b++) {
        const A = words[a], B = words[b];
        const dx = B.x - A.x, dy = B.y - A.y;
        const ox = A.hw + B.hw + PAD - Math.abs(dx), oy = A.hh + B.hh + PAD * 0.5 - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          if (ox < oy) { const p = (dx === 0 ? (a % 2 ? 1 : -1) : Math.sign(dx)) * ox / 2; A.x -= p; B.x += p; }
          else { const p = (dy === 0 ? (a % 2 ? 1 : -1) : Math.sign(dy)) * oy / 2; A.y -= p; B.y += p; }
        }
      }
      for (const w of words) {
        w.x = Math.max(w.hw + DRIFT_PX + 6, Math.min(W - w.hw - DRIFT_PX - 6, w.x));
        w.y = Math.max(w.hh + DRIFT_PX + 4, Math.min(H - w.hh - DRIFT_PX - 4, w.y));
      }
    }
  }
  layout();
  // The canvas does not pull a webfont in by itself: rasterise once ArbelG is
  // really there, or the letters come out in the browser's fallback face.
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('500 40px ArbelG'), document.fonts.load('500 220px ArbelG')])
      .then(() => { for (const w of words) w.cache = null; layout(); })
      .catch(() => {});
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { if (spread < 0.02) layout(); }) : null;
  ro && ro.observe(field);

  // each word has its own delay, so the block unravels as a living system
  const progress = (w) => easeOut(clamp01((spread - w.delay * 0.42) / (1 - w.delay * 0.42)));

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const t = (now - t0) / 1000;
    if (released && spread < 1) spread = clamp01(dragAcc + (1 - dragAcc) * ((now - settleStart) / SETTLE_MS));

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = INK;
    for (const w of words) {
      const p = progress(w);
      const ang = t * w.driftS + w.driftA;
      const dx = p > 0.995 ? Math.cos(ang) * DRIFT_PX : 0;
      const dy = p > 0.995 ? Math.sin(ang * 0.8) * DRIFT_PX * 0.7 : 0;
      const cx = w.bx + (w.x - w.bx) * p + dx;
      const cy = w.by + (w.y - w.by) * p + dy;
      // Cross from the big rasterisation to the small one around the midpoint:
      // both are dense, so the word never dissolves into loose dots.
      const mixTo = clamp01((p - 0.42) / 0.26);
      let r = DOT_R, alpha = 1;
      if (chosen >= 0) {
        const k = clamp01((now - chosenAt) / 300);
        if (w.i === chosen) r *= 1 + 0.3 * Math.sin(k * Math.PI);   // one gentle pulse
        else alpha = 1 - 0.55 * k;                                   // the rest recede
      }
      const layers = [];
      if (mixTo < 1) {
        const s = 1 + (1 / w.bigMul - 1) * p;
        layers.push({ set: w.big, s, a: alpha * (1 - mixTo), rr: r * w.bigMul * 0.5 * s });
      }
      if (mixTo > 0) layers.push({ set: w.cache, s: w.bigMul * (1 - p) + p, a: alpha * mixTo, rr: r });
      for (const L of layers) {
        if (L.a <= 0.01) continue;
        ctx.globalAlpha = L.a;
        ctx.beginPath();
        for (const d of L.set.pts) {
          const x = cx + d.x * L.s, y = cy + d.y * L.s;
          ctx.moveTo(x + L.rr, y); ctx.arc(x, y, L.rr, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  raf = requestAnimationFrame(frame);

  /* ── Touch: one drag opens the whole system; a tap picks a word. ── */
  const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) }; };
  const hit = (x, y) => {
    if (spread < 0.85) return -1;
    for (const w of words) {
      const pad = 14;   // a comfortable target, though the word is only dots
      if (Math.abs(x - w.x) <= w.hw + pad && Math.abs(y - w.y) <= w.hh * 0.8 + pad) return w.i;
    }
    return -1;
  };
  const startSettle = () => { if (!released) { released = true; dragAcc = spread; settleStart = performance.now(); } };

  canvas.addEventListener('pointerdown', (e) => {
    if (chosen >= 0) return;
    drag = { ...local(e), moved: 0 };
    dragging = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || chosen >= 0) return;
    const p = local(e);
    drag.moved += Math.hypot(p.x - drag.x, p.y - drag.y);
    drag.x = p.x; drag.y = p.y;
    if (!released) spread = clamp01(drag.moved / 260);       // the hand drives the opening
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    const p = local(e);
    if (drag.moved < 10) {                                    // a tap, not a drag
      const i = hit(p.x, p.y);
      if (i >= 0) return select(i);
      startSettle();                                          // tapping the block opens it too
      return;
    }
    startSettle();                                            // carry on with inertia
  });
  canvas.addEventListener('pointercancel', () => { dragging = false; startSettle(); });

  function select(i) {
    if (chosen >= 0) return;
    chosen = i; chosenAt = performance.now();
    setTimeout(() => onSelect(words[i].label), 520);   // the existing symbol flow takes over
  }

  return () => {
    cancelAnimationFrame(raf);
    ro && ro.disconnect();
    try { field.remove(); } catch (_) {}
  };
}
