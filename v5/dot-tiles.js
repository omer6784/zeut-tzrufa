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

import { sweep } from './sfx.js';

const DOT = 0.8;   // dot DIAMETER — a fine dot, set close: the line is stippled, not beaded
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
  // Two outlines meeting at a corner each put a dot there, and a dot drawn twice
  // reads as a blot. A coarse spatial hash drops only the true collisions — a dot
  // closer to an earlier one than a dot's own width — and leaves the rhythm alone.
  const min2 = DOT * DOT * 1.32, cell = DOT * 1.15, grid = new Map();
  ctx.beginPath();
  for (const d of dots) {
    const gx = Math.floor(d.x / cell), gy = Math.floor(d.y / cell);
    let clash = false;
    for (let ox = -1; ox <= 1 && !clash; ox++) for (let oy = -1; oy <= 1 && !clash; oy++) {
      const bucket = grid.get(((gx + ox) << 16) ^ (gy + oy));
      if (!bucket) continue;
      for (let i = 0; i < bucket.length; i += 2) {
        const ddx = d.x - bucket[i], ddy = d.y - bucket[i + 1];
        if (ddx * ddx + ddy * ddy < min2) { clash = true; break; }
      }
    }
    if (clash) continue;
    const key = (gx << 16) ^ gy;
    const bucket = grid.get(key);
    if (bucket) bucket.push(d.x, d.y); else grid.set(key, [d.x, d.y]);
    dot(ctx, d.x, d.y, d.r);
  }
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
const ST = GAP * 0.42;              // the pitch of a large outline
// A small unit needs a finer pitch, or it stops being a shape and becomes a few
// loose dots. Anything under a fifth of the ornament is drawn at this.
const FINE = GAP * 0.30;
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
/* ── Composition vocabulary ────────────────────────────────────────────────
   Everything below is built from these: a square, a bracket, four corners, a
   pair of axes. Each ornament is one whole geometric tile — layered frames, a
   centre, and repeating units — never a figure, never a scatter. */
const square = (D, cx, cy, h, step, r) => {
  seg(D, cx - h, cy - h, cx + h, cy - h, step, r); seg(D, cx + h, cy - h, cx + h, cy + h, step, r);
  seg(D, cx + h, cy + h, cx - h, cy + h, step, r); seg(D, cx - h, cy + h, cx - h, cy - h, step, r);
};
// an L bracket pointing into the tile, as on a zellige corner
const bracket = (D, x, y, len, sx, sy, step, r) => {
  seg(D, x, y, x + sx * len, y, step, r);
  seg(D, x, y, x, y + sy * len, step, r);
};
const corners4 = (D, cx, cy, off, fn) => {
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy], i) => fn(cx + sx * off, cy + sy * off, sx, sy, i));
};
const cross = (D, cx, cy, len, step, r) => {
  seg(D, cx - len, cy, cx + len, cy, step, r); seg(D, cx, cy - len, cx, cy + len, step, r);
};

