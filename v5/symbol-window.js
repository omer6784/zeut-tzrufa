/* symbol-window.js — the centred SYMBOL WINDOW on the touch/interface screen.
   ─────────────────────────────────────────────────────────────────────
   After the user makes their choice in a stage (and the 3D symbol starts
   building on the big DISPLAY screen), this window opens on the interface and
   presents that same symbol in 2D — as an animated dotted CONTOUR — together
   with its name, origin and meaning. A "המשך" button (dotted frame → orange on
   press) closes the window and continues to the next stage.

   The window's FORMAT is identical every stage. Only three things change:
     1. the symbol (swap the OBJ file),
     2. the text (name / origin / meaning),
     3. WHEN it opens (which click) — decided by the caller, per stage.

   Usage:
     import { openSymbolWindow, closeSymbolWindow } from './symbol-window.js';
     openSymbolWindow('hamsa', { onContinue: () => advance() });
*/
import { SYMBOL_INFO } from './symbol-info.js';
import { mountSymbolContour } from './symbol-contour.js';

/* Sound played each time the symbol window opens (a stage was completed). Served
   from the Vite public root (public/sounds/). Preloaded once and rewound before
   each play so rapid stage completions retrigger it cleanly. Autoplay is allowed
   because opening the window is driven by the user's button press. */
const symbolSound = typeof Audio !== 'undefined' ? new Audio('/sounds/symbolsound.mp3') : null;
if (symbolSound) symbolSound.preload = 'auto';
function playSymbolSound() {
  if (!symbolSound) return;
  try { symbolSound.currentTime = 0; symbolSound.play().catch(() => {}); } catch (_) {}
}

/* Motif key → OBJ file served from the Vite public root. Callers may override
   with opts.objPath for anything not listed here. */
const MOTIF_OBJ = {
  hamsa:  '/hamsa.obj',
  scarab: '/scarab.obj',
  eye:    '/eye.obj',
  rimon:  '/rimon.obj',
  fish:   '/fish.obj',
  lotus:    '/lotus.obj',
  dharma:   '/Dharma.obj',
  vegvisir: '/VEGVISIR.obj',
  pyramid:  '/pyramid.obj',
  anah:     '/anah.obj',
  djed:     '/djed.obj',
  artichoke: '/artichoke.obj',
  horseshoe: '/horseshoe.obj',
  spiral:    '/spiral.obj',
  moon:      '/moon.obj',
  tiltan:    '/tiltan.obj',
};

/* Per-motif contour overrides. Some OBJs are authored facing a side axis, so
   their frontal 2D silhouette needs a 90° turn (the lotus flower and the dharma
   wheel both face the X axis). Everything else reads correctly head-on. */
const MOTIF_CONTOUR = {
  lotus:  { rotateY: Math.PI / 2 },
  dharma: { rotateY: Math.PI / 2 },
};

let winEl = null;
let contourInstance = null;
let continueHandler = null;
let coverBg = null;          // explicit override for the expand-cover target colour (else read live)
let covering = false;        // true while the expand-cover animation owns the window teardown
let plainClose = false;      // skip the grow-cover; just fade the window out (next stage builds itself)

// The background the interface shows for the CURRENT stage. Read from the
// --stage-plate custom property (set per data-stage in geometric.css), which
// computes reliably — unlike #section-3's actual `background`, whose cascade is
// a tangle of competing !important rules that read back as cream for every
// stage. Falls back to the page colour if the property is somehow absent.
function effectiveStageBg() {
  const sec = document.getElementById('section-3');
  if (sec) {
    const plate = getComputedStyle(sec).getPropertyValue('--stage-plate').trim();
    if (plate) return plate;
  }
  return getComputedStyle(document.body).backgroundColor;
}

