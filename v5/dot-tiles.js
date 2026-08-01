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

const DOT = 1.5;   // dot DIAMETER — small dots, close together: a fine dotted line
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
// One pitch for every outline: the dots of a motif keep the same rhythm as the
// interface's own grid, so the tile reads as drawn in the same material.
const ST = GAP * 0.75;              // the pitch of a large outline
// A small unit needs a finer pitch, or it stops being a shape and becomes a few
// loose dots. Anything under a fifth of the ornament is drawn at this.
const FINE = GAP * 0.55;
// Every motif is drawn INSIDE this radius, so a clear margin of plate is always
// left between the ornament and the tile's dotted frame.
const ART_R = tl => Math.min(tl.W, tl.H) * 0.335;
// The square every ornament is authored in (see sizeAll).
const ART = 100;
// stable per-tile pseudo-random (no state, safe to call every frame)
const sd = (i, k) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
const frac = v => v - Math.floor(v);
const ease = t => t * t * (3 - 2 * t);

/* Each draw(ctx, tl, t, bo): t = the tile's own smooth clock (already boost-
   scaled), bo = 0..1 reinforcement (hover 0.45 / selected 1). */
/* ── Ornament toolkit — every mark is a DOT on the interface's own pitch ──
   Moroccan-flavoured geometry: rosettes, repeating diamonds, star polygons,
   radial fans, weaves, frames and axes. No lines, fills, gradients or glow. */
