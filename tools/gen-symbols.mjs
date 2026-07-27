/* gen-symbols.mjs — generates the 8 authored (non-scanned) symbol OBJs:
   circle, bird, sun, diamond, hexagram, pentagram, cowrie, snake.

   Each symbol is a FLAT extruded silhouette (front + back triangle layers at
   z = ±T) composed of convex primitives — exactly the kind of OBJ the two
   samplers already eat: jewel-engine's shell builder dots the faces, and
   symbol-contour masks the XY projection for the 2D drawing.

   Run:  node tools/gen-symbols.mjs
   Writes each OBJ to public/<name>.obj (2D contour + artifact3d) AND
   public/jewel/objs/<name>.obj (the jewel engine).                       */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = 7;                       // half-thickness of the extrusion

/* ── a tiny OBJ builder ── */
function mesh() {
  const v = [], f = [];
  // one triangle, extruded: front (z=+T) and back (z=−T)
  const tri = (a, b, c) => {
    for (const z of [T, -T]) {
      const i = v.length;
      v.push([a[0], a[1], z], [b[0], b[1], z], [c[0], c[1], z]);
      f.push([i + 1, i + 2, i + 3]);
    }
  };
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  // convex (or star-shaped-about-centroid) polygon fan
  const poly = (pts) => {
    let cx = 0, cy = 0;
    for (const p of pts) { cx += p[0]; cy += p[1]; }
    cx /= pts.length; cy /= pts.length;
    for (let i = 0; i < pts.length; i++) tri([cx, cy], pts[i], pts[(i + 1) % pts.length]);
  };
  const disc = (cx, cy, r, seg = 36) => {
    const pts = [];
    for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    poly(pts);
  };
  const ellipse = (cx, cy, a, b, rot = 0, seg = 40) => {
    const pts = [];
    for (let i = 0; i < seg; i++) {
      const t = (i / seg) * Math.PI * 2;
      const x = a * Math.cos(t), y = b * Math.sin(t);
      pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
    }
    poly(pts);
  };
  const ring = (cx, cy, rOut, rIn, seg = 64) => {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      quad(
        [cx + rOut * Math.cos(a0), cy + rOut * Math.sin(a0)],
        [cx + rOut * Math.cos(a1), cy + rOut * Math.sin(a1)],
        [cx + rIn * Math.cos(a1), cy + rIn * Math.sin(a1)],
        [cx + rIn * Math.cos(a0), cy + rIn * Math.sin(a0)],
      );
    }
  };
  // thick line segment (for star chords / frames)
  const seg = (a, b, w) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const nx = (-dy / L) * (w / 2), ny = (dx / L) * (w / 2);
    quad([a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]);
  };
  const out = () => {
    let s = '';
    for (const p of v) s += `v ${p[0].toFixed(2)} ${p[1].toFixed(2)} ${p[2].toFixed(2)}\n`;
    for (const t of f) s += `f ${t[0]} ${t[1]} ${t[2]}\n`;
    return s;
  };
  return { tri, quad, poly, disc, ellipse, ring, seg, out };
}

const SYMBOLS = {};

/* ── circle — a clean ring (wholeness / cyclicality) ── */
SYMBOLS.circle = (() => {
  const m = mesh();
  m.ring(0, 0, 100, 72, 72);
  return m.out();
})();

/* ── radiant sun — a circle in a circle in a circle + a core ── */
SYMBOLS.sun = (() => {
  const m = mesh();
  m.ring(0, 0, 100, 87, 72);
  m.ring(0, 0, 69, 57, 56);
  m.ring(0, 0, 39, 29, 44);
  m.disc(0, 0, 12, 24);
  return m.out();
})();

/* ── bird — a side-profile dove facing right (body, head, beak, wing, tail) ── */
SYMBOLS.bird = (() => {
  const m = mesh();
  m.ellipse(-5, -8, 52, 30, -0.2);                     // body
  m.disc(44, 18, 17);                                  // head
  m.tri([57, 25], [57, 11], [76, 17]);                 // beak
  m.poly([[-14, 6], [20, 4], [0, 50], [-30, 40]]);     // raised wing
  m.poly([[-48, -4], [-80, 16], [-86, 2], [-54, -16]]);// tail feathers
  return m.out();
})();

