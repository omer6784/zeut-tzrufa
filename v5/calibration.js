/* calibration.js — Stage 01: frequency calibration (touch), dark theme.
   ─────────────────────────────────────────────────────────────────────
   Master–detail layout inside the central rectangle:
     · a standing cue at the top, with a horizontal dotted rule beneath it;
     · a COLUMN of four small frequency squares on the RIGHT — each an animated
       dot-field in an interface colour, separated by the interface's dotted
       grid (horizontal rules between them);
     · a dotted VERTICAL rule to the left of the column;
     · the LEFT part of the rectangle shows the currently-picked frequency LARGE.
   Tap a square in the column → it previews LARGE on the left. Tap the large
   view → that colour locks in as the display background (onLock). Every dotted
   rule matches the fixed interface grid (Ø1.6px / 5.5px pitch) and stays inside
   the rectangle. Each frequency owns one interface colour:
     orange · gold · cream · charcoal (drawn in cream, saved as #282828). */

// Order is LEFT→RIGHT on screen, so the row reads (right→left): orange, gold,
// cream, dark — i.e. dark is leftmost, orange rightmost.
const TILES = [
  // The dark option: ALMOST-BLACK dots on the same #282828 panel (a quiet, deep
  // field). The locked/saved colour is still #282828 (hex), the dark choice.
  { rgb: [10, 10, 10],    hex: '#282828', anim: 'diamond', invert: true }, // dark  (leftmost)
  { rgb: [245, 245, 237], hex: '#f5f5ed', anim: 'vortex'  }, // cream
  { rgb: [226, 188, 113], hex: '#e2bc71', anim: 'squares' }, // gold
  { rgb: [255, 80, 3],    hex: '#ff5003', anim: 'pulse'   }, // orange (rightmost)
];
const TILE_BG  = [40, 40, 40];      // #282828 panel (the coloured-dot tiles)
const GRID_DOT = '245,245,237';     // cream — the grid colour on the dark plate
const GRID_R = 0.8, GRID_PITCH = 5.5; // match the fixed interface grid (Ø1.6 / 5.5)
const LOCK_DUR = 0.7;   // commit → grow the picked frequency → hand off to the globe
const TAU = Math.PI * 2;

import { getGhostHand, lockInput, unlockInput } from './demo-hand.js';

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const FIELD = {
  pulse:   (nx, ny, t) => (0.5 + 0.5 * Math.sin(Math.hypot(nx, ny) * 9 - t * 2.4)) * smooth(0.12, 0.30, Math.hypot(nx, ny)),
  squares: (nx, ny, t) => 0.5 + 0.5 * Math.sin(Math.max(Math.abs(nx), Math.abs(ny)) * 11 - t * 2.0),
  vortex:  (nx, ny, t) => (0.5 + 0.5 * Math.sin(Math.hypot(nx, ny) * 8 + Math.atan2(ny, nx) * 4 - t * 2.6)) * smooth(0.0, 0.14, Math.hypot(nx, ny)),
  tunnel:  (nx, ny, t) => 0.5 + 0.5 * Math.sin(Math.hypot(nx, ny) * 13 - t * 3.2),
  // Concentric diamonds (Manhattan distance) — same halftone family as the
  // others (radial / squares / spiral), just a distinct fourth shape.
  diamond: (nx, ny, t) => 0.5 + 0.5 * Math.sin((Math.abs(nx) + Math.abs(ny)) * 9 - t * 2.2),
};

