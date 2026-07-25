/* profession-cards.js — "מה תחום העיסוק שלך?" stage.
   ─────────────────────────────────────────────────────────────────────
   Eight profession-category cards (4×2). Each card is a cream plate with a
   DOTTED icon (canvas, gently animated) and a Hebrew label. Tapping a card
   selects it (others dim) and reports (label, symbolKey) so the caller can
   force that talisman symbol; "המשך" confirms. Matches the interface's dotted
   language (dark #282828 dots) and palette. */

const TAU = Math.PI * 2;
const DOTC = '#282828';

function dot(ctx, x, y, r) { if (r <= 0.05) return; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
function ring(D, cx, cy, R, n, ph) { for (let i = 0; i < n; i++) { const a = (ph || 0) + i / n * TAU; D.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R }); } }
function seg(D, x0, y0, x1, y1, step) { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / step)); for (let i = 0; i <= n; i++) D.push({ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n }); }
function arc(D, cx, cy, R, a0, a1, step) { const n = Math.max(2, Math.round(Math.abs(a1 - a0) * R / step)); for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; D.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R }); } }
function ell(D, cx, cy, rx, ry, ph, rot, n) { for (let i = 0; i < n; i++) { const a = i / n * TAU; let x = Math.cos(a) * rx, y = Math.sin(a) * ry; const c = Math.cos(rot), s = Math.sin(rot); D.push({ x: cx + x * c - y * s, y: cy + x * s + y * c }); } }

/* Each icon draws dots into D within a box centred at (cx,cy), scale S, base dot
   radius b, animated by t (seconds). Idle motion only — subtle. */
const CATS = [
  { label: 'אמנות ויצירה', symbol: 'lotus', draw(D, cx, cy, S, b, t) {   // painter's palette
      const st = b * 2.6;
      arc(D, cx, cy, S * 0.92, -0.35, TAU - 1.0, st);              // open blob
      ring(D, cx + S * 0.34, cy + S * 0.4, S * 0.16, 7);           // thumb hole
      [[-0.5, -0.42], [0.05, -0.6], [0.55, -0.18], [-0.62, 0.12]].forEach(([px, py], i) => {
        D.push({ x: cx + px * S, y: cy + py * S, rm: 2.0 + 0.7 * Math.sin(t * 2 + i * 1.6) });   // paint blobs pulse
      });
    } },
  { label: 'מדע וטכנולוגיה', symbol: 'dharma', draw(D, cx, cy, S, b, t) {   // atom
      D.push({ x: cx, y: cy, rm: 1.6 });
      for (let k = 0; k < 3; k++) {
        const rotk = k * Math.PI / 3 + t * 0.5;
        ell(D, cx, cy, S * 0.92, S * 0.36, 0, rotk, 22);
        const a = t * 1.6 + k * TAU / 3;                            // electron
        D.push({ x: cx + Math.cos(a) * S * 0.92 * Math.cos(rotk) - Math.sin(a) * S * 0.36 * Math.sin(rotk),
                 y: cx * 0 + cy + Math.cos(a) * S * 0.92 * Math.sin(rotk) + Math.sin(a) * S * 0.36 * Math.cos(rotk), rm: 2.0 });
      }
    } },
  { label: 'חינוך והוראה', symbol: 'anah', draw(D, cx, cy, S, b, t) {   // open book
      const st = b * 2.6, flut = Math.sin(t * 1.4) * S * 0.05;
      seg(D, cx, cy - S * 0.6, cx, cy + S * 0.75, st);              // spine
      // left + right page outlines
      seg(D, cx, cy - S * 0.6, cx - S * 0.92, cy - S * 0.42 + flut, st);
      seg(D, cx - S * 0.92, cy - S * 0.42 + flut, cx - S * 0.92, cy + S * 0.6, st);
      seg(D, cx - S * 0.92, cy + S * 0.6, cx, cy + S * 0.75, st);
      seg(D, cx, cy - S * 0.6, cx + S * 0.92, cy - S * 0.42 - flut, st);
      seg(D, cx + S * 0.92, cy - S * 0.42 - flut, cx + S * 0.92, cy + S * 0.6, st);
      seg(D, cx + S * 0.92, cy + S * 0.6, cx, cy + S * 0.75, st);
      for (let r = 0; r < 3; r++) {                                 // text lines
        const y = cy - S * 0.18 + r * S * 0.26;
        seg(D, cx - S * 0.72, y + flut * 0.6, cx - S * 0.2, y + flut * 0.3, st);
        seg(D, cx + S * 0.2, y - flut * 0.3, cx + S * 0.72, y - flut * 0.6, st);
      }
    } },
  { label: 'בריאות ורפואה', symbol: 'eye', draw(D, cx, cy, S, b, t) {   // medical cross in a ring
      ring(D, cx, cy, S * 0.95, 30, t * 0.2);
      const arm = S * 0.5, w = S * 0.2, p = 1 + 0.06 * Math.sin(t * 2), st = b * 2.4;
      seg(D, cx, cy - arm * p, cx, cy + arm * p, st);
      seg(D, cx - arm * p, cy, cx + arm * p, cy, st);
      seg(D, cx - w, cy - arm * p, cx + w, cy - arm * p, st);
      seg(D, cx - w, cy + arm * p, cx + w, cy + arm * p, st);
      seg(D, cx - arm * p, cy - w, cx - arm * p, cy + w, st);
      seg(D, cx + arm * p, cy - w, cx + arm * p, cy + w, st);
    } },
  { label: 'עסקים וכלכלה', symbol: 'rimon', draw(D, cx, cy, S, b, t) {   // rising bar chart
      const st = b * 2.4, base = cy + S * 0.8, x0 = cx - S * 0.8, bw = S * 0.5;
      seg(D, x0 - S * 0.05, base, cx + S * 0.9, base, st);          // baseline
      for (let i = 0; i < 4; i++) {
        const h = S * (0.5 + i * 0.28) * (0.82 + 0.18 * Math.sin(t * 1.6 + i * 0.9));
        const x = x0 + i * bw;
        seg(D, x, base, x, base - h, st);
        seg(D, x, base - h, x + bw * 0.55, base - h, st);
        seg(D, x + bw * 0.55, base - h, x + bw * 0.55, base, st);
      }
    } },
  { label: 'טבע וחקלאות', symbol: 'tiltan', draw(D, cx, cy, S, b, t) {   // leaf, gently swaying
      const sway = Math.sin(t * 1.2) * 0.13, st = b * 2.4;
      const R = (px, py) => { const c = Math.cos(sway), s = Math.sin(sway); return [cx + (px) * c - (py) * s, cy + (px) * s + (py) * c]; };
      // two mirrored edges tip(top) → base(bottom)
      const N = 12;
      for (let i = 0; i <= N; i++) { const f = i / N, y = -S * 0.95 + f * S * 1.9, w = Math.sin(f * Math.PI) * S * 0.6;
        let [ax, ay] = R(w, y); D.push({ x: ax, y: ay });
        let [bx, by] = R(-w, y); D.push({ x: bx, y: by }); }
      for (let i = 0; i <= N; i++) { const f = i / N, y = -S * 0.9 + f * S * 1.8; const [vx, vy] = R(0, y); D.push({ x: vx, y: vy }); }   // vein
    } },
  { label: 'בנייה והנדסה', symbol: 'djed', draw(D, cx, cy, S, b, t) {   // gear
      const ph = t * 0.5, teeth = 8;
      ring(D, cx, cy, S * 0.62, 26, ph);
      ring(D, cx, cy, S * 0.24, 8, -ph);                            // hub
      for (let i = 0; i < teeth; i++) { const a = ph + i / teeth * TAU;
        seg(D, cx + Math.cos(a) * S * 0.62, cy + Math.sin(a) * S * 0.62, cx + Math.cos(a) * S * 0.95, cy + Math.sin(a) * S * 0.95, b * 2.2); }
    } },
  { label: 'שירות וקהילה', symbol: 'hamsa', draw(D, cx, cy, S, b, t) {   // three people
      const st = b * 2.3;
      [[-0.62, 0.12], [0, -0.05], [0.62, 0.12]].forEach(([px, py], i) => {
        const bob = Math.sin(t * 1.5 + i * 1.4) * S * 0.06;
        const hx = cx + px * S, hy = cy + py * S - S * 0.32 + bob;
        ring(D, hx, hy, S * 0.2, 10);                               // head
        arc(D, hx, hy + S * 0.62, S * 0.34, Math.PI + 0.5, TAU - 0.5, st);   // shoulders
      });
    } },
];