function ensureWindow() {
  if (winEl) return winEl;
  // Mount on <body>, NOT inside #section-3: section-3 is a stacking context
  // (position + z-index:1), so a window nested in it can never rise above the
  // on-screen keyboard (which lives on <body> at z-index 1000). On <body> the
  // window's z-index competes with the keyboard directly and wins.
  const host = document.body;
  winEl = document.createElement('div');
  winEl.id = 'symbol-window';
  winEl.innerHTML = `
    <div class="sw-frame" role="dialog" aria-modal="true">
      <div class="sw-symbol" aria-hidden="true"></div>
      <div class="sw-divider" aria-hidden="true"></div>
      <div class="sw-text">
        <div class="sw-field"><span class="sw-label">שם הסמל:</span><span class="sw-value sw-name"></span></div>
        <div class="sw-field"><span class="sw-label">מקור הסמל:</span><span class="sw-value sw-origin"></span></div>
        <div class="sw-field"><span class="sw-label">משמעות הסמל:</span><span class="sw-value sw-meaning"></span></div>
      </div>
      <div class="sw-actions">
        <button class="sw-restart" type="button">אתחול שלב</button>
        <button class="sw-continue" type="button">המשך</button>
      </div>
    </div>
    <div class="stage-grid sw-grid-overlay" aria-hidden="true"></div>`;
  host.appendChild(winEl);

  // "אתחול שלב" — moved here from the corner of the central rectangle. It reruns
  // the current stage: same action as the (now-hidden) corner button, so it just
  // closes the window and triggers that button rather than duplicating the reset
  // logic (which lives in questionnaire.js).
  const restartBtn = winEl.querySelector('.sw-restart');
  restartBtn.addEventListener('click', () => {
    if (winEl.classList.contains('is-covering')) return;   // continue is mid-flight
    restartBtn.classList.add('is-pressed');
    setTimeout(() => {
      closeSymbolWindow();
      document.getElementById('stage-restart-btn')?.click();
    }, 140);
  });

  const btn = winEl.querySelector('.sw-continue');
  const gridOverlay = winEl.querySelector('.sw-grid-overlay');
  const gridColorOf = (el) => el ? getComputedStyle(el).getPropertyValue('--grid-dot').trim() : '';
  btn.addEventListener('click', () => {
    if (covering) return;                      // guard double-press
    btn.classList.add('is-pressed');           // lock in the orange state
    const cb = continueHandler;
    // Plain close: no grow-cover. Fade the window out and build the next stage
    // underneath at the same time — it runs its own gradual entry (e.g. the
    // light-point stage assembling on the bare grid).
    if (plainClose) {
      setTimeout(() => {
        winEl.style.transition = 'opacity 0.55s ease';
        winEl.style.opacity = '0';
        if (cb) cb();                          // next stage assembles as the window fades
        setTimeout(() => {
          closeSymbolWindow();
          winEl.style.transition = ''; winEl.style.opacity = '';
        }, 580);
      }, 160);
      return;
    }
    const frame = winEl.querySelector('.sw-frame');
    const sec = document.getElementById('section-3');
    const startStage = sec ? sec.getAttribute('data-stage') : null;
    const srcGrid = sec ? sec.querySelector('.stage-grid') : null;
    covering = true;                           // protect this cover from external closeSymbolWindow
    winEl.classList.add('is-covering');

    // Keep the FIXED grid visible on top of the growing frame: clone the active
    // stage's grid lines into an overlay above it, starting at the CURRENT grid
    // colour. It recolours to the next stage's grid colour in step with the
    // frame's background (below), so the grid never disappears — it only morphs.
    if (srcGrid && gridOverlay) {
      gridOverlay.innerHTML = srcGrid.innerHTML;
      gridOverlay.style.setProperty('--grid-dot', gridColorOf(sec) || gridColorOf(srcGrid));
      gridOverlay.classList.add('is-shown');
    }
    // Beat so the orange press reads, then a ONE-WAY choreography:
    //   1. the frame grows to fill the screen (still its dark colour);
    //   2. once it reaches full size, its colour flips to the NEXT stage's bg;
    //   3. the window is hidden instantly (its colour already matches the stage
    //      built underneath) — the frame transition is disabled first so removing
    //      the cover classes never animates a collapse ("closes inward").
    // Recolour to the next stage's ACTUAL background, read live once that stage
    // has rendered (its data-stage differs), so orange/dark/cream stages each
    // match seamlessly. `coverBg` overrides; a cap stops us waiting forever when
    // the continue leads somewhere without a stage panel (e.g. finish).
    const finish = () => {
      frame.style.transition = 'none';             // 3. no collapse on reset
      winEl.style.transition = 'none';
      winEl.style.opacity = '0';                   //    hide instantly (seamless)
      covering = false;                            //    release: the real teardown may run now
      closeSymbolWindow();
      setTimeout(() => {
        frame.style.transition = '';
        winEl.style.transition = '';
        winEl.style.opacity = '';
      }, 30);
    };
    const recolour = (waited) => {
      const rendered = !sec || sec.getAttribute('data-stage') !== startStage;
      if (!rendered && waited < 500) { setTimeout(() => recolour(waited + 60), 60); return; }
      frame.style.setProperty('--sw-cover-bg', coverBg || effectiveStageBg());
      frame.classList.add('is-cover-color');         // 2. at end of growth → recolour to next bg
      // Morph the grid overlay to the next stage's grid colour, in step with bg.
      if (gridOverlay && gridOverlay.classList.contains('is-shown')) {
        const nextGrid = gridColorOf(sec);
        if (nextGrid) gridOverlay.style.setProperty('--grid-dot', nextGrid);
      }
      setTimeout(finish, 340);
    };
    setTimeout(() => {
      frame.classList.add('is-cover');                 // 1. expand (dark)
      setTimeout(() => { if (cb) cb(); }, 160);        //    build next stage under the cover
      setTimeout(() => recolour(0), 470);              // 2. once grown, recolour to the rendered stage
    }, 140);
  });
  return winEl;
}

