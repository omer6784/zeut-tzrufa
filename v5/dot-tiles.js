/* dot-tiles.js — "choose a living behaviour" stage (replaces the word grid).
   ─────────────────────────────────────────────────────────────────────
   A 6×4 grid of 24 square tiles, pinned INSIDE the fixed interface grid frame
   and evenly spaced. Each tile is its own dot system with a distinct look AND a
   distinct looped animation. Every tile is a SOLID plate in one interface colour
   with its dots in a second, contrasting colour (see SCHEMES) — e.g. cream dots
   on an orange plate, the strongest pairing.

   Interaction: no hover effect; click freezes the tile, fades the others, plays
   a short confirmation, then onChoose(index, meaning) fires. Each tile carries
   an internal meaning (never shown) that the caller maps to a symbol. */

const DOT = 2.0;   // dot DIAMETER — bolder dots so each tile reads fuller
const GAP = 4.6;   // centre-to-centre pitch — denser grid → richer shapes per tile
const TAU = Math.PI * 2;
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const P = x => 0.5 + 0.5 * Math.sin(x);   // 0..1 oscillator
const CONFIRM_MS = 620;

// Interface palette.
const CREAM = '#f5f5ed', ORANGE = '#fb5716', GOLD = '#e2bc71', DARK = '#282828';
const PALETTE = [ORANGE, GOLD, DARK];
// distance→band / scalar→band — kept so behaviours can still express structure,
// though each tile now paints its dots in a single colour (see SCHEMES).
const bandR = (d, R) => { const v = 1 - clamp01(d / R); return v >= 0.6667 ? 2 : v >= 0.3333 ? 1 : 0; };
const band3 = v => (v >= 0.6667 ? 2 : v >= 0.3333 ? 1 : 0);

/* Each tile is a SOLID plate (bg) with dots in a contrasting colour (dot).
   Pairs are chosen for optical contrast — cream reads strongest on the orange
   and dark plates; dark carries the light gold plate; cream is never a plate
   (it is the page colour). Assigned across the grid with a per-row shift so no
   two neighbours share a scheme. */
