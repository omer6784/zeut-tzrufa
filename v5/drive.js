/* ────────────────────────────────────────────────────────────────────────
   Stage 7 — "מה מניע אותך?"  ·  the typographic space.

   Every word is drawn as LETTERS MADE OF DOTS — each label is rasterised from
   the interface's own ArbelG at the interface's own dot pitch, so the type is
   the same material as the grid, the tiles and the frames. One canvas paints
   them all.

   The stage is no longer a cloud of small equal words. It is a large
   typographic space the visitor moves through: ONE enormous word, two or three
   large ones and a few middle ones stand in an asymmetric composition with a
   great deal of empty ground between them. Some deliberately run off the edge
   of the content area and are cut there. Six to nine words are present at any
   moment; the rest drift in and out over time, so the space keeps changing
   without ever filling up. Nothing ever overlaps: every word holds its own
   padded ground, in placement and while it moves.

   The size of a word is composition only — it says nothing about the word's
   weight and nothing about the chance of choosing it.

   Every word drifts, very slowly. As a hand comes near, the word feels it
   before any touch: it leans toward the hand, grows a little, its dots gain
   weight, its own drift slows, and the rest of the space steps back a little.
   A tap hands the word to the questionnaire, which runs the existing flow —
   word → meaning family → symbol pool → symbol — completely unchanged.

   Words, families and symbol pools live in drive-words.js.
   ──────────────────────────────────────────────────────────────────────── */

import { DISPLAY_WORDS } from './drive-words.js';

const INK = '#282828';
const DOT_R = 1.15;          // dot RADIUS — one weight at every size…
const PITCH = 4.4;           // …and one spacing: a bigger word gets MORE dots
const PAD = 34;              // the clear ground every word keeps around itself
const MIN_ON = 6, MAX_ON = 9;
const NEAR_R = 250;          // how far out a word feels a hand
const FADE_IN = 1400, FADE_OUT = 1500;

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = t => t * t * (3 - 2 * t);
const rnd = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

/* The three scales of the composition. `h` is the word's type size as a share
   of the content area's height — one word carries the screen, a couple answer
   it, the rest hold the ground between them. */
const TIERS = {
  huge:  { h: 0.40, ttl: [26000, 38000], crop: 0.30, count: 1 },
  large: { h: 0.21, ttl: [20000, 30000], crop: 0.20, count: 2 },
  mid:   { h: 0.10, ttl: [14000, 24000], crop: 0.08, count: 4 },
};

