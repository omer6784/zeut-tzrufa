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

const DOT = 1.6;   // dot DIAMETER (matches --grid-dot-size)
const GAP = 5.5;   // centre-to-centre pitch (matches --grid-dot-gap)
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

/* ── The 24 tiles: { meaning, draw(ctx, tl, t) } ── */
const TILES = [
  // 0 · PULSE — grid breathing; colour in concentric bands → healing
  { meaning: 'healing', draw(ctx, tl, t) {
    const g = grid(tl), b = DOT / 2, r = b * (0.8 + 0.9 * P(t * 1.5)), R = Math.hypot(tl.W, tl.H) / 2, D = [];
    for (const p of g.pts) D.push({ x: p.x, y: p.y, r, b: bandR(Math.hypot(p.x - g.cx, p.y - g.cy), R) });
    paint(ctx, D);
  } },
  // 1 · RIPPLE — waves from centre; concentric colour bands → abundance
  { meaning: 'abundance', draw(ctx, tl, t) {
    const g = grid(tl), b = DOT / 2, maxD = Math.hypot(tl.W, tl.H) / 2, w = GAP * 3.2, sp = 60;
    const f0 = (t * sp) % (maxD + w), f1 = (t * sp + (maxD + w) / 2) % (maxD + w), D = [];
    for (const p of g.pts) { const d = Math.hypot(p.x - g.cx, p.y - g.cy); let bump = 0;
      for (const f of [f0, f1]) { const dd = Math.abs(d - f); if (dd < w) bump += Math.cos(dd / w * Math.PI / 2); }
      D.push({ x: p.x, y: p.y, r: b * (0.7 + clamp01(bump) * 1.1), b: bandR(d, maxD) }); }
    paint(ctx, D);
  } },
  // 2 · DIAGONAL HALFTONE — size gradient sliding; diagonal colour bands → growth
  { meaning: 'growth', draw(ctx, tl, t) {
    const g = grid(tl), b = DOT / 2, D = [];
    for (const p of g.pts) { const d = (p.x + p.y) / (tl.W + tl.H); D.push({ x: p.x, y: p.y, r: b * (0.35 + 1.25 * P(d * 8 - t * 2.2)), b: band3(1 - d) }); }
    paint(ctx, D);
  } },
  // 3 · DENSITY WAVE — horizontal; three vertical colour zones → flow
  { meaning: 'flow', draw(ctx, tl, t) {
    const g = grid(tl), b = DOT / 2, D = [];
    for (const p of g.pts) D.push({ x: p.x, y: p.y, r: b * (0.3 + 1.3 * P(p.x / tl.W * 6 - t * 2)), b: band3(p.x / tl.W) });
    paint(ctx, D);
  } },
  // 4 · CHECKERBOARD — two subsets breathe; diagonal 3-colour weave → balance
  { meaning: 'balance', draw(ctx, tl, t) {
    const g = grid(tl), b = DOT / 2, a = P(t * 1.6), D = [];
    for (const p of g.pts) { const v = ((p.r + p.c) & 1) ? a : 1 - a; D.push({ x: p.x, y: p.y, r: b * (0.5 + 0.8 * v), b: (p.r + p.c) % 3 }); }
    paint(ctx, D);
  } },
  // 5 · VERTICAL RAIN — brightness falls; vertical colour stripes → cleansing
  { meaning: 'cleansing', draw(ctx, tl, t) {
    const g = grid(tl), b = DOT / 2, D = [];
    for (const p of g.pts) D.push({ x: p.x, y: p.y, r: b * (0.35 + 0.95 * Math.pow(P(p.r * 0.7 - t * 3 + p.c * 0.3), 2)), b: band3(p.x / tl.W) });
    paint(ctx, D);
  } },
  // 6 · HORIZONTAL BANDS in sequence; horizontal colour bands → continuity
  { meaning: 'continuity', draw(ctx, tl, t) {
    const g = grid(tl), b = DOT / 2, D = [];
    for (const p of g.pts) D.push({ x: p.x, y: p.y, r: b * (0.35 + 1.05 * Math.pow(P(p.r * 0.6 - t * 2), 2)), b: band3(p.r / g.rows) });
    paint(ctx, D);
  } },
  // 7 · DIAGONAL FLOW — streams wrap; diagonal colour bands → journey
  { meaning: 'journey', draw(ctx, tl, t) {
    const g = grid(tl), b = DOT / 2, sp = 40, SX = tl.W, SY = tl.H, D = [];
    for (const p of g.pts) { const x = ((p.x - t * sp) % SX + SX) % SX, y = ((p.y - t * sp * 0.6) % SY + SY) % SY; D.push({ x, y, r: b, b: band3((x + y) / (tl.W + tl.H)) }); }
    paint(ctx, D);
  } },
  // 8 · RAIN — staggered columns fall; vertical colour stripes → renewal
  { meaning: 'renewal', draw(ctx, tl, t) {
    const g = grid(tl), b = DOT / 2, sp = 45, D = [];
    for (const p of g.pts) { const y = (p.y + t * sp + p.c * 17) % tl.H; D.push({ x: p.x, y, r: b, b: band3(p.x / tl.W) }); }
    paint(ctx, D);
  } },
  // 9 · SHIELD — concentric rings guard an empty centre; orange→yellow→dark → protection
  { meaning: 'protection', draw(ctx, tl, t) {
    const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, rMin = GAP * 1.6, rMax = Math.min(tl.W, tl.H) / 2 - GAP * 0.6;
    const inw = (GAP * 0.4 + GAP * 0.7) * P(t * 1.3), D = [];
    for (let R = rMin; R <= rMax; R += GAP * 1.6) { const rr = R - inw; if (rr < rMin * 0.7) continue;
      const n = Math.max(6, Math.round(TAU * rr / GAP)); for (let k = 0; k < n; k++) { const a = k / n * TAU + R * 0.02; D.push({ x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a), r: b, b: bandR(rr, rMax) }); } }
    paint(ctx, D);
  } },
  // 10 · ORBIT — rings circle a still centre; ring colour bands → harmony
  { meaning: 'harmony', draw(ctx, tl, t) {
    const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, w = 0.6, rMax = Math.min(tl.W, tl.H) / 2 - GAP, D = [{ x: cx, y: cy, r: b * 1.15, b: 2 }];
    let ring = 0;
    for (let R = GAP * 2; R <= rMax; R += GAP * 2, ring++) { const n = 4 + ring * 2, dir = ring & 1 ? -1 : 1;
      for (let k = 0; k < n; k++) { const a = k / n * TAU + dir * t * w + ring * 0.4; D.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), r: b, b: bandR(R, rMax) }); } }
    paint(ctx, D);
  } },
  // 11 · RADIAL BURST — pulses along spokes; radius colour bands → energy
  { meaning: 'energy', draw(ctx, tl, t) {
    const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, rMax = Math.min(tl.W, tl.H) / 2 - GAP * 0.5, S = 8, D = [];
    for (let s = 0; s < S; s++) { const a = s / S * TAU; for (let R = GAP; R <= rMax; R += GAP) D.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), r: b * (0.3 + 1.1 * P(R * 0.08 - t * 2.6)), b: bandR(R, rMax) }); }
    paint(ctx, D);
  } },
  // 12 · SPIRAL ARMS — rotating spiral; radius colour bands → ascent
  { meaning: 'ascent', draw(ctx, tl, t) {
    const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, rMax = Math.min(tl.W, tl.H) / 2 - GAP * 0.5, D = [];
    for (let R = GAP; R <= rMax; R += GAP * 0.9) { const n = Math.max(6, Math.round(TAU * R / GAP));
      for (let k = 0; k < n; k++) { const a = k / n * TAU, v = P(a * 2 - R * 0.05 - t * 1.8); if (v > 0.55) D.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), r: b * (0.5 + v), b: bandR(R, rMax) }); } }
    paint(ctx, D);
  } },
  // 13 · ARCH / DOME — rising wave fills a dome; radial bands from apex → aspiration
  { meaning: 'aspiration', draw(ctx, tl, t) {
    const g = grid(tl), b = DOT / 2, cx = tl.W / 2, cy = tl.H * 0.9, R = Math.min(tl.W, tl.H) * 0.44, D = [];
    for (const p of g.pts) { if (p.y > cy) continue; const d = Math.hypot(p.x - cx, p.y - cy); if (d < R) D.push({ x: p.x, y: p.y, r: b * (0.4 + P(d * 0.08 - t * 1.8)), b: bandR(d, R) }); }
    paint(ctx, D);
  } },
  // 14 · ROTATING CROSS — four arms turn; radius colour bands → guidance
  { meaning: 'guidance', draw(ctx, tl, t) {
    const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, rMax = Math.min(tl.W, tl.H) / 2 - GAP * 0.5, ang = t * 0.55, D = [];
    for (let arm = 0; arm < 4; arm++) { const a = ang + arm * Math.PI / 2; for (let R = 0; R <= rMax; R += GAP) D.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), r: b, b: bandR(R, rMax) }); }
    paint(ctx, D);
  } },
  // 15 · GROWTH FROM CORE — dots appear then reset; core dark → outer orange → fertility
  { meaning: 'fertility', draw(ctx, tl, t) {
    if (!tl.cache || !tl.cache.growth) { const g = grid(tl); tl.cache = Object.assign(tl.cache || {}, { growth: g.pts.map(p => ({ p, d: Math.hypot(p.x - g.cx, p.y - g.cy) + tl.rnd() * GAP * 2 })).sort((a, b) => a.d - b.d), maxD: Math.hypot(tl.W, tl.H) / 2 }); }
    const ord = tl.cache.growth, maxD = tl.cache.maxD, b = DOT / 2, cyc = 4.2, n = Math.floor(Math.pow((t % cyc) / cyc, 0.85) * ord.length), D = [];
    for (let k = 0; k < n; k++) { const grow = clamp01((n - k) / 3); D.push({ x: ord[k].p.x, y: ord[k].p.y, r: b * (0.4 + 0.6 * grow), b: bandR(ord[k].d, maxD) }); }
    paint(ctx, D);
  } },
  // 16 · CONSTELLATION — thin lines link anchors → connection
  { meaning: 'connection', draw(ctx, tl, t) {
    if (!tl.cache || !tl.cache.stars) { const N = 14, pts = [], pad = GAP * 2;
      for (let k = 0; k < N; k++) pts.push({ x: pad + tl.rnd() * (tl.W - 2 * pad), y: pad + tl.rnd() * (tl.H - 2 * pad), anchor: k % 4 === 0 });
      const edges = []; for (let a = 0; a < N; a++) for (let bx = a + 1; bx < N; bx++) { const d = Math.hypot(pts[a].x - pts[bx].x, pts[a].y - pts[bx].y); if (d < tl.W * 0.5) edges.push({ a, b: bx, ph: tl.rnd() * TAU, sp: 0.5 + tl.rnd() * 0.6 }); }
      tl.cache = Object.assign(tl.cache || {}, { stars: { pts, edges } }); }
    const { pts, edges } = tl.cache.stars, b = DOT / 2;
    ctx.strokeStyle = tl.dotColor; ctx.lineWidth = 0.6;   // links in the dot colour
    for (const e of edges) { const on = clamp01((Math.sin(t * e.sp + e.ph) - 0.35) / 0.65); if (on <= 0) continue;
      ctx.globalAlpha = tl.alpha * on * 0.85; ctx.beginPath(); ctx.moveTo(pts[e.a].x, pts[e.a].y); ctx.lineTo(pts[e.b].x, pts[e.b].y); ctx.stroke(); }
    ctx.globalAlpha = tl.alpha;
    paint(ctx, pts.map(p => ({ x: p.x, y: p.y, r: b * (p.anchor ? 1.55 : 1), b: p.anchor ? 0 : 2 })));   // anchors orange, rest dark
  } },
  // 17 · TWINKLE — irregular field lights up; per-dot palette → luck
  { meaning: 'luck', draw(ctx, tl, t) {
    if (!tl.cache || !tl.cache.field) { const g = grid(tl); tl.cache = Object.assign(tl.cache || {}, { field: g.pts.map(p => ({ x: p.x + (tl.rnd() - 0.5) * GAP * 1.4, y: p.y + (tl.rnd() - 0.5) * GAP * 1.4, ph: tl.rnd() * TAU, per: 3 + tl.rnd() * 3.5, b: Math.floor(tl.rnd() * 3) })) }); }
    const b = DOT / 2;
    paint(ctx, tl.cache.field.map(p => ({ x: p.x, y: p.y, r: b * (0.8 + 1.3 * Math.pow(P(t * TAU / p.per + p.ph), 6)), b: p.b })));
  } },
  // 18 · DRIFT — field wanders; per-dot palette → freedom
  { meaning: 'freedom', draw(ctx, tl, t) {
    if (!tl.cache || !tl.cache.drift) { const g = grid(tl); tl.cache = Object.assign(tl.cache || {}, { drift: g.pts.map(p => ({ x: p.x, y: p.y, ph: tl.rnd() * TAU, ax: GAP * (0.6 + tl.rnd()), ay: GAP * (0.6 + tl.rnd()), b: Math.floor(tl.rnd() * 3) })) }); }
    const b = DOT / 2, sp = 0.7;
    paint(ctx, tl.cache.drift.map(p => ({ x: p.x + Math.sin(t * sp + p.ph) * p.ax, y: p.y + Math.cos(t * sp * 0.8 + p.ph) * p.ay, r: b, b: p.b })));
  } },
  // 19 · RANDOM WALK — walkers roam a faint grid → exploration
  { meaning: 'exploration', draw(ctx, tl, t) {
    const g = grid(tl), b = DOT / 2;
    ctx.globalAlpha = tl.alpha * 0.3; ctx.fillStyle = tl.dotColor; ctx.beginPath(); for (const p of g.pts) dot(ctx, p.x, p.y, b * 0.6); ctx.fill();
    ctx.globalAlpha = tl.alpha; ctx.fillStyle = tl.dotColor;
    if (!tl.cache || !tl.cache.walk) { const W = []; for (let i = 0; i < 4; i++) W.push({ s: tl.rnd() * 1000 }); tl.cache = Object.assign(tl.cache || {}, { walk: W }); }
    paint(ctx, tl.cache.walk.map(w => ({ x: tl.W * (0.5 + 0.42 * Math.sin(t * 0.7 + w.s) * Math.cos(t * 0.31 + w.s)), y: tl.H * (0.5 + 0.42 * Math.cos(t * 0.6 + w.s * 1.3)), r: b * 1.8, b: 0 })));   // walkers orange
  } },
  // 20 · CLUSTER PULSE — three groups pulse in turn, one colour each → community
  { meaning: 'community', draw(ctx, tl, t) {
    if (!tl.cache || !tl.cache.field2) { const g = grid(tl); tl.cache = Object.assign(tl.cache || {}, { field2: g.pts.map(p => ({ x: p.x, y: p.y, grp: Math.floor(tl.rnd() * 3) })) }); }
    const b = DOT / 2;
    paint(ctx, tl.cache.field2.map(p => ({ x: p.x, y: p.y, r: b * (0.5 + 0.9 * P(t * 1.4 + p.grp * TAU / 3)), b: p.grp })));
  } },
  // 21 · CONTRACT / EXPAND — field breathes to centre; radial bands → vitality
  { meaning: 'vitality', draw(ctx, tl, t) {
    const g = grid(tl), b = DOT / 2, cx = g.cx, cy = g.cy, s = 0.8 + 0.35 * P(t * 1.5), R = Math.hypot(tl.W, tl.H) / 2;
    paint(ctx, g.pts.map(p => ({ x: cx + (p.x - cx) * s, y: cy + (p.y - cy) * s, r: b, b: bandR(Math.hypot(p.x - cx, p.y - cy), R) })));
  } },
  // 22 · CORNER RADIAL — waves from a corner; dark near the corner → orange outward → roots
  { meaning: 'roots', draw(ctx, tl, t) {
    const g = grid(tl), b = DOT / 2, cx = 0, cy = tl.H, maxD = Math.hypot(tl.W, tl.H), D = [];
    for (const p of g.pts) { const d = Math.hypot(p.x - cx, p.y - cy); D.push({ x: p.x, y: p.y, r: b * (0.35 + 1.2 * P(d * 0.07 - t * 1.8)), b: band3(d / maxD) }); }
    paint(ctx, D);
  } },
  // 23 · BOLD COLUMNS — shimmer across strong columns; per-column palette → strength
  { meaning: 'strength', draw(ctx, tl, t) {
    const g = grid(tl), b = DOT / 2, D = [];
    for (const p of g.pts) D.push({ x: p.x, y: p.y, r: b * (0.6 + 1.1 * P(p.c * 0.5 - t * 2)), b: p.c % 3 });
    paint(ctx, D);
  } },
  // 24 · SCAN — a bright band sweeps down the grid → wisdom
  { meaning: 'wisdom', draw(ctx, tl, t) {
    const g = grid(tl), b = DOT / 2, front = (t * 0.32) % 1, D = [];
    for (const p of g.pts) { const v = Math.max(0, 1 - Math.abs(p.r / g.rows - front) * 5); D.push({ x: p.x, y: p.y, r: b * (0.45 + 1.1 * v) }); }
    paint(ctx, D);
  } },
  // 25 · LEMNISCATE — a bright dot traces a figure-8 over a faint grid → eternity
  { meaning: 'eternity', draw(ctx, tl, t) {
    const g = grid(tl), b = DOT / 2, D = g.pts.map(p => ({ x: p.x, y: p.y, r: b * 0.7 }));
    const cx = tl.W / 2, cy = tl.H / 2, A = tl.W * 0.34, Bh = tl.H * 0.32, th = t * 1.1, dn = 1 + Math.sin(th) * Math.sin(th);
    D.push({ x: cx + A * Math.cos(th) / dn, y: cy + Bh * Math.sin(th) * Math.cos(th) / dn, r: b * 2.2 });
    paint(ctx, D);
  } },
  // 26 · COLLAPSE / BURST — the field shrinks to the centre then bursts, cycling → rebirth
  { meaning: 'rebirth', draw(ctx, tl, t) {
    const g = grid(tl), b = DOT / 2, cx = g.cx, cy = g.cy;
    const tri = 1 - Math.abs(((t * 0.45) % 1) * 2 - 1), s = 1 - 0.78 * tri;
    paint(ctx, g.pts.map(p => ({ x: cx + (p.x - cx) * s, y: cy + (p.y - cy) * s, r: b })));
  } },
  // 27 · CONVERGE — dots gather to the centre and return → unity
  { meaning: 'unity', draw(ctx, tl, t) {
    const g = grid(tl), b = DOT / 2, cx = g.cx, cy = g.cy, k = (0.5 + 0.5 * Math.sin(t * 1.2)) * 0.7;
    paint(ctx, g.pts.map(p => ({ x: p.x + (cx - p.x) * k, y: p.y + (cy - p.y) * k, r: b })));
  } },
  // 28 · DOORWAY — a bright pulse rises through a central gap in the field → passage
  { meaning: 'passage', draw(ctx, tl, t) {
    const g = grid(tl), b = DOT / 2, cx = tl.W / 2, gw = GAP * 2.4, yf = (1 - (t * 0.4) % 1) * tl.H, D = [];
    for (const p of g.pts) {
      if (Math.abs(p.x - cx) < gw) { const v = Math.max(0, 1 - Math.abs(p.y - yf) / (GAP * 3)); if (v > 0.05) D.push({ x: p.x, y: p.y, r: b * (0.5 + 1.2 * v) }); }
      else D.push({ x: p.x, y: p.y, r: b });
    }
    paint(ctx, D);
  } },
  // 29 · SUN — rays brighten outward from the centre → radiance
  { meaning: 'radiance', draw(ctx, tl, t) {
    const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, rMax = Math.min(tl.W, tl.H) / 2 - GAP * 0.5, S = 12, D = [{ x: cx, y: cy, r: b * 1.4 }];
    for (let s = 0; s < S; s++) { const a = s / S * TAU; for (let R = GAP; R <= rMax; R += GAP) D.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), r: b * (0.4 + 0.9 * P(R * 0.06 - t * 2.2)) }); }
    paint(ctx, D);
  } },
  // 30 · CANOPY — a dome from the top with a wave settling beneath it → shelter
  { meaning: 'shelter', draw(ctx, tl, t) {
    const g = grid(tl), b = DOT / 2, cx = tl.W / 2, cy = tl.H * 0.12, R = Math.min(tl.W, tl.H) * 0.62, D = [];
    for (const p of g.pts) { const d = Math.hypot(p.x - cx, p.y - cy); if (d > R) continue; const edge = Math.max(0, 1 - Math.abs(d - R) / (GAP * 2)); const v = Math.max(edge, P(p.y * 0.06 - t * 1.4) * 0.5); D.push({ x: p.x, y: p.y, r: b * (0.4 + 1.0 * v) }); }
    paint(ctx, D);
  } },
  // 31 · CALM — the whole field drifts on a slow gentle wave → serenity
  { meaning: 'serenity', draw(ctx, tl, t) {
    const g = grid(tl), b = DOT / 2;
    paint(ctx, g.pts.map(p => ({ x: p.x, y: p.y + Math.sin(p.x * 0.04 + t * 0.8) * GAP * 0.8, r: b })));
  } },
];