const MEANING_DRAWS = {

  /* ═══ הגנה — מסגרות שנסגרות על ליבה ═══ */
  protection: [
    // 1. three squares inside one another, four corner diamonds
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const k = 1 + 0.05 * Math.sin(t * 0.5);
      square(D, cx, cy, S, ST, b);
      square(D, cx, cy, S * 0.62 * k, ST, b);
      square(D, cx, cy, S * 0.26 * k, FINE, b);
      corners4(D, cx, cy, S * 0.80, (x, y) => diamond(D, x, y, S * 0.12, FINE, b));
      paint(ctx, D);
    },
    // 2. a diamond set in a square, turning a little within it
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      square(D, cx, cy, S, ST, b);
      poly(D, cx, cy, S * 0.70, 4, ST, b, Math.PI / 4 + Math.sin(t * 0.3) * 0.13);
      diamond(D, cx, cy, S * 0.26, FINE, b);
      paint(ctx, D);
    },
    // 3. a frame with four brackets stepping toward the core
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const step = S * (0.66 - 0.06 * P(t * 0.5));
      square(D, cx, cy, S, ST, b);
      corners4(D, cx, cy, step, (x, y, sx, sy) => bracket(D, x, y, S * 0.30, -sx, -sy, FINE, b));
      const R = S * 0.24;
      ring(D, cx, cy, R, Math.round(A_TAU * R / FINE), b);
      paint(ctx, D);
    },
    // 4. octagon within octagon, the layers waking in turn
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const w = (i) => 1 + 0.045 * Math.sin(t * 0.6 - i * 1.3);
      poly(D, cx, cy, S * w(0), 8, ST, b);
      poly(D, cx, cy, S * 0.58 * w(1), 8, ST, b);
      diamond(D, cx, cy, S * 0.22 * w(2), FINE, b);
      paint(ctx, D);
    },
  ],

  /* ═══ שפע — יחידות שמתרבות סביב מרכז ═══ */
  abundance: [
    // 5. an eight-petal rosette rooted on its own ring
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const open = 0.92 + 0.08 * P(t * 0.5), r0 = S * 0.28;
      for (let k = 0; k < 8; k++) {                              // eight rays of stepped diamonds
        const a = k / 8 * A_TAU;
        for (let j = 0; j < 2; j++) {
          const R = (r0 + S * (0.26 + j * 0.30)) * open;
          diamond(D, cx + Math.cos(a) * R, cy + Math.sin(a) * R, S * (0.13 - j * 0.02), FINE, b);
        }
      }
      ring(D, cx, cy, r0, Math.round(A_TAU * r0 / FINE), b);
      ring(D, cx, cy, S, Math.round(A_TAU * S / ST), b);
      paint(ctx, D);
    },
    // 6. a course of eight diamonds turning between two rings
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      ring(D, cx, cy, S, Math.round(A_TAU * S / ST), b);
      const Rm = S * 0.62, R3 = S * 0.24;
      for (let k = 0; k < 8; k++) {
        const a = t * 0.07 + k / 8 * A_TAU;
        diamond(D, cx + Math.cos(a) * Rm, cy + Math.sin(a) * Rm, S * 0.17, FINE, b);
      }
      ring(D, cx, cy, R3, Math.round(A_TAU * R3 / FINE), b);
      paint(ctx, D);
    },
    // 7. a twelve-point star breathing inside its ring
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const k = 1 + 0.05 * Math.sin(t * 0.55);
      ring(D, cx, cy, S, Math.round(A_TAU * S / ST), b);
      star(D, cx, cy, S * 0.78 * k, S * 0.40 * k, 12, ST, b);
      paint(ctx, D);
    },
    // 8. four rosettes around a centre, waking one after another
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      square(D, cx, cy, S, ST, b);
      corners4(D, cx, cy, S * 0.55, (x, y, sx, sy, i) => {
        const p = 1 + 0.10 * Math.sin(t * 0.7 - i * 1.57);
        const R = S * 0.22 * p;
        ring(D, x, y, R, Math.round(A_TAU * R / FINE), b);
      });
      const Rc = S * 0.20;
      ring(D, cx, cy, Rc, Math.round(A_TAU * Rc / FINE), b);
      paint(ctx, D);
    },
  ],

  /* ═══ התחדשות — טבעות ושכבות שנולדות מחדש ═══ */
  renewal: [
    // 9. four rings born at the centre and released outward
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      for (let k = 0; k < 4; k++) {
        const f = frac(t * 0.13 + k / 4), R = S * (0.18 + 0.74 * f);
        ring(D, cx, cy, R, Math.max(10, Math.round(A_TAU * R / ST)), b);
      }
      corners4(D, cx, cy, S * 0.82, (x, y) => diamond(D, x, y, S * 0.10, FINE, b));
      paint(ctx, D);
    },
    // 10. concentric diamonds, a wave passing through them outward
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      [1, 0.72, 0.46, 0.22].forEach((k, i) => diamond(D, cx, cy, S * k * (1 + 0.05 * Math.sin(t * 0.65 - i * 1.1)), i > 1 ? FINE : ST, b));
      paint(ctx, D);
    },
    // 11. a spiral opening from its core
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const turns = 2.2, R0 = S * 0.22, R1 = S * 0.94, spin = t * 0.12;
      let a = 0;
      while (a < turns * A_TAU) {
        const R = R0 + (R1 - R0) * (a / (turns * A_TAU));
        push(D, cx + Math.cos(a + spin) * R, cy + Math.sin(a + spin) * R, b);
        a += ST / Math.max(R, 1);
      }
      const Rc = S * 0.14;
      ring(D, cx, cy, Rc, Math.round(A_TAU * Rc / FINE), b);
      paint(ctx, D);
    },
    // 12. three courses of segments, turning against one another
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      ringSegs(D, cx, cy, S, 12, 0.55, ST, b, t * 0.05);
      ringSegs(D, cx, cy, S * 0.68, 8, 0.5, ST, b, -t * 0.07);
      ringSegs(D, cx, cy, S * 0.36, 6, 0.45, FINE, b, t * 0.09);
      paint(ctx, D);
    },
  ],

  /* ═══ דרך — צירים, מעברים, כיוון ═══ */
  path: [
    // 13. the two axes inside a frame, four quarters marked
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const k = P(t * 0.5);
      square(D, cx, cy, S, ST, b);
      seg(D, cx - S * (0.50 + 0.36 * k), cy, cx + S * (0.50 + 0.36 * k), cy, ST, b);
      seg(D, cx, cy - S * (0.50 + 0.36 * (1 - k)), cx, cy + S * (0.50 + 0.36 * (1 - k)), ST, b);
      corners4(D, cx, cy, S * 0.52, (x, y) => square(D, x, y, S * 0.17, FINE, b));
      paint(ctx, D);
    },
    // 14. a diagonal crossing, its arms reaching out in turn
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const k1 = 0.78 + 0.18 * P(t * 0.5), k2 = 0.78 + 0.18 * P(t * 0.5 + Math.PI), d = S * 0.70, g = S * 0.26;
      [[1, 1], [-1, -1]].forEach(([sx, sy]) => seg(D, cx + sx * g, cy + sy * g, cx + sx * d * k1, cy + sy * d * k1, ST, b));
      [[1, -1], [-1, 1]].forEach(([sx, sy]) => seg(D, cx + sx * g, cy + sy * g, cx + sx * d * k2, cy + sy * d * k2, ST, b));
      corners4(D, cx, cy, S * 0.86, (x, y) => diamond(D, x, y, S * 0.12, FINE, b));
      diamond(D, cx, cy, S * 0.16, FINE, b);
      paint(ctx, D);
    },
    // 15. mirrored chevron bands travelling out from the middle line
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const w = S * 0.86, h = S * 0.26;
      for (let k = 0; k < 3; k++) {
        const f = frac(t * 0.16 + k / 3), off = S * (0.34 + 0.58 * f);
        seg(D, cx - w, cy - off + h, cx, cy - off, ST, b); seg(D, cx, cy - off, cx + w, cy - off + h, ST, b);
        seg(D, cx - w, cy + off - h, cx, cy + off, ST, b); seg(D, cx, cy + off, cx + w, cy + off - h, ST, b);
      }
      paint(ctx, D);
    },
    // 16. two squares locked into an interlace, turning against each other
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const turn = Math.sin(t * 0.32) * 0.15;
      poly(D, cx, cy, S * 1.02, 4, ST, b, Math.PI / 4 + turn);
      poly(D, cx, cy, S * 0.56, 4, ST, b, -turn);
      const R = S * 0.26;
      ring(D, cx, cy, R, Math.round(A_TAU * R / FINE), b);
      paint(ctx, D);
    },
  ],

  /* ═══ הרמוניה — מאזן, סימטריה, סריג ═══ */
  harmony: [
    // 17. four focal diamonds breathing around one centre
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const off = S * (0.60 + 0.07 * Math.sin(t * 0.5));
      square(D, cx, cy, S, ST, b);
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([sx, sy]) => diamond(D, cx + sx * off, cy + sy * off, S * 0.20, FINE, b));
      diamond(D, cx, cy, S * 0.26, FINE, b);
      paint(ctx, D);
    },
    // 18. the eight-point seal, turning slowly inside its ring
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      ring(D, cx, cy, S, Math.round(A_TAU * S / ST), b);
      star(D, cx, cy, S * 0.80, S * 0.36, 8, ST, b, Math.sin(t * 0.25) * 0.2);
      paint(ctx, D);
    },
    // 19. a lattice of nine diamonds, a wave crossing it on the diagonal
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const u = S * 0.62;
      for (let r = -1; r <= 1; r++) for (let c = -1; c <= 1; c++) {
        const k = 1 + 0.14 * Math.sin(t * 0.7 - (r + c) * 1.1);
        diamond(D, cx + c * u, cy + r * u, S * 0.24 * k, FINE, b);
      }
      paint(ctx, D);
    },
    // 20. a circle, a square and a diamond sharing one centre
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const turn = Math.sin(t * 0.28) * 0.12;
      ring(D, cx, cy, S, Math.round(A_TAU * S / ST), b);
      poly(D, cx, cy, S * 0.80, 4, ST, b, Math.PI / 4 + turn);
      poly(D, cx, cy, S * 0.46, 4, ST, b, turn);
      const R = S * 0.18;
      ring(D, cx, cy, R, Math.round(A_TAU * R / FINE), b);
      paint(ctx, D);
    },
  ],

  /* ═══ חיוניות — התפשטות מהמרכז ═══ */
  vitality: [
    // 21. twelve spokes between two rings, reaching out together
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const R0 = S * 0.32, R1 = S * (0.62 + 0.20 * P(t * 0.55));
      ring(D, cx, cy, R0, Math.round(A_TAU * R0 / FINE), b);
      for (let k = 0; k < 12; k++) {
        const a = k / 12 * A_TAU;
        seg(D, cx + Math.cos(a) * R0, cy + Math.sin(a) * R0, cx + Math.cos(a) * R1, cy + Math.sin(a) * R1, ST, b);
      }
      ring(D, cx, cy, S, Math.round(A_TAU * S / ST), b);
      paint(ctx, D);
    },
    // 22. a course of small diamonds pushed outward and drawn back
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const R = S * (0.48 + 0.24 * P(t * 0.5));
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * A_TAU;
        diamond(D, cx + Math.cos(a) * R, cy + Math.sin(a) * R, S * 0.13, FINE, b);
      }
      const Rc = S * 0.26;
      ring(D, cx, cy, Rc, Math.round(A_TAU * Rc / FINE), b);
      square(D, cx, cy, S, ST, b);
      paint(ctx, D);
    },
    // 23. three courses of segments opening outward, one after another
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      [0, 1, 2].forEach(i => {
        const f = frac(t * 0.16 + i / 3), R = S * (0.26 + 0.68 * f);
        ringSegs(D, cx, cy, R, 6 + i * 6, 0.5, ST, b, i * 0.3);
      });
      const Rc = S * 0.16;
      ring(D, cx, cy, Rc, Math.round(A_TAU * Rc / FINE), b);
      paint(ctx, D);
    },
    // 24. a sixteen-point star turning on a quiet ring
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      star(D, cx, cy, S, S * 0.62, 16, ST, b, t * 0.05);
      const R = S * 0.30;
      ring(D, cx, cy, R, Math.round(A_TAU * R / FINE), b);
      paint(ctx, D);
    },
  ],

  /* ═══ מזל — מרכז וארבע פינות ═══ */
  luck: [
    // 25. a medallion with four corner rosettes
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const br = 1 + 0.04 * Math.sin(t * 0.5);
      [0.60, 0.42, 0.24].forEach((k, i) => {
        const R = S * k * (i % 2 ? 2 - br : br);
        ring(D, cx, cy, R, Math.round(A_TAU * R / (k < 0.3 ? FINE : ST)), b);
      });
      corners4(D, cx, cy, S * 0.74, (x, y, sx, sy, i) => {
        const R = S * 0.15 * (1 + 0.12 * Math.sin(t * 0.8 - i * 1.57));
        ring(D, x, y, R, Math.round(A_TAU * R / FINE), b);
      });
      paint(ctx, D);
    },
    // 26. a seal held by four corner diamonds
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      star(D, cx, cy, S * 0.72, S * 0.32, 8, ST, b, t * 0.06);
      corners4(D, cx, cy, S * 0.80, (x, y, sx, sy, i) =>
        diamond(D, x, y, S * 0.14 * (1 + 0.14 * Math.sin(t * 0.7 - i * 1.57)), FINE, b));
      paint(ctx, D);
    },
    // 27. five squares in a quincunx, the four circling the one
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const a0 = Math.sin(t * 0.3) * 0.16, off = S * 0.62;
      for (let k = 0; k < 4; k++) {
        const a = a0 + Math.PI / 4 + k / 4 * A_TAU;
        square(D, cx + Math.cos(a) * off, cy + Math.sin(a) * off, S * 0.20, FINE, b);
      }
      square(D, cx, cy, S * 0.28, FINE, b);
      square(D, cx, cy, S, ST, b);
      paint(ctx, D);
    },
    // 28. four brackets sliding in and out around a ring
    (ctx, tl, t) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = ART_R(tl), D = [];
      const off = S * (0.86 - 0.10 * P(t * 0.5));
      square(D, cx, cy, S, ST, b);
      corners4(D, cx, cy, off, (x, y, sx, sy) => bracket(D, x, y, S * 0.34, -sx, -sy, FINE, b));
      const R = S * 0.34;
      ring(D, cx, cy, R, Math.round(A_TAU * R / ST), b);
      diamond(D, cx, cy, S * 0.14, FINE, b);
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