/* Rasterise a label into dot offsets around its own centre. Hebrew stays
   exact — the real glyphs are sampled, never approximated — and the pitch is
   the same at every size, so a huge word is built from more dots rather than
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
  // the ink's own box, so the word's ground is the letters and not the padding
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const p of pts) { if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; }
  return { pts, hw: (maxX - minX) / 2 + 2, hh: (maxY - minY) / 2 + 2, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
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
  let W = 0, H = 0, dpr = 1, fontReady = false;
  let live = [];                       // the words standing in the space right now
  let chosen = null, chosenAt = 0;
  let pointer = null;                  // last known hand/pointer position, in field space
  let raf = 0, last = 0, lastCheck = 0;
  const t0 = performance.now();

  /* The order words appear in: shuffled once, then walked — so no word repeats
     until every other has had its turn. Nothing here touches the mapping. */
  const order = DISPLAY_WORDS.map((w, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  let cursor = 0;
  const nextWord = () => {
    for (let n = 0; n < order.length; n++) {
      const w = DISPLAY_WORDS[order[(cursor + n) % order.length]];
      if (!live.some(e => e.label === w.label)) { cursor = (cursor + n + 1) % order.length; return w; }
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

  /* How much of a word's own box falls inside the content area (1 = whole). A
     word may be CUT by the edge — that is part of the composition — but never
     to the point of being a fragment. */
  const shown = (e, x, y) => {
    const ix = Math.max(0, Math.min(W, x + e.hw) - Math.max(0, x - e.hw));
    const iy = Math.max(0, Math.min(H, y + e.hh) - Math.max(0, y - e.hh));
    return (ix * iy) / Math.max(1, (e.hw * 2) * (e.hh * 2));
  };
  const clashes = (e, x, y, skip) => live.some(o => o !== skip &&
    Math.abs(x - o.x) < e.hw + o.hw + PAD && Math.abs(y - o.y) < e.hh + o.hh + PAD * 0.7);

  /* Controlled randomness: many candidates, only the ones that keep their
     distance survive, and the best-spaced of those wins. The result is
     asymmetric — never a grid, never centred, never a scatter. */
  function place(e, tier) {
    const crop = TIERS[tier].crop;
    const bx = e.hw * (1 - 2 * crop), by = e.hh * (1 - 2 * crop);
    let best = null;
    for (let k = 0; k < 120; k++) {
      const x = -e.hw + bx + R() * (W + 2 * (e.hw - bx));
      const y = -e.hh + by + R() * (H + 2 * (e.hh - by));
      if (clashes(e, x, y, e)) continue;
      // prefer the emptiest ground, and keep the big words off the exact middle
      let score = 1e9;
      for (const o of live) if (o !== e) score = Math.min(score, Math.hypot(x - o.x, y - o.y));
      if (tier !== 'mid') score += Math.hypot(x - W / 2, y - H / 2) * 0.5;
      if (!best || score > best.score) best = { x, y, score };
    }
    if (!best) return false;
    e.x = best.x; e.y = best.y;
    return true;
  }

  function spawn(tier, at) {
    const word = nextWord();
    const fontPx = Math.max(18, Math.round(H * TIERS[tier].h));
    const cache = dotsForLabel(word.label, fontPx);
    const e = {
      label: word.label, tier, fontPx,
      pts: cache.pts, hw: cache.hw, hh: cache.hh, ox: cache.cx, oy: cache.cy,
      x: 0, y: 0,
      // a very slow drift, its own direction and speed — depth without motion
      dir: R() * Math.PI * 2, speed: 2.2 + R() * 4.2,
      wob: 0.05 + R() * 0.09, wobA: R() * Math.PI * 2,
      born: at, ttl: TIERS[tier].ttl[0] + R() * (TIERS[tier].ttl[1] - TIERS[tier].ttl[0]),
      fade: 0, near: 0, dying: false,
    };
    if (!place(e, tier)) return null;
    live.push(e);
    return e;
  }

  function build(now) {
    live = [];
    for (const tier of ['huge', 'large', 'mid']) {
      for (let i = 0; i < TIERS[tier].count; i++) {
        const e = spawn(tier, now - (tier === 'mid' ? i * 120 : 0));
        // the first breath: they are already there, they only come up
        if (e) e.born = now - i * 90;
      }
    }
  }
  measure();
  build(performance.now());

  // A canvas will not pull a webfont in by itself: cut the letters again once
  // ArbelG is really there, or the words come out in a fallback face.
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('500 40px ArbelG'), document.fonts.load('500 200px ArbelG')])
      .then(() => { fontReady = true; measure(); build(performance.now()); })
      .catch(() => {});
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { measure(); build(performance.now()); }) : null;
  ro && ro.observe(field);

  /* ── The space itself ─────────────────────────────────────────────────── */
  function frame(now) {
    raf = requestAnimationFrame(frame);
    step(now, Math.min(0.05, (now - (last || now)) / 1000));
    last = now;
  }

  function step(now, dt) {
    const t = (now - t0) / 1000;

    // The stage enters with a transition, so the field can still report no box
    // when it is first measured. Watch its real size and lay the space out for
    // the size it actually has — a composition built for a 2px box is nothing.
    if (now - lastCheck > 250) {
      lastCheck = now;
      const cw = field.clientWidth, ch = field.clientHeight;
      if ((Math.abs(cw - W) > 1 || Math.abs(ch - H) > 1) && cw > 8 && ch > 8) { measure(); build(now); }
    }

    // how strongly the nearest word answers the hand — used to step the rest back
    let focus = 0;
    for (const e of live) {
      const d = pointer ? Math.hypot(pointer.x - e.x, pointer.y - e.y) : 1e9;
      const want = clamp01(1 - (d - e.hw * 0.35) / NEAR_R);
      e.near += (smooth(want) - e.near) * Math.min(1, dt * 6);     // smooth both ways
      if (e.near > focus) focus = e.near;
    }

    for (const e of live) {
      const age = now - e.born;
      // presence: up over a second and a half, held, then away again
      const inK = clamp01(age / FADE_IN);
      const outK = e.dying ? clamp01((now - e.dieAt) / FADE_OUT) : clamp01((age - e.ttl) / FADE_OUT);
      e.fade = smooth(inK) * (1 - smooth(outK));
      if (outK >= 1) e.gone = true;

      // drift: a few pixels a second, its own way, its own gentle wander
      const ang = e.dir + Math.sin(t * e.wob + e.wobA) * 0.5;
      const slow = 1 - 0.8 * e.near;                                // it settles as a hand nears
      e.x += Math.cos(ang) * e.speed * slow * dt;
      e.y += Math.sin(ang) * e.speed * 0.7 * slow * dt;

      // and it leans toward the hand, a little
      if (e.near > 0.001 && pointer) {
        const k = e.near * e.near * 16;
        const d = Math.max(1, Math.hypot(pointer.x - e.x, pointer.y - e.y));
        e.px = ((pointer.x - e.x) / d) * k; e.py = ((pointer.y - e.y) / d) * k;
      } else { e.px = (e.px || 0) * 0.9; e.py = (e.py || 0) * 0.9; }

      // a word may be CUT by the edge — that is the composition — but never
      // past it: the band it may travel in is exactly what it may lose
      const crop = TIERS[e.tier].crop;
      const bx = e.hw * (1 - 2 * crop), by = e.hh * (1 - 2 * crop);
      const cx = Math.max(-e.hw + bx, Math.min(W + e.hw - bx, e.x));
      const cy = Math.max(-e.hh + by, Math.min(H + e.hh - by, e.y));
      if (cx !== e.x || cy !== e.y) { e.x = cx; e.y = cy; e.dir = Math.atan2(H / 2 - e.y, W / 2 - e.x) + (R() - 0.5); }
    }

    // nothing may touch anything: a slow push apart, never a collision
    for (let a = 0; a < live.length; a++) for (let b = a + 1; b < live.length; b++) {
      const A = live[a], B = live[b];
      const ox = (A.hw + B.hw + PAD) - Math.abs(B.x - A.x);
      const oy = (A.hh + B.hh + PAD * 0.7) - Math.abs(B.y - A.y);
      if (ox > 0 && oy > 0) {
        const push = Math.min(ox, oy) * 0.02;
        if (ox < oy) { const s = Math.sign(B.x - A.x) || 1; A.x -= s * push; B.x += s * push; }
        else { const s = Math.sign(B.y - A.y) || 1; A.y -= s * push; B.y += s * push; }
      }
    }

    // a word that has said its piece leaves, and another takes its ground
    for (const e of live.filter(e => e.gone)) {
      const tier = e.tier;
      live = live.filter(o => o !== e);
      if (live.length < MAX_ON) spawn(tier, now);
    }
    if (live.length < MIN_ON) spawn('mid', now);

    /* ── paint ─────────────────────────────────────────────────────────── */
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = INK;
    for (const e of live) {
      let alpha = e.fade * (1 - 0.22 * (focus - e.near));          // the rest step back
      let scale = 1 + 0.10 * e.near;                                // it grows, gently
      let r = DOT_R * (1 + 0.25 * e.near);                          // and gains weight
      if (chosen) {
        const k = clamp01((now - chosenAt) / 320);
        if (e === chosen) { r *= 1 + 0.3 * Math.sin(k * Math.PI); scale *= 1 + 0.04 * Math.sin(k * Math.PI); }
        else alpha *= 1 - 0.6 * k;
      }
      if (alpha <= 0.01) continue;
      const cx = e.x + (e.px || 0) - e.ox * scale, cy = e.y + (e.py || 0) - e.oy * scale;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (const d of e.pts) {
        const x = cx + d.x * scale, y = cy + d.y * scale;
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  raf = requestAnimationFrame(frame);

  /* ── The hand ─────────────────────────────────────────────────────────
     A word answers a hand BEFORE it is touched, so the field listens to every
     pointer move on the window — the visitor's finger and the stage's own
     ghost hand alike (the demo dispatches real pointermove events). */
  const toField = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    return { x: (cx - r.left) * (W / r.width), y: (cy - r.top) * (H / r.height) };
  };
  const onMove = (e) => { pointer = toField(e.clientX, e.clientY); };
  const onLeave = () => { pointer = null; };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerleave', onLeave, { passive: true });

  const hit = (x, y) => {
    let best = null;
    for (const e of live) {
      if (e.fade < 0.35) continue;
      const pad = 16;
      if (Math.abs(x - e.x) <= e.hw + pad && Math.abs(y - e.y) <= e.hh + pad) {
        const d = Math.hypot(x - e.x, y - e.y);
        if (!best || d < best.d) best = { e, d };
      }
    }
    return best && best.e;
  };

  let down = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (chosen) return;
    down = toField(e.clientX, e.clientY);
    pointer = down;
  });
  canvas.addEventListener('pointerup', (e) => {
    if (chosen || !down) return;
    const p = toField(e.clientX, e.clientY);
    const moved = Math.hypot(p.x - down.x, p.y - down.y);
    down = null;
    if (moved > 14) return;                       // a slide across the space, not a choice
    const w = hit(p.x, p.y);
    if (w) select(w);
  });
  canvas.addEventListener('pointercancel', () => { down = null; });

  function select(e) {
    if (chosen) return;
    chosen = e; chosenAt = performance.now();
    setTimeout(() => onSelect(e.label), 520);     // the existing symbol flow takes over
  }

  const teardown = () => {
    cancelAnimationFrame(raf);
    ro && ro.disconnect();
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerleave', onLeave);
    try { field.remove(); } catch (_) {}
  };
  /* For the stage's ghost hand: where the words actually stand right now, in
     screen coordinates, so the demo can drift toward one of them. */
  // dev/verification, like the other stages' hooks
  // dev/verification: advance the space without waiting for the display
  if (typeof window !== 'undefined') window.__driveWarm = (n = 1) => { for (let k = 0; k < n; k++) step(performance.now(), 0.016); return live.length; };
  if (typeof window !== 'undefined') window.__driveTest = () => live.map(e => ({ label: e.label, tier: e.tier, x: Math.round(e.x), y: Math.round(e.y), hw: Math.round(e.hw), hh: Math.round(e.hh), fade: +e.fade.toFixed(2), near: +e.near.toFixed(2), dots: e.pts.length, age: Math.round(performance.now() - e.born), ttl: Math.round(e.ttl) }));
  teardown.wordPoints = () => {
    const r = canvas.getBoundingClientRect();
    return live.filter(e => e.fade > 0.6).map(e => ({
      label: e.label, tier: e.tier,
      x: r.left + e.x * (r.width / W), y: r.top + e.y * (r.height / H),
    }));
  };
  return teardown;
}