export const TILE_MEANINGS = TILES.map(t => t.meaning);

// Confirmation overlay — a single ring sweeps out (orange) enlarging dots.
function drawConfirm(ctx, tl, ce) {
  const g = grid(tl), b = DOT / 2, maxD = Math.hypot(tl.W, tl.H) / 2, width = GAP * 3.5, front = ce * (maxD + width);
  ctx.fillStyle = tl.dotColor; ctx.beginPath();
  for (const p of g.pts) { const d = Math.hypot(p.x - g.cx, p.y - g.cy), dd = Math.abs(d - front), bump = dd < width ? Math.cos(dd / width * Math.PI / 2) : 0; if (bump > 0.02) dot(ctx, p.x, p.y, b * (0.9 + bump * 1.6)); }
  ctx.fill();
}

export function mountDotTiles(host, { onChoose } = {}) {
  if (!host) return () => {};

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
    // Solid plate + contrasting dot colour, shifted +2 schemes per row so no two
    // neighbours (across or down) share a scheme.
    const scheme = SCHEMES[(i + Math.floor(i / 8) * 3) % SCHEMES.length];
    cell.style.backgroundColor = scheme.bg;
    const canvas = document.createElement('canvas');
    canvas.className = 'dot-tile-canvas';
    cell.appendChild(canvas);
    innerEl.appendChild(cell);
    tiles.push({ i, cell, canvas, ctx: canvas.getContext('2d'), W: 0, H: 0,
      bgColor: scheme.bg, dotColor: scheme.dot,
      rnd: mulberry32(1000 + i * 7919), inten: 0.45, alpha: 1,
      frozen: false, frozenT: 0, confirmT: -1, cache: null });
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

  let chosen = -1, chosenAt = 0, done = false, raf = 0, t0 = performance.now();
  function frame(now) {
    const t = (now - t0) / 1000;
    for (const tl of tiles) {
      const aTarget = chosen < 0 ? 1 : (tl.i === chosen ? 1 : 0.16);
      tl.alpha += (aTarget - tl.alpha) * 0.14;
      const ctx = tl.ctx;
      ctx.clearRect(0, 0, tl.W, tl.H);
      ctx.globalAlpha = tl.alpha;
      ctx.fillStyle = tl.dotColor;   // single dot colour on the tile's solid plate
      TILES[tl.i].draw(ctx, tl, tl.frozen ? tl.frozenT : t);
      if (tl.i === chosen && tl.confirmT >= 0) { ctx.globalAlpha = tl.alpha; drawConfirm(ctx, tl, clamp01((now - chosenAt) / CONFIRM_MS)); }
      ctx.globalAlpha = 1;
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  tiles.forEach(tl => {
    tl.cell.addEventListener('pointerdown', e => {
      if (chosen >= 0) return;
      e.preventDefault();
      chosen = tl.i; chosenAt = performance.now();
      tl.frozen = true; tl.frozenT = (chosenAt - t0) / 1000; tl.confirmT = 0;
      tl.cell.classList.add('is-chosen');
      tiles.forEach(o => { if (o.i !== chosen) o.cell.classList.add('is-dimmed'); });
      setTimeout(() => { if (done) return; done = true; onChoose && onChoose(tl.i, TILES[tl.i].meaning); }, CONFIRM_MS + 120);
    });
  });

  const onResize = () => sizeAll();
  window.addEventListener('resize', onResize);

  return function teardown() {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    try { gridEl.remove(); } catch (_) {}
  };
}