const push = (D, x, y, r) => { if (r > 0.06) D.push({ x, y, r }); };
// dots evenly along a segment
const seg = (D, x0, y0, x1, y1, step, r) => {
  const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / step));
  for (let i = 0; i <= n; i++) push(D, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, r);
};
// dots around a circle (a ring); phase rotates it
const ring = (D, cx, cy, R, n, r, phase = 0) => {
  for (let i = 0; i < n; i++) { const a = phase + i / n * A_TAU; push(D, cx + Math.cos(a) * R, cy + Math.sin(a) * R, r); }
};
// dots along an arc
const arc = (D, cx, cy, R, a0, a1, n, r) => {
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; push(D, cx + Math.cos(a) * R, cy + Math.sin(a) * R, r); }
};
// a diamond (rotated square) outline
const diamond = (D, cx, cy, R, step, r) => {
  seg(D, cx, cy - R, cx + R, cy, step, r); seg(D, cx + R, cy, cx, cy + R, step, r);
  seg(D, cx, cy + R, cx - R, cy, step, r); seg(D, cx - R, cy, cx, cy - R, step, r);
};
// a star polygon outline (points alternating outer/inner radius)
const star = (D, cx, cy, rOut, rIn, points, step, r, phase = 0) => {
  const V = [];
  for (let i = 0; i < points * 2; i++) { const R = i % 2 ? rIn : rOut, a = phase - Math.PI / 2 + i / (points * 2) * A_TAU; V.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
  for (let i = 0; i < V.length; i++) { const A = V[i], B = V[(i + 1) % V.length]; seg(D, A[0], A[1], B[0], B[1], step, r); }
};
// a petal (two mirrored arcs) pointing outward at angle a
const petal = (D, cx, cy, a, len, wide, step, r) => {
  const n = Math.max(3, Math.round(len / step));
  for (let i = 0; i <= n; i++) {
    const f = i / n, d = f * len, w = Math.sin(f * Math.PI) * wide;
    const ux = Math.cos(a), uy = Math.sin(a);
    push(D, cx + ux * d - uy * w, cy + uy * d + ux * w, r);
    push(D, cx + ux * d + uy * w, cy + uy * d - ux * w, r);
  }
};

/* Each draw(ctx, tl, t, bo, i): t = the tile's own smooth clock, bo = 0..1
   reinforcement (hover 0.45 / selected 1), i = tile index (stable randomness).
   The MOTION always grows out of the ornament's own structure. */
const MEANING_DRAWS = {

  /* ═══ הגנה — ח'אתם, מסגרות, שער: מה שסוגר על ליבה ═══ */
  protection: [
    // 1. ח'אתם — the eight-point seal turning slowly on its own centre
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const turn = Math.sin(t * 0.22) * 0.09;
      star(D, cx, cy, S * 0.94, S * 0.42, 8, ST, b, turn);
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
    // 2. two diamond frames — the guard passes from the outer to the inner
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const k = P(t * 0.4);
      diamond(D, cx, cy, S, ST, b);
      diamond(D, cx, cy, S * (0.46 + 0.08 * k), ST, b);
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
    // 3. a square frame whose four corner keys step toward the core
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const m = S * 0.96, k = P(t * 0.45);
      seg(D, cx - m, cy - m, cx + m, cy - m, ST, b); seg(D, cx - m, cy + m, cx + m, cy + m, ST, b);
      seg(D, cx - m, cy - m, cx - m, cy + m, ST, b); seg(D, cx + m, cy - m, cx + m, cy + m, ST, b);
      const d = m * (0.60 - 0.08 * k);
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => diamond(D, cx + sx * d, cy + sy * d, S * 0.24, ST, b));
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
    // 4. the horseshoe gate, breathing on its own base line
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const R = S * (0.60 + 0.03 * Math.sin(t * 0.5)), base = cy + S * 0.92, spring = cy - S * 0.02;
      const legN = Math.max(2, Math.round((base - spring) / ST));
      for (let i = 0; i <= legN; i++) {
        const y = base - (base - spring) * (i / legN);
        push(D, cx - R, y, b); push(D, cx + R, y, b);
      }
      const aN = Math.max(6, Math.round(Math.PI * 1.2 * R / ST));
      for (let i = 0; i <= aN; i++) {
        const a = Math.PI * (1.10 - 1.20 * (i / aN));
        push(D, cx + Math.cos(a) * R, spring - Math.sin(a) * R, b);
      }
      seg(D, cx - S * 0.96, base, cx + S * 0.96, base, ST, b);
      paint(ctx, D);
    },
  ],

  /* ═══ שפע — ורדות, עלי כותרת, גרגרים: מה שמתרבה ═══ */
  abundance: [
    // 5. the seed rosette, opening and closing from its own centre
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const open = 0.86 + 0.14 * P(t * 0.5);                      // it opens from its centre
      for (let k = 0; k < 6; k++) petal(D, cx, cy, k / 6 * A_TAU, S * 0.94 * open, S * 0.26 * open, ST, b);
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
    // 6. quatrefoil — the four lobes swell together and let go
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const sw = 1 + 0.06 * Math.sin(t * 0.55);
      for (let k = 0; k < 4; k++) {
        const a = k / 4 * A_TAU - Math.PI / 2, R = S * 0.42 * sw, off = S * 0.52 * sw;
        ring(D, cx + Math.cos(a) * off, cy + Math.sin(a) * off, R, Math.round(A_TAU * R / ST), b);
      }
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
    // 7. three grains on one line — the middle one holds the eye
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const sp = S * (0.66 + 0.05 * Math.sin(t * 0.45)), R = S * 0.27;
      [-1, 0, 1].forEach(k => ring(D, cx + k * sp, cy, R, Math.round(A_TAU * R / ST), b));
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
    // 8. an eight-petal flower turning slowly
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const a0 = t * 0.09;
      for (let k = 0; k < 8; k++) petal(D, cx, cy, a0 + k / 8 * A_TAU, S * 0.92, S * 0.20, ST, b);
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
  ],

  /* ═══ התחדשות — גלים, טבעות שנולדות, חלת דבש ═══ */
  renewal: [
    // 9. rings born at the centre and released outward
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      for (let k = 0; k < 3; k++) {
        const f = frac(t * 0.15 + k / 3), R = S * (0.22 + 0.78 * f);
        ring(D, cx, cy, R, Math.max(8, Math.round(A_TAU * R / ST)), b);
      }
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
    // 10. two waves running under one another
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const span = S * 1.92, n = Math.round(span / ST);
      [-1, 1].forEach(s => {
        for (let i = 0; i <= n; i++) {
          const f = i / n, x = cx - span / 2 + span * f;
          push(D, x, cy + s * S * 0.40 + Math.sin(f * A_TAU * 1.5 + t * 0.6 * s) * S * 0.22, b);
        }
      });
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
    // 11. a spiral flowing outward along its own arm
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const turns = 2.2, n = 34, a0 = t * 0.15;
      for (let i = 0; i <= n; i++) {
        const f = i / n, a = a0 + f * turns * A_TAU, R = S * (0.14 + 0.86 * f);
        push(D, cx + Math.cos(a) * R, cy + Math.sin(a) * R, b);
      }
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
    // 12. a honeycomb of seven cells, breathing as one body
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const R = S * (0.33 + 0.02 * Math.sin(t * 0.45)), dx = R * Math.sqrt(3), cells = [[0, 0]];
      for (let k = 0; k < 6; k++) { const a = k / 6 * A_TAU + Math.PI / 6; cells.push([Math.cos(a) * dx, Math.sin(a) * dx]); }
      cells.forEach(([ox, oy]) => {
        for (let k = 0; k < 6; k++) {
          const a1 = k / 6 * A_TAU, a2 = (k + 1) / 6 * A_TAU;
          seg(D, cx + ox + Math.cos(a1) * R, cy + oy + Math.sin(a1) * R,
                 cx + ox + Math.cos(a2) * R, cy + oy + Math.sin(a2) * R, ST, b);
        }
      });
      paint(ctx, D);
    },
  ],

  /* ═══ דרך — שברונים, צירים, הצטלבות ═══ */
  path: [
    // 13. three chevrons climbing, one behind the other
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const w = S * 0.86, h = S * 0.40, drift = frac(t * 0.18);
      for (let k = 0; k < 3; k++) {
        const y = cy + S * 0.92 - ((k + drift) % 3) * S * 0.72;
        seg(D, cx - w, y + h, cx, y, ST, b); seg(D, cx, y, cx + w, y + h, ST, b);
      }
      paint(ctx, D);
    },
    // 14. the axis — two arms measured out from the centre and drawn back
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const reach = S * (0.72 + 0.24 * P(t * 0.5));
      seg(D, cx - reach, cy, cx - S * 0.20, cy, ST, b);
      seg(D, cx + S * 0.20, cy, cx + reach, cy, ST, b);
      diamond(D, cx - reach, cy, S * 0.18, ST, b); diamond(D, cx + reach, cy, S * 0.18, ST, b);
      push(D, cx, cy, b * 1.8);
      paint(ctx, D);
    },
    // 15. the crossing — its two diagonals reach out in turn
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const k1 = 0.80 + 0.18 * P(t * 0.5), k2 = 0.80 + 0.18 * P(t * 0.5 + Math.PI), d = S * 0.72;
      seg(D, cx - d * k1, cy - d * k1, cx + d * k1, cy + d * k1, ST, b);
      seg(D, cx - d * k2, cy + d * k2, cx + d * k2, cy - d * k2, ST, b);
      push(D, cx, cy, b * 1.8);
      paint(ctx, D);
    },
    // 16. a folded path — the fold travels along it
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const sw = Math.sin(t * 0.5) * 0.12;
      const V = [[-0.94, 0.52 + sw], [-0.31, -0.46 + sw], [0.31, 0.52 - sw], [0.94, -0.46 - sw]]
        .map(([x, y]) => [cx + x * S, cy + y * S]);
      for (let i = 0; i < V.length - 1; i++) seg(D, V[i][0], V[i][1], V[i + 1][0], V[i + 1][1], ST, b);
      paint(ctx, D);
    },
  ],

  /* ═══ הרמוניה — סריג, סימטריה, מאזן ═══ */
  harmony: [
    // 17. a net of five diamonds — the four answer the one
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const off = S * (0.56 + 0.05 * Math.sin(t * 0.5)), R = S * 0.34;
      diamond(D, cx, cy, R, ST, b);
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([sx, sy]) => diamond(D, cx + sx * off * 1.35, cy + sy * off * 1.35, R * 0.72, ST, b));
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
    // 18. the seal inside its frame — one turns, the other holds
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      diamond(D, cx, cy, S, ST, b);
      star(D, cx, cy, S * 0.44, S * 0.19, 8, ST, b, t * 0.11);
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
    // 19. four around one — they breathe out and back together
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const off = S * (0.62 + 0.08 * Math.sin(t * 0.45));
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => diamond(D, cx + sx * off, cy + sy * off, S * 0.24, ST, b));
      diamond(D, cx, cy, S * 0.30, ST, b);
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
    // 20. two rings holding one another, one turning inside the other
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      ring(D, cx, cy, S, Math.round(A_TAU * S / ST), b);
      const R2 = S * 0.56;
      ring(D, cx, cy, R2, Math.round(A_TAU * R2 / ST), b, t * 0.16);
      push(D, cx, cy, b * 1.8);
      paint(ctx, D);
    },
  ],

  /* ═══ חיוניות — שמש, קרניים, קרינה ═══ */
  vitality: [
    // 21. a sunburst — the eight rays reach out and draw back as one
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const reach = 0.78 + 0.20 * P(t * 0.55);
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * A_TAU;
        seg(D, cx + Math.cos(a) * S * 0.30, cy + Math.sin(a) * S * 0.30,
               cx + Math.cos(a) * S * reach, cy + Math.sin(a) * S * reach, ST, b);
      }
      push(D, cx, cy, b * 1.8);
      paint(ctx, D);
    },
    // 22. a twelve-point star, turning
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      star(D, cx, cy, S, S * 0.50, 8, ST, b, t * 0.07);
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
    // 23. the sun disc — its short rays grow and draw back together
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const R = S * 0.54;
      ring(D, cx, cy, R, Math.round(A_TAU * R / ST), b);
      const len = S * (0.20 + 0.14 * P(t * 0.6));
      for (let k = 0; k < 12; k++) {
        const a = k / 12 * A_TAU;
        seg(D, cx + Math.cos(a) * (R + ST * 1.4), cy + Math.sin(a) * (R + ST * 1.4),
               cx + Math.cos(a) * (R + ST * 1.4 + len), cy + Math.sin(a) * (R + ST * 1.4 + len), ST, b);
      }
      push(D, cx, cy, b * 1.8);
      paint(ctx, D);
    },
    // 24. four diamonds carried outward along the diagonals, and back
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const off = S * (0.52 + 0.24 * P(t * 0.5));
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + k / 4 * A_TAU;
        diamond(D, cx + Math.cos(a) * off, cy + Math.sin(a) * off, S * 0.26, ST, b);
      }
      push(D, cx, cy, b * 1.8);
      paint(ctx, D);
    },
  ],

  /* ═══ מזל — קמעות בפינות, תלתן, אריח מנוקד ═══ */
  luck: [
    // 25. four corner charms leaning toward the centre and back
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const off = S * (0.64 + 0.06 * Math.sin(t * 0.5));
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) =>
        star(D, cx + sx * off, cy + sy * off, S * 0.30, S * 0.12, 4, ST, b, Math.PI / 4));
      diamond(D, cx, cy, S * 0.22, ST, b);
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
    // 26. the clover — four lobes turning gently on their centre
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const a0 = Math.sin(t * 0.3) * 0.16;
      for (let k = 0; k < 4; k++) {
        const a = a0 + Math.PI / 4 + k / 4 * A_TAU, R = S * 0.40, off = S * 0.50;
        ring(D, cx + Math.cos(a) * off, cy + Math.sin(a) * off, R, Math.round(A_TAU * R / ST), b);
      }
      push(D, cx, cy, b * 1.8);
      paint(ctx, D);
    },
    // 27. a diamond within a diamond, each turning against the other
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const k = P(t * 0.45);
      diamond(D, cx, cy, S, ST, b);
      const m = S * 0.50 * (0.92 + 0.12 * k);
      seg(D, cx - m, cy - m, cx + m, cy - m, ST, b); seg(D, cx - m, cy + m, cx + m, cy + m, ST, b);
      seg(D, cx - m, cy - m, cx - m, cy + m, ST, b); seg(D, cx + m, cy - m, cx + m, cy + m, ST, b);
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
    // 28. five charms in a quincunx, the outer four drifting on their circle
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const a0 = Math.sin(t * 0.28) * 0.2, off = S * 0.68;
      for (let k = 0; k < 4; k++) {
        const a = a0 + k / 4 * A_TAU - Math.PI / 2;
        star(D, cx + Math.cos(a) * off, cy + Math.sin(a) * off, S * 0.26, S * 0.10, 4, ST, b, Math.PI / 4);
      }
      star(D, cx, cy, S * 0.32, S * 0.13, 8, ST, b, 0);
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
  ],
};

