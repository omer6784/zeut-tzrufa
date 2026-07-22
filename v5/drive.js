/* ────────────────────────────────────────────────────────────────────────
   Stage 7 — "מה מניע אותך?"  ·  floating-words selector.

   Renders the DISPLAY_WORDS as independent, generously-spaced floating texts
   (no cards / buttons / icons / boxes). They enter with a soft fade + short
   drift, then hover slowly in place. Hover recolours a word to the interface
   orange; a tap selects it: it turns #ff5003, grows slightly, the rest scatter
   away, and the chosen word dissolves into dots that stream toward the jewel —
   after which onSelect(word, symbol) hands control back to the questionnaire.

   Layout is DETERMINISTIC (fixed seed) so the composition is identical every
   load, and a relaxation pass guarantees no two words overlap — including under
   the small drift, because the packing keeps a padding wider than the drift.
   ──────────────────────────────────────────────────────────────────────── */

import { DISPLAY_WORDS, symbolForWord } from './drive-words.js';

/* Deterministic PRNG (mulberry32) — same sequence every mount. */
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SIZE_BUCKETS = {
  s: [28, 31, 34],   // small
  m: [38, 42, 46],   // medium
  l: [50, 55, 60],   // large
};
// A fixed, balanced spread of sizes (more medium; no clustering of larges).
const SIZE_PATTERN = ['m','l','s','m','s','l','m','s','m','l','s','m','s','l','m','s','m','l','s','m','s'];

const DRIFT_MAX = 6;      // px a word may float from its anchor (small, gentle)
const PAD = 26;           // min gap kept between word boxes (> drift + hover grow)

