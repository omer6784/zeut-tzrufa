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

  /* ═══ הגנה — מעטפת, טבעות, גבולות, מבנה שנסגר על ליבה ═══ */
  protection: [
    // 1. eight-point star inside a ring — the ring draws IN and releases
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const close = 0.5 + 0.5 * Math.sin(t * 0.55);              // 0 open … 1 closed
      star(D, cx, cy, S * 0.5, S * 0.22, 8, GAP * 1.5, b * 0.52);
      ring(D, cx, cy, S * (0.86 - 0.2 * close), 26, b * (0.5 + 0.3 * close));
      push(D, cx, cy, b * (0.8 + 0.5 * close));
      paint(ctx, D);
    },
    // 2. three nested diamond frames — revealed from the OUTSIDE inward
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const phase = frac(t * 0.14) * 3;                           // which frame is lit
      [0.9, 0.62, 0.34].forEach((k, idx) => {
        const lit = 1 - Math.min(1, Math.abs(phase - idx));
        diamond(D, cx, cy, S * k, GAP * 1.5, b * (0.4 + 0.6 * lit));
      });
      push(D, cx, cy, b * (0.6 + 0.5 * (1 - Math.min(1, Math.abs(phase - 2.6)))));
      paint(ctx, D);
    },
    // 3. square border with corner keys — dots CONVERGE along the boundary
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const m = S * 0.78, k = 0.5 + 0.5 * Math.sin(t * 0.5);
      const step = GAP * 1.5;
      seg(D, cx - m, cy - m, cx + m, cy - m, step, b * 0.5); seg(D, cx - m, cy + m, cx + m, cy + m, step, b * 0.5);
      seg(D, cx - m, cy - m, cx - m, cy + m, step, b * 0.5); seg(D, cx + m, cy - m, cx + m, cy + m, step, b * 0.5);
      // the four corner keys step inward as the border "closes"
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
        const d = m * (1 - 0.42 * k);
        diamond(D, cx + sx * d, cy + sy * d, S * 0.16, GAP * 1.4, b * 0.62);
      });
      push(D, cx, cy, b * (0.7 + 0.6 * k));
      paint(ctx, D);
    },
    // 4. guards ORBIT a core that never moves
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      ring(D, cx, cy, S * 0.32, 12, b * 0.42);
      const a = t * 0.22;
      for (let k = 0; k < 6; k++) {
        const ang = a + k / 6 * A_TAU;
        const gx = cx + Math.cos(ang) * S * 0.72, gy = cy + Math.sin(ang) * S * 0.72;
        diamond(D, gx, gy, S * 0.13, GAP * 1.3, b * 0.6);
      }
      push(D, cx, cy, b * 1.15);
      paint(ctx, D);
    },
  ],

  /* ═══ שפע · פוריות · ברכה — התרבות, פריחה, התפצלות ═══ */
  abundance: [
    // 5. six-petal rosette — the petals OPEN from the centre
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const open = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.5));
      for (let k = 0; k < 6; k++) petal(D, cx, cy, k / 6 * A_TAU, S * 0.82 * open, S * 0.2 * open, GAP * 1.4, b * 0.5);
      ring(D, cx, cy, S * 0.15, 8, b * 0.5);
      push(D, cx, cy, b * 1.1);
      paint(ctx, D);
    },
    // 6. a seed cluster — one dot ACCUMULATES into many
    (ctx, tl, t, bo, i) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const cyc = frac(t * 0.12), n = 1 + Math.floor(cyc * 18);
      for (let k = 0; k < 18; k++) {
        const a = sd(k, 3) * A_TAU, R = (0.25 + sd(k, 7) * 0.6) * S;
        const on = k < n ? 1 : 0.12;
        push(D, cx + Math.cos(a) * R, cy + Math.sin(a) * R, b * (0.35 + 0.5 * on));
      }
      ring(D, cx, cy, S * 0.9, 30, b * 0.3);
      push(D, cx, cy, b * 1.1);
      paint(ctx, D);
    },
    // 7. BRANCHING stems
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H * 0.9, S = Math.min(tl.W, tl.H) / 2, D = [];
      const grow = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.45));
      seg(D, cx, cy, cx, cy - S * 1.0 * grow, GAP * 1.4, b * 0.55);
      [-1, 1].forEach(sx => {
        const y0 = cy - S * 0.45 * grow;
        seg(D, cx, y0, cx + sx * S * 0.5 * grow, y0 - S * 0.4 * grow, GAP * 1.4, b * 0.5);
        const y1 = cy - S * 0.8 * grow;
        seg(D, cx, y1, cx + sx * S * 0.34 * grow, y1 - S * 0.3 * grow, GAP * 1.4, b * 0.45);
      });
      paint(ctx, D);
    },
    // 8. rays with beads — DIVERGENCE, centre → outside
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * A_TAU;
        for (let j = 1; j <= 5; j++) {
          const f = frac(j / 5 + t * 0.09);
          const R = S * (0.18 + f * 0.72);
          push(D, cx + Math.cos(a) * R, cy + Math.sin(a) * R, b * (0.35 + 0.55 * (1 - f)));
        }
      }
      ring(D, cx, cy, S * 0.14, 8, b * 0.5);
      paint(ctx, D);
    },
  ],

  /* ═══ התחדשות · צמיחה — ספירלות, מחזוריות, פריחה ═══ */
  renewal: [
    // 9. a spiral — the motion travels ALONG it
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const N = 54;
      for (let k = 0; k < N; k++) {
        const f = k / N, a = f * A_TAU * 2.4, R = S * (0.1 + f * 0.82);
        const trav = 0.5 + 0.5 * Math.sin(f * 8 - t * 0.9);
        push(D, cx + Math.cos(a) * R, cy + Math.sin(a) * R, b * (0.34 + 0.5 * trav));
      }
      paint(ctx, D);
    },
    // 10. a flower that closes and RE-FORMS
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const k = 0.5 + 0.5 * Math.sin(t * 0.42), open = 0.25 + 0.75 * k;
      for (let p = 0; p < 8; p++) {
        const a = p / 8 * A_TAU + (1 - k) * 0.35;
        arc(D, cx + Math.cos(a) * S * 0.34 * open, cy + Math.sin(a) * S * 0.34 * open, S * 0.3 * open, 0, A_TAU, 12, b * 0.42);
      }
      push(D, cx, cy, b * (0.8 + 0.6 * (1 - k)));
      paint(ctx, D);
    },
    // 11. two opposed arcs — slow ROTATION
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const a = t * 0.18;
      arc(D, cx, cy, S * 0.78, a, a + Math.PI * 0.8, 20, b * 0.55);
      arc(D, cx, cy, S * 0.78, a + Math.PI, a + Math.PI * 1.8, 20, b * 0.55);
      arc(D, cx, cy, S * 0.44, -a * 1.3, -a * 1.3 + Math.PI * 0.7, 14, b * 0.45);
      arc(D, cx, cy, S * 0.44, -a * 1.3 + Math.PI, -a * 1.3 + Math.PI * 1.7, 14, b * 0.45);
      push(D, cx, cy, b * 0.9);
      paint(ctx, D);
    },
    // 12. a ring that DISPERSES and re-forms
    (ctx, tl, t, bo, i) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const k = 0.5 + 0.5 * Math.sin(t * 0.38);                   // 1 = gathered
      const N = 28;
      for (let j = 0; j < N; j++) {
        const a = j / N * A_TAU, scatter = (0.5 + sd(j, 5)) * S * 0.5 * (1 - k);
        const R = S * 0.66 + scatter;
        push(D, cx + Math.cos(a) * R, cy + Math.sin(a) * R, b * (0.4 + 0.45 * k));
      }
      ring(D, cx, cy, S * 0.2, 10, b * 0.4);
      paint(ctx, D);
    },
  ],

  /* ═══ דרך · הכוונה · מסע — צירים, מסלולים, הסתעפויות ═══ */
  path: [
    // 13. stacked chevrons — VERTICAL progression up the axis
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const rows = 4;
      for (let k = 0; k < rows; k++) {
        const y = tl.H * (0.74 - k * 0.16);
        const lit = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.9 - k * 1.1));
        seg(D, cx - S * 0.58, y + S * 0.22, cx, y, GAP * 1.45, b * lit * 0.8);
        seg(D, cx, y, cx + S * 0.58, y + S * 0.22, GAP * 1.45, b * lit * 0.8);
      }
      paint(ctx, D);
    },
    // 14. a route with stations — a bead FLOWS from node to node
    (ctx, tl, t, bo) => {
      const b = DOT / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const N = [[0.16, 0.74], [0.38, 0.36], [0.62, 0.66], [0.84, 0.28]].map(([x, y]) => [tl.W * x, tl.H * y]);
      for (let k = 0; k < N.length - 1; k++) seg(D, N[k][0], N[k][1], N[k + 1][0], N[k + 1][1], GAP * 1.5, b * 0.42);
      N.forEach(([x, y]) => diamond(D, x, y, S * 0.12, GAP * 1.3, b * 0.5));
      const p = frac(t * 0.13) * (N.length - 1), i0 = Math.floor(p), f = p - i0;
      const A = N[Math.min(i0, N.length - 2)], B = N[Math.min(i0 + 1, N.length - 1)];
      push(D, A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, b * 1.35);
      paint(ctx, D);
    },
    // 15. a four-axis compass — the axes pulse in turn, POINTING
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const cur = Math.floor(frac(t * 0.1) * 4);
      for (let k = 0; k < 4; k++) {
        const a = k / 4 * A_TAU - Math.PI / 2, on = k === cur ? 1 : 0.3;
        seg(D, cx + Math.cos(a) * S * 0.2, cy + Math.sin(a) * S * 0.2, cx + Math.cos(a) * S * 0.86, cy + Math.sin(a) * S * 0.86, GAP * 1.5, b * (0.34 + 0.55 * on));
        const tipR = S * (0.86 + 0.06 * on);
        diamond(D, cx + Math.cos(a) * tipR, cy + Math.sin(a) * tipR, S * 0.1 * (0.7 + 0.5 * on), GAP * 1.25, b * (0.4 + 0.5 * on));
      }
      ring(D, cx, cy, S * 0.22, 10, b * 0.4);
      paint(ctx, D);
    },
    // 16. a forking route — built by SEQUENTIAL reveal
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const g = frac(t * 0.11);
      const trunk = Math.min(1, g * 2);
      seg(D, cx, tl.H * 0.86, cx, tl.H * (0.86 - 0.34 * trunk), GAP * 1.45, b * 0.55);
      if (g > 0.5) {
        const f = (g - 0.5) * 2, y0 = tl.H * 0.52;
        seg(D, cx, y0, cx - S * 0.62 * f, y0 - S * 0.5 * f, GAP * 1.45, b * 0.5);
        seg(D, cx, y0, cx + S * 0.62 * f, y0 - S * 0.5 * f, GAP * 1.45, b * 0.5);
      }
      diamond(D, cx, tl.H * 0.52, S * 0.11, GAP * 1.25, b * 0.5);
      paint(ctx, D);
    },
  ],

  /* ═══ איזון · הרמוניה · חיבור — סימטריה, צירים נגדיים, שילוב ═══ */
  harmony: [
    // 17. two interlaced squares — turning in OPPOSITE directions
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const a = t * 0.14, R = S * 0.72, step = GAP * 1.5;
      const sq = (rot, r) => {
        const V = [];
        for (let k = 0; k < 4; k++) { const ang = rot + k / 4 * A_TAU + Math.PI / 4; V.push([cx + Math.cos(ang) * R, cy + Math.sin(ang) * R]); }
        for (let k = 0; k < 4; k++) seg(D, V[k][0], V[k][1], V[(k + 1) % 4][0], V[(k + 1) % 4][1], step, r);
      };
      sq(a, b * 0.5); sq(-a, b * 0.5);
      push(D, cx, cy, b * 0.95);
      paint(ctx, D);
    },
    // 18. a mirror pair — the halves move toward each other and back
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const k = 0.5 + 0.5 * Math.sin(t * 0.5), off = S * 0.42 * (1 - k);
      [-1, 1].forEach(sx => {
        const x = cx + sx * (S * 0.3 + off);
        arc(D, x, cy, S * 0.34, -Math.PI / 2, Math.PI / 2, 12, b * 0.5);
        seg(D, x, cy - S * 0.34, x, cy + S * 0.34, GAP * 1.5, b * 0.42);
      });
      seg(D, cx, cy - S * 0.6, cx, cy + S * 0.6, GAP * 1.7, b * (0.3 + 0.4 * k));
      paint(ctx, D);
    },
    // 19. a hexagonal weave — a WAVE crosses it
    (ctx, tl, t, bo) => {
      const b = DOT / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const R = S * 0.3, dx = R * 1.5, dy = R * Math.sqrt(3) / 2;
      for (let r = -1; r <= 1; r++) for (let c = -1; c <= 1; c++) {
        const hx = tl.W / 2 + c * dx, hy = tl.H / 2 + r * dy * 2 + (c & 1 ? dy : 0);
        const w = 0.5 + 0.5 * Math.sin(t * 0.8 - (hx / tl.W) * 4);
        for (let k = 0; k < 6; k++) {
          const a0 = k / 6 * A_TAU, a1 = (k + 1) / 6 * A_TAU;
          seg(D, hx + Math.cos(a0) * R, hy + Math.sin(a0) * R, hx + Math.cos(a1) * R, hy + Math.sin(a1) * R, GAP * 1.5, b * (0.3 + 0.42 * w));
        }
      }
      paint(ctx, D);
    },
    // 20. concentric rings + centre — ALTERNATING pulse in and out
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      [0.34, 0.58, 0.84].forEach((k, idx) => {
        const p = 0.5 + 0.5 * Math.sin(t * 0.5 - idx * Math.PI / 2);
        ring(D, cx, cy, S * k * (0.94 + 0.1 * p), 12 + idx * 8, b * (0.34 + 0.45 * p));
      });
      push(D, cx, cy, b * (0.9 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.5 + Math.PI))));
      paint(ctx, D);
    },
  ],

  /* ═══ חיים · חוזק · יציבות — ציר אנכי, בסיס, מבנה מדורג ═══ */
  vitality: [
    // 21. a stepped tower — built from the BASE upward
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const g = frac(t * 0.1), tiers = 4;
      for (let k = 0; k < tiers; k++) {
        const on = clamp01(g * tiers - k);
        const w = S * (0.78 - k * 0.16), y = tl.H * (0.8 - k * 0.15);
        seg(D, cx - w * on, y, cx + w * on, y, GAP * 1.45, b * 0.52);
      }
      seg(D, cx, tl.H * 0.86, cx, tl.H * 0.2, GAP * 1.8, b * 0.34);
      paint(ctx, D);
    },
    // 22. a central axis that HOLDS while its envelope moves
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      seg(D, cx, cy - S * 0.82, cx, cy + S * 0.82, GAP * 1.4, b * 0.6);   // the steady axis
      const sway = Math.sin(t * 0.5) * S * 0.2;
      [-1, 1].forEach(sy => {
        for (let k = 1; k <= 3; k++) {
          const y = cy + sy * k * S * 0.24;
          seg(D, cx, y, cx + sway * (k / 3) * (sy > 0 ? 1 : -1), y - sy * S * 0.14, GAP * 1.4, b * 0.44);
          seg(D, cx, y, cx - sway * (k / 3) * (sy > 0 ? 1 : -1), y - sy * S * 0.14, GAP * 1.4, b * 0.44);
        }
      });
      paint(ctx, D);
    },
    // 23. a gate — GROWS upward, then settles
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const g = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.4));
      const w = S * 0.5, base = tl.H * 0.84, top = tl.H * 0.84 - S * 1.0 * g;
      seg(D, cx - w, base, cx - w, top + S * 0.22, GAP * 1.45, b * 0.55);
      seg(D, cx + w, base, cx + w, top + S * 0.22, GAP * 1.45, b * 0.55);
      arc(D, cx, top + S * 0.22, w, Math.PI, A_TAU, 16, b * 0.55);
      seg(D, cx - w * 1.25, base, cx + w * 1.25, base, GAP * 1.5, b * 0.5);
      paint(ctx, D);
    },
    // 24. a radial structure that EXPANDS and returns to its stable core
    (ctx, tl, t, bo) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const k = 0.5 + 0.5 * Math.sin(t * 0.45);
      for (let j = 0; j < 12; j++) {
        const a = j / 12 * A_TAU, R0 = S * 0.26, R1 = S * (0.5 + 0.36 * k);
        seg(D, cx + Math.cos(a) * R0, cy + Math.sin(a) * R0, cx + Math.cos(a) * R1, cy + Math.sin(a) * R1, GAP * 1.5, b * 0.44);
      }
      ring(D, cx, cy, S * 0.24, 12, b * 0.55);
      push(D, cx, cy, b * 1.15);
      paint(ctx, D);
    },
  ],

  /* ═══ מזל · הזדמנות — מקצב לא צפוי, מוקדים מתחלפים ═══ */
  luck: [
    // 25. an abstract quatrefoil — the lobes light in a CHANGING order
    (ctx, tl, t, bo, i) => {
      const b = DOT / 2, cx = tl.W / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const beat = Math.floor(t * 0.5);
      for (let k = 0; k < 4; k++) {
        const a = k / 4 * A_TAU + Math.PI / 4;
        const lx = cx + Math.cos(a) * S * 0.4, ly = cy + Math.sin(a) * S * 0.4;
        const on = sd(beat, k) > 0.55 ? 1 : 0.25;
        arc(D, lx, ly, S * 0.3, 0, A_TAU, 14, b * (0.32 + 0.5 * on));
      }
      push(D, cx, cy, b * 1.0);
      paint(ctx, D);
    },
    // 26. scattered small diamonds — unpredictable ACTIVATION
    (ctx, tl, t, bo, i) => {
      const b = DOT / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const beat = Math.floor(t * 0.7);
      for (let k = 0; k < 9; k++) {
        const x = tl.W * (0.2 + sd(k, 11) * 0.6), y = tl.H * (0.2 + sd(k, 23) * 0.6);
        const on = sd(beat * 7 + k, 3) > 0.62 ? 1 : 0.22;
        diamond(D, x, y, S * (0.1 + 0.05 * on), GAP * 1.25, b * (0.3 + 0.5 * on));
      }
      paint(ctx, D);
    },
    // 27. three foci — pulsing in turn, in a shifting order
    (ctx, tl, t, bo, i) => {
      const b = DOT / 2, cy = tl.H / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const beat = Math.floor(t * 0.45), pick = Math.floor(sd(beat, 2) * 3);
      for (let k = 0; k < 3; k++) {
        const x = tl.W * (0.28 + k * 0.22), on = k === pick ? 1 : 0.28;
        ring(D, x, cy, S * (0.24 + 0.06 * on), 14, b * (0.32 + 0.5 * on));
        push(D, x, cy, b * (0.5 + 0.5 * on));
      }
      paint(ctx, D);
    },
    // 28. a field of dots — ONE is chosen out of the group
    (ctx, tl, t, bo, i) => {
      const b = DOT / 2, S = Math.min(tl.W, tl.H) / 2, D = [];
      const cols = 5, rows = 5, m = S * 0.72;
      const beat = Math.floor(t * 0.55), pick = Math.floor(sd(beat, 6) * cols * rows);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = tl.W / 2 + (c - (cols - 1) / 2) * (m * 2 / (cols - 1));
        const y = tl.H / 2 + (r - (rows - 1) / 2) * (m * 2 / (rows - 1));
        const isPick = r * cols + c === pick;
        push(D, x, y, b * (isPick ? 1.5 : 0.42));
        if (isPick) diamond(D, x, y, S * 0.16, GAP * 1.3, b * 0.5);
      }
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
const GAL_STEP = 0.92;        // spacing between tiles, in tile-widths
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
    boxH = Math.max(60, Math.min(galH * 0.8, galW * 0.42));
    boxW = boxH;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Published as a variable the CSS applies with !important — the stage's own
    // grid rules size .dot-tile with !important and would otherwise win.
    gridEl.style.setProperty('--tile-size', boxW + 'px');
    for (const tl of tiles) {
      tl.W = boxW; tl.H = boxH;
      tl.canvas.width = Math.round(boxW * dpr); tl.canvas.height = Math.round(boxH * dpr);
      tl.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
      tl.alpha = (chosen >= 0 && tl.i !== chosen) ? 0.35 : (ad < 0.5 ? 1 : Math.max(0.42, 1 - (ad - 0.5) * 0.34)) * enterEase;
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