/* The seven MEANING groups, interleaved across the grid (tile i belongs to
   group i % 7) so no row or column clusters one meaning. Each group owns four
   ornaments; the ornament's structure is what its motion is made of, and the
   group is what the questionnaire maps to a symbol. */
const MEANING_ORDER = ['protection', 'abundance', 'renewal', 'path', 'harmony', 'vitality', 'luck'];
const TILES = Array.from({ length: 28 }, (_, i) => {
  const meaning = MEANING_ORDER[i % 7];
  const variant = Math.floor(i / 7);
  const fn = MEANING_DRAWS[meaning][variant];
  return {
    id: 'movement-tile-' + String(i + 1).padStart(2, '0'),
    meaningGroup: meaning,
    meaning,           // what onSelect/onConfirm hand back
    draw(ctx, tl, t, bo) { fn(ctx, tl, t, bo || 0, i); },
  };
});


/* ── SIX TEST ORNAMENTS ────────────────────────────────────────────────────
   A trial of the ornament LANGUAGE before the 28 are rebuilt in it. Each one is
   a whole decorative unit, not an icon floating in a square: layered geometry,
   radial symmetry, repeating units around a centre, built from ONE dot size
   (a few accents at most 1.4×, never a large centre dot). Every motion happens
   inside the geometry, so the ornament stays readable while it moves.

   Shown only with ?tiletest=1 — the stage's own 28 tiles are untouched.
   ──────────────────────────────────────────────────────────────────────── */

