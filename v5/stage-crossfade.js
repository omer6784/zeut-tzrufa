/* stage-crossfade.js — the ONE transition for every stage change.
   ─────────────────────────────────────────────────────────────────────
   Principle: the interface is a single, stable space. The grid and every
   fixed element STAY EXACTLY IN PLACE — no move, scale, fade or rebuild.
   The only thing that animates between stages is the COLOUR LANGUAGE:
   the background and the grid colour (--grid-dot, which drives the grid
   dots and all the chrome that follows it) crossfade — a true per-frame
   colour interpolation — from the current stage's palette to the next
   stage's, in sync and at one rate.

   The stage's own content swaps in near the end of the melt (contentAt) but
   is HELD INVISIBLE until the melt fully finishes — so no stage imagery ever
   appears before the next stage's background, grid and surrounding chrome
   (logo, step counter, library link, step dots, side text) are in place.
   Only then does the content fade in (its own entry animation runs beneath).
   The colour melt is what connects the stages, not screens entering/leaving.
   Same mechanism for every pair, forwards and back. */

let raf = 0;
/* Elements currently held invisible by a transition, tracked at MODULE level so
   any later call (or the safety net) can always give them back — a stage must
   never be left blank because a release step was missed. */
let heldEls = [];
let heldSafety = 0;
function releaseHeld() {
  clearTimeout(heldSafety); heldSafety = 0;
  const els = heldEls; heldEls = [];
  if (!els.length) return;
  for (const el of els) el.style.transition = 'opacity 0.5s ease';
  for (const el of els) el.style.opacity = '1';
  setTimeout(() => {
    for (const el of els) { el.style.removeProperty('opacity'); el.style.removeProperty('transition'); }
  }, 650);
}
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const mix = (a, b, t) => Math.round(a + (b - a) * t);

/* Any CSS colour → [r,g,b]. Handles #rgb / #rrggbb and rgb()/rgba(). */
function parse(str) {
  str = (str || '').trim();
  if (str[0] === '#') {
    const h = str.slice(1);
    const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
  }
  const m = str.match(/[\d.]+/g);
  if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
  return [40, 40, 40];
}
const rgb = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

/* Crossfade #section-3's palette to `toStage`, then swap content near the end.
   - sec:          the #section-3 element (carries background + --grid-dot).
   - toStage:      the target data-stage value (its palette is read live).
   - applyContent: swaps the stage content (renderQuestion) — called once at contentAt.
   - onStart/onDone: lifecycle hooks (e.g. pause/resume the canvas loop). */
/* Read #section-3's currently-RESOLVED palette (ignoring any running transition,
   which would otherwise return a mid-animation colour), with the inline overrides
   we set temporarily lifted so we see the underlying stage CSS. */
function readResolvedPalette(sec) {
  const bgInline = sec.style.backgroundColor;
  const gridInline = sec.style.getPropertyValue('--grid-dot');
  sec.style.backgroundColor = '';
  sec.style.removeProperty('--grid-dot');
  const kill = document.createElement('style');
  kill.textContent = '#section-3, #section-3 *, #section-3::before, #section-3::after { transition: none !important; }';
  document.head.appendChild(kill);
  void sec.offsetWidth;
  const cs = getComputedStyle(sec);
  const bg = parse(cs.backgroundColor);
  const grid = parse(cs.getPropertyValue('--grid-dot'));
  document.head.removeChild(kill);
  // restore whatever inline override the crossfade had applied
  if (bgInline) sec.style.backgroundColor = bgInline;
  if (gridInline) sec.style.setProperty('--grid-dot', gridInline);
  return { bg, grid };
}