const SCHEMES = [
  { bg: ORANGE, dot: CREAM },   // cream on orange — the strongest pairing
  { bg: DARK,   dot: CREAM },   // cream on dark
  { bg: GOLD,   dot: DARK },    // dark on gold
  { bg: DARK,   dot: ORANGE },  // orange on dark
  { bg: ORANGE, dot: DARK },    // dark on orange
  { bg: DARK,   dot: GOLD },    // gold on dark
];

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function dot(ctx, x, y, r) { if (r <= 0.05) return; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
function grid(tl) {
  if (tl.cache && tl.cache.grid) return tl.cache.grid;
  const cols = Math.max(3, Math.floor((tl.W - GAP) / GAP));
  const rows = Math.max(3, Math.floor((tl.H - GAP) / GAP));
  const ox = (tl.W - (cols - 1) * GAP) / 2, oy = (tl.H - (rows - 1) * GAP) / 2;
  const pts = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pts.push({ x: ox + c * GAP, y: oy + r * GAP, c, r });
  const g = { pts, cols, rows, cx: tl.W / 2, cy: tl.H / 2 };
  tl.cache = Object.assign(tl.cache || {}, { grid: g });
  return g;
}
// Paint a dots array in ONE colour — whatever ctx.fillStyle currently holds
// (the frame loop sets it to the tile's dot colour before drawing).
function paint(ctx, dots) {
  ctx.beginPath();
  for (const d of dots) dot(ctx, d.x, d.y, d.r);
  ctx.fill();
}

/* ── Ornamental "azulejo"-style tiles, rendered entirely in DOTS ──────────────
   Each tile is a symmetric medallion — a dotted border framing one of 14 distinct
   central motifs — with its OWN base rotation, symmetry and animation, so no two
   tiles read alike. The per-tile `meaning` (index → symbol) is unchanged. */
const A_TAU = Math.PI * 2;

// Dotted border, `ins` in from each edge; `dbl` adds a second inner line.
function frameDots(D, W, H, ins, r, dbl) {
  const gap = GAP * 1.3;
  const line = (x0, y0, x1, y1) => {
    const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / gap));
    for (let i = 0; i <= n; i++) D.push({ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n, r });
  };
  line(ins, ins, W - ins, ins); line(ins, H - ins, W - ins, H - ins);
  line(ins, ins, ins, H - ins); line(W - ins, ins, W - ins, H - ins);
  if (dbl) {
    const j = gap * 1.15;
    line(ins + j, ins + j, W - ins - j, ins + j); line(ins + j, H - ins - j, W - ins - j, H - ins - j);
    line(ins + j, ins + j, ins + j, H - ins - j); line(W - ins - j, ins + j, W - ins - j, H - ins - j);
  }
}
function ringDots(D, cx, cy, R, n, r, ph) {
  for (let i = 0; i < n; i++) { const a = (ph || 0) + i / n * A_TAU; D.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, r }); }
}
function rayDots(D, cx, cy, a, R0, R1, r, curl) {
  const st = GAP * 0.95, n = Math.max(1, Math.round((R1 - R0) / st));
  for (let i = 0; i <= n; i++) { const f = i / n, R = R0 + (R1 - R0) * f, aa = a + (curl || 0) * f; D.push({ x: cx + Math.cos(aa) * R, y: cy + Math.sin(aa) * R, r }); }
}
function squareRing(D, cx, cy, R, r, ph) {
  const c = [];
  for (let i = 0; i < 4; i++) { const a = (ph || 0) + i / 4 * A_TAU; c.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
  for (let i = 0; i < 4; i++) {
    const [x1, y1] = c[i], [x2, y2] = c[(i + 1) % 4];
    const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / (GAP * 1.15)));
    for (let j = 0; j < n; j++) D.push({ x: x1 + (x2 - x1) * j / n, y: y1 + (y2 - y1) * j / n, r });
  }
}
function smallDiamond(D, cx, cy, R, r) {
  [[0, -R], [R, 0], [0, R], [-R, 0]].forEach(([dx, dy]) => D.push({ x: cx + dx, y: cy + dy, r }));
}
// Almond/leaf petal OUTLINE (two mirrored edges) pointing along angle `a`.
function petalOutline(D, cx, cy, a, R0, R1, wid, r) {
  const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux, N = 6;
  for (let s = 0; s <= N; s++) {
    const f = s / N, R = R0 + (R1 - R0) * f, w = Math.sin(f * Math.PI) * wid;
    D.push({ x: cx + ux * R + px * w, y: cy + uy * R + py * w, r });
    D.push({ x: cx + ux * R - px * w, y: cy + uy * R - py * w, r });
  }
}