// dots along an arc at an EVEN arc-length pitch (so density never changes)
const arcAt = (D, cx, cy, R, a0, a1, step, r) => {
  const n = Math.max(1, Math.round(Math.abs(a1 - a0) * R / step));
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; push(D, cx + Math.cos(a) * R, cy + Math.sin(a) * R, r); }
};
// a ring broken into K repeating segments (fill = how much of each slot is drawn)
const ringSegs = (D, cx, cy, R, K, fill, step, r, phase = 0) => {
  const w = A_TAU / K * fill;
  for (let k = 0; k < K; k++) { const a0 = phase + k * A_TAU / K - w / 2; arcAt(D, cx, cy, R, a0, a0 + w, step, r); }
};
// a closed regular polygon in dots
const poly = (D, cx, cy, R, N, step, r, phase = 0) => {
  for (let i = 0; i < N; i++) {
    const a1 = phase + i / N * A_TAU, a2 = phase + (i + 1) / N * A_TAU;
    seg(D, cx + Math.cos(a1) * R, cy + Math.sin(a1) * R, cx + Math.cos(a2) * R, cy + Math.sin(a2) * R, step, r);
  }
};
// a petal drawn as an OUTLINE: two circular arcs from the core to the tip
const leaf = (D, cx, cy, ang, r0, r1, W, step, r) => {
  const L = r1 - r0, R = (W * W + (L / 2) * (L / 2)) / (2 * W), oy = R - W;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const put = (x, y) => push(D, cx + (r0 + x) * ca - y * sa, cy + (r0 + x) * sa + y * ca, r);
  for (const side of [1, -1]) {
    const a0 = Math.atan2(oy, -L / 2), a1 = Math.atan2(oy, L / 2);
    const n = Math.max(3, Math.round(Math.abs(a1 - a0) * R / step));
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n;
      put(L / 2 + Math.cos(a) * R, side * (-oy + Math.sin(a) * R));
    }
  }
};
const ACC = 1;       // every dot the same size — the richness is the geometry