function easeCubic(t) {
  // cubic-bezier(0.76, 0, 0.24, 1) smooth ease-in-out curve
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function crossfadeStage({ sec, estimate, applyContent, duration = 800, contentAt = 0.85, onStart, onDone } = {}) {
  if (!sec) { try { applyContent && applyContent(); } catch (_) {} onDone && onDone(); return; }

  // FROM = what is on screen right now.
  const cs0 = getComputedStyle(sec);
  const fromBg = parse(cs0.backgroundColor);
  const fromGrid = parse(cs0.getPropertyValue('--grid-dot'));

  const mid = document.getElementById('middle-q-container');
  const midGridPin = mid ? getComputedStyle(mid).getPropertyValue('--grid-dot').trim() : '';
  if (mid && midGridPin) mid.style.setProperty('--grid-dot', midGridPin);

  const estBg = estimate && estimate.bg ? parse(estimate.bg) : fromBg;
  const estGrid = estimate && estimate.grid ? parse(estimate.grid) : fromGrid;

  releaseHeld();   // never inherit a hold from an interrupted transition
  const prevTransition = sec.style.transition;
  sec.style.transition = 'none';   // we own the colours; no CSS transition may fight us
  onStart && onStart();

  let swapped = false, finished = false;
  let segBg = estBg, segGrid = estGrid;   // phase-B start (value held at contentAt)
  let toBg = estBg, toGrid = estGrid;     // phase-B target (real, read at the swap)

  // The incoming stage's CONTENT containers (everything unique to a stage —
  // the central cell, the dark light-point layer, the instruction + forward
  // button band). The fixed chrome (grid, logo, step counter, library link,
  // step dots, side text) lives outside these and is never touched.
  const HOLD_SELECTOR = '#q-main-cell, .stage2, .stage-band, #q-instruction';
  function holdContent() {
    heldEls = Array.from(document.querySelectorAll(HOLD_SELECTOR));
    for (const el of heldEls) { el.style.transition = 'none'; el.style.opacity = '0'; }
    // Safety net: whatever happens to this transition (a throttled frame loop, a
    // stage that swaps its own DOM, an exception downstream), the content is
    // ALWAYS given back shortly after the melt would have ended.
    clearTimeout(heldSafety);
    heldSafety = setTimeout(releaseHeld, duration + 900);
  }
  function doSwap() {
    if (swapped) return;
    swapped = true;
    segBg = estBg.slice(); segGrid = estGrid.slice();
    try { applyContent && applyContent(); } catch (_) {}
    holdContent();   // the new content stays invisible until the melt finishes
    const m2 = document.getElementById('middle-q-container');
    if (m2) m2.style.removeProperty('--grid-dot');
    const real = readResolvedPalette(sec);
    toBg = real.bg; toGrid = real.grid;
  }
  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    doSwap();
    sec.style.backgroundColor = '';
    sec.style.removeProperty('--grid-dot');
    sec.style.transition = prevTransition;
    releaseHeld();      // bg + grid + chrome are settled — NOW the content fades in
    onDone && onDone();
  }
  const swapTimer = setTimeout(doSwap, duration * contentAt);
  const doneTimer = setTimeout(finish, duration + 40);

  const t0 = performance.now();
  cancelAnimationFrame(raf);
  function frame(now) {
    if (finished) return;
    const rawT = clamp01((now - t0) / duration);
    let bg, grid;
    if (rawT < contentAt) {
      const p = easeCubic(rawT / contentAt);    // Phase A: current → estimated next palette
      bg = [mix(fromBg[0], estBg[0], p), mix(fromBg[1], estBg[1], p), mix(fromBg[2], estBg[2], p)];
      grid = [mix(fromGrid[0], estGrid[0], p), mix(fromGrid[1], estGrid[1], p), mix(fromGrid[2], estGrid[2], p)];
    } else {
      doSwap();
      const p = easeCubic((rawT - contentAt) / (1 - contentAt));
      bg = [mix(segBg[0], toBg[0], p), mix(segBg[1], toBg[1], p), mix(segBg[2], toBg[2], p)];
      grid = [mix(segGrid[0], toGrid[0], p), mix(segGrid[1], toGrid[1], p), mix(segGrid[2], toGrid[2], p)];
    }
    sec.style.backgroundColor = rgb(bg);
    sec.style.setProperty('--grid-dot', rgb(grid));
    if (rawT < 1) raf = requestAnimationFrame(frame);
    else { clearTimeout(doneTimer); clearTimeout(swapTimer); finish(); }
  }
  raf = requestAnimationFrame(frame);
}