// One composer draws every tile; `cfg.style` (0..13) selects the motif. `P0` is the
// tile's base rotation (spin animation + a per-tile seed offset) so twins differ.
function drawAzulejo(ctx, tl, t, cfg) {
  const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2;
  const D = [];
  const breathe = 0.82 + 0.26 * Math.sin(t * 1.2 + cfg.seed);
  const spin = cfg.anim === 'spin' ? t * 0.35 : cfg.anim === 'spin2' ? t * 0.55 : 0;
  const bloom = cfg.anim === 'bloom' ? 1 + 0.12 * Math.sin(t * 1.1) : 1;
  const sym = cfg.sym, P0 = spin + cfg.seed;   // base rotation → distinct orientation per tile

  if (cfg.frame) frameDots(D, tl.W, tl.H, S * 0.08, b, cfg.frame === 2);
  if (cfg.corner) {
    const o = S * 0.22;
    [[o, o], [tl.W - o, o], [o, tl.H - o], [tl.W - o, tl.H - o]].forEach(([x, y]) =>
      ringDots(D, x, y, S * 0.07, cfg.corner === 2 ? 4 : 1, b, P0));
  }

  const s = cfg.style;
  if (s === 0) {                     // rosette — petal rays + outer bead ring
    ringDots(D, cx, cy, S * 0.15, sym, b, P0);
    for (let i = 0; i < sym; i++) rayDots(D, cx, cy, P0 + i / sym * A_TAU, S * 0.26, S * 0.66 * bloom, b);
    ringDots(D, cx, cy, S * 0.8, sym * 2, b, -P0);
    D.push({ x: cx, y: cy, r: b * 1.5 });
  } else if (s === 1) {              // star burst
    for (let i = 0; i < sym; i++) rayDots(D, cx, cy, P0 + i / sym * A_TAU, S * 0.12, S * 0.86 * bloom, b);
    ringDots(D, cx, cy, S * 0.44, sym, b, P0 + Math.PI / sym);
    ringDots(D, cx, cy, S * 0.22, sym, b, P0);
    D.push({ x: cx, y: cy, r: b * 1.6 });
  } else if (s === 2) {              // concentric mandala rings
    [0.24, 0.44, 0.62, 0.8].forEach((f, k) => ringDots(D, cx, cy, S * f * (k % 2 ? bloom : 1), sym * (k + 1), b, P0 * (k % 2 ? 1 : -1)));
    D.push({ x: cx, y: cy, r: b * 1.7 });
  } else if (s === 3) {              // cross + corner diamonds
    for (let i = 0; i < 4; i++) rayDots(D, cx, cy, P0 + i / 4 * A_TAU, S * 0.1, S * 0.84 * bloom, b);
    for (let i = 0; i < 4; i++) { const a = P0 + i / 4 * A_TAU + Math.PI / 4; smallDiamond(D, cx + Math.cos(a) * S * 0.46, cy + Math.sin(a) * S * 0.46, S * 0.1, b); }
    ringDots(D, cx, cy, S * 0.24, 8, b, P0);
    D.push({ x: cx, y: cy, r: b * 1.6 });
  } else if (s === 4) {              // floral cross — big cardinal + small diagonal petals
    for (let i = 0; i < 4; i++) rayDots(D, cx, cy, P0 + i / 4 * A_TAU, S * 0.14, S * 0.7 * bloom, b);
    for (let i = 0; i < 4; i++) rayDots(D, cx, cy, P0 + i / 4 * A_TAU + Math.PI / 4, S * 0.14, S * 0.46, b);
    ringDots(D, cx, cy, S * 0.8, 8, b, P0);
    ringDots(D, cx, cy, S * 0.18, 8, b, -P0);
  } else if (s === 5) {              // pinwheel — curved rays
    for (let i = 0; i < sym; i++) rayDots(D, cx, cy, P0 + i / sym * A_TAU, S * 0.1, S * 0.82, b, 0.95);
    ringDots(D, cx, cy, S * 0.55, sym * 2, b, -P0);
    D.push({ x: cx, y: cy, r: b * 1.5 });
  } else if (s === 6) {              // nested rotated squares (lattice medallion)
    [0.8, 0.56, 0.32].forEach((f, k) => squareRing(D, cx, cy, S * f, b, P0 + (k % 2 ? Math.PI / 4 : 0)));
    smallDiamond(D, cx, cy, S * 0.14, b);
    D.push({ x: cx, y: cy, r: b * 1.6 });
  } else if (s === 7) {              // dense sunflower (two offset petal-ray rings)
    for (let i = 0; i < sym; i++) rayDots(D, cx, cy, P0 + i / sym * A_TAU, S * 0.3, S * 0.8 * bloom, b);
    for (let i = 0; i < sym; i++) rayDots(D, cx, cy, P0 + (i + 0.5) / sym * A_TAU, S * 0.16, S * 0.5, b);
    ringDots(D, cx, cy, S * 0.12, sym, b, P0);
    D.push({ x: cx, y: cy, r: b * 1.5 });
  } else if (s === 8) {              // compass star — two crossed squares + points
    squareRing(D, cx, cy, S * 0.6, b, P0);
    squareRing(D, cx, cy, S * 0.6, b, P0 + Math.PI / 4);
    for (let i = 0; i < 8; i++) rayDots(D, cx, cy, P0 + i / 8 * A_TAU, S * 0.6, S * 0.86 * bloom, b);
    ringDots(D, cx, cy, S * 0.3, 8, b, P0);
    D.push({ x: cx, y: cy, r: b * 1.6 });
  } else if (s === 9) {              // concentric aligned squares + center plus
    [0.82, 0.58, 0.34].forEach(f => squareRing(D, cx, cy, S * f, b, P0));
    for (let i = 0; i < 4; i++) rayDots(D, cx, cy, P0 + i / 4 * A_TAU, 0, S * 0.24 * bloom, b);
    D.push({ x: cx, y: cy, r: b * 1.6 });
  } else if (s === 10) {             // all-over diamond lattice (repeating geometric)
    const m = S * 0.16, step = GAP * 3.4;
    let row = 0;
    for (let y = m; y <= tl.H - m + 0.1; y += step, row++) {
      const off = (row % 2) * step / 2;
      for (let x = m + off; x <= tl.W - m + 0.1; x += step) smallDiamond(D, x, y, GAP * 0.9, b);
    }
  } else if (s === 11) {             // petal blossom — leaf-outline petals
    for (let i = 0; i < sym; i++) petalOutline(D, cx, cy, P0 + i / sym * A_TAU, S * 0.16, S * 0.82 * bloom, S * 0.15, b);
    ringDots(D, cx, cy, S * 0.1, sym, b, P0);
    D.push({ x: cx, y: cy, r: b * 1.5 });
  } else if (s === 12) {             // double spiral arms
    for (let arm = 0; arm < 2; arm++) {
      for (let i = 0; i <= 46; i++) { const th = i / 46 * 3 * A_TAU + P0 + arm * Math.PI, R = S * 0.06 + i / 46 * S * 0.82; D.push({ x: cx + Math.cos(th) * R, y: cy + Math.sin(th) * R, r: b }); }
    }
    D.push({ x: cx, y: cy, r: b * 1.6 });
  } else {                           // s === 13 · ring of diamonds + inner rosette
    for (let i = 0; i < sym; i++) { const a = P0 + i / sym * A_TAU; smallDiamond(D, cx + Math.cos(a) * S * 0.64, cy + Math.sin(a) * S * 0.64, S * 0.09, b); }
    ringDots(D, cx, cy, S * 0.36, sym, b, P0 + Math.PI / sym);
    for (let i = 0; i < sym; i++) rayDots(D, cx, cy, P0 + i / sym * A_TAU, S * 0.12, S * 0.28, b);
    D.push({ x: cx, y: cy, r: b * 1.5 });
  }

  ctx.beginPath();
  if (cfg.anim === 'twinkle') {
    for (const d of D) { const k = 0.55 + 0.7 * Math.pow(0.5 + 0.5 * Math.sin(t * 2.2 + (d.x + d.y) * 0.05 + cfg.seed), 3); dot(ctx, d.x, d.y, d.r * k); }
  } else if (cfg.anim === 'pulse') {
    const front = ((t * 0.5) % 1) * S * 1.15, w = GAP * 3;
    for (const d of D) { const dd = Math.abs(Math.hypot(d.x - cx, d.y - cy) - front), k = dd < w ? 1 + 0.9 * Math.cos(dd / w * Math.PI / 2) : 1; dot(ctx, d.x, d.y, d.r * k); }
  } else if (cfg.anim === 'breathe') {
    for (const d of D) dot(ctx, d.x, d.y, d.r * breathe);
  } else {
    for (const d of D) dot(ctx, d.x, d.y, d.r);
  }
  ctx.fill();
}