/* Entry choreography, in order (same every stage):
     1. the frame scales up from the centre (CSS on .is-open),
     2. the dotted divider draws itself top→bottom,
     3. the symbol contour animates in (symbol-contour.js),
     4. the right-hand text types itself in (typewriter).                       */
let seqTimers = [];
let typeTimers = [];
let textRevealed = false;

function clearSeqTimers()  { seqTimers.forEach(clearTimeout);  seqTimers = [];  textRevealed = false; }
function clearTypeTimers() { typeTimers.forEach(clearTimeout); typeTimers = []; }

/** Type `text` into `el`, one character at a time. */
function typeInto(el, text, speed, done) {
  el.textContent = '';
  let i = 0;
  (function step() {
    el.textContent = text.slice(0, i);
    if (i < text.length) { i++; typeTimers.push(setTimeout(step, speed)); }
    else if (done) done();
  })();
}

/** Type a list of {el, text} pairs one after another (row after row). */
function typeSequence(pairs, i, speed) {
  if (i >= pairs.length) return;
  const { el, text } = pairs[i];
  typeInto(el, text, speed, () => {
    // Longer beat after a VALUE line (odd index) before the next label; short
    // beat between a label and its value.
    const gap = (i % 2 === 1) ? 280 : 110;
    typeTimers.push(setTimeout(() => typeSequence(pairs, i + 1, speed), gap));
  });
}

/** Reveal + type the fields in order: label → value, row after row. Guarded so
    the contour's onComplete and the safety fallback can't run it twice. */
function revealText(el, info) {
  if (textRevealed) return;
  textRevealed = true;
  const labels = el.querySelectorAll('.sw-label');
  const nameEl = el.querySelector('.sw-name');
  const originEl = el.querySelector('.sw-origin');
  const meaningEl = el.querySelector('.sw-meaning');
  const textEl = el.querySelector('.sw-text');

  const L = info._labels || ['שם הסמל:', 'מקור הסמל:', 'משמעות הסמל:'];
  const seq = [
    { el: labels[0], text: L[0] }, { el: nameEl,    text: info.name    || '' },
    { el: labels[1], text: L[1] }, { el: originEl,  text: info.origin  || '' },
    { el: labels[2], text: L[2] }, { el: meaningEl, text: info.meaning || '' },
  ];

  // Reserve the FINAL block height FIRST (fill everything, measure, then clear)
  // so the typewriter reveals in place and never drifts upward as lines fill in.
  textEl.style.minHeight = '';
  seq.forEach(({ el: sp, text }) => { sp.textContent = text; });
  textEl.style.minHeight = textEl.offsetHeight + 'px';
  seq.forEach(({ el: sp }) => { sp.textContent = ''; });

  textEl.classList.remove('sw-text-hidden');
  typeSequence(seq, 0, 46);   // title → content, row after row
}

/* ── Gematria mode ──────────────────────────────────────────────────────
   Instead of a symbol, the window can show the SAME dotted Moroccan floral
   frame that appears on the display (parallel), plus text about gematria. The
   frame geometry mirrors jewel-engine's buildOrnament: rosette flowers spaced
   around a straight 1:2 rectangle, remaining dots strung between them; EXACTLY
   `N` dots (N = the name's gematria). */