export function mountProfessionCards(host, { onSelect } = {}) {
  if (!host) return () => {};

  const grid = document.createElement('div'); grid.className = 'prof-grid';
  const inner = document.createElement('div'); inner.className = 'prof-inner';
  grid.appendChild(inner); host.appendChild(grid);

  const cards = [];
  CATS.forEach((cat, i) => {
    const card = document.createElement('div'); card.className = 'prof-card'; card.dataset.i = String(i);
    const cv = document.createElement('canvas'); cv.className = 'prof-icon';
    const lbl = document.createElement('div'); lbl.className = 'prof-label'; lbl.textContent = cat.label;
    card.appendChild(cv); card.appendChild(lbl); inner.appendChild(card);
    cards.push({ i, card, cv, ctx: cv.getContext('2d'), W: 0, H: 0 });
    setTimeout(() => card.classList.add('is-in'), 140 + i * 85);   // entrance stagger
  });

  function size(c) {
    const r = c.cv.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.W = r.width; c.H = r.height;
    c.cv.width = Math.round(r.width * dpr); c.cv.height = Math.round(r.height * dpr);
    c.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const sizeAll = () => cards.forEach(size);

  let selected = -1, raf = 0, t0 = performance.now();
  function frame(now) {
    const t = (now - t0) / 1000;
    for (const c of cards) {
      if (!c.W) { size(c); if (!c.W) continue; }
      const ctx = c.ctx; ctx.clearRect(0, 0, c.W, c.H);
      ctx.fillStyle = DOTC;
      const cx = c.W / 2, cy = c.H / 2, S = Math.min(c.W, c.H) * 0.33, b = Math.max(1.5, S * 0.05);
      const D = [];
      CATS[c.i].draw(D, cx, cy, S, b, t);
      ctx.beginPath();
      for (const d of D) dot(ctx, d.x, d.y, b * (d.rm || 1));
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  }
  requestAnimationFrame(() => { sizeAll(); raf = requestAnimationFrame(frame); });

  cards.forEach(c => {
    c.card.addEventListener('pointerdown', e => {
      e.preventDefault();
      selected = c.i;
      cards.forEach(o => { o.card.classList.toggle('is-selected', o.i === selected); o.card.classList.toggle('is-dimmed', o.i !== selected); });
      onSelect && onSelect(CATS[c.i].label, CATS[c.i].symbol);
    });
  });

  const onResize = () => sizeAll();
  window.addEventListener('resize', onResize);
  return function teardown() { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); try { grid.remove(); } catch (_) {} };
}