/* 28 tiles (4×7). Fixed meaning per index (index → symbol); each is dressed as a
   distinct ornamental medallion — 14 motifs, with symmetry / animation / frame /
   corner and a per-tile rotation seed all varied so none look alike. */
const A_MEANINGS = ['healing', 'abundance', 'growth', 'flow', 'balance', 'cleansing', 'continuity', 'journey', 'renewal', 'protection', 'harmony', 'energy', 'ascent', 'aspiration', 'guidance', 'fertility', 'connection', 'luck', 'freedom', 'exploration', 'community', 'vitality', 'roots', 'strength', 'wisdom', 'eternity', 'rebirth', 'unity'];
const A_SYMS = [8, 6, 12, 5, 8, 6, 10, 4, 8, 7];
const A_ANIMS = ['breathe', 'spin', 'bloom', 'twinkle', 'pulse', 'spin2'];
const TILES = A_MEANINGS.map((meaning, i) => {
  const cfg = {
    style: i % 14,
    sym: A_SYMS[i % A_SYMS.length],
    anim: A_ANIMS[i % A_ANIMS.length],
    frame: (i % 4 === 0 ? 2 : 1),
    corner: (i % 3),
    seed: i * 0.9,
  };
  return { meaning, draw(ctx, tl, t) { drawAzulejo(ctx, tl, t, cfg); } };
});

