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
// One pitch for every outline: the dots of a motif keep the same rhythm as the
// interface's own grid, so the tile reads as drawn in the same material.
const ST = GAP * 1.12;
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
    // 1. ח'אתם — the eight-point Moroccan seal, ringed, on its centre
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const turn = Math.sin(t * 0.22) * 0.10;                    // the seal turns a little on itself
      star(D, cx, cy, S * 0.74, S * 0.33, 8, ST, b, turn);
      ring(D, cx, cy, S * 0.90, 32, b * 0.8, turn * 0.5);
      push(D, cx, cy, b * (1.7 + 0.25 * P(t * 0.9)));
      paint(ctx, D);
    },
    // 2. three nested diamond frames — the guard travels inward
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const ph = frac(t * 0.13) * 3;
      [0.92, 0.64, 0.36].forEach((k, i) => {
        const lit = 1 - Math.min(1, Math.abs(ph - i));
        diamond(D, cx, cy, S * k, ST, b * (0.85 + 0.75 * lit));
      });
      push(D, cx, cy, b * 1.6);
      paint(ctx, D);
    },
    // 3. a zellige frame with corner keys around a small seal
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const m = S * 0.88, k = P(t * 0.5);
      seg(D, cx - m, cy - m, cx + m, cy - m, ST, b); seg(D, cx - m, cy + m, cx + m, cy + m, ST, b);
      seg(D, cx - m, cy - m, cx - m, cy + m, ST, b); seg(D, cx + m, cy - m, cx + m, cy + m, ST, b);
      const d = m * (0.72 - 0.10 * k);                            // the keys step toward the core
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => diamond(D, cx + sx * d, cy + sy * d, S * 0.17, ST, b));
      star(D, cx, cy, S * 0.34, S * 0.15, 4, ST, b, Math.PI / 4);
      push(D, cx, cy, b * 1.5);
      paint(ctx, D);
    },
    // 4. the horseshoe gate — its outline lights from the ground up
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const R = S * 0.52, base = cy + S * 0.78, spring = cy - S * 0.06;
      const rise = frac(t * 0.18);                                // where the light stands
      const lift = (f) => b * (0.8 + 0.9 * Math.max(0, 1 - Math.abs(f - rise) * 3.2));
      const legN = Math.max(2, Math.round((base - spring) / ST));
      for (let i = 0; i <= legN; i++) {
        const f = i / legN, y = base - (base - spring) * f;
        push(D, cx - R, y, lift(f * 0.5)); push(D, cx + R, y, lift(f * 0.5));
      }
      const aN = Math.max(6, Math.round(Math.PI * 1.25 * R / ST));
      for (let i = 0; i <= aN; i++) {
        const f = i / aN, a = Math.PI * (1.12 - 1.24 * f);
        push(D, cx + Math.cos(a) * R, spring + Math.sin(a) * -R, lift(0.5 + f * 0.5));
      }
      seg(D, cx - R * 1.5, base, cx + R * 1.5, base, ST, b);
      paint(ctx, D);
    },
  ],

  /* ═══ שפע — ורדות, עלי כותרת, גרגרים: מה שמתרבה ═══ */
  abundance: [
    // 5. the seed rosette — six circles breathing around a seventh
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const R = S * (0.40 + 0.035 * Math.sin(t * 0.5));
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * A_TAU - Math.PI / 2;
        ring(D, cx + Math.cos(a) * R, cy + Math.sin(a) * R, R, Math.round(A_TAU * R / ST), b);
      }
      ring(D, cx, cy, R, Math.round(A_TAU * R / ST), b);
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
    // 6. quatrefoil — the four lobes swell in turn
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      for (let k = 0; k < 4; k++) {
        const a = k / 4 * A_TAU - Math.PI / 2;
        const sw = 1 + 0.10 * Math.sin(t * 0.7 - k * 1.57);
        const R = S * 0.34 * sw, off = S * 0.40;
        ring(D, cx + Math.cos(a) * off, cy + Math.sin(a) * off, R, Math.round(A_TAU * R / ST), b);
      }
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
    // 7. three grains in a row — each one fills in its turn
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const turn = frac(t * 0.24) * 3;
      [-1, 0, 1].forEach((k, i) => {
        const gx = cx + k * S * 0.60, R = S * 0.27;
        ring(D, gx, cy, R, Math.round(A_TAU * R / ST), b);
        const lit = Math.max(0, 1 - Math.abs(turn - i) * 2);
        push(D, gx, cy, b * (0.7 + 1.1 * lit));
      });
      paint(ctx, D);
    },
    // 8. an eight-petal flower turning slowly inside its ring
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const a0 = t * 0.10;
      for (let k = 0; k < 8; k++) petal(D, cx, cy, a0 + k / 8 * A_TAU, S * 0.66, S * 0.15, ST, b);
      ring(D, cx, cy, S * 0.90, 34, b * 0.8);
      push(D, cx, cy, b * 1.6);
      paint(ctx, D);
    },
  ],

  /* ═══ התחדשות — גלים, טבעות שנולדות, חלת דבש ═══ */
  renewal: [
    // 9. rings born at the centre and released outward
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      for (let k = 0; k < 3; k++) {
        const f = frac(t * 0.16 + k / 3);
        const R = S * (0.16 + 0.76 * f);
        ring(D, cx, cy, R, Math.max(8, Math.round(A_TAU * R / ST)), b * (1.15 - 0.5 * f));
      }
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
    // 10. two dotted waves running under one another
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const span = S * 1.7, n = Math.round(span / ST);
      [-1, 1].forEach((s, r) => {
        for (let i = 0; i <= n; i++) {
          const f = i / n, x = cx - span / 2 + span * f;
          const y = cy + s * S * 0.34 + Math.sin(f * A_TAU * 1.6 + t * 0.7 * s) * S * 0.20;
          push(D, x, y, b);
        }
      });
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
    // 11. a spiral opening out of its own centre
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const turns = 2.6, n = 58, a0 = t * 0.16;
      for (let i = 0; i <= n; i++) {
        const f = i / n, a = a0 + f * turns * A_TAU, R = S * 0.10 + S * 0.80 * f;
        push(D, cx + Math.cos(a) * R, cy + Math.sin(a) * R, b * (0.75 + 0.5 * P(f * 9 - t * 1.4)));
      }
      push(D, cx, cy, b * 1.6);
      paint(ctx, D);
    },
    // 12. a honeycomb — the cells light in a slow wave
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const R = S * 0.30, dx = R * Math.sqrt(3), cells = [[0, 0]];
      for (let k = 0; k < 6; k++) { const a = k / 6 * A_TAU + Math.PI / 6; cells.push([Math.cos(a) * dx, Math.sin(a) * dx]); }
      cells.forEach(([ox, oy], i) => {
        const lit = 0.75 + 0.6 * Math.max(0, 1 - Math.abs(frac(t * 0.16) * 7 - i));
        for (let k = 0; k < 6; k++) {
          const a1 = k / 6 * A_TAU, a2 = (k + 1) / 6 * A_TAU;
          seg(D, cx + ox + Math.cos(a1) * R, cy + oy + Math.sin(a1) * R,
                 cx + ox + Math.cos(a2) * R, cy + oy + Math.sin(a2) * R, ST, b * lit);
        }
      });
      paint(ctx, D);
    },
  ],

  /* ═══ דרך — שברונים, צירים, הצטלבות ═══ */
  path: [
    // 13. three chevrons climbing, one behind the other
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const w = S * 0.72, h = S * 0.34;
      for (let k = 0; k < 3; k++) {
        const f = frac(t * 0.20 + k / 3);
        const y = cy + S * 0.80 - f * S * 1.6;
        const a = b * (0.7 + 0.8 * Math.sin(f * Math.PI));
        seg(D, cx - w, y + h, cx, y, ST, a); seg(D, cx, y, cx + w, y + h, ST, a);
      }
      push(D, cx, cy, b * 1.6);
      paint(ctx, D);
    },
    // 14. the axis — dashes leaving the centre for both edges
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const span = S * 0.92, dash = ST * 3, n = Math.floor(span / dash);
      for (let s = -1; s <= 1; s += 2) {
        for (let k = 0; k < n; k++) {
          const f = frac(k / n + t * 0.12);
          const x0 = cx + s * (S * 0.14 + f * (span - S * 0.14));
          seg(D, x0, cy, x0 + s * dash * 0.55, cy, ST, b * (0.7 + 0.6 * (1 - f)));
        }
      }
      push(D, cx, cy, b * 1.9);
      paint(ctx, D);
    },
    // 15. the crossing — its four arms reach out in pairs
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const k1 = 0.72 + 0.22 * P(t * 0.6), k2 = 0.72 + 0.22 * P(t * 0.6 + Math.PI);
      seg(D, cx - S * k1, cy - S * k1, cx + S * k1, cy + S * k1, ST, b);
      seg(D, cx - S * k2, cy + S * k2, cx + S * k2, cy - S * k2, ST, b);
      push(D, cx, cy, b * 1.9);
      paint(ctx, D);
    },
    // 16. a folded path crossing the tile — the walker runs along it
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const V = [[-0.86, 0.60], [-0.30, -0.36], [0.30, 0.60], [0.86, -0.36]].map(([x, y]) => [cx + x * S, cy + y * S]);
      const walker = frac(t * 0.22) * (V.length - 1);
      for (let i = 0; i < V.length - 1; i++) {
        const A = V[i], B = V[i + 1], L = Math.hypot(B[0] - A[0], B[1] - A[1]), n = Math.max(2, Math.round(L / ST));
        for (let j = 0; j <= n; j++) {
          const f = j / n, pos = i + f;
          push(D, A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f,
               b * (0.75 + 0.9 * Math.max(0, 1 - Math.abs(pos - walker) * 3)));
        }
      }
      paint(ctx, D);
    },
  ],

  /* ═══ הרמוניה — סריג, סימטריה, מאזן ═══ */
  harmony: [
    // 17. a zellige net of small diamonds, lighting like a chessboard
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const R = S * 0.28, k = P(t * 0.55);
      for (let r = -1; r <= 1; r++) for (let c = -1; c <= 1; c++) {
        const even = ((r + c) & 1) === 0;
        diamond(D, cx + c * R * 1.9, cy + r * R * 1.9, R, ST, b * (0.7 + 0.7 * (even ? k : 1 - k)));
      }
      paint(ctx, D);
    },
    // 18. the seal inside its frame — one turns, the other holds
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      diamond(D, cx, cy, S * 0.92, ST, b);
      star(D, cx, cy, S * 0.52, S * 0.24, 8, ST, b, t * 0.12);
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
    // 19. four around one — they breathe out and back together
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const off = S * (0.56 + 0.09 * Math.sin(t * 0.5));
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => diamond(D, cx + sx * off * 0.72, cy + sy * off * 0.72, S * 0.20, ST, b));
      diamond(D, cx, cy, S * 0.24, ST, b);
      push(D, cx, cy, b * 1.6);
      paint(ctx, D);
    },
    // 20. the closed ring — one light walks it, and returns
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const R = S * 0.80, n = Math.round(A_TAU * R / ST), w = frac(t * 0.14) * n;
      for (let i = 0; i < n; i++) {
        const a = i / n * A_TAU - Math.PI / 2;
        const d = Math.min(Math.abs(i - w), n - Math.abs(i - w));
        push(D, cx + Math.cos(a) * R, cy + Math.sin(a) * R, b * (0.8 + 0.9 * Math.max(0, 1 - d / 3)));
      }
      push(D, cx, cy, b * 1.8);
      paint(ctx, D);
    },
  ],

  /* ═══ חיוניות — שמש, קרניים, קרינה ═══ */
  vitality: [
    // 21. a sunburst — the rays pulse out of the centre
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * A_TAU;
        for (let i = 1; i <= 5; i++) {
          const f = i / 5, R = S * (0.22 + 0.68 * f);
          push(D, cx + Math.cos(a) * R, cy + Math.sin(a) * R, b * (0.7 + 0.75 * Math.max(0, 1 - Math.abs(frac(t * 0.3) - f) * 3)));
        }
      }
      push(D, cx, cy, b * 2);
      paint(ctx, D);
    },
    // 22. a twelve-point star, turning
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      star(D, cx, cy, S * 0.88, S * 0.46, 12, ST, b, t * 0.08);
      push(D, cx, cy, b * 1.7);
      paint(ctx, D);
    },
    // 23. the sun disc — its short rays grow and draw back
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const R = S * 0.46;
      ring(D, cx, cy, R, Math.round(A_TAU * R / ST), b);
      for (let k = 0; k < 16; k++) {
        const a = k / 16 * A_TAU, len = S * (0.16 + 0.18 * P(t * 0.7 + k * 0.6));
        seg(D, cx + Math.cos(a) * (R + ST), cy + Math.sin(a) * (R + ST),
               cx + Math.cos(a) * (R + ST + len), cy + Math.sin(a) * (R + ST + len), ST, b);
      }
      push(D, cx, cy, b * 1.8);
      paint(ctx, D);
    },
    // 24. diamonds thrown outward along the four diagonals
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + k / 4 * A_TAU;
        for (let i = 0; i < 2; i++) {
          const f = frac(t * 0.2 + i / 2), R = S * (0.28 + 0.58 * f);
          diamond(D, cx + Math.cos(a) * R, cy + Math.sin(a) * R, S * 0.16 * (1 - 0.3 * f), ST, b * (1.1 - 0.4 * f));
        }
      }
      push(D, cx, cy, b * 1.8);
      paint(ctx, D);
    },
  ],

  /* ═══ מזל — קמעות בפינות, תלתן, אריח מנוקד ═══ */
  luck: [
    // 25. four corner charms twinkling around a small centre
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const turn = frac(t * 0.22) * 4;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy], i) => {
        const lit = 0.75 + 0.75 * Math.max(0, 1 - Math.abs(turn - i));
        star(D, cx + sx * S * 0.58, cy + sy * S * 0.58, S * 0.26, S * 0.10, 4, ST, b * lit, Math.PI / 4);
      });
      diamond(D, cx, cy, S * 0.16, ST, b);
      push(D, cx, cy, b * 1.5);
      paint(ctx, D);
    },
    // 26. the clover — four lobes turning gently on their stem
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const a0 = Math.sin(t * 0.3) * 0.18;
      for (let k = 0; k < 4; k++) {
        const a = a0 + Math.PI / 4 + k / 4 * A_TAU, R = S * 0.31, off = S * 0.38;
        ring(D, cx + Math.cos(a) * off, cy + Math.sin(a) * off, R, Math.round(A_TAU * R / ST), b);
      }
      push(D, cx, cy, b * 1.8);
      paint(ctx, D);
    },
    // 27. a filled zellige diamond — the fill pulses across it
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const R = S * 0.92;
      diamond(D, cx, cy, R, ST, b);
      const inner = R - ST * 2.2, stp = ST * 1.6;
      for (let y = -inner; y <= inner; y += stp) {
        const half = inner - Math.abs(y);
        for (let x = -half; x <= half; x += stp) {
          const w = 0.75 + 0.75 * Math.max(0, 1 - Math.abs(frac(t * 0.2) * 2 - 1 - (x + y) / (inner * 2)) * 2.4);
          push(D, cx + x, cy + y, b * w * 0.85);
        }
      }
      push(D, cx, cy, b * 1.6);
      paint(ctx, D);
    },
    // 28. small charms scattered on the tile, twinkling one by one
    (ctx, tl, t, bo, i) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const spots = [[0, -0.62], [-0.62, -0.1], [0.62, -0.1], [-0.38, 0.6], [0.38, 0.6]];
      const turn = frac(t * 0.18) * spots.length;
      spots.forEach(([x, y], k) => {
        const lit = 0.75 + 0.8 * Math.max(0, 1 - Math.abs(turn - k));
        star(D, cx + x * S, cy + y * S, S * 0.22, S * 0.08, 4, ST, b * lit, Math.PI / 4);
      });
      star(D, cx, cy, S * 0.26, S * 0.10, 8, ST, b, 0);
      push(D, cx, cy, b * 1.6);
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

