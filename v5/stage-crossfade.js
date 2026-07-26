/* stage-crossfade.js — the ONE transition for every stage change.
   ─────────────────────────────────────────────────────────────────────
   Principle: the interface is a single, stable space. The grid and every
   fixed element STAY EXACTLY IN PLACE — no move, scale, fade or rebuild.
   The only thing that animates between stages is the COLOUR LANGUAGE:
   the background and the grid colour (--grid-dot, which drives the grid
   dots and all the chrome that follows it) crossfade — a true per-frame
   colour interpolation — from the current stage's palette to the next
   stage's, in sync and at one rate.

   Only once the colour crossfade is ~done (contentAt) does the stage's own
   unique content swap in, via its EXISTING dedicated entry animation. The
   colour melt is what connects the stages, not the screens entering/leaving.
   Same mechanism for every pair, forwards and back. */

let raf = 0;
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

export function crossfadeStage({ sec, estimate, applyContent, duration = 900, contentAt = 0.85, onStart, onDone } = {}) {
  if (!sec) { try { applyContent && applyContent(); } catch (_) {} onDone && onDone(); return; }

  // FROM = what is on screen right now.
  const cs0 = getComputedStyle(sec);
  const fromBg = parse(cs0.backgroundColor);
  const fromGrid = parse(cs0.getPropertyValue('--grid-dot'));

  // The crossfade recolours the FIXED interface grid + chrome ONLY — never the
  // stage's own content. #middle-q-container holds that content (the central
  // element); pin its --grid-dot to its current colour so the EXITING content keeps
  // its own colours through the melt (it simply swaps out at contentAt) instead of
  // inheriting the recolouring meant for the fixed frame. (The symbol window lives
  // on <body>, already outside this scope and closed before the transition.)
  const mid = document.getElementById('middle-q-container');
  const midGridPin = mid ? getComputedStyle(mid).getPropertyValue('--grid-dot').trim() : '';
  if (mid && midGridPin) mid.style.setProperty('--grid-dot', midGridPin);

  // Phase-A target = a rough estimate of the next palette (the exact value is read
  // for real at the swap and corrected in phase B — see below — so the estimate need
  // not be perfect, only roughly the right direction).
  const estBg = estimate && estimate.bg ? parse(estimate.bg) : fromBg;
  const estGrid = estimate && estimate.grid ? parse(estimate.grid) : fromGrid;

  const prevTransition = sec.style.transition;
  sec.style.transition = 'none';   // we own the colours; no CSS transition may fight us
  onStart && onStart();

  let swapped = false, finished = false;
  let segBg = estBg, segGrid = estGrid;   // phase-B start (value held at contentAt)
  let toBg = estBg, toGrid = estGrid;     // phase-B target (real, read at the swap)

  // The content swap + completion are milestones that MUST happen even if rAF is
  // throttled/paused (kiosk browsers, unfocused tabs), so drive them off timers;
  // rAF only smooths the colour melt in between. This guarantees the transition
  // always completes instead of stalling with the content never swapping.
  function doSwap() {
    if (swapped) return;
    swapped = true;
    segBg = estBg.slice(); segGrid = estGrid.slice();
    try { applyContent && applyContent(); } catch (_) {}
    // Release the exiting-content colour pin so the NEW content takes the stage's
    // own colours (not the pinned old ones).
    const m2 = document.getElementById('middle-q-container');
    if (m2) m2.style.removeProperty('--grid-dot');
    const real = readResolvedPalette(sec);
    toBg = real.bg; toGrid = real.grid;
  }
  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    doSwap();                       // ensure the content is in even if we jumped straight here
    sec.style.backgroundColor = '';           // hand the colours back to the (matching) stage CSS
    sec.style.removeProperty('--grid-dot');
    sec.style.transition = prevTransition;
    onDone && onDone();
  }
  const swapTimer = setTimeout(doSwap, duration * contentAt);
  const doneTimer = setTimeout(finish, duration + 40);

  const t0 = performance.now();
  cancelAnimationFrame(raf);
  function frame(now) {
    if (finished) return;
    const t = clamp01((now - t0) / duration);
    let bg, grid;
    if (t < contentAt) {
      const p = t / contentAt;    // Phase A: current → estimated next palette
      bg = [mix(fromBg[0], estBg[0], p), mix(fromBg[1], estBg[1], p), mix(fromBg[2], estBg[2], p)];
      grid = [mix(fromGrid[0], estGrid[0], p), mix(fromGrid[1], estGrid[1], p), mix(fromGrid[2], estGrid[2], p)];
    } else {
      // At contentAt the previous content leaves and the next enters (its own anim);
      // then read the stage's REAL palette and finish the melt onto it — no jump,
      // even if the estimate was off or the stage is JS-tinted.
      doSwap();
      const p = (t - contentAt) / (1 - contentAt);
      bg = [mix(segBg[0], toBg[0], p), mix(segBg[1], toBg[1], p), mix(segBg[2], toBg[2], p)];
      grid = [mix(segGrid[0], toGrid[0], p), mix(segGrid[1], toGrid[1], p), mix(segGrid[2], toGrid[2], p)];
    }
    sec.style.backgroundColor = rgb(bg);
    sec.style.setProperty('--grid-dot', rgb(grid));
    if (t < 1) raf = requestAnimationFrame(frame);
    else { clearTimeout(doneTimer); clearTimeout(swapTimer); finish(); }
  }
  raf = requestAnimationFrame(frame);
}