export function mountCalibration(host, { onFreeze, onLock, cont } = {}) {
  if (!host) return () => {};
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

  const canvas = document.createElement('canvas');
  canvas.className = 'calib-canvas';
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // `cont` is the SHARED bottom-band button (questionnaire.js). The frequency
  // stage drives it directly: dimmed until a frequency is picked, fills orange
  // on commit, and the ghost-hand demo taps it — same as every other stage.

  // A dot-grid template for a rect of the given size (uniform pitch → round dots;
  // pattern coords normalise by the SHORT side so the fields stay circular).
  function makeGrid(w, h) {
    const rows = Math.max(8, Math.min(34, Math.round(h / 14)));
    const pitch = h / rows;
    const cols = Math.max(2, Math.round(w / pitch));
    const half = Math.min(w, h) / 2;
    const pts = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const fx = (i + 0.5) / cols, fy = (j + 0.5) / rows;
        pts.push({ fx, fy, nx: (fx * w - w / 2) / half, ny: (fy * h - h / 2) / half });
      }
    }
    return { pts, maxR: pitch * 0.46 };
  }

  // ── Layout (rebuilt on resize) ──
  let W = 0, H = 0, big = null, thumbs = [], vLineX = 0, colX = 0, thumbDivs = [], gridBig = null, gridThumb = null, rowDivY = 0;
  function layout() {
    const rect = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // ONE light gap used everywhere — between the squares, between them and the
    // big view, and as the inset from the surrounding grid (all sides equal).
    const g = 14;
    // Start the content lower so the top-right instruction text (.sb-note, ~20px
    // below the top grid line) stays visible — the squares/big view no longer
    // paint over it. This also shortens every element (smaller big view + tiles).
    const mainY = 58;                  // top inset that clears the instruction line
    const botY = H - g;                // live in the shared bottom band below it
    const n = TILES.length;
    // Four frequency squares in a ROW along the bottom; the big selected view
    // fills the full width above them.
    const tw0 = (W - 2 * g - (n - 1) * g) / n;            // full cell width
    const rowH0 = Math.min(tw0, (botY - mainY) * 0.32);   // full row height
    const rowY = botY - rowH0;
    // The big preview, the thumbnail row AND the dotted divider above them all share
    // ONE shrunk width Wt (≈0.9 of the inset width), centred — so their left/right
    // edges line up exactly.
    const SH = 0.9;
    const Wt = (W - 2 * g) * SH;
    const x0 = (W - Wt) / 2;
    const bigH = rowY - g - mainY;
    big = { x: x0, y: mainY + bigH * (1 - SH) / 2, w: Wt, h: bigH * SH };

    const tw = (Wt - (n - 1) * g) / n;                    // thumb width so the row fills Wt
    const rowH = rowH0 * SH;
    thumbs = TILES.map((_, i) => ({ x: x0 + i * (tw + g), y: rowY + (rowH0 - rowH) / 2, w: tw, h: rowH }));
    rowDivY = rowY - g / 2;                                // horizontal rule between big view and the row (spans Wt)
    thumbDivs = [];                                        // vertical rules between the four squares
    for (let i = 1; i < n; i++) thumbDivs.push(x0 + i * (tw + g) - g / 2);

    gridBig = makeGrid(big.w, big.h);
    gridThumb = makeGrid(thumbs[0].w, thumbs[0].h);
  }
  layout();

  // ── State ──
  let t = 0, last = performance.now(), raf = 0;
  let active = -1, committed = false, lockT = 0, lockFired = false;   // -1 = nothing picked (left empty)
  let demoToken = 0;
  let selAt = -1, selIdx = -1;        // time + index of the last pick (drives the tap cue)

  const LEVELS = 8;
  function drawField(tctx, rect, grid, tile, alpha) {
    if (alpha <= 0.001) return;
    const field = FIELD[tile.anim], isTunnel = tile.anim === 'tunnel';
    const panel = TILE_BG;   // every tile (incl. the dark one) on the #282828 panel
    tctx.globalAlpha = alpha;
    tctx.fillStyle = `rgb(${panel[0]},${panel[1]},${panel[2]})`;
    tctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    const buckets = Array.from({ length: LEVELS }, () => []);
    for (const p of grid.pts) {
      const b = clamp01(field(p.nx, p.ny, t));
      buckets[Math.min(LEVELS - 1, (b * LEVELS) | 0)].push(p);
    }
    for (let lv = 0; lv < LEVELS; lv++) {
      const items = buckets[lv];
      if (!items.length) continue;
      const b = (lv + 0.5) / LEVELS;
      tctx.globalAlpha = alpha * (0.18 + 0.82 * b);
      tctx.fillStyle = `rgb(${tile.rgb[0]},${tile.rgb[1]},${tile.rgb[2]})`;
      tctx.beginPath();
      for (const p of items) {
        let r = grid.maxR * (0.14 + 0.86 * b);
        if (isTunnel) r *= (0.35 + 0.65 * Math.hypot(p.nx, p.ny));
        const cx = rect.x + p.fx * rect.w, cy = rect.y + p.fy * rect.h;
        tctx.moveTo(cx + r, cy); tctx.arc(cx, cy, r, 0, TAU);
      }
      tctx.fill();
    }
    tctx.globalAlpha = 1;
  }

  // Dotted rules matching the fixed interface grid.
  function dottedH(x0, x1, y) {
    ctx.fillStyle = `rgb(${GRID_DOT})`;
    ctx.beginPath();
    for (let x = x0 + GRID_PITCH / 2; x <= x1; x += GRID_PITCH) { ctx.moveTo(x + GRID_R, y); ctx.arc(x, y, GRID_R, 0, TAU); }
    ctx.fill();
  }
  function dottedV(x, y0, y1) {
    ctx.fillStyle = `rgb(${GRID_DOT})`;
    ctx.beginPath();
    for (let y = y0 + GRID_PITCH / 2; y <= y1; y += GRID_PITCH) { ctx.moveTo(x + GRID_R, y); ctx.arc(x, y, GRID_R, 0, TAU); }
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const selAge = selAt >= 0 ? t - selAt : 999;
    // On commit the picked frequency GROWS/zooms to fill the frame — the visual
    // hand-off into the globe stage.
    const growP = committed ? smooth(0, 1, lockT / LOCK_DUR) : 0;

    // Large detail view — only once a frequency is picked (empty left before that).
    // On commit the GROW is handled by a full-screen overlay (drawGrow below); the
    // confined canvas keeps painting the big view so the overlay starts seamlessly.
    if (active >= 0) {
      drawField(ctx, big, gridBig, TILES[active], committed ? 1 : smooth(0, 0.45, selAge));
    }

    // Right column + dotted rules — fade out as the grow takes over.
    const chromeA = 1 - growP;
    if (chromeA > 0.01) {
      for (let i = 0; i < thumbs.length; i++) drawField(ctx, thumbs[i], gridThumb, TILES[i], (i === active ? 1 : 0.62) * chromeA);
      ctx.globalAlpha = chromeA;
      dottedH(big.x, big.x + big.w, rowDivY);                  // between the big view and the row
      const rowH = thumbs.length ? thumbs[0].h : 0;
      const rowY = thumbs.length ? thumbs[0].y : 0;
      for (const x of thumbDivs) dottedV(x, rowY, rowY + rowH);// between the four squares
      ctx.globalAlpha = 1;
    }

    // Tap cue: a ring pulses out from the square you just picked (contrasting
    // colour so it reads on both the dark tiles and the cream 4th one).
    if (!committed && selIdx >= 0 && selAge < 0.62) {
      const rc = thumbs[selIdx];
      const cx = rc.x + rc.w / 2, cy = rc.y + rc.h / 2;
      const p = selAge / 0.62;                               // 0 → 1
      const ring = '245,245,237';   // cream ring reads on every #282828 panel
      ctx.save();
      ctx.strokeStyle = `rgba(${ring},${(1 - p) * 0.85})`;
      ctx.lineWidth = 1 + 2.2 * (1 - p);
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(rc.w, rc.h) * (0.18 + 0.42 * p), 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── Full-screen grow overlay ──────────────────────────────────────────────
  // On commit, the chosen frequency grows out of the big view to cover the WHOLE
  // screen (not just the content rectangle). A separate fixed, full-viewport
  // canvas above everything renders the same field, scaling from the big view's
  // on-screen rect until it covers the viewport — the hand-off into the globe.
  let growCanvas = null, gctx = null, growBig = null, growCover = 1;
  function startFullscreenGrow() {
    const hostRect = host.getBoundingClientRect();
    growCanvas = document.createElement('canvas');
    growCanvas.className = 'calib-grow-overlay';
    growCanvas.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:9999;pointer-events:none;';
    document.body.appendChild(growCanvas);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    growCanvas.width = Math.round(innerWidth * dpr);
    growCanvas.height = Math.round(innerHeight * dpr);
    gctx = growCanvas.getContext('2d');
    gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // The big view's rect in SCREEN coordinates (overlay is pinned at 0,0).
    growBig = { x: hostRect.left + big.x, y: hostRect.top + big.y, w: big.w, h: big.h };
    const cx = growBig.x + growBig.w / 2, cy = growBig.y + growBig.h / 2;
    const needW = 2 * Math.max(cx, innerWidth - cx);
    const needH = 2 * Math.max(cy, innerHeight - cy);
    growCover = Math.max(needW / growBig.w, needH / growBig.h) * 1.06;   // enough to fully cover
  }
  function drawGrow(growP) {
    if (!gctx || active < 0) return;
    gctx.clearRect(0, 0, innerWidth, innerHeight);
    const scale = 1 + growP * (growCover - 1);
    const cx = growBig.x + growBig.w / 2, cy = growBig.y + growBig.h / 2;
    gctx.save();
    gctx.translate(cx, cy); gctx.scale(scale, scale); gctx.translate(-cx, -cy);
    drawField(gctx, growBig, gridBig, TILES[active], 1);
    gctx.restore();
  }

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    t += dt;
    if (committed) {
      lockT += dt;
      if (!lockFired && lockT >= LOCK_DUR) { lockFired = true; onLock && onLock(TILES[active].hex); }
    }
    draw();
    if (committed && gctx) drawGrow(smooth(0, 1, lockT / LOCK_DUR));
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  function inRect(r, x, y) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
  // Pick a frequency: fire the tap cue (ripple + big-view fade-in) and enable "המשך".
  function select(i) { active = i; selIdx = i; selAt = t; updateContinue(); }
  // The shared "המשך" button is dimmed/greyed (unusable) until a frequency is
  // picked, cream + clickable once one is.
  function updateContinue() {
    if (committed || !cont) return;
    cont.classList.toggle('is-disabled', active < 0);
  }

  function commit() {
    if (committed || active < 0) return;
    committed = true; lockT = 0; lockFired = false;
    stopDemo();
    if (cont) { cont.classList.remove('is-disabled'); cont.classList.add('is-pressed'); }  // fills orange
    onFreeze && onFreeze(TILES[active].hex);
    startFullscreenGrow();   // the picked frequency grows to cover the whole screen
  }

  // Tap a square in the column → it shows large on the left + "המשך" grows in.
  function onDown(e) {
    stopDemo();                                   // any real touch ends the demo
    if (committed) return;
    const r = canvas.getBoundingClientRect();
    // The thumbnails are laid out in getBoundingClientRect (displayed-px) space —
    // W = rect.width — so the pointer offset in that same space is client − rect,
    // no extra scaling (the letterbox scale is already baked into rect).
    const x = e.clientX - r.left, y = e.clientY - r.top;
    for (let i = 0; i < thumbs.length; i++) {
      if (inRect(thumbs[i], x, y)) { e.preventDefault(); select(i); return; }
    }
  }
  host.addEventListener('pointerdown', onDown);
  // The shared band button's click is wired by questionnaire.js → calib.commit().

  const onResize = () => layout();
  window.addEventListener('resize', onResize);

  updateContinue();                                // button present (dimmed) from the start

  // ── Auto "ghost hand" demo: empty → tap the orange square → it appears large
  //    → tap "המשך". Plays ONCE, 1.5s after the stage is actually on screen. ──
  function tileCenter(i) { const r = canvas.getBoundingClientRect(); const rc = thumbs[i]; return { x: r.left + rc.x + rc.w / 2, y: r.top + rc.y + rc.h / 2 }; }
  function contCenter() { const r = (cont || canvas).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function stopDemo() { demoToken++; try { getGhostHand().hide(); } catch (_) {} unlockInput(); }
  // Calibration is pre-mounted while the intro is still up (its host sits inside a
  // faded-out section), so gate the demo on the stage being genuinely visible.
  function stageVisible() {
    let n = host;
    while (n && n !== document.body) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
      n = n.parentElement;
    }
    return host.getBoundingClientRect().width > 0;
  }
  async function runDemo() {
    const my = ++demoToken;
    const gh = getGhostHand();
    while (my === demoToken && !committed && !stageVisible()) await gh.sleep(200);
    if (my !== demoToken || committed) return;
    await gh.sleep(1500);                          // let the visitor settle in first
    if (my !== demoToken || committed) return;
    lockInput();                                   // block visitor input until the demo finishes
    try {
      active = -1; updateContinue();
      // Glide the hand IN from below the frame (outside → in), never a sudden pop.
      const demoIdx = TILES.length - 1;            // the ORANGE tile (rightmost)
      let p = tileCenter(demoIdx);
      gh.place(p.x + 24, (window.innerHeight || H) + 60);
      gh.show('light');
      await gh.sleep(90); if (my !== demoToken) return gh.hide();
      gh.move(p.x, p.y);                           // slides up onto the orange square
      await gh.sleep(820); if (my !== demoToken) return gh.hide();
      await gh.tap();
      select(demoIdx);                             // orange appears large + selection cue + "המשך" enables
      await gh.sleep(850); if (my !== demoToken) return gh.hide();
      p = contCenter(); gh.move(p.x, p.y); await gh.sleep(850); if (my !== demoToken) return gh.hide();
      if (cont) cont.classList.add('is-pressed');  // the button lights ORANGE, like a real press
      await gh.tap();
      await gh.sleep(550);
      gh.hide();
      // Reset to the clean empty state so the visitor makes their own choice.
      if (cont) cont.classList.remove('is-pressed');
      if (my === demoToken && !committed) { active = -1; updateContinue(); }
    } finally {
      unlockInput();
    }
  }
  runDemo();

  function teardown() {
    stopDemo();
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    host.removeEventListener('pointerdown', onDown);
    try { canvas.remove(); } catch (_) {}
    try { if (growCanvas) growCanvas.remove(); } catch (_) {}
    // Leave the shared band button as-is (owned by questionnaire.js); just clear
    // any transient state it carried for this stage.
    if (cont) cont.classList.remove('is-pressed', 'is-disabled');
  }

  return { teardown, commit };
}