/* Helpers the ornaments are drawn with. */
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

export const TILE_MEANINGS = TILES.map(t => t.meaningGroup);
export const __TILE_DRAWS = { MEANING_DRAWS, MEANING_ORDER, TILES };   // dev/verification

/* A quiet dotted BORDER for every tile — the tile's boundary in the dot
   language (cached per size). Drawn under the ornament. */
function drawTileFrame(ctx, tl) {
  if (!tl.cache || !tl.cache.frame) {
    const b = DOT / 2, ins = Math.min(tl.W, tl.H) * 0.06, gp = ST, F = [];
    const line = (x0, y0, x1, y1) => {
      const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / gp));
      for (let i = 0; i <= n; i++) F.push({ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n, r: b });
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
// The tile at the centre is only the CANDIDATE: the stage's own gold, darkened a
// touch. The ornament and frame keep the interface's dark.
const CENTER_BG = '#d7ae60';
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
const GAL_SCALE_MIN = 0.78;   // a neighbour — a little smaller than the centre
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
  host.appendChild(gridEl);

  const SET = TILES;
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
    boxH = Math.max(60, Math.min(galH * 0.9, galW * 0.375));
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
  let selected = -1, notified = -1, chosen = -1, chosenAt = 0, done = false, locked = false, sweepTimer = 0;
  let raf = 0, t0 = performance.now(), pulseAt = -1, hintDone = false;
  // The tile before and the tile after stand WHOLE inside the interface's own
  // vertical grid lines — never running onto them — with only a narrow channel
  // between them and the centre tile. The tile size above is set so the three
  // together just fit between the lines.
  const galStep = () => boxW * (0.5 + GAL_SCALE_MIN * 0.5) + galW * 0.018;
  const wrap = (v) => ((v % N) + N) % N;                       // the row is a loop
  const centreIndex = () => wrap(Math.round(pos));

  function layoutFrame(now) {
    // The candidate follows the row itself — under the finger, under momentum —
    // and each tile that passes the centre gets its own swish, in the direction
    // the row is travelling.
    if (chosen < 0) {
      const c = centreIndex();
      if (selected >= 0 && c !== selected) sweep(vel >= 0 ? 1 : -1, Math.min(1, Math.abs(vel) * 8 + 0.3));
      markCentre(c);
    }
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
      const vis = ad < 1.6;                                     // the centre and one tile each side
      tl.cell.style.display = vis ? 'block' : 'none';
      if (!vis) continue;
      tl.scale = s;
      const sel = (tl.i === chosen || tl.i === selected);
      let pulse = 1;
      if (pulseAt > 0) { const k = clamp01((now - pulseAt) / 260); pulse = sel ? 1 + 0.05 * Math.sin(k * Math.PI) : 1; }
      tl.cell.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0) scale(${(s * pulse).toFixed(3)})`;
      tl.cell.style.zIndex = String(100 - Math.round(ad * 10));
      // presence follows distance too — the centre is the focus, the flanks hint
      // No fading: every tile is drawn at full strength. What marks the centre is
      // its size and its darker plate, not a veil over its neighbours.
      tl.alpha = 1;
      tl.cell.style.opacity = '1';
    }
  }

  function frame(now) {
    // the candidate follows the row, and the stage hears about it once it settles
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
    // the stage is told which tile it is once the row comes to rest
    if (chosen < 0 && !dragging && Math.abs(vel) < 0.004) announce(centreIndex());

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
      // A tap is never a choice — it only brings a neighbour in to be looked at.
      if (i >= 0 && i !== centreIndex()) { let d = i - pos; d = ((d % N) + N) % N; if (d > N / 2) d -= N; pos += d * 0.999; vel = 0; }
    }
  };
  gridEl.addEventListener('pointerup', endDrag);
  gridEl.addEventListener('pointercancel', () => { dragging = false; });

  /* The candidate is whatever tile the row has brought to the centre — no tap
     needed, and a tap never chooses. Exactly one tile carries the darker plate;
     when another arrives, the one before it goes back to the stage's own gold. */
  function markCentre(i) {
    if (selected === i || chosen >= 0) return;
    if (selected >= 0) plate(tiles[selected], false);
    selected = i;
    plate(tiles[i], true);
  }
  function announce(i) {
    if (notified === i || chosen >= 0) return;
    notified = i;
    if (onSelect) onSelect(i, SET[i].meaning);            // the stage arms "המשך" on this one
  }
  function deselect() {}                                  // there is always a candidate now

  function plate(tl, on) {
    tl.bgColor = on ? CENTER_BG : TILE_BG;
    tl.cell.style.backgroundColor = tl.bgColor;
    tl.cell.classList.toggle('is-current', !!on);
  }

  // Bring a tile to the centre (used by the stage's own demo).
  function selectTile(i) {
    let d = i - pos; d = ((d % N) + N) % N; if (d > N / 2) d -= N;
    pos += d; vel = 0;
  }

  /* A SWEEP of the row, as a hand would make it: the row eases along by whole
     tiles over the given time. Used by the stage's demo so the movement it
     shows is the real one — the same travel, the same swish, the same snap. */
  function sweepBy(delta = 1, durMs = 900) {
    if (chosen >= 0) return;
    const from = pos, to = pos + delta, t0s = performance.now();
    locked = true; vel = 0;
    clearInterval(sweepTimer);
    sweepTimer = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0s) / durMs);
      pos = from + (to - from) * (1 - Math.pow(1 - k, 3));       // eased, like a hand
      if (k >= 1) { clearInterval(sweepTimer); sweepTimer = 0; pos = Math.round(to); locked = false; }
    }, 16);
  }

  function confirm() {
    if (chosen >= 0) return;
    const c = centreIndex();
    announce(c);                                          // make sure the stage has this one
    chosen = c; chosenAt = performance.now();
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
      cancelAnimationFrame(raf); clearTimeout(hintTimer); clearInterval(sweepTimer);
      sizeTimers.forEach(clearTimeout);
      ro && ro.disconnect();
      window.removeEventListener('resize', onResize);
      try { gridEl.remove(); } catch (_) {}
    },
    confirm,
    selectTile,                           // used by the demo: bring a tile to the centre
    sweepBy,                              // used by the demo: sweep the row as a hand would
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