export const TILE_MEANINGS = TILES.map(t => t.meaning);

// Confirmation overlay — a single ring sweeps out (orange) enlarging dots.
function drawConfirm(ctx, tl, ce) {
  const g = grid(tl), b = DOT / 2, maxD = Math.hypot(tl.W, tl.H) / 2, width = GAP * 3.5, front = ce * (maxD + width);
  ctx.fillStyle = tl.dotColor; ctx.beginPath();
  for (const p of g.pts) { const d = Math.hypot(p.x - g.cx, p.y - g.cy), dd = Math.abs(d - front), bump = dd < width ? Math.cos(dd / width * Math.PI / 2) : 0; if (bump > 0.02) dot(ctx, p.x, p.y, b * (0.9 + bump * 1.6)); }
  ctx.fill();
}

// Every tile shares ONE look: the interface YELLOW plate with dark #282828 dots.
const TILE_BG = '#e2bc71', TILE_DOT = '#282828';
// Tiles are STATIC — drawn at this frozen frame — and only animate while the
// pointer is over them (hover / touch). STAGGER = per-tile entrance delay.
const STATIC_T = 2.2, STAGGER = 55, APPEAR_MS = 300;

export function mountDotTiles(host, { onSelect, onConfirm } = {}) {
  const noop = () => {};
  if (!host) return { teardown: noop, confirm: noop, selectTile: noop, stopActive: noop, deselect: noop, tileCenter: () => null, count: 0, appearMs: 0 };

  const gridEl = document.createElement('div');
  gridEl.className = 'dot-tiles-grid';
  const innerEl = document.createElement('div');
  innerEl.className = 'dot-tiles-inner';
  gridEl.appendChild(innerEl);
  host.appendChild(gridEl);

  const tiles = [];
  for (let i = 0; i < TILES.length; i++) {
    const cell = document.createElement('div');
    cell.className = 'dot-tile';
    cell.dataset.index = String(i);
    cell.style.backgroundColor = TILE_BG;
    const canvas = document.createElement('canvas');
    canvas.className = 'dot-tile-canvas';
    cell.appendChild(canvas);
    innerEl.appendChild(cell);
    tiles.push({ i, cell, canvas, ctx: canvas.getContext('2d'), W: 0, H: 0,
      bgColor: TILE_BG, dotColor: TILE_DOT,
      rnd: mulberry32(1000 + i * 7919), inten: 0.45, alpha: 0,
      frozen: false, frozenT: 0, confirmT: -1, cache: null,
      appearAt: i * STAGGER });   // enter one after another
  }

  function sizeTile(tl) {
    const r = tl.cell.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    tl.W = r.width; tl.H = r.height;
    tl.canvas.width = Math.round(r.width * dpr); tl.canvas.height = Math.round(r.height * dpr);
    tl.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tl.cache = null;
  }
  const sizeAll = () => tiles.forEach(sizeTile);
  sizeAll();

  let selected = -1, chosen = -1, chosenAt = 0, done = false, raf = 0, t0 = performance.now();

  function setSelected(i) {
    if (chosen >= 0) return;
    selected = i;
    tiles.forEach(o => o.cell.classList.toggle('is-selected', o.i === i));
    if (onSelect) onSelect(i, TILES[i].meaning);
  }
  function deselect() {
    if (chosen >= 0) return;
    selected = -1;
    tiles.forEach(o => o.cell.classList.remove('is-selected'));
  }

  function frame(now) {
    const t = (now - t0) / 1000;
    for (const tl of tiles) {
      const appeared = (now - t0) >= tl.appearAt;
      // Never dim the other tiles — every tile stays fully lit whether or not one is
      // selected/chosen; only its MOTION (not its brightness) marks the pick.
      const aTarget = appeared ? 1 : 0;
      tl.alpha += (aTarget - tl.alpha) * 0.16;
      const ctx = tl.ctx;
      ctx.clearRect(0, 0, tl.W, tl.H);
      ctx.globalAlpha = tl.alpha;
      ctx.fillStyle = tl.dotColor;   // dark dots on the yellow plate
      // STATIC by default; only the tile the visitor TAPPED (selected) shows its
      // movement — no hover. The confirming tile also animates.
      const animated = (tl.i === selected || tl.i === chosen);
      const localT = tl.frozen ? tl.frozenT : (animated ? t : STATIC_T);
      TILES[tl.i].draw(ctx, tl, localT);
      if (tl.i === chosen && tl.confirmT >= 0) { ctx.globalAlpha = tl.alpha; drawConfirm(ctx, tl, clamp01((now - chosenAt) / CONFIRM_MS)); }
      ctx.globalAlpha = 1;
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  // No hover. A TAP selects the tile — it starts moving (so the visitor sees the
  // movement they picked) and the others dim; "המשך" confirms it.
  tiles.forEach(tl => {
    tl.cell.addEventListener('pointerdown', e => {
      if (chosen >= 0) return;
      e.preventDefault();
      setSelected(tl.i);
    });
  });

  // Confirm the selected tile ("המשך") — play the ring, then fire onConfirm.
  function confirm() {
    if (chosen >= 0 || selected < 0) return;
    chosen = selected; chosenAt = performance.now();
    const tl = tiles[chosen];
    tl.frozen = true; tl.frozenT = (chosenAt - t0) / 1000; tl.confirmT = 0;
    tl.cell.classList.add('is-chosen');
    /* No dimming of the other tiles — they stay fully lit. */
    setTimeout(() => { if (done) return; done = true; onConfirm && onConfirm(chosen, TILES[chosen].meaning); }, CONFIRM_MS + 120);
  }

  const onResize = () => sizeAll();
  window.addEventListener('resize', onResize);

  return {
    teardown() { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); try { gridEl.remove(); } catch (_) {} },
    confirm,
    // Demo helpers: programmatic "tap" (selects → the tile starts moving) + reset,
    // and a tile's screen centre.
    selectTile(i) { setSelected(i); },
    deselect,
    tileCenter(i) { const tl = tiles[i]; if (!tl) return null; const r = tl.cell.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; },
    count: tiles.length,
    appearMs: tiles.length * STAGGER + APPEAR_MS,
  };
}
