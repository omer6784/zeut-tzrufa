/* ────────────────────────────────────────────────────────────────────────
   Stage 7 — "מה מניע אותך?"  ·  three running lines.

   Every word is drawn as LETTERS MADE OF DOTS — each label is rasterised from
   the interface's own ArbelG at the interface's own dot pitch, so the type is
   the same material as the grid, the tiles and the frames. One canvas paints
   them all.

   The stage is a conveyor: THREE lines of very large words crossing the content
   area, each at its own slow pace. A word enters after the right-hand grid line,
   crosses, and leaves before the left-hand one — so the edges cut the type by
   design and the space is never a cloud. Words never overlap: inside a line they
   are spaced apart, and the lines have their own bands.

   The size of a word is composition only — it says nothing about the word's
   weight and nothing about the chance of choosing it.

   As a hand comes near, the word feels it before any touch: it grows a little,
   its dots gain weight, and its whole line slows so the word can be caught. A
   tap hands the word to the questionnaire, which runs the existing flow —
   word → meaning family → symbol pool → symbol — completely unchanged.

   Words, families and symbol pools live in drive-words.js.
   ──────────────────────────────────────────────────────────────────────── */

import { DISPLAY_WORDS } from './drive-words.js';

const INK = '#f5f5ed';      // the words: the interface's cream
const PICKED = '#282828';   // the one chosen: the interface's dark
const DOT_R = 1.15;          // dot RADIUS — one weight at every size…
const PITCH = 4.4;           // …and one spacing: a bigger word gets MORE dots
const NEAR_R = 260;          // how far out a word feels a hand

/* The three lines. `h` is the type size as a share of the content area's
   height, `y` where the line sits in it, `v` how fast it travels (px a second),
   `gap` the clear ground between one word and the next, in type sizes. */
const PACE = 30;             // every line travels at the same pace
const LINES = [
  { y: 0.17, h: 0.26, v: PACE, gap: 0.85 },
  { y: 0.50, h: 0.30, v: PACE, gap: 0.70 },
  { y: 0.83, h: 0.24, v: PACE, gap: 0.95 },
];

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = t => t * t * (3 - 2 * t);
const rnd = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

/* Rasterise a label into dot offsets around its own centre. Hebrew stays
   exact — the real glyphs are sampled, never approximated — and the pitch is
   the same at every size, so a bigger word is built from more dots rather than
   from bigger ones. */
function dotsForLabel(label, fontPx) {
  const pad = Math.ceil(fontPx * 0.3);
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
  for (let y = 0; y < h; y += PITCH) {
    for (let x = 0; x < w; x += PITCH) {
      if (px[((y | 0) * w + (x | 0)) * 4 + 3] > 110) pts.push({ x: x - w / 2, y: y - h / 2 });
    }
  }
  // the ink's own box, so a word's ground is its letters and not its padding
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const p of pts) { if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; }
  return { pts, hw: (maxX - minX) / 2 + 2, hh: (maxY - minY) / 2 + 2, ox: (minX + maxX) / 2, oy: (minY + maxY) / 2 };
}