const TEST_DRAWS = [
  // T1 · MEDALLION — an outer course, a ring of repeating diamonds, an inner
  //      ring. Three clear layers, air between them.
  //      Motion: the diamond course turns; the rings breathe against each other.
  (ctx, tl, t) => {
    const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
    const br = 0.03 * Math.sin(t * 0.5);
    const R1 = S * (1 + br), R3 = S * 0.30 * (1 - br), Rm = S * 0.64;
    ring(D, cx, cy, R1, Math.round(A_TAU * R1 / ST), b);
    ring(D, cx, cy, R3, Math.round(A_TAU * R3 / ST), b);
    for (let k = 0; k < 8; k++) {
      const a = t * 0.07 + k / 8 * A_TAU;
      diamond(D, cx + Math.cos(a) * Rm, cy + Math.sin(a) * Rm, S * 0.21, FINE, b);
    }
    paint(ctx, D);
  },

  // T2 · ROSETTE — eight petals rooted on a small ring, tips on a broken course.
  //      Motion: the petals open and close together.
  (ctx, tl, t) => {
    const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
    const open = 0.9 + 0.1 * P(t * 0.5), r0 = S * 0.26;
    for (let k = 0; k < 8; k++) leaf(D, cx, cy, k / 8 * A_TAU, r0, S * 0.90 * open, S * 0.20 * open, ST, b);
    ring(D, cx, cy, r0, Math.round(A_TAU * r0 / ST), b);
    paint(ctx, D);
  },

  // T3 · NESTED DIAMONDS — three frames, four small diamonds set on the
  //      diagonals between the outer two. Motion: a wave passes outward.
  (ctx, tl, t) => {
    const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
    const wave = (i) => 1 + 0.045 * Math.sin(t * 0.65 - i * 1.2);
    [1, 0.64, 0.30].forEach((k, i) => diamond(D, cx, cy, S * k * wave(i), ST, b));
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + k / 4 * A_TAU, R = S * 0.82 * wave(0.5);
      diamond(D, cx + Math.cos(a) * R, cy + Math.sin(a) * R, S * 0.19, FINE, b);
    }
    paint(ctx, D);
  },

  // T4 · INTERLACE — two squares locked into one eight-point star, on a ring.
  //      Motion: the two turn against one another, the star opening and closing.
  (ctx, tl, t) => {
    const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
    const turn = Math.sin(t * 0.35) * 0.16;
    poly(D, cx, cy, S * 0.96, 4, ST, b, Math.PI / 4 + turn);
    poly(D, cx, cy, S * 0.96, 4, ST, b, -turn);
    const R = S * 0.30;
    ring(D, cx, cy, R, Math.round(A_TAU * R / ST), b);
    paint(ctx, D);
  },

  // T5 · SPIRAL — one arm walked at an even pitch, opening from the core.
  //      Motion: the whole spiral turns, so the eye flows along the arm.
  (ctx, tl, t) => {
    const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
    const turns = 2.2, R0 = S * 0.22, R1 = S * 0.94, spin = t * 0.13, step = ST;
    let a = 0;                                          // one clean arm
    while (a < turns * A_TAU) {
      const R = R0 + (R1 - R0) * (a / (turns * A_TAU));
      push(D, cx + Math.cos(a + spin) * R, cy + Math.sin(a + spin) * R, b);
      a += step / Math.max(R, 1);
    }
    const Rc = S * 0.15;
    ring(D, cx, cy, Rc, Math.round(A_TAU * Rc / FINE), b);      // the core it opens from
    paint(ctx, D);
  },

  // T6 · AXES — a square frame, the two axes crossing it, a small square in each
  //      quarter. Motion: the axes answer one another, in and out.
  (ctx, tl, t) => {
    const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
    const m = S * 0.92, k = P(t * 0.5);
    poly(D, cx, cy, m * Math.SQRT2, 4, ST, b, Math.PI / 4);
    const hx = m * (0.55 + 0.40 * k), vy = m * (0.55 + 0.40 * (1 - k));
    seg(D, cx - hx, cy, cx + hx, cy, ST, b);
    seg(D, cx, cy - vy, cx, cy + vy, ST, b);
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) =>
      poly(D, cx + sx * m * 0.55, cy + sy * m * 0.55, S * 0.24, 4, FINE, b, Math.PI / 4));
    paint(ctx, D);
  },
];

/* The six carry the first six meaning groups, so choosing one still runs the
   stage's own flow untouched. */
export const TEST_TILES = TEST_DRAWS.map((fn, i) => ({
  id: 'test-tile-' + (i + 1),
  meaningGroup: MEANING_ORDER[i],
  meaning: MEANING_ORDER[i],
  draw(ctx, tl, t, bo) { fn(ctx, tl, t, bo || 0, i); },
}));

export const TILE_MEANINGS = TILES.map(t => t.meaningGroup);
export const __TILE_DRAWS = { MEANING_DRAWS, MEANING_ORDER, TILES };   // dev/verification

/* A quiet dotted BORDER for every tile — the tile's boundary in the dot
   language (cached per size). Drawn under the ornament. */
function drawTileFrame(ctx, tl) {
  if (!tl.cache || !tl.cache.frame) {
    const b = DOT / 2, ins = Math.min(tl.W, tl.H) * 0.06, gp = GAP * 1.15, F = [];
    const line = (x0, y0, x1, y1) => {
      const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / gp));
      for (let i = 0; i <= n; i++) F.push({ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n, r: b * 0.7 });
    };
    line(ins, ins, tl.W - ins, ins); line(ins, tl.H - ins, tl.W - ins, tl.H - ins);
    line(ins, ins, ins, tl.H - ins); line(tl.W - ins, ins, tl.W - ins, tl.H - ins);
    tl.cache = Object.assign(tl.cache || {}, { frame: F });
  }
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * 0.5;           // a boundary, quieter than anything inside
  paint(ctx, tl.cache.frame);
  ctx.globalAlpha = a;
}

