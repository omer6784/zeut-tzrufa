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

const TILES = [
  { rgb: [255, 80, 3],    hex: '#ff5003', anim: 'pulse'   }, // orange
  { rgb: [226, 188, 113], hex: '#e2bc71', anim: 'squares' }, // gold
  { rgb: [245, 245, 237], hex: '#f5f5ed', anim: 'vortex'  }, // cream
  // The dark option is INVERTED: #282828 dots on a cream panel, so the dominant
  // colour (#282828) itself is what you see — clearly the dark choice.
  { rgb: [40, 40, 40],    hex: '#282828', anim: 'diamond', invert: true },
];
const TILE_BG  = [22, 22, 22];      // near-black panel (the coloured-dot tiles)
const CREAM_BG = [240, 236, 228];   // cream panel for the inverted (#282828) tile
const GRID_DOT = '245,245,237';     // cream — the grid colour on the dark plate
const GRID_R = 0.8, GRID_PITCH = 5.5; // match the fixed interface grid (Ø1.6 / 5.5)
const LOCK_DUR = 0.55;
const TAU = Math.PI * 2;

import { getGhostHand } from './demo-hand.js';

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

export function mountCalibration(host, { onFreeze, onLock, hint: hintText = 'בחרו את התדר איתו תרצו להיכנס לתהליך היצירה' } = {}) {
  if (!host) return () => {};
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

  const canvas = document.createElement('canvas');
  canvas.className = 'calib-canvas';
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const hint = document.createElement('div');
  hint.className = 'calib-hint';
  hint.textContent = hintText;
  host.appendChild(hint);

  // "המשך" confirm button — grows in next to the cue once a frequency is picked;
  // fills orange on press (same graphic language as the symbol-window button).
  const cont = document.createElement('button');
  cont.type = 'button';
  cont.className = 'calib-continue';
  cont.textContent = 'המשך';
  host.appendChild(cont);

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
  let W = 0, H = 0, big = null, thumbs = [], vLineX = 0, hLineY = 0, colX = 0, thumbDivs = [], gridBig = null, gridThumb = null;
  function layout() {
    const rect = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    hLineY = 76;                       // horizontal rule below the cue + "המשך" button
    const mainY = hLineY + 12;         // top of the master/detail area
    const colW = Math.max(170, Math.min(300, W * 0.24));
    const vGap = 14;
    colX = W - colW;
    vLineX = colX - vGap / 2;
    big = { x: 0, y: mainY, w: colX - vGap, h: H - mainY };

    const n = TILES.length, hGap = 12;
    const th = (H - mainY - (n - 1) * hGap) / n;
    thumbs = TILES.map((_, i) => ({ x: colX, y: mainY + i * (th + hGap), w: colW, h: th }));
    thumbDivs = [];
    for (let i = 1; i < n; i++) thumbDivs.push(mainY + i * (th + hGap) - hGap / 2);

    gridBig = makeGrid(big.w, big.h);
    gridThumb = makeGrid(colW, th);
  }
  layout();

  // ── State ──
  let t = 0, last = performance.now(), raf = 0;
  let active = -1, committed = false, lockT = 0, lockFired = false;   // -1 = nothing picked (left empty)
  let demoToken = 0;

  const LEVELS = 8;
  function drawField(rect, grid, tile, alpha) {
    if (alpha <= 0.001) return;
    const field = FIELD[tile.anim], isTunnel = tile.anim === 'tunnel';
    const panel = tile.invert ? CREAM_BG : TILE_BG;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgb(${panel[0]},${panel[1]},${panel[2]})`;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    const buckets = Array.from({ length: LEVELS }, () => []);
    for (const p of grid.pts) {
      const b = clamp01(field(p.nx, p.ny, t));
      buckets[Math.min(LEVELS - 1, (b * LEVELS) | 0)].push(p);
    }
    for (let lv = 0; lv < LEVELS; lv++) {
      const items = buckets[lv];
      if (!items.length) continue;
      const b = (lv + 0.5) / LEVELS;
      ctx.globalAlpha = alpha * (0.18 + 0.82 * b);
      ctx.fillStyle = `rgb(${tile.rgb[0]},${tile.rgb[1]},${tile.rgb[2]})`;
      ctx.beginPath();
      for (const p of items) {
        let r = grid.maxR * (0.14 + 0.86 * b);
        if (isTunnel) r *= (0.35 + 0.65 * Math.hypot(p.nx, p.ny));
        const cx = rect.x + p.fx * rect.w, cy = rect.y + p.fy * rect.h;
        ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, TAU);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
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
    // Large detail view — only once a frequency is picked (empty left before that).
    if (active >= 0) drawField(big, gridBig, TILES[active], 1);
    // Right column — the picked one full, the rest a touch dimmer.
    for (let i = 0; i < thumbs.length; i++) drawField(thumbs[i], gridThumb, TILES[i], i === active ? 1 : 0.62);

    // Dotted rules (contained in the rectangle).
    dottedH(0, W, hLineY);              // under the cue
    dottedV(vLineX, big.y, H);          // between the big view and the column
    for (const y of thumbDivs) dottedH(colX, W, y);   // between the four squares
  }

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    t += dt;
    if (committed) {
      lockT += dt;
      if (!lockFired && lockT >= LOCK_DUR) { lockFired = true; onLock && onLock(TILES[active].hex); }
    }
    draw();
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  function inRect(r, x, y) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
  function updateContinue() { cont.classList.toggle('is-shown', active >= 0 && !committed); }

  function commit() {
    if (committed || active < 0) return;
    committed = true; lockT = 0; lockFired = false;
    hint.classList.add('is-hidden');
    cont.classList.remove('is-shown');
    cont.classList.add('is-pressed');            // fills orange
    onFreeze && onFreeze(TILES[active].hex);
  }

  // Tap a square in the column → it shows large on the left + "המשך" grows in.
  function onDown(e) {
    stopDemo();                                   // any real touch ends the demo
    if (committed) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    for (let i = 0; i < thumbs.length; i++) {
      if (inRect(thumbs[i], x, y)) { e.preventDefault(); active = i; updateContinue(); return; }
    }
  }
  host.addEventListener('pointerdown', onDown);
  cont.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); stopDemo(); commit(); });

  const onResize = () => layout();
  window.addEventListener('resize', onResize);

  // ── Auto "ghost hand" demo: empty → tap the orange square → it appears large
  //    → tap "המשך". Plays ONCE, 2s after the stage is actually on screen. ──
  function tileCenter(i) { const r = canvas.getBoundingClientRect(); const rc = thumbs[i]; return { x: r.left + rc.x + rc.w / 2, y: r.top + rc.y + rc.h / 2 }; }
  function contCenter() { const r = cont.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function stopDemo() { demoToken++; try { getGhostHand().hide(); } catch (_) {} }
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
    await gh.sleep(2000);                          // let the visitor settle in first
    if (my !== demoToken || committed) return;
    gh.show('light');
    active = -1; updateContinue();
    await gh.sleep(250); if (my !== demoToken) return gh.hide();
    let p = tileCenter(0); gh.move(p.x, p.y); await gh.sleep(850); if (my !== demoToken) return gh.hide();
    await gh.tap();
    active = 0; updateContinue();                  // orange appears large + "המשך" grows in
    await gh.sleep(850); if (my !== demoToken) return gh.hide();
    p = contCenter(); gh.move(p.x, p.y); await gh.sleep(850); if (my !== demoToken) return gh.hide();
    await gh.tap();
    await gh.sleep(550);
    gh.hide();
    // Reset to the clean empty state so the visitor makes their own choice.
    if (my === demoToken && !committed) { active = -1; updateContinue(); }
  }
  runDemo();

  function teardown() {
    stopDemo();
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    host.removeEventListener('pointerdown', onDown);
    try { canvas.remove(); } catch (_) {}
    try { hint.remove(); } catch (_) {}
    try { cont.remove(); } catch (_) {}
  }

  return { teardown };
}