export function mountDrive(host, opts = {}) {
  const onSelect = opts.onSelect || (() => {});
  const onDeselect = opts.onDeselect || (() => {});

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
  let W = 0, H = 0, dpr = 1;
  let lines = [];                      // the three running lines
  let chosen = null, chosenAt = 0;
  let pointer = null;                  // last known hand/pointer position, in field space
  let raf = 0, last = 0, lastCheck = 0;

  /* The order words appear in: shuffled once, then walked — so no word returns
     until every other has had its turn. Nothing here touches the mapping. */
  const order = DISPLAY_WORDS.map((w, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  let cursor = 0;
  const onScreen = () => lines.flatMap(l => l.items.map(it => it.label));
  const nextWord = () => {
    const here = new Set(onScreen());
    for (let n = 0; n < order.length; n++) {
      const w = DISPLAY_WORDS[order[(cursor + n) % order.length]];
      if (!here.has(w.label)) { cursor = (cursor + n + 1) % order.length; return w; }
    }
    return DISPLAY_WORDS[order[cursor++ % order.length]];
  };

  function measure() {
    W = Math.max(2, field.clientWidth); H = Math.max(2, field.clientHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* One word on a line: cut from the font at that line's size, and placed so
     its left edge follows the word before it with a clear gap. */
  function makeItem(line, x) {
    const word = nextWord();
    const cache = dotsForLabel(word.label, line.fontPx);
    return { label: word.label, pts: cache.pts, hw: cache.hw, hh: cache.hh, ox: cache.ox, oy: cache.oy, x, near: 0 };
  }

  /* Fill a line from the right-hand edge outwards, so the conveyor is already
     running when the stage opens rather than starting empty. */
  function fillLine(line) {
    line.items = [];
    let x = -line.fontPx * 0.6;                 // the first word is already leaving
    while (x < W + line.fontPx * 2.5) {
      const it = makeItem(line, 0);
      it.x = x + it.hw;
      line.items.push(it);
      x = it.x + it.hw + line.fontPx * line.gap;
    }
  }

  function build() {
    lines = LINES.map(def => {
      const line = { ...def, fontPx: Math.max(18, Math.round(H * def.h)), yPx: H * def.y, items: [], slow: 0 };
      fillLine(line);
      return line;
    });
  }
  measure();
  build();

  // A canvas will not pull a webfont in by itself: cut the letters again once
  // ArbelG is really there, or the words come out in a fallback face.
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('500 40px ArbelG'), document.fonts.load('500 200px ArbelG')])
      .then(() => { measure(); build(); })
      .catch(() => {});
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { measure(); build(); }) : null;
  ro && ro.observe(field);

  /* ── The conveyor ─────────────────────────────────────────────────────── */
  function step(now, dt) {
    // The stage enters with a transform, so its box can still read as nothing
    // when first measured. Watch the LAYOUT size — a transform never changes it.
    if (now - lastCheck > 250) {
      lastCheck = now;
      const cw = field.clientWidth, ch = field.clientHeight;
      if ((Math.abs(cw - W) > 1 || Math.abs(ch - H) > 1) && cw > 8 && ch > 8) { measure(); build(); }
    }

    let focus = 0;
    for (const line of lines) {
      // how strongly this line is being asked for — the nearest word decides
      let lineNear = 0;
      for (const it of line.items) {
        const d = pointer ? Math.hypot(pointer.x - it.x, pointer.y - line.yPx) : 1e9;
        const want = isFinite(d) ? clamp01(1 - (d - it.hw * 0.4) / NEAR_R) : 0;
        if (!isFinite(it.near)) it.near = 0;
        it.near += (smooth(want) - it.near) * Math.min(1, dt * 6);
        if (it.near > lineNear) lineNear = it.near;
      }
      line.slow += (lineNear - line.slow) * Math.min(1, dt * 4);
      if (lineNear > focus) focus = lineNear;

      // the line travels: in after the right-hand grid line, out before the left
      const v = line.v * (1 - 0.72 * line.slow) * (chosen ? 0.25 : 1);
      for (const it of line.items) it.x -= v * dt;

      // a word that has left is dropped; another follows the last one in
      while (line.items.length && line.items[0].x + line.items[0].hw < -20) line.items.shift();
      const tail = line.items[line.items.length - 1];
      const edge = tail ? tail.x + tail.hw : -1e9;
      if (edge < W + line.fontPx * 2) {
        const it = makeItem(line, 0);
        it.x = Math.max(edge, W) + line.fontPx * line.gap + it.hw;
        line.items.push(it);
      }
    }

    /* ── paint ─────────────────────────────────────────────────────────── */
    ctx.clearRect(0, 0, W, H);
    for (const line of lines) {
      for (const it of line.items) {
        if (it.x + it.hw < -10 || it.x - it.hw > W + 10) continue;
        let alpha = 1 - 0.25 * (focus - it.near);            // the rest step back
        let scale = 1 + 0.10 * it.near;                       // it grows, gently
        let r = DOT_R * (1 + 0.25 * it.near);                 // and gains weight
        if (it === chosen) {
          // the chosen word answers with one pulse; the others are left alone —
          // the colour already says which one was taken
          const k = clamp01((now - chosenAt) / 320);
          r *= 1 + 0.3 * Math.sin(k * Math.PI);
          scale *= 1 + 0.04 * Math.sin(k * Math.PI);
        }
        if (alpha <= 0.01) continue;
        const cx = it.x - it.ox * scale, cy = line.yPx - it.oy * scale;
        ctx.fillStyle = (it === chosen) ? PICKED : INK;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        for (const d of it.pts) {
          const x = cx + d.x * scale, y = cy + d.y * scale;
          ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    step(now, Math.min(0.05, (now - (last || now)) / 1000));
    last = now;
  }
  raf = requestAnimationFrame(frame);

  /* ── The hand ─────────────────────────────────────────────────────────
     A word answers a hand BEFORE it is touched, so the field listens to every
     pointer move on the window — the visitor's finger and the stage's own
     ghost hand alike (the demo dispatches real pointermove events). */
  const toField = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    // While the stage is still entering (or the window is not being painted) the
    // canvas can report no box at all. Dividing by that gives NaN, and one NaN
    // reaching a word's state would keep it from ever being drawn again.
    if (!(r.width > 1) || !(r.height > 1)) return null;
    const p = { x: (cx - r.left) * (W / r.width), y: (cy - r.top) * (H / r.height) };
    return (isFinite(p.x) && isFinite(p.y)) ? p : null;
  };
  const onMove = (e) => { const p = toField(e.clientX, e.clientY); if (p) pointer = p; };
  const onLeave = () => { pointer = null; };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerleave', onLeave, { passive: true });

  const hit = (x, y) => {
    let best = null;
    for (const line of lines) for (const it of line.items) {
      const pad = 18;
      if (Math.abs(x - it.x) <= it.hw + pad && Math.abs(y - line.yPx) <= it.hh + pad) {
        const d = Math.hypot(x - it.x, y - line.yPx);
        if (!best || d < best.d) best = { it, d };
      }
    }
    return best && best.it;
  };

  let down = null;
  // A press is still listened for while a word is taken — that is how the same
  // word is let go again.
  canvas.addEventListener('pointerdown', (e) => {
    down = toField(e.clientX, e.clientY);
    if (down) pointer = down;
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const p = toField(e.clientX, e.clientY);
    if (!p) { down = null; return; }
    const moved = Math.hypot(p.x - down.x, p.y - down.y);
    down = null;
    if (moved > 16) return;                       // a slide across the field, not a choice
    const it = hit(p.x, p.y);
    if (it) select(it);
  });
  canvas.addEventListener('pointercancel', () => { down = null; });

  /* Pressing a word takes it: it turns dark and the lines slow almost to a
     stop. Pressing the SAME word again lets it go — back to cream, and the
     lines pick their pace up again. Pressing another word simply moves the
     choice across. Only "המשך" commits it. */
  function select(it) {
    if (chosen === it) return release();
    chosen = it; chosenAt = performance.now();
    onSelect(it.label);
  }
  function release() {
    if (!chosen) return;
    chosen = null;
    onDeselect();
  }

  // dev/verification, like the other stages' hooks
  if (typeof window !== 'undefined') {
    window.__driveCanvas = () => canvas;
    window.__drivePick = (label) => { for (const line of lines) for (const it of line.items) if (it.label === label) { select(it); return true; } return false; };
    window.__driveRelease = () => release();
    window.__driveWarm = (n = 1) => { for (let k = 0; k < n; k++) step(performance.now(), 0.016); return lines.length; };
    window.__driveTest = () => lines.map(l => ({
      y: Math.round(l.yPx), fontPx: l.fontPx, v: l.v, slow: +l.slow.toFixed(2),
      items: l.items.map(it => ({ label: it.label, x: Math.round(it.x), hw: Math.round(it.hw), hh: Math.round(it.hh), ox: Math.round(it.ox), oy: Math.round(it.oy), dots: it.pts.length, near: it.near })),
    }));
  }

  const teardown = () => {
    cancelAnimationFrame(raf);
    ro && ro.disconnect();
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerleave', onLeave);
    try { field.remove(); } catch (_) {}
  };
  /* For the stage's ghost hand: where the words actually are right now, in
     screen coordinates, so the demo can drift toward one of them. */
  teardown.pick = (label) => {
    for (const line of lines) for (const it of line.items) if (it.label === label) { select(it); return true; }
    return false;
  };
  teardown.release = () => release();
  teardown.wordPoints = () => {
    const r = canvas.getBoundingClientRect();
    const out = [];
    for (const line of lines) for (const it of line.items) {
      if (it.x < it.hw || it.x > W - it.hw) continue;         // only the ones fully in view
      out.push({ label: it.label, tier: 'line', x: r.left + it.x * (r.width / W), y: r.top + line.yPx * (r.height / H) });
    }
    return out;
  };
  return teardown;
}