// Confirmation overlay — a single ring sweeps out (orange) enlarging dots.
function drawConfirm(ctx, tl, ce) {
  const g = grid(tl), b = DOT / 2, maxD = Math.hypot(tl.W, tl.H) / 2, width = GAP * 3.5, front = ce * (maxD + width);
  ctx.fillStyle = tl.dotColor; ctx.beginPath();
  for (const p of g.pts) { const d = Math.hypot(p.x - g.cx, p.y - g.cy), dd = Math.abs(d - front), bump = dd < width ? Math.cos(dd / width * Math.PI / 2) : 0; if (bump > 0.02) dot(ctx, p.x, p.y, b * (0.9 + bump * 1.6)); }
  ctx.fill();
}

// Every tile shares ONE look: the interface YELLOW plate with dark #282828 dots.
const TILE_BG = '#e2bc71', TILE_DOT = '#282828';
const SELECT_BG = ORANGE, SELECT_DOT = CREAM;   // pressed tile: the interface's own orange plate, cream dots
// Tiles are STATIC — drawn at this frozen frame — and only animate while the
// pointer is over them (hover / touch). STAGGER = per-tile entrance delay.
const STATIC_T = 2.2, STAGGER = 55, APPEAR_MS = 300;

/* ── The stage is a horizontal GALLERY of the 28 tiles ─────────────────────
   One tile sits at the centre at full size; its neighbours flank it, smaller,
   so the row reads as a continuous strip you push with your hand rather than a
   slideshow. Every tile keeps animating wherever it stands. Scale, position and
   presence are all derived from a tile's distance from the centre, so nothing
   "starts an animation" on arrival — it is one continuous state.

   The tiles, their drawings and their mapping to meaning + symbol are exactly
   as before; only the way they are shown and chosen changed. */
const GAL_SCALE_MIN = 0.92;   // a neighbour — only a little smaller
const CENTER_SCALE = 1;       // the active tile
const DRAG_TAP_PX = 8;        // beyond this the gesture is a swipe, never a tap
const FLICK_MAX = 2.6;        // how many tiles one strong flick may carry
const ENTER_MS = 520;

