/* stage-morph.js — coherent stage-to-stage transition (POC: globe ↔ maze).
   ───────────────────────────────────────────────────────────────────────
   Replaces the generic slide+fade with ONE dot language: the current stage
   DISSOLVES into the shared grid lattice, the dots REFLOW along the vertical
   track while the background/grid colour morphs in step, then they CONDENSE
   into the next stage. The fixed frame (grid, logo, counter, band, nav) never
   moves; only the central content hands off through the dots.

   One shared overlay canvas draws the dots in the 1360×768 LOGICAL space of
   #app-viewport, so it sits on the same lattice as the construction grid and
   works at any screen scale. Nothing here touches the per-stage renderers or
   their functionality — it plays purely BETWEEN renders. */

let cv = null, ctx = null, raf = 0;

function ensureCanvas() {
  const av = document.getElementById('app-viewport') || document.body;
  if (!cv || cv.parentNode !== av) {
    cv = document.createElement('canvas');
    cv.id = 'stage-morph-cv';
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:absolute;left:0;top:0;width:1360px;height:768px;z-index:1400;pointer-events:none;';
    av.appendChild(cv);
    ctx = cv.getContext('2d');
  }
  const dpr = window.__renderDPR || Math.min(window.devicePixelRatio || 1, 2.5);
  cv.width = Math.round(1360 * dpr);
  cv.height = Math.round(768 * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

function parseColor(s) {
  s = (s || '').trim();
  const m = s.match(/\d+(\.\d+)?/g);
  if (s[0] === '#') {
    const h = s.slice(1);
    const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
  }
  if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
  return [40, 40, 40];
}
const gridDotColor = () => {
  const sec = document.getElementById('section-3');
  const c = sec ? getComputedStyle(sec).getPropertyValue('--grid-dot') : '';
  return parseColor(c || '#282828');
};

/* Play the morph. `swap` performs the actual DOM stage swap (renderQuestion),
   called once at the dissolve→reflow boundary. Resolves via onDone. */
export function playStageMorph({ descending, swap, duration = 900, onDone } = {}) {
  ensureCanvas();
  const mid = document.getElementById('middle-q-container');

  // Dot field on the lattice, covering the content rectangle (between the grid
  // lines). Coarser than the real grid so the reflow reads clearly.
  const RX0 = 100, RX1 = 1260, RY0 = 85, RY1 = 726, P = 26;
  const dots = [];
  for (let y = RY0 + P / 2; y < RY1; y += P)
    for (let x = RX0 + P / 2; x < RX1; x += P)
      dots.push({ x, y, sway: (x - RX0) / (RX1 - RX0) });   // x-position → reflow stagger

  const cF = gridDotColor();               // outgoing stage's dot colour
  let cT = cF.slice();                      // incoming — read at swap
  const dir = descending ? -1 : 1;         // forward: dots drift up the track; back: down

  const DISS = 0.36, REFLOW = 0.70;        // phase boundaries (fractions of duration)
  if (mid) mid.style.transition = 'opacity .30s ease, transform .30s ease';
  let swapped = false, m2 = null;
  const t0 = performance.now();

  cancelAnimationFrame(raf);
  function frame(now) {
    const t = clamp01((now - t0) / duration);
    ctx.clearRect(0, 0, 1360, 768);

    // ── dissolve: the current content shrinks + fades into the dots ──
    if (mid && !swapped) { const k = clamp01(t / DISS); mid.style.opacity = String(1 - k); mid.style.transform = `scale(${1 - 0.05 * k})`; }

    // ── swap the DOM at the dissolve→reflow boundary, hidden, ready to condense ──
    if (!swapped && t >= DISS) {
      swapped = true;
      try { swap(); } catch (_) {}
      cT = gridDotColor();
      m2 = document.getElementById('middle-q-container');
      if (m2) { m2.style.transition = 'opacity .34s ease, transform .34s ease'; m2.style.opacity = '0'; m2.style.transform = 'scale(0.965)'; }
    }

    // ── condense: the next content grows + fades out of the dots ──
    if (swapped && m2) { const k = clamp01((t - REFLOW) / (1 - REFLOW)); m2.style.opacity = String(k); m2.style.transform = `scale(${0.965 + 0.035 * k})`; }

    // ── the dots: fade in on dissolve, drift + recolour on reflow, fade out on condense ──
    for (const d of dots) {
      const lt = clamp01((t - d.sway * 0.12) / (1 - 0.12));   // horizontal sweep stagger
      let a;
      if (lt < DISS) a = lt / DISS;
      else if (lt < REFLOW) a = 1;
      else a = 1 - (lt - REFLOW) / (1 - REFLOW);
      a = clamp01(a);
      if (a <= 0.02) continue;
      const rf = clamp01((lt - DISS) / (REFLOW - DISS));       // 0..1 across the reflow
      const dy = dir * 30 * Math.sin(rf * Math.PI);            // a wave along the vertical track
      const r = lerp(cF[0], cT[0], rf) | 0, g = lerp(cF[1], cT[1], rf) | 0, b = lerp(cF[2], cT[2], rf) | 0;
      ctx.globalAlpha = a;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y + dy, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (t < 1) { raf = requestAnimationFrame(frame); }
    else {
      ctx.clearRect(0, 0, 1360, 768);
      const el = document.getElementById('middle-q-container');
      if (el) { el.style.opacity = ''; el.style.transform = ''; el.style.transition = ''; }
      onDone && onDone();
    }
  }
  raf = requestAnimationFrame(frame);
}
