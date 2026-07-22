/* geometric.js — v5 sacred-geometry rendering (rev 2).

   Every visible decoration on the page is drawn from scratch as SVG
   here. No v4 PNG assets are referenced. The slots that v4 used for
   coloured panels are still in the DOM (so all interactions/state
   keep working), but they're transparent — we anchor new SVG overlays
   to them. Pieces re-render on stage change so each step can feel
   like a new composition. */

(() => {
  const NS  = 'http://www.w3.org/2000/svg';
  const TAU = Math.PI * 2;

  // ── Tiny SVG helpers ────────────────────────────────────────
  function el(tag, attrs = {}, parent){
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  const circle = (p, cx, cy, r, cls) =>
    el('circle', { cx, cy, r, ...(cls && { class: cls }) }, p);
  const dot    = (p, cx, cy, r, cls = 'nodefill') =>
    el('circle', { cx, cy, r, class: cls }, p);
  const line   = (p, x1, y1, x2, y2, cls) =>
    el('line', { x1, y1, x2, y2, ...(cls && { class: cls }) }, p);

  function polygon(p, cx, cy, r, n, rot = 0, cls){
    const pts = [];
    for (let i = 0; i < n; i++){
      const a = rot + (i / n) * TAU;
      pts.push(`${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`);
    }
    return el('polygon', { points: pts.join(' '), ...(cls && { class: cls }) }, p);
  }
  function concentric(p, cx, cy, rMin, rMax, count, cls){
    const step = count === 1 ? 0 : (rMax - rMin) / (count - 1);
    for (let i = 0; i < count; i++) circle(p, cx, cy, rMin + step * i, cls);
  }
  function spokes(p, cx, cy, rMin, rMax, count, cls){
    for (let i = 0; i < count; i++){
      const a = (i / count) * TAU;
      line(p,
        cx + Math.cos(a) * rMin, cy + Math.sin(a) * rMin,
        cx + Math.cos(a) * rMax, cy + Math.sin(a) * rMax,
        cls);
    }
  }
  function flowerOfLife(p, cx, cy, r, rings = 1, cls){
    circle(p, cx, cy, r, cls);
    for (let k = 1; k <= rings; k++){
      const ringR = r * k;
      const n = 6 * k;
      for (let i = 0; i < n; i++){
        const a = (i / n) * TAU;
        circle(p, cx + Math.cos(a) * ringR, cy + Math.sin(a) * ringR, r, cls);
      }
    }
  }
  function hexStar(p, cx, cy, r, cls){
    polygon(p, cx, cy, r, 3, -Math.PI / 2, cls);
    polygon(p, cx, cy, r,  3,  Math.PI / 2, cls);
  }

  // ── Composed pieces ────────────────────────────────────────

  /** Vertical sacred stack for the sidebar — mirrors the mockup:
      circle+dot, concentric circles, flower of life, star of david,
      concentric circles, circle+dot. Spine line connects them. */
  function pieceSidebarStack(w, h){
    const root = el('g');
    const cx = w / 2;
    const padTop    = h * 0.05;
    const padBottom = h * 0.05;
    const usableH   = h - padTop - padBottom;

    // Vertical spine — dashed beige guide
    el('line', { x1: cx, y1: padTop, x2: cx, y2: h - padBottom, class: 'ghost' }, root);

    // Define 6 vertical anchor points
    const ys = [0, 0.18, 0.36, 0.55, 0.74, 0.95].map(t => padTop + usableH * t);
    const baseR = Math.min(w * 0.45, usableH * 0.10);

    // Slot 0 — small ring + accent dot in centre
    circle(root, cx, ys[0], baseR * 0.6);
    dot(root, cx, ys[0], 2, 'accentfill');

    // Slot 1 — concentric circles (planet-like)
    concentric(root, cx, ys[1], baseR * 0.25, baseR * 0.95, 4);
    dot(root, cx, ys[1], 1.6);
    // 4 cardinal tick nodes
    for (let i = 0; i < 4; i++){
      const a = i * Math.PI / 2;
      dot(root, cx + Math.cos(a) * baseR * 0.95, ys[1] + Math.sin(a) * baseR * 0.95, 1.6);
    }

    // Slot 2 — flower of life (seed pattern)
    flowerOfLife(root, cx, ys[2], baseR * 0.42, 1);
    // ring around it
    circle(root, cx, ys[2], baseR * 0.95, 'thin');
    // 6 cardinal nodes
    for (let i = 0; i < 6; i++){
      const a = i * TAU / 6;
      dot(root, cx + Math.cos(a) * baseR * 0.95, ys[2] + Math.sin(a) * baseR * 0.95, 1.4);
    }

    // Slot 3 — hex star inside a circle
    circle(root, cx, ys[3], baseR * 0.95, 'thin');
    hexStar(root, cx, ys[3], baseR * 0.7);
    // accent in centre
    dot(root, cx, ys[3], 1.4, 'accentfill');

    // Slot 4 — vesica piscis stack (3 overlapping circles, vertical)
    circle(root, cx,             ys[4] - baseR * 0.30, baseR * 0.55);
    circle(root, cx,             ys[4] + baseR * 0.30, baseR * 0.55);
    circle(root, cx,             ys[4],                baseR * 0.85, 'thin');
    dot(root, cx, ys[4], 1.4);

    // Slot 5 — small ring + accent dot
    circle(root, cx, ys[5], baseR * 0.55);
    dot(root, cx, ys[5], 2, 'accentfill');

    return root;
  }

  /** Small geometric stamp — one of several variants. */
  function stamp(p, cx, cy, r, variant){
    const g = el('g', { transform: `translate(${cx},${cy})` }, p);
    if (variant === 'hexstar'){
      hexStar(g, 0, 0, r);
      circle(g, 0, 0, r * 0.45, 'thin');
    } else if (variant === 'seed'){
      flowerOfLife(g, 0, 0, r * 0.42, 1);
      circle(g, 0, 0, r * 0.97, 'thin');
    } else if (variant === 'flower'){
      // smaller flower — 6 petals around a centre, all same r
      flowerOfLife(g, 0, 0, r * 0.36, 1);
      // tiny nodes at outer ring
      for (let i = 0; i < 6; i++){
        const a = i * TAU / 6;
        dot(g, Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, 1.2);
      }
    } else if (variant === 'rings'){
      concentric(g, 0, 0, r * 0.18, r, 4);
      dot(g, 0, 0, 1.4);
    } else { // vesica
      circle(g, -r * 0.32, 0, r * 0.7);
      circle(g,  r * 0.32, 0, r * 0.7);
    }
    return g;
  }

  /** Central bottom mandala — dense overlapping circle composition. */
  function pieceBottomMandala(w, h){
    const root = el('g');
    const cx = w / 2;
    const cy = h * 0.55;
    const r  = Math.min(h * 0.40, w * 0.04);

    // Outer dashed ring
    circle(root, cx, cy, r * 2.2, 'ghost');
    // 8-pointed star
    polygon(root, cx, cy, r * 1.7, 8, -Math.PI / 8, 'thin');
    polygon(root, cx, cy, r * 1.7, 8,  Math.PI / 8, 'thin');
    // Flower of life centre
    flowerOfLife(root, cx, cy, r * 0.45, 1);
    // Hex spokes
    spokes(root, cx, cy, r * 0.55, r * 1.7, 12, 'thin');
    // Outer node ring
    for (let i = 0; i < 12; i++){
      const a = i * TAU / 12 + Math.PI / 12;
      dot(root, cx + Math.cos(a) * r * 1.85, cy + Math.sin(a) * r * 1.85, 1.6);
    }
    // Centre accent
    dot(root, cx, cy, 2.2, 'accentfill');

    // Lateral extending lines to either edge of the host width
    el('line', { x1: 0, y1: cy, x2: cx - r * 2.4, y2: cy, class: 'thin' }, root);
    el('line', { x1: cx + r * 2.4, y1: cy, x2: w, y2: cy, class: 'thin' }, root);
    // Terminal accent dots on the extending lines
    dot(root, 0, cy, 2, 'accentfill');
    dot(root, w, cy, 2, 'accentfill');

    return root;
  }

  // ── Mount / re-mount on stage change ─────────────────────────

  function placeOverlay(host, builder, opts = {}){
    if (!host) return;
    // Remove previous v5 overlay for this slot
    host.querySelectorAll(':scope > .geo-decor[data-v5]').forEach((n) => n.remove());

    const rect = host.getBoundingClientRect();
    const W = Math.max(40, opts.width  || rect.width);
    const H = Math.max(40, opts.height || rect.height);

    const wrap = document.createElement('div');
    wrap.className = 'geo-decor';
    wrap.dataset.v5 = '1';
    if (opts.style) Object.assign(wrap.style, opts.style);

    const svg = el('svg', {
      viewBox: `0 0 ${W} ${H}`,
      preserveAspectRatio: opts.preserve || 'xMidYMid meet',
    });
    wrap.appendChild(svg);
    svg.appendChild(builder(W, H));

    const cs = getComputedStyle(host);
    if (cs.position === 'static') host.style.position = 'relative';
    host.appendChild(wrap);
  }

  /** Position the top-strip stamps directly inside #q-main-cell so they
      sit in the top 90px row (matching v4 grid). 4 stamps for variety. */
  function placeTopStrip(cell){
    if (!cell) return;
    cell.querySelectorAll(':scope > .geo-top-strip[data-v5]').forEach((n) => n.remove());

    const wrap = document.createElement('div');
    wrap.className = 'geo-decor geo-top-strip';
    wrap.dataset.v5 = '1';
    Object.assign(wrap.style, {
      position: 'absolute',
      top: '0', left: '0', right: '0',
      height: '90px',
    });
    const W = Math.max(200, cell.getBoundingClientRect().width);
    const H = 90;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet' });
    wrap.appendChild(svg);

    // 4 stamps + the orange "01" number positioned on the rightmost cell
    // The cell is RTL, so visually right ↔ left. Place stamps left to right.
    const labels = ['flower', 'hexstar', 'flower', 'seed'];
    const cellW = W / 5;        // 4 stamps + 1 cell for "01"
    const r = Math.min(cellW * 0.36, H * 0.38);
    const y = H / 2;

    // Bottom hairline of the strip
    el('line', { x1: 0, y1: H - 0.5, x2: W, y2: H - 0.5, class: 'thin' }, svg);
    // Inner vertical dividers
    for (let i = 1; i < 5; i++){
      el('line', { x1: i * cellW, y1: 8, x2: i * cellW, y2: H - 8, class: 'ghost' }, svg);
    }

    // 4 stamps in cells 0..3 (which visually are the right 4 in RTL).
    for (let i = 0; i < labels.length; i++){
      stamp(svg, cellW * (i + 0.5), y, r, labels[i]);
    }

    // Cell 4 (rightmost in LTR, leftmost in RTL view) — the orange "01"
    // Draw a circle around it and the number itself as SVG text.
    const numCx = cellW * 4.5;
    circle(svg, numCx, y, r * 1.05, 'thin');
    const t = el('text', {
      x: numCx, y: y + 1,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'font-family': 'ArbelG, sans-serif',
      'font-weight': '700',
      'font-size': Math.round(r * 1.0),
      fill: 'var(--geo-accent)',
      stroke: 'none',
    }, svg);
    // Decorative stage number = the real 1-based position (mirrors the header
    // counter). NOT data-stage, which is now a fixed style id decoupled from
    // position (see QUESTIONS.styleStage in questionnaire.js).
    t.textContent = (document.getElementById('q-num-current')?.textContent
      || String((Number(document.getElementById('section-3')?.dataset.stage || 0) + 1)).padStart(2, '0'));

    cell.style.position = 'relative';
    cell.appendChild(wrap);
  }

  function mount(){
    // Sidebar — vertical sacred stack
    placeOverlay(
      document.querySelector('#section-3 .q-chrome-side'),
      (w, h) => pieceSidebarStack(w, h)
    );

    // Top strip (4 stamps + orange "01") inside #q-main-cell
    placeTopStrip(document.querySelector('#section-3 #q-main-cell'));

    // Bottom mandala across cols 2-3 of row 3
    const layout = document.getElementById('questionnaire-layout');
    if (layout){
      layout.querySelectorAll(':scope > .geo-bottom-band[data-v5]').forEach((n) => n.remove());
      const band = document.createElement('div');
      band.className = 'geo-decor geo-bottom-band';
      band.dataset.v5 = '1';
      Object.assign(band.style, {
        position: 'absolute',
        left: 'var(--col-1, 280px)',
        right: '0',
        bottom: 'clamp(20px, 3vh, 36px)',
        height: '90px',
        transform: 'translateY(-45px)',
        pointerEvents: 'none',
        zIndex: '3',
      });
      const W = 1200, H = 90;
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet' });
      band.appendChild(svg);
      svg.appendChild(pieceBottomMandala(W, H));
      layout.appendChild(band);
    }
  }

  function init(){
    mount();
    const section3 = document.getElementById('section-3');
    if (section3 && !section3._geoObserved){
      new MutationObserver(() => mount()).observe(section3, {
        attributes: true, attributeFilter: ['data-stage', 'class']
      });
      section3._geoObserved = true;
    }
    let rTimer = 0;
    addEventListener('resize', () => {
      clearTimeout(rTimer);
      rTimer = setTimeout(mount, 200);
    });
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // v5 stamp
  if (!document.getElementById('v5-stamp')){
    const s = document.createElement('div');
    s.id = 'v5-stamp';
    s.textContent = 'v5 — sacred geometry';
    document.body.appendChild(s);
  }
})();