export function mountDotTiles(host, { onSelect, onConfirm } = {}) {
  const noop = () => {};
  if (!host) return { teardown: noop, confirm: noop, selectTile: noop, stopActive: noop, deselect: noop, tileCenter: () => null, count: 0, appearMs: 0 };

  const gridEl = document.createElement('div');
  gridEl.className = 'dot-tiles-grid dot-gallery';
  const innerEl = document.createElement('div');
  innerEl.className = 'dot-tiles-inner';
  gridEl.appendChild(innerEl);
  const counterEl = document.createElement('div');
  counterEl.className = 'dot-gallery-count';
  gridEl.appendChild(counterEl);
  host.appendChild(gridEl);

  // ?tiletest=1 → the six trial ornaments instead of the 28 (the stage, its
  // mapping and its flow are untouched; without the flag nothing changes).
  const SET = /[?&#]tiletest=1/.test(location.search + location.hash) ? TEST_TILES : TILES;
  const N = SET.length;
  const tiles = [];
  for (let i = 0; i < N; i++) {
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
      rnd: mulberry32(1000 + i * 7919), inten: 0.45, alpha: 1,
      frozen: false, frozenT: 0, confirmT: -1, cache: null, clock: i * 0.37 });
  }

  /* The stage's frame: the two full-height dotted verticals that bracket it.
     Returns how far they sit inside the gallery box, in LAYOUT pixels. */
  function frameInset() {
    const g = gridEl.getBoundingClientRect();
    const sc = screenScale || 1;
    if (!g.width) return { L: 0, R: 0 };
    const mid = (g.left + g.right) / 2;
    let L = 0, R = 0;
    for (const el of document.querySelectorAll('#section-3 .sg-v')) {
      const r = el.getBoundingClientRect();
      if (r.height < g.height * 0.6) continue;                 // short ticks, not the frame
      if (r.left <= mid) L = Math.max(L, r.left - g.left);
      else R = Math.max(R, g.right - r.right);
    }
    return { L: Math.max(0, L) / sc, R: Math.max(0, R) / sc };
  }

  /* ── Geometry. The tile box is square, sized off the gallery height. ── */
  let boxW = 0, boxH = 0, galW = 0, ready = false;
  let screenScale = 1;   // how much the whole interface is scaled on the way to the glass
  function sizeAll() {
    // LAYOUT pixels (clientWidth/Height), not getBoundingClientRect: the whole
    // interface lives inside a scaled wrapper, and a size measured after that
    // scale would be shrunk a second time when written back as CSS.
    galW = gridEl.clientWidth || 1;
    const galH = gridEl.clientHeight || 1;
    screenScale = (gridEl.getBoundingClientRect().width || galW) / galW;
    // The row is CUT on the interface's own vertical grid lines: a tile may run
    // past them, but nothing is ever drawn outside the frame the stage sits in.
    const ins = frameInset();
    gridEl.style.clipPath = `inset(0 ${ins.R}px 0 ${ins.L}px)`;
    galW = Math.max(80, galW - ins.L - ins.R);
    // The centre tile claims the frame; its neighbours run off both edges and
    // are cut there — the gallery clips exactly on the interface's grid lines.
    boxH = Math.max(60, Math.min(galH * 0.78, galW * 0.46));
    boxW = boxH;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Published as a variable the CSS applies with !important — the stage's own
    // grid rules size .dot-tile with !important and would otherwise win.
    gridEl.style.setProperty('--tile-size', boxW + 'px');
    // Every ornament is DRAWN IN ITS OWN 100-unit square and the canvas is
    // scaled to the tile. That is what keeps a dot a dot: with a fixed pixel
    // pitch a big tile would only get more, finer dots and the motif would
    // dissolve into dust — here the whole drawing grows with the plate.
    const k = boxW / ART;
    for (const tl of tiles) {
      tl.W = ART; tl.H = ART;
      tl.canvas.width = Math.round(boxW * dpr); tl.canvas.height = Math.round(boxH * dpr);
      tl.ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
      tl.cache = null;
    }
    if (ready) layoutFrame(performance.now());     // re-place the row at the new size
  }
  sizeAll();
  // The stage reveals with a transform, so the gallery briefly reports a small
  // box; re-measure whenever it settles (and once more shortly after mount)
  // rather than freezing the tile size at whatever it was during the entrance.
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => sizeAll()) : null;
  ro && ro.observe(gridEl);
  const sizeTimers = [80, 260, 620, 1200].map(ms => setTimeout(sizeAll, ms));

  /* ── State: `pos` is the gallery's position in TILE UNITS (fractional). ── */
  let pos = 0, vel = 0;
  let dragging = false, dragId = -1, lastX = 0, moved = 0, lastT = 0;
  let selected = -1, chosen = -1, chosenAt = 0, done = false, locked = false;
  let raf = 0, t0 = performance.now(), pulseAt = -1, hintDone = false;
  // Half of the tile before and half of the tile after: their centres sit
  // exactly on the frame lines the gallery is cut on.
  const galStep = () => Math.max(boxW * 0.6, galW * 0.5);
  const wrap = (v) => ((v % N) + N) % N;                       // the row is a loop
  const centreIndex = () => wrap(Math.round(pos));

  function layoutFrame(now) {
    const step = galStep();
    const enter = clamp01((now - t0) / ENTER_MS);
    const enterEase = 1 - Math.pow(1 - enter, 3);
    for (const tl of tiles) {
      // shortest signed distance from the centre, wrapped — so tiles that pass
      // an end reappear at the other, one continuous loop with no duplicates.
      let d = tl.i - pos;
      d = ((d % N) + N) % N; if (d > N / 2) d -= N;
      const ad = Math.abs(d);
      const s = Math.max(GAL_SCALE_MIN, CENTER_SCALE - (CENTER_SCALE - GAL_SCALE_MIN) * Math.min(1, ad));
      const x = d * step + (1 - enterEase) * step * 1.6;        // the row slides in
      const vis = ad < 1.65;                                    // the centre and one slice each side
      tl.cell.style.display = vis ? 'block' : 'none';
      if (!vis) continue;
      tl.scale = s;
      const sel = (tl.i === chosen || tl.i === selected);
      let pulse = 1;
      if (pulseAt > 0) { const k = clamp01((now - pulseAt) / 260); pulse = sel ? 1 + 0.05 * Math.sin(k * Math.PI) : 1; }
      tl.cell.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0) scale(${(s * pulse).toFixed(3)})`;
      tl.cell.style.zIndex = String(100 - Math.round(ad * 10));
      // presence follows distance too — the centre is the focus, the flanks hint
      // the focus is unmistakable: the centre is present, the flanks recede
      tl.alpha = (chosen >= 0 && tl.i !== chosen) ? 0.28 : (1 - 0.55 * Math.min(1, ad)) * enterEase;
      tl.cell.style.opacity = String(tl.alpha);
    }
    counterEl.textContent = String(centreIndex() + 1).padStart(2, '0') + ' / ' + N;
  }

  function frame(now) {
    // scheduled FIRST: a throw anywhere below must never be able to kill the
    // loop and leave the whole row blank.
    raf = requestAnimationFrame(frame);
    // physics: momentum, then a soft pull to the nearest tile
    if (!dragging && !locked) {
      pos += vel;
      vel *= 0.92;
      if (Math.abs(vel) < 0.004) {
        vel = 0;
        const target = Math.round(pos);
        pos += (target - pos) * 0.18;                            // snap, never a jump
        if (Math.abs(target - pos) < 0.0008) pos = target;
      }
    }
    layoutFrame(now);

    for (const tl of tiles) {
      if (tl.cell.style.display === 'none') continue;
      const bo = (tl.i === selected || tl.i === chosen) ? 1 : 0;
      const dt = Math.min(0.1, (now - (tl._last || now)) / 1000);
      tl._last = now;
      if (!tl.frozen) tl.clock = (tl.clock || 0) + dt * (1 + 0.45 * bo);   // never restarted
      const ctx = tl.ctx;
      ctx.clearRect(0, 0, tl.W, tl.H);
      ctx.globalAlpha = 1;
      ctx.fillStyle = tl.dotColor;
      ctx._dotScale = 1;
      drawTileFrame(ctx, tl);
      ctx._dotScale = 1 + 0.3 * bo;
      SET[tl.i].draw(ctx, tl, tl.clock || 0, bo);
      if (tl.i === chosen && tl.confirmT >= 0) drawConfirm(ctx, tl, clamp01((now - chosenAt) / CONFIRM_MS));
      ctx.globalAlpha = 1;
    }
  }
  ready = true;
  layoutFrame(t0);                 // the row is in place on the very first paint
  raf = requestAnimationFrame(frame);

  // one small nudge after the row settles — a hint that it can be swiped
  const hintTimer = setTimeout(() => { if (!hintDone && !dragging && chosen < 0) { hintDone = true; vel = -0.055; } }, ENTER_MS + 420);

  /* ── Touch: drag the row, flick it, tap the centre to choose. ── */
  const px = (e) => e.clientX;
  gridEl.addEventListener('pointerdown', (e) => {
    if (locked || chosen >= 0) return;
    dragging = true; dragId = e.pointerId; lastX = px(e); moved = 0; lastT = performance.now(); vel = 0;
    try { gridEl.setPointerCapture(e.pointerId); } catch (_) {}
  });
  gridEl.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== dragId) return;
    const x = px(e), dx = (x - lastX) / (screenScale || 1); lastX = x;
    moved += Math.abs(dx);
    const step = galStep();
    const dpos = -dx / step;                                     // finger px → tile units
    pos += dpos;
    const now = performance.now(), dt = Math.max(8, now - lastT); lastT = now;
    vel = dpos * (16 / dt);                                      // carried into the release
    layoutFrame(now);                                            // the row tracks the finger 1:1
  });
  const endDrag = (e) => {
    if (!dragging || (e && e.pointerId !== dragId)) return;
    dragging = false;
    try { gridEl.releasePointerCapture(dragId); } catch (_) {}
    vel = Math.max(-FLICK_MAX * 0.12, Math.min(FLICK_MAX * 0.12, vel));   // controlled flick
    if (moved <= DRAG_TAP_PX) {                                  // a tap, not a swipe
      const tgt = e && e.target && e.target.closest ? e.target.closest('.dot-tile') : null;
      const i = tgt ? Number(tgt.dataset.index) : -1;
      if (i >= 0) {
        if (i === centreIndex()) select(i);                       // only the centre can be chosen
        else { let d = i - pos; d = ((d % N) + N) % N; if (d > N / 2) d -= N; pos += d * 0.999; vel = 0; }  // bring it to the centre first
      }
    }
  };
  gridEl.addEventListener('pointerup', endDrag);
  gridEl.addEventListener('pointercancel', () => { dragging = false; });

  function select(i) {
    if (chosen >= 0) return;
    if (selected >= 0 && selected !== i) plate(tiles[selected], false);
    selected = i;
    plate(tiles[i], true);                                       // pressed → orange plate
    pulseAt = performance.now();
    locked = true;                                               // no swiping mid-transition
    setTimeout(() => { locked = false; }, 420);
    if (onSelect) onSelect(i, SET[i].meaning);
  }
  function deselect() {
    if (chosen >= 0) return;
    if (selected >= 0) plate(tiles[selected], false);
    selected = -1; pulseAt = -1;
  }

  /* Being at the centre is only where the eye is; PRESSING is the choice. Only
     a press fills the plate — the ornament keeps moving, in cream. */
  function plate(tl, on) {
    tl.bgColor = on ? SELECT_BG : TILE_BG;
    tl.dotColor = on ? SELECT_DOT : TILE_DOT;
    tl.cell.style.backgroundColor = tl.bgColor;
    tl.cell.classList.toggle('is-picked', !!on);
  }

  function confirm() {
    if (chosen >= 0 || selected < 0) return;
    chosen = selected; chosenAt = performance.now();
    const tl = tiles[chosen];
    tl.confirmT = 0;                       // the ornament goes on moving under it
    tl.cell.classList.add('is-chosen');
    locked = true;
    setTimeout(() => { if (done) return; done = true; onConfirm && onConfirm(chosen, SET[chosen].meaning); }, CONFIRM_MS + 120);
  }

  const onResize = () => sizeAll();
  window.addEventListener('resize', onResize);

  return {
    teardown() {
      cancelAnimationFrame(raf); clearTimeout(hintTimer);
      sizeTimers.forEach(clearTimeout);
      ro && ro.disconnect();
      window.removeEventListener('resize', onResize);
      try { gridEl.remove(); } catch (_) {}
    },
    confirm,
    selectTile(i) {                       // used by the ghost-hand demo
      let d = i - pos; d = ((d % N) + N) % N; if (d > N / 2) d -= N;
      pos += d; vel = 0;
      select(wrap(i));
    },
    deselect,
    stopActive: noop,
    tileCenter(i) {
      const tl = tiles[wrap(i)]; if (!tl) return null;
      const r = tl.cell.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    centreIndex,
    count: N,
    appearMs: ENTER_MS + 500,
  };
}