/* ── diamond (מעוין) — a rhombus FRAME: the Berber eye, against the evil eye ── */
SYMBOLS.diamond = (() => {
  const m = mesh();
  const W = 78, H = 105, W2 = 60, H2 = 81;
  m.quad([0, H], [W, 0], [W2, 0], [0, H2]);            // top-right edge
  m.quad([W, 0], [0, -H], [0, -H2], [W2, 0]);          // bottom-right
  m.quad([0, -H], [-W, 0], [-W2, 0], [0, -H2]);        // bottom-left
  m.quad([-W, 0], [0, H], [0, H2], [-W2, 0]);          // top-left
  return m.out();
})();

/* ── hexagram (חותם שלמה) — two interlocked triangle frames ── */
SYMBOLS.hexagram = (() => {
  const m = mesh();
  const triFrame = (phase) => {
    const R = 100, R2 = 74;
    const P = [], Q = [];
    for (let k = 0; k < 3; k++) {
      const a = phase + (k * 2 * Math.PI) / 3;
      P.push([R * Math.cos(a), R * Math.sin(a)]);
      Q.push([R2 * Math.cos(a), R2 * Math.sin(a)]);
    }
    for (let k = 0; k < 3; k++) m.quad(P[k], P[(k + 1) % 3], Q[(k + 1) % 3], Q[k]);
  };
  triFrame(Math.PI / 2);        // pointing up
  triFrame(-Math.PI / 2);       // pointing down
  return m.out();
})();

/* ── pentagram — the five-chord star, drawn as thick strokes ── */
SYMBOLS.pentagram = (() => {
  const m = mesh();
  const P = [];
  for (let k = 0; k < 5; k++) {
    const a = Math.PI / 2 + (k * 2 * Math.PI) / 5;
    P.push([100 * Math.cos(a), 100 * Math.sin(a)]);
  }
  const order = [0, 2, 4, 1, 3, 0];
  for (let i = 0; i < 5; i++) m.seg(P[order[i]], P[order[i + 1]], 13);
  return m.out();
})();

/* ── cowrie shell — a portrait oval split by the wavy mouth-slit ── */
SYMBOLS.cowrie = (() => {
  const m = mesh();
  const A = 62, B = 92, GAP = 7, N = 26;
  const half = (side) => {                             // side: −1 left, +1 right
    const pts = [];
    // outer half-ellipse, top → bottom on this side
    for (let i = 0; i <= N; i++) {
      const t = Math.PI / 2 + side * (Math.PI * i) / N;    // 90° → 90°±180°
      pts.push([A * Math.cos(t), B * Math.sin(t)]);
    }
    // back up along the wavy central slit (bottom → top)
    for (let i = N; i >= 0; i--) {
      const y = -B + (2 * B * i) / N;
      const clamp = Math.max(0.25, 1 - Math.pow(Math.abs(y) / B, 3));  // slit narrows at the tips
      pts.push([side * GAP * clamp + 4 * Math.sin(y * 0.075) * clamp, y * 0.94]);
    }
    if (side < 0) pts.reverse();
    m.poly(pts);
  };
  half(-1); half(1);
  return m.out();
})();

/* ── snake — an S-curved serpent with a round head, tapering to the tail ── */
SYMBOLS.snake = (() => {
  const m = mesh();
  const N = 30, pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    pts.push({ x: 38 * Math.sin(t * Math.PI * 1.8 + 0.35), y: -95 + 190 * t, w: 5 + 11 * t });
  }
  for (let i = 0; i < N; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    const nax = (-dy / L) * (a.w / 2), nay = (dx / L) * (a.w / 2);
    const nbx = (-dy / L) * (b.w / 2), nby = (dx / L) * (b.w / 2);
    m.quad([a.x + nax, a.y + nay], [b.x + nbx, b.y + nby], [b.x - nbx, b.y - nby], [a.x - nax, a.y - nay]);
  }
  const head = pts[N];
  m.disc(head.x + 2, head.y + 8, 16);                  // head
  return m.out();
})();

/* ── write everything ── */
mkdirSync(join(ROOT, 'public/jewel/objs'), { recursive: true });
for (const [name, obj] of Object.entries(SYMBOLS)) {
  writeFileSync(join(ROOT, 'public', `${name}.obj`), obj);
  writeFileSync(join(ROOT, 'public/jewel/objs', `${name}.obj`), obj);
  console.log(`${name}.obj — ${obj.split('\n').filter(l => l[0] === 'v').length} verts`);
}