const _TAU = Math.PI * 2;
// Identical geometry to jewel-engine's buildOrnament: a 900×1800 frame
// (hw 450, hh 900), rosette flowers (r1 15, r2 27) around it, remaining dots on
// the straight edges. Returned in that same coordinate space so the window frame
// is drawn at the SAME proportions as the display (only scaled to fit the slot).
const ORN_HW = 450, ORN_HH = 900, ORN_R1 = 15, ORN_R2 = 27, ORN_DOT = 4.4;
function buildOrnamentDots(N) {
  const dots = [];
  N = Math.max(0, N | 0);
  const rectAt = t => {
    const W = 2 * ORN_HW, H = 2 * ORN_HH, per = 2 * (W + H); let d = (((t % 1) + 1) % 1) * per;
    if (d < W) return { x: -ORN_HW + d, y: -ORN_HH }; d -= W;
    if (d < H) return { x: ORN_HW, y: -ORN_HH + d }; d -= H;
    if (d < W) return { x: ORN_HW - d, y: ORN_HH }; d -= W;
    return { x: -ORN_HW, y: ORN_HH - d };
  };
  const addFlower = (cx, cy) => {
    dots.push({ x: cx, y: cy });
    for (let k = 0; k < 8; k++) { const a = k / 8 * _TAU; dots.push({ x: cx + Math.cos(a) * ORN_R1, y: cy + Math.sin(a) * ORN_R1 }); }
    for (let k = 0; k < 8; k++) { const a = (k / 8 + 0.0625) * _TAU; dots.push({ x: cx + Math.cos(a) * ORN_R2, y: cy + Math.sin(a) * ORN_R2 }); }
  };
  if (N < 20) { for (let i = 0; i < N; i++) { const a = i / N * _TAU; dots.push({ x: Math.cos(a) * 120, y: Math.sin(a) * 120 }); } return dots; }
  const PER = 17; let F = Math.max(4, Math.round(N * 0.45 / PER));
  while (PER * F > N - F && F > 1) F--;
  const conn = N - PER * F;
  for (let i = 0; i < F; i++) { const p = rectAt(i / F); addFlower(p.x, p.y); }
  const base = Math.floor(conn / F); let extra = conn - base * F;
  for (let i = 0; i < F; i++) {
    const cnt = base + (extra-- > 0 ? 1 : 0), tA = i / F, tB = (i + 1) / F;
    for (let j = 1; j <= cnt; j++) { const f = j / (cnt + 1), p = rectAt(tA + (tB - tA) * f); dots.push({ x: p.x, y: p.y }); }
  }
  return dots;
}
function mountGematriaOrnament(host, N) {
  // Fixed intrinsic size like the symbol contour (1000×1000, no inline CSS) so
  // the window's own CSS scales it — sidesteps the canvas-in-flex feedback.
  const S = 1000;
  const cv = document.createElement('canvas');
  cv.className = 'sw-ornament-canvas';
  cv.width = S; cv.height = S;
  host.appendChild(cv);
  const ctx = cv.getContext('2d');
  const dots = buildOrnamentDots(N);
  // Fit the full frame (incl. flower petals) into the canvas with margin; the dot
  // radius scales with it so the dot-to-frame ratio matches the display exactly.
  const frameH = 2 * (ORN_HH + ORN_R2);
  const scale = (S * 0.9) / frameH;
  const r = ORN_DOT * scale;
  ctx.fillStyle = '#e2bc71';   // gold, matching the display ornament
  ctx.beginPath();
  for (const d of dots) { const x = S / 2 + d.x * scale, y = S / 2 + d.y * scale; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, _TAU); }
  ctx.fill();
  return { remove() { try { cv.remove(); } catch (_) {} } };
}
function gematriaInfo(g) {
  const v = g.value | 0;
  return {
    _labels: ['השם שלך:', 'ערך הגימטריה:', 'גימטריה ביהדות:'],
    name: g.name || '',
    origin: String(v),
    meaning: 'בגימטריה כל אות עברית נושאת ערך מספרי, וסכום ערכי אותיות השם חושף רובד נסתר של משמעות. מסורת הקבלה רואה במספר השם מפתח למהות ולגורל. מן המספר שלך נבנתה מסגרת הנקודות שסביב התכשיט.',
  };
}

/** Open the window for a symbol (by motif key).
    opts.objPath — override the OBJ file; opts.onContinue — called on המשך.
    opts.gematria = { value, name } — show the dotted ornament + gematria text
    instead of a symbol. */