export const TILE_MEANINGS = TILES.map(t => t.meaningGroup);
export const __TILE_DRAWS = { MEANING_DRAWS, MEANING_ORDER, TILES };   // dev/verification

/* A quiet dotted BORDER for every tile — the tile's boundary in the dot
   language (cached per size). Drawn under the ornament. */
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

/* ── The stage is a horizontal GALLERY of the 28 tiles ─────────────────────
   One tile sits at the centre at full size; its neighbours flank it, smaller,
   so the row reads as a continuous strip you push with your hand rather than a
   slideshow. Every tile keeps animating wherever it stands. Scale, position and
   presence are all derived from a tile's distance from the centre, so nothing
   "starts an animation" on arrival — it is one continuous state.

   The tiles, their drawings and their mapping to meaning + symbol are exactly
   as before; only the way they are shown and chosen changed. */
const GAL_STEP = 0.86;        // spacing between tiles, in tile-widths
const GAL_SCALE_MIN = 0.62;   // a distant tile
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

  const N = TILES.length;
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
    boxH = Math.max(60, Math.min(galH * 0.9, galW * 0.72));
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
  const wrap = (v) => ((v % N) + N) % N;                       // the row is a loop
  const centreIndex = () => wrap(Math.round(pos));

  function layoutFrame(now) {
    const step = boxW * GAL_STEP;
    const enter = clamp01((now - t0) / ENTER_MS);
    const enterEase = 1 - Math.pow(1 - enter, 3);
    for (const tl of tiles) {
      // shortest signed distance from the centre, wrapped — so tiles that pass
      // an end reappear at the other, one continuous loop with no duplicates.
      let d = tl.i - pos;
      d = ((d % N) + N) % N; if (d > N / 2) d -= N;
      const ad = Math.abs(d);
      const s = ad <= 1 ? CENTER_SCALE - (CENTER_SCALE - 0.8) * ad
                        : Math.max(GAL_SCALE_MIN, 0.8 - (ad - 1) * 0.1);
      const x = d * step + (1 - enterEase) * step * 1.6;        // the row slides in
      const vis = ad < 3.4;
      tl.cell.style.display = vis ? 'block' : 'none';
      if (!vis) continue;
      tl.scale = s;
      const sel = (tl.i === chosen || tl.i === selected);
      let pulse = 1;
      if (pulseAt > 0) { const k = clamp01((now - pulseAt) / 260); pulse = sel ? 1 + 0.05 * Math.sin(k * Math.PI) : 1; }
      tl.cell.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0) scale(${(s * pulse).toFixed(3)})`;
      tl.cell.style.zIndex = String(100 - Math.round(ad * 10));
      // presence follows distance too — the centre is the focus, the flanks hint
      tl.alpha = (chosen >= 0 && tl.i !== chosen) ? 0.35 : (ad < 0.5 ? 1 : Math.max(0.86, 1 - (ad - 0.5) * 0.09)) * enterEase;
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
      TILES[tl.i].draw(ctx, tl, tl.clock || 0, bo);
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
    const step = boxW * GAL_STEP;
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
    selected = i;
    pulseAt = performance.now();
    locked = true;                                               // no swiping mid-transition
    setTimeout(() => { locked = false; }, 420);
    if (onSelect) onSelect(i, TILES[i].meaning);
  }
  function deselect() {
    if (chosen >= 0) return;
    selected = -1; pulseAt = -1;
  }

  function confirm() {
    if (chosen >= 0 || selected < 0) return;
    chosen = selected; chosenAt = performance.now();
    const tl = tiles[chosen];
    tl.frozen = true; tl.frozenT = (chosenAt - t0) / 1000; tl.confirmT = 0;
    tl.cell.classList.add('is-chosen');
    locked = true;
    setTimeout(() => { if (done) return; done = true; onConfirm && onConfirm(chosen, TILES[chosen].meaning); }, CONFIRM_MS + 120);
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
