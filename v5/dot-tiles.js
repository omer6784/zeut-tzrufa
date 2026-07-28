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

const DOT = 2.2;   // dot DIAMETER — bolder dots so each tile reads fuller
const GAP = 4.2;   // centre-to-centre pitch — denser grid → richer shapes per tile
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

function dot(ctx, x, y, r) {
  if (r <= 0.05) return;
  const s = ctx._dotScale || 1;
  const rs = r * s;
  ctx.moveTo(x + rs, y); ctx.arc(x, y, rs, 0, TAU);
}
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

/* ── 28 movement tiles in SEVEN movement families (4 tiles each) ─────────────
   The visitor picks the motion that FEELS right; the family answers "what
   energy drew them?" and maps to a meaning + symbol group (questionnaire.js).
   All tiles move all the time; touch/hover gently REINFORCES a tile's own
   motion (faster clock + emphasized dots) without ever changing its family.
   Language: dots only — quiet, digital, clean. */
const A_TAU = Math.PI * 2;
// stable per-tile pseudo-random (no state, safe to call every frame)
const sd = (i, k) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
const frac = v => v - Math.floor(v);
const ease = t => t * t * (3 - 2 * t);

/* Each draw(ctx, tl, t, bo): t = the tile's own smooth clock (already boost-
   scaled), bo = 0..1 reinforcement (hover 0.45 / selected 1). */