export function openSymbolWindow(motif, opts = {}) {
  const info = opts.gematria ? gematriaInfo(opts.gematria) : (SYMBOL_INFO[motif] || {});
  const objPath = opts.objPath || MOTIF_OBJ[motif];
  const el = ensureWindow();

  clearSeqTimers();
  clearTypeTimers();

  // Text starts empty + hidden; labels AND values type in after the symbol draws.
  el.querySelectorAll('.sw-label').forEach(l => { l.textContent = ''; });
  el.querySelector('.sw-name').textContent    = '';
  el.querySelector('.sw-origin').textContent  = '';
  el.querySelector('.sw-meaning').textContent = '';
  el.querySelector('.sw-text').classList.add('sw-text-hidden');

  // Divider starts undrawn (clipped away); it wipes in top→bottom. Reset to the
  // hidden state INSTANTLY (suppress its clip-path transition + force a reflow),
  // so the draw-in replays cleanly on EVERY window — not just the first one.
  // Without this, re-opening lets the previous "drawn" state animate BACK up and
  // the next draw-in starts from a half-finished retract.
  const divider = el.querySelector('.sw-divider');
  divider.classList.remove('is-drawn');
  divider.style.transition = 'none';
  void divider.offsetWidth;            // reflow → apply the hidden clip now
  divider.style.transition = '';       // restore the CSS transition for the draw-in

  const btn = el.querySelector('.sw-continue');
  btn.classList.remove('is-pressed');
  el.querySelector('.sw-restart')?.classList.remove('is-pressed');
  continueHandler = opts.onContinue || null;
  coverBg = opts.nextBg || null;
  plainClose = !!opts.plainClose;      // fade-out instead of grow-cover (next stage self-builds)
  covering = false;                    // fresh window → no cover in flight

  const symbolHost = el.querySelector('.sw-symbol');
  if (contourInstance) { try { contourInstance.remove(); } catch (_) {} contourInstance = null; }
  symbolHost.innerHTML = '';

  // 1. Open — the frame scales up from the centre (CSS).
  el.classList.add('is-open');

  // Hide the stage's gold dots (both the clickable layer and the decorative
  // float layer) while the window is up — otherwise they peek through the
  // transparent margins around the frame and read as stray "glow".
  ['s2-dots-container', 'stage2-float-dots'].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.style.visibility = 'hidden';
  });

  // 2. Divider draws top→bottom.
  seqTimers.push(setTimeout(() => divider.classList.add('is-drawn'), 320));

  // Sound starts a touch AFTER the contour mounts, so it lands with the symbol
  // visibly beginning to draw (not the instant the mount is scheduled).
  seqTimers.push(setTimeout(playSymbolSound, 1150));

  // 3. Then the symbol contour animates in; 4. its completion types the text.
  seqTimers.push(setTimeout(() => {
    if (opts.gematria) {                 // gematria mode → the dotted ornament frame
      contourInstance = mountGematriaOrnament(symbolHost, opts.gematria.value);
      revealText(el, info);
    } else {
      const contourOpts = Object.assign({}, MOTIF_CONTOUR[motif], opts.contour, { onComplete: () => revealText(el, info) });
      if (objPath) contourInstance = mountSymbolContour(symbolHost, objPath, contourOpts);
      else revealText(el, info);         // no symbol (e.g. background stage) → still show text
    }
  }, 900));

  // Safety: never leave the text stuck blank if onComplete never fires.
  seqTimers.push(setTimeout(() => revealText(el, info), 5000));

  return el;
}

/** Close the window and tear down its p5 contour instance. */
export function closeSymbolWindow() {
  // While the expand-cover animation is running, its own choreography owns the
  // teardown (it clears `covering` right before its final close). Ignore other
  // callers — notably transitionQuestion(), fired by onContinue to build the
  // next stage under the cover — so they can't snap the growing frame shut.
  if (covering) return;
  if (!winEl) return;
  clearSeqTimers();
  clearTypeTimers();
  winEl.classList.remove('is-open', 'is-covering');
  const frame = winEl.querySelector('.sw-frame');
  if (frame) { frame.classList.remove('is-cover', 'is-cover-color'); frame.style.removeProperty('--sw-cover-bg'); }
  const contBtn = winEl.querySelector('.sw-continue');
  if (contBtn) contBtn.classList.remove('is-pressed');
  const gridOverlay = winEl.querySelector('.sw-grid-overlay');
  if (gridOverlay) { gridOverlay.classList.remove('is-shown'); gridOverlay.innerHTML = ''; gridOverlay.style.removeProperty('--grid-dot'); }
  ['s2-dots-container', 'stage2-float-dots'].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.style.visibility = '';
  });
  if (contourInstance) { try { contourInstance.remove(); } catch (_) {} contourInstance = null; }
  const symbolHost = winEl.querySelector('.sw-symbol');
  if (symbolHost) symbolHost.innerHTML = '';
  continueHandler = null;
}