export function mountDrive(host, opts = {}) {
  const onSelect = opts.onSelect || (() => {});
  const words = DISPLAY_WORDS.slice();
  const rng = makeRng(0x5EED17);       // fixed seed → identical composition each load

  // Mount the field on <body>, NOT inside the stage's grid cell: the stage
  // reveal + per-question track use CSS transforms on those ancestors, and a
  // transformed ancestor re-bases position:fixed and can collapse it to 0×0.
  // At <body> level the fixed overlay is always viewport-relative and stable.
  document.getElementById('drive-field')?.remove();
  const field = document.createElement('div');
  field.id = 'drive-field';
  field.dir = 'rtl';
  field.setAttribute('aria-label', 'בחרו את הכוח שמוביל אתכם');
  document.body.appendChild(field);

  // 1. Create the word elements (two layers: outer carries drift + centring,
  //    inner text carries colour + hover/select scale — so the two transforms
  //    never fight).
  const nodes = words.map((w, i) => {
    const bucket = SIZE_PATTERN[i % SIZE_PATTERN.length];
    const sizes = SIZE_BUCKETS[bucket];
    const fs = sizes[Math.floor(rng() * sizes.length)];
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'drive-word';
    el.dataset.word = w;
    el.style.fontSize = fs + 'px';
    // per-word drift: small amplitude, unique direction, slow + desynchronised
    const ang = rng() * Math.PI * 2;
    const amp = DRIFT_MAX * (0.5 + rng() * 0.5);
    el.style.setProperty('--dx', (Math.cos(ang) * amp).toFixed(1) + 'px');
    el.style.setProperty('--dy', (Math.sin(ang) * amp).toFixed(1) + 'px');
    el.style.setProperty('--dur', (7 + rng() * 5).toFixed(2) + 's');
    el.style.setProperty('--ddelay', (-rng() * 6).toFixed(2) + 's');
    el.style.setProperty('--enter-delay', (0.1 + i * 0.05).toFixed(2) + 's');
    el.innerHTML = `<span class="dw-text">${w}</span>`;
    field.appendChild(el);
    return el;
  });

  // 2. Seed positions, then relax so nothing overlaps. IDEMPOTENT — a fresh
  //    seeded RNG each call gives the SAME composition however many times it
  //    runs, so we can safely re-layout when the field settles to its real size
  //    (the stage reveal briefly reports a small/zero size, which would otherwise
  //    pile every word in one corner). Measures real word widths.
  const LAYOUT_SEED = 0x1234abcd;
  let placed = false, lastW = 0, lastH = 0, chosen = false;
  const layout = () => {
    if (chosen) return true;
    const fw = field.clientWidth, fh = field.clientHeight;
    if (fw < 60 || fh < 60) return false;
    if (fw === lastW && fh === lastH) return true;   // already placed at this size
    lastW = fw; lastH = fh; placed = true;
    const lr = makeRng(LAYOUT_SEED);                 // local → deterministic per size
    const boxes = nodes.map((el) => {
      const r = el.getBoundingClientRect();
      return { el, hw: r.width / 2, hh: r.height / 2, x: 0, y: 0 };
    });
    // seeded initial centres inside a margin that fits each word
    boxes.forEach((b) => {
      const mx = b.hw + 10, my = b.hh + 8;
      b.x = mx + lr() * Math.max(1, fw - 2 * mx);
      b.y = my + lr() * Math.max(1, fh - 2 * my);
    });
    // relaxation: push overlapping pairs apart, keep inside the field
    for (let iter = 0; iter < 260; iter++) {
      for (let a = 0; a < boxes.length; a++) {
        for (let c = a + 1; c < boxes.length; c++) {
          const A = boxes[a], B = boxes[c];
          const dx = B.x - A.x, dy = B.y - A.y;
          const ox = A.hw + B.hw + PAD - Math.abs(dx);   // horizontal overlap
          const oy = A.hh + B.hh + PAD - Math.abs(dy);    // vertical overlap
          if (ox > 0 && oy > 0) {
            // separate along the axis of least penetration
            if (ox < oy) {
              const push = (dx === 0 ? (a % 2 ? 1 : -1) : Math.sign(dx)) * ox / 2;
              A.x -= push; B.x += push;
            } else {
              const push = (dy === 0 ? (a % 2 ? 1 : -1) : Math.sign(dy)) * oy / 2;
              A.y -= push; B.y += push;
            }
          }
        }
      }
      // clamp inside the field (leave room for drift so it never spills either)
      boxes.forEach((b) => {
        const mx = b.hw + DRIFT_MAX + 4, my = b.hh + DRIFT_MAX + 4;
        b.x = Math.max(mx, Math.min(fw - mx, b.x));
        b.y = Math.max(my, Math.min(fh - my, b.y));
      });
    }
    boxes.forEach((b) => { b.el.style.left = b.x + 'px'; b.el.style.top = b.y + 'px'; });
    return true;
  };

  // Run now, and re-run whenever the field settles to a new valid size — covers
  // the stage reveal/transition where the field is briefly small before it fills
  // the content band. ResizeObserver is the primary signal; the timed retries are
  // a fallback for environments/timings it might miss.
  layout();
  let ro = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => layout());
    ro.observe(field);
  }
  const retryTimers = [60, 160, 340, 600, 1000].map(t => setTimeout(layout, t));

  // 3. Entrance: fade + short move in, staggered — then drift begins (CSS).
  //    setTimeout (not rAF) so the reveal still fires in a throttled/background
  //    tab where requestAnimationFrame is paused.
  setTimeout(() => field.classList.add('is-in'), 40);

  // 4. Selection. (`chosen` is declared above so layout() freezes once a word is
  //    picked — no re-layout mid-animation.)
  const select = (el) => {
    if (chosen || !placed) return;
    chosen = true;
    if (ro) { try { ro.disconnect(); } catch (_) {} ro = null; }
    const word = el.dataset.word;
    const symbol = symbolForWord(word);
    field.classList.add('is-choosing');

    // scatter the others outward from the chosen word, fading
    const cx = parseFloat(el.style.left), cy = parseFloat(el.style.top);
    nodes.forEach((o) => {
      if (o === el) return;
      const ox = parseFloat(o.style.left) - cx, oy = parseFloat(o.style.top) - cy;
      const d = Math.hypot(ox, oy) || 1;
      o.style.setProperty('--scatter-x', (ox / d * 120).toFixed(0) + 'px');
      o.style.setProperty('--scatter-y', (oy / d * 120).toFixed(0) + 'px');
      o.classList.add('is-gone');
    });

    // the chosen word: recolour + grow, glide to the field centre
    el.classList.add('is-chosen');
    el.style.left = (field.clientWidth / 2) + 'px';
    el.style.top = (field.clientHeight / 2) + 'px';

    // after it has settled centre-stage, dissolve it into dots that stream to
    // the jewel, then hand back to the questionnaire.
    setTimeout(() => dissolveToDots(el, () => onSelect(word, symbol)), 900);
  };

  // dot dissolve: sample points across the word box, fly them toward the jewel
  // build area (falls back to straight up), then fire `done`.
  function dissolveToDots(el, done) {
    const wr = el.getBoundingClientRect();
    const fr = field.getBoundingClientRect();
    // aim point: centre of the interface pendant/jewel preview, else top-centre
    const target = document.getElementById('artifact-canvas') || document.getElementById('artifact-col');
    let tx, ty;
    if (target) { const tr = target.getBoundingClientRect(); tx = tr.left + tr.width / 2 - fr.left; ty = tr.top + tr.height / 2 - fr.top; }
    else { tx = fr.width / 2; ty = -80; }

    el.querySelector('.dw-text').style.opacity = '0';
    const N = 26;
    for (let i = 0; i < N; i++) {
      const d = document.createElement('span');
      d.className = 'dw-dot';
      const sx = (wr.left - fr.left) + rng() * wr.width;
      const sy = (wr.top - fr.top) + rng() * wr.height;
      d.style.left = sx + 'px';
      d.style.top = sy + 'px';
      d.style.setProperty('--fx', (tx - sx).toFixed(0) + 'px');
      d.style.setProperty('--fy', (ty - sy).toFixed(0) + 'px');
      d.style.setProperty('--fd', (0.05 + rng() * 0.18).toFixed(2) + 's');
      field.appendChild(d);
      requestAnimationFrame(() => d.classList.add('is-flying'));
    }
    setTimeout(done, 780);
  }

  nodes.forEach((el) => el.addEventListener('click', () => select(el)));

  // Teardown — returned as a plain function so questionnaire.js can call it as
  // st._driveTeardown() (like every other mount*). Removes the body-level field
  // so the words never linger onto other stages.
  return () => {
    if (ro) { try { ro.disconnect(); } catch (_) {} ro = null; }
    retryTimers.forEach(clearTimeout);
    try { field.remove(); } catch (_) {}
  };
}