const FAMILY_DRAWS = {

  /* ── PULSE — חיים · חיוניות · התחדשות ── */
  PULSE: [
    // 1. a central dot breathing in size, inside a faint steady ring
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2;
      const D = [];
      for (let i = 0; i < 14; i++) { const a = i / 14 * A_TAU; D.push({ x: cx + Math.cos(a) * S * 0.62, y: cy + Math.sin(a) * S * 0.62, r: b * 0.55 }); }
      D.push({ x: cx, y: cy, r: b * (1.6 + (1.5 + bo) * P(t * 2.1)) });
      paint(ctx, D);
    },
    // 2. a circle of dots expanding and contracting (a breathing ring)
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2;
      const R = S * (0.3 + 0.26 * P(t * 1.7));
      const D = [{ x: cx, y: cy, r: b * 0.9 }];
      for (let i = 0; i < 16; i++) { const a = i / 16 * A_TAU; D.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, r: b }); }
      paint(ctx, D);
    },
    // 3. a small field of dots pulsing in a staggered rhythm
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2;
      const D = [], sp = S * 0.42;
      for (let r = -1; r <= 1; r++) for (let c = -1; c <= 1; c++)
        D.push({ x: cx + c * sp, y: cy + r * sp, r: b * (0.55 + 1.15 * P(t * 2.2 + (r + c + 2) * 0.9)) });
      paint(ctx, D);
    },
    // 4. a pulse travelling dot-to-dot along a line, like a wave
    (ctx, tl, t) => {
      const b = DOT / 2, cy = tl.H / 2, n = 9, m = tl.W * 0.14, step = (tl.W - 2 * m) / (n - 1);
      const D = [];
      for (let i = 0; i < n; i++) D.push({ x: m + i * step, y: cy, r: b * (0.55 + 1.5 * Math.max(0, P(t * 2.4 - i * 0.55)) ** 2) });
      paint(ctx, D);
    },
  ],

  /* ── CENTER_PULL — איזון · אחדות · מרכז פנימי ── */
  CENTER_PULL: [
    // 1. dots from every direction drawn steadily into the centre
    (ctx, tl, t, bo, i) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2;
      const D = [{ x: cx, y: cy, r: b * 1.3 }];
      for (let k = 0; k < 12; k++) {
        const a = sd(i, k) * A_TAU, f = frac(t * 0.22 + sd(i, k + 40));
        const R = S * 0.92 * (1 - ease(f));
        if (R > S * 0.09) D.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, r: b * (0.6 + 0.5 * f) });
      }
      paint(ctx, D);
    },
    // 2. two groups approaching each other and meeting in the middle
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2;
      const off = S * 0.62 * (0.18 + 0.82 * P(t * 1.15 + Math.PI));
      const D = [];
      for (let k = -1; k <= 2; k++) {
        const y = cy + (k - 0.5) * S * 0.34;
        D.push({ x: cx - off, y, r: b }, { x: cx + off, y, r: b });
      }
      paint(ctx, D);
    },
    // 3. scattered dots settling into one balanced circle
    (ctx, tl, t, bo, i) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2;
      const m = ease(P(t * 0.75)), D = [];
      for (let k = 0; k < 12; k++) {
        const a = k / 12 * A_TAU;
        const sx = cx + (sd(i, k) - 0.5) * S * 1.5, sy = cy + (sd(i, k + 17) - 0.5) * S * 1.5;
        const tx = cx + Math.cos(a) * S * 0.55, ty = cy + Math.sin(a) * S * 0.55;
        D.push({ x: sx + (tx - sx) * m, y: sy + (ty - sy) * m, r: b });
      }
      paint(ctx, D);
    },
    // 4. dots gathering to the centre, easing out a little, gathering again
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2;
      const D = [{ x: cx, y: cy, r: b }];
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * A_TAU + t * 0.12;
        const R = S * (0.14 + 0.5 * Math.abs(Math.sin(t * 1.15 + k * 0.16)));
        D.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, r: b });
      }
      paint(ctx, D);
    },
  ],

  /* ── EXPANSION — שפע · צמיחה · ברכה ── */
  EXPANSION: [
    // 1. one dot splitting outward along branching rays
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2;
      const f = ease(frac(t * 0.3)), D = [{ x: cx, y: cy, r: b * 1.4 }];
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * A_TAU - Math.PI / 2;
        const reach = f * S * 0.85, n = Math.floor(reach / (GAP * 1.6));
        for (let j = 1; j <= n; j++) { const R = j * GAP * 1.6; D.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, r: b * (j === n ? 1.25 : 0.8) }); }
      }
      paint(ctx, D);
    },
    // 2. dots streaming out of the centre in every direction
    (ctx, tl, t, bo, i) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2;
      const D = [{ x: cx, y: cy, r: b }];
      for (let k = 0; k < 14; k++) {
        const a = sd(i, k) * A_TAU, f = frac(t * 0.32 + k / 14);
        const R = ease(f) * S * 0.92;
        D.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, r: b * (1.15 - 0.6 * f) });
      }
      paint(ctx, D);
    },
    // 3. rows of dots added one after another, filling upward
    (ctx, tl, t) => {
      const b = DOT / 2, rows = 6, colsN = 7;
      const mx = tl.W * 0.16, my = tl.H * 0.16;
      const stx = (tl.W - 2 * mx) / (colsN - 1), sty = (tl.H - 2 * my) / (rows - 1);
      const prog = frac(t * 0.14) * (rows + 1), D = [];
      for (let r = 0; r < Math.min(rows, prog); r++) {
        const rowA = clamp01(prog - r);
        for (let c = 0; c < colsN; c++) D.push({ x: mx + c * stx, y: tl.H - my - r * sty, r: b * (0.5 + 0.5 * rowA) });
      }
      paint(ctx, D);
    },
    // 4. a small cluster growing into a fuller field (sunflower fill)
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2;
      const count = Math.floor(6 + ease(P(t * 0.5)) * 34), GA = 2.399963, D = [];
      for (let k = 0; k < count; k++) {
        const R = S * 0.9 * Math.sqrt((k + 0.5) / 40), a = k * GA;
        D.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, r: b * 0.85 });
      }
      paint(ctx, D);
    },
  ],

  /* ── PATH — דרך · הכוונה · גילוי ── */
  PATH: [
    // 1. a dot travelling a straight dotted line
    (ctx, tl, t) => {
      const b = DOT / 2, cy = tl.H / 2, m = tl.W * 0.14;
      const D = [];
      for (let x = m; x <= tl.W - m; x += GAP * 1.8) D.push({ x, y: cy, r: b * 0.5 });
      const f = ease(frac(t * 0.38));
      D.push({ x: m + (tl.W - 2 * m) * f, y: cy, r: b * 1.7 });
      paint(ctx, D);
    },
    // 2. a dot moving station-to-station along a broken route
    (ctx, tl, t) => {
      const b = DOT / 2, W = tl.W, H = tl.H;
      const Pts = [[0.16, 0.72], [0.4, 0.34], [0.62, 0.62], [0.86, 0.28]].map(([x, y]) => [x * W, y * H]);
      const D = [];
      Pts.forEach(([x, y]) => D.push({ x, y, r: b * 1.05 }));
      for (let sgi = 0; sgi < Pts.length - 1; sgi++) {
        const [x0, y0] = Pts[sgi], [x1, y1] = Pts[sgi + 1], L = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(L / (GAP * 1.9));
        for (let j = 1; j < n; j++) D.push({ x: x0 + (x1 - x0) * j / n, y: y0 + (y1 - y0) * j / n, r: b * 0.45 });
      }
      const prog = frac(t * 0.22) * (Pts.length - 1), sgn = Math.min(Pts.length - 2, Math.floor(prog)), f = ease(prog - sgn);
      const [ax, ay] = Pts[sgn], [bx, by] = Pts[sgn + 1];
      D.push({ x: ax + (bx - ax) * f, y: ay + (by - ay) * f, r: b * 1.7 });
      paint(ctx, D);
    },
    // 3. several dots advancing one after another on the same route
    (ctx, tl, t) => {
      const b = DOT / 2, m = tl.W * 0.14;
      const y = (x) => tl.H / 2 + Math.sin((x / tl.W) * Math.PI * 2) * tl.H * 0.14;
      const D = [];
      for (let x = m; x <= tl.W - m; x += GAP * 2) D.push({ x, y: y(x), r: b * 0.42 });
      for (let k = 0; k < 4; k++) {
        const f = frac(t * 0.3 + k * 0.13), x = m + (tl.W - 2 * m) * f;
        D.push({ x, y: y(x), r: b * (1.6 - k * 0.22) });
      }
      paint(ctx, D);
    },
    // 4. a dot reaching a fork, choosing a branch, continuing to the exit
    (ctx, tl, t) => {
      const b = DOT / 2, W = tl.W, H = tl.H, m = W * 0.14, jx = W * 0.5;
      const branch = Math.floor(t * 0.24) % 2;                  // alternates each loop
      const yFor = (x, br) => x <= jx ? H / 2 : H / 2 + (br ? 1 : -1) * (x - jx) / (W - m - jx) * H * 0.24;
      const D = [{ x: jx, y: H / 2, r: b * 1.1 }];
      for (let x = m; x <= W - m; x += GAP * 1.9) {
        if (x <= jx) D.push({ x, y: H / 2, r: b * 0.45 });
        else { D.push({ x, y: yFor(x, 0), r: b * 0.45 }); D.push({ x, y: yFor(x, 1), r: b * 0.45 }); }
      }
      const f = ease(frac(t * 0.24)), x = m + (W - 2 * m) * f;
      D.push({ x, y: yFor(x, branch), r: b * 1.7 });
      paint(ctx, D);
    },
  ],

  /* ── PROTECTION — הגנה · שמירה ── */
  PROTECTION: [
    // 1. a ring of dots encircling a steady centre
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2;
      const D = [{ x: cx, y: cy, r: b * 1.25 }];
      for (let k = 0; k < 15; k++) { const a = k / 15 * A_TAU + t * 0.35; D.push({ x: cx + Math.cos(a) * S * 0.6, y: cy + Math.sin(a) * S * 0.6, r: b }); }
      paint(ctx, D);
    },
    // 2. guards circling the centre without ever entering it
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2;
      const D = [{ x: cx, y: cy, r: b * 0.8 }];
      for (let k = 0; k < 5; k++) {
        const a = t * (0.5 + k * 0.09) + k * A_TAU / 5, R = S * (0.42 + 0.18 * (k % 3) / 2);
        D.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, r: b * 1.15 });
      }
      paint(ctx, D);
    },
    // 3. a shell of dots closing into a full circle and easing open
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2;
      const span = Math.PI * (0.5 + 0.5 * P(t * 1.05)), D = [{ x: cx, y: cy, r: b }];
      for (let k = 0; k < 11; k++) {
        const f = k / 10 - 0.5;
        const aT = -Math.PI / 2 + f * 2 * span, aB = Math.PI / 2 + f * 2 * span;
        D.push({ x: cx + Math.cos(aT) * S * 0.62, y: cy + Math.sin(aT) * S * 0.62, r: b });
        D.push({ x: cx + Math.cos(aB) * S * 0.62, y: cy + Math.sin(aB) * S * 0.62, r: b });
      }
      paint(ctx, D);
    },
    // 4. scattered dots organizing into a closed boundary
    (ctx, tl, t, bo, i) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2;
      const m = ease(P(t * 0.7)), half = S * 0.62, D = [];
      for (let k = 0; k < 16; k++) {
        const e = Math.floor(k / 4), j = (k % 4) / 4 - 0.375;
        const tx = e === 0 ? cx + j * 2 * half : e === 1 ? cx + half : e === 2 ? cx - j * 2 * half : cx - half;
        const ty = e === 0 ? cy - half : e === 1 ? cy + j * 2 * half : e === 2 ? cy + half : cy - j * 2 * half;
        const sx = cx + (sd(i, k) - 0.5) * S * 1.4, sy = cy + (sd(i, k + 23) - 0.5) * S * 1.4;
        D.push({ x: sx + (tx - sx) * m, y: sy + (ty - sy) * m, r: b });
      }
      paint(ctx, D);
    },
  ],

  /* ── CYCLE — מחזוריות · המשכיות · נצח ── */
  CYCLE: [
    // 1. a dot on an endless circular track, trailing softly
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, R = S * 0.6;
      const D = [];
      for (let k = 0; k < 18; k++) { const a = k / 18 * A_TAU; D.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, r: b * 0.42 }); }
      for (let k = 0; k < 4; k++) { const a = t * 1.05 - k * 0.22; D.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, r: b * (1.6 - k * 0.32) }); }
      paint(ctx, D);
    },
    // 2. dots flowing along a spiral, in and out without end
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2;
      const D = [];
      for (let k = 0; k < 12; k++) {
        const f = frac(t * 0.16 + k / 12);
        const R = S * (0.12 + 0.72 * f), a = f * A_TAU * 2.2 + t * 0.5;
        D.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, r: b * (1.25 - 0.5 * f) });
      }
      paint(ctx, D);
    },
    // 3. three dot-groups cycling around at 120° to each other
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2;
      const D = [{ x: cx, y: cy, r: b * 0.8 }];
      for (let g = 0; g < 3; g++) {
        const base = t * 0.7 + g * A_TAU / 3;
        for (let j = 0; j < 3; j++) {
          const a = base - j * 0.17, R = S * (0.55 + Math.sin(t * 1.2 + g) * 0.06);
          D.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, r: b * (1.3 - j * 0.3) });
        }
      }
      paint(ctx, D);
    },
    // 4. a stream that leaves one side and returns from the other
    (ctx, tl, t, bo, i) => {
      const b = DOT / 2, D = [];
      for (let k = 0; k < 8; k++) {
        const f = frac(t * 0.22 + k / 8);
        const y = tl.H * (0.28 + 0.44 * sd(i, k));
        D.push({ x: f * tl.W, y, r: b * (0.8 + 0.5 * Math.sin(f * Math.PI)) });
      }
      paint(ctx, D);
    },
  ],

  /* ── STABILITY — יציבות · חוזק · עמידות ── */
  STABILITY: [
    // 1. a row of dots swaying a little and always returning home
    (ctx, tl, t) => {
      const b = DOT / 2, cy = tl.H / 2, n = 7, m = tl.W * 0.15, step = (tl.W - 2 * m) / (n - 1);
      const off = Math.sin(t * 1.05) * GAP * 0.55, D = [];
      for (let k = 0; k < n; k++) D.push({ x: m + k * step + off, y: cy, r: b });
      for (let k = 0; k < n; k++) D.push({ x: m + k * step, y: cy + GAP * 2.2, r: b * 0.4 });   // the home line, steady
      paint(ctx, D);
    },
    // 2. a lattice that trembles gently but never breaks
    (ctx, tl, t, bo, i) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, sp = S * 0.44;
      const D = [];
      let k = 0;
      for (let r = -1; r <= 1; r++) for (let c = -1; c <= 1; c++) {
        const jx = Math.sin(t * 1.9 + sd(i, k) * 9) * GAP * 0.16, jy = Math.cos(t * 1.7 + sd(i, k + 9) * 9) * GAP * 0.16;
        D.push({ x: cx + c * sp + jx, y: cy + r * sp + jy, r: b * (r === 0 && c === 0 ? 1.3 : 1) });
        k++;
      }
      paint(ctx, D);
    },
    // 3. a column of dots rising and settling within a small range
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, n = 6, m = tl.H * 0.16, step = (tl.H - 2 * m) / (n - 1);
      const off = Math.sin(t * 0.85) * GAP * 0.7, D = [];
      for (let k = 0; k < n; k++) D.push({ x: cx, y: m + k * step + off, r: b * (k === 0 ? 1.35 : 1) });
      D.push({ x: cx - GAP * 2.2, y: tl.H - m, r: b * 0.5 }, { x: cx + GAP * 2.2, y: tl.H - m, r: b * 0.5 });  // steady base
      paint(ctx, D);
    },
    // 4. dots drifting slightly apart and re-forming the same order
    (ctx, tl, t, bo, i) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, sp = S * 0.42;
      const burst = Math.max(0, Math.sin(t * 0.7)) ** 3, D = [];
      let k = 0;
      for (let r = -1; r <= 1; r++) for (let c = -1; c <= 1; c++) {
        const dx = (sd(i, k) - 0.5) * GAP * 2.4 * burst, dy = (sd(i, k + 31) - 0.5) * GAP * 2.4 * burst;
        D.push({ x: cx + c * sp + dx, y: cy + r * sp + dy, r: b });
        k++;
      }
      paint(ctx, D);
    },
  ],
};

/* Interleave the families across the 7×4 grid so no row/column clusters one
   family: tile i belongs to family (i % 7), variant floor(i / 7). Each family
   gets exactly four visually-distinct tiles expressing its motion principle. */
/* A quiet dotted BORDER for every tile — the tile's boundary in the dot
   language (cached per size). Drawn under the family animation. */
function drawTileFrame(ctx, tl) {
  if (!tl.cache || !tl.cache.frame) {
    const b = DOT / 2, ins = Math.min(tl.W, tl.H) * 0.06, gp = GAP * 1.7, F = [];
    const line = (x0, y0, x1, y1) => {
      const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / gp));
      for (let i = 0; i <= n; i++) F.push({ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n, r: b * 0.45 });
    };
    line(ins, ins, tl.W - ins, ins); line(ins, tl.H - ins, tl.W - ins, tl.H - ins);
    line(ins, ins, ins, tl.H - ins); line(tl.W - ins, ins, tl.W - ins, tl.H - ins);
    tl.cache = Object.assign(tl.cache || {}, { frame: F });
  }
  paint(ctx, tl.cache.frame);
}

const FAMILY_ORDER = ['PULSE', 'CENTER_PULL', 'EXPANSION', 'PATH', 'PROTECTION', 'CYCLE', 'STABILITY'];
const TILES = Array.from({ length: 28 }, (_, i) => {
  const family = FAMILY_ORDER[i % 7];
  const variant = Math.floor(i / 7);
  const fn = FAMILY_DRAWS[family][variant];
  return {
    id: 'movement-tile-' + String(i + 1).padStart(2, '0'),
    family,
    meaning: family,   // kept name-compatible: onSelect/onConfirm pass this
    draw(ctx, tl, t, bo) { fn(ctx, tl, t, bo || 0, i); },
  };
});

export const TILE_MEANINGS = TILES.map(t => t.family);

// Confirmation overlay — a single ring sweeps out (orange) enlarging dots.
function drawConfirm(ctx, tl, ce) {
  const g = grid(tl), b = DOT / 2, maxD = Math.hypot(tl.W, tl.H) / 2, width = GAP * 3.5, front = ce * (maxD + width);
  ctx.fillStyle = tl.dotColor; ctx.beginPath();
  for (const p of g.pts) { const d = Math.hypot(p.x - g.cx, p.y - g.cy), dd = Math.abs(d - front), bump = dd < width ? Math.cos(dd / width * Math.PI / 2) : 0; if (bump > 0.02) dot(ctx, p.x, p.y, b * (0.9 + bump * 1.6)); }
  ctx.fill();
}

// Every tile shares ONE look: the interface YELLOW plate with dark #282828 dots.
const TILE_BG = '#e2bc71', TILE_DOT = '#282828';
const SELECT_BG = '#ff5003', SELECT_DOT = '#f5f5ed';   // pressed tile: orange plate, cream dots
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
    tl.settledPaint = false;   // resized → repaint the settled frame once
  }
  const sizeAll = () => tiles.forEach(sizeTile);
  sizeAll();

  let selected = -1, chosen = -1, chosenAt = 0, done = false, raf = 0, t0 = performance.now();

  function setSelected(i) {
    if (chosen >= 0) return;
    selected = i;
    tiles.forEach(o => {
      const sel = o.i === i;
      o.cell.classList.toggle('is-selected', sel);
      o.cell.style.backgroundColor = sel ? SELECT_BG : TILE_BG;
      o.dotColor = sel ? SELECT_DOT : TILE_DOT;
      o.settledPaint = false;
    });
    if (onSelect) onSelect(i, TILES[i].meaning);
  }
  function deselect() {
    if (chosen >= 0) return;
    selected = -1;
    tiles.forEach(o => {
      o.cell.classList.remove('is-selected');
      o.cell.style.backgroundColor = TILE_BG;
      o.dotColor = TILE_DOT;
      o.settledPaint = false;
    });
  }

  function frame(now) {
    for (const tl of tiles) {
      const appeared = (now - t0) >= tl.appearAt;
      const aTarget = appeared ? 1 : 0;
      tl.alpha += (aTarget - tl.alpha) * 0.16;
      if (appeared && Math.abs(1 - tl.alpha) < 0.005) tl.alpha = 1;
      // Every tile has its OWN smooth clock; touch/hover only accelerates it a
      // little (reinforcing the tile's motion — never changing its family).
      const bo = (tl.i === selected || tl.i === chosen) ? 1 : (tl.hover ? 0.45 : 0);
      const dt = Math.min(0.1, (now - (tl._last || now)) / 1000);
      tl._last = now;
      if (!tl.frozen) tl.clock = (tl.clock || 0) + dt * (1 + 0.45 * bo);
      const ctx = tl.ctx;
      ctx.clearRect(0, 0, tl.W, tl.H);
      ctx.globalAlpha = tl.alpha;
      ctx.fillStyle = tl.dotColor;   // dark dots on the yellow plate
      ctx._dotScale = 1;
      drawTileFrame(ctx, tl);        // the tile's quiet dotted boundary
      ctx._dotScale = 1 + 0.3 * bo;  // emphasized dots on touch/hover
      TILES[tl.i].draw(ctx, tl, tl.clock || 0, bo);
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
    // Hover/touch-over gently reinforces the tile's own motion.
    tl.cell.addEventListener('pointerenter', () => { if (chosen < 0) tl.hover = true; });
    tl.cell.addEventListener('pointerleave', () => { tl.hover = false; });
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
