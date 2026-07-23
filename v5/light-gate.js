/* light-gate.js — "Light Point Selection" interaction.
   ─────────────────────────────────────────────────────────────────────
   The field keeps its scattered light points. A small rectangular "gate"
   sits at the bottom of the central area (no points inside it). The user:
     1. presses a light point to select it,
     2. drags to draw a thin straight line from the point to the cursor,
     3. releases.
   Release OUTSIDE the gate cancels (the point returns to normal). Release
   INSIDE the gate turns the line into a gentle dotted trail and the point
   then travels along it ON ITS OWN toward the gate — the trail vanishing
   behind it — until it is absorbed (the gate gives a soft pulse), the other
   points fade away, and the stage advances.

   Everything is points + thin lines: no textures, no heavy gradients. All
   geometry is in client coordinates in one fixed, pointer-events:none SVG
   overlay, so it works regardless of which container a point lives in. */

const SVGNS = 'http://www.w3.org/2000/svg';

export function mountLightGate({ arena, dots, onAbsorb, revealDelay = 0 } = {}) {
  if (!arena) return () => {};
  dots = Array.from(dots || []);

  const el = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const k in (attrs || {})) e.setAttribute(k, attrs[k]); return e; };

  // ── One fixed overlay SVG in client coordinates ──
  const svg = el('svg', { class: 's2-gate-svg' });
  // Critical layout is set inline so it never depends on external CSS loading.
  svg.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:15;pointer-events:none;overflow:visible;';
  const sizeSvg = () => { svg.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`); svg.setAttribute('width', innerWidth); svg.setAttribute('height', innerHeight); };
  sizeSvg();

  // ── Gate (a small dotted CIRCLE with a faint centre marker) ──
  const gateEl = el('circle', { class: 's2-gate-rect' });   // class kept; now a circle
  const gateDot = el('circle', { class: 's2-gate-mark', r: 1.6 });
  svg.appendChild(gateEl);
  svg.appendChild(gateDot);
  let gate = null;
  function computeGate() {
    const a = arena.getBoundingClientRect();
    // Radius scales with the arena (clamped) so the circle keeps its proportions
    // at every viewport size — roughly the old rectangle's footprint.
    const r = Math.max(30, Math.min(52, a.height * 0.072));
    const cx = a.left + a.width / 2;
    const cy = a.bottom - r - a.height * 0.08;              // clear margin below it
    gate = { cx, cy, r, x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
    gateEl.setAttribute('cx', cx); gateEl.setAttribute('cy', cy);
    gateEl.setAttribute('r', r);
    gateDot.setAttribute('cx', cx); gateDot.setAttribute('cy', cy);
  }
  computeGate();
  document.body.appendChild(svg);
  // Fade the gate in with the stage's gradual build (0 = show immediately).
  if (revealDelay > 0) {
    svg.style.opacity = '0';
    svg.style.transition = 'opacity 0.8s ease';
    setTimeout(() => { svg.style.opacity = '1'; }, revealDelay);
  }

  // Keep the target area clear: hide any point sitting inside the gate + a
  // breathing margin, so the gate always reads as empty, dedicated space.
  function clearGateZone() {
    const mx = gate.w * 0.55, my = gate.h * 1.1;
    dots.forEach(d => {
      const r = d.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx > gate.x - mx && cx < gate.x + gate.w + mx && cy > gate.y - my && cy < gate.y + gate.h + my) {
        d.classList.add('s2-hidden-by-gate');
      }
    });
  }
  clearGateZone();

  const onResize = () => { sizeSvg(); computeGate(); clearGateZone(); };
  addEventListener('resize', onResize);

  // ── State ──
  let phase = 'idle';    // idle | dragging | traveling | done
  let sel = null, line = null, raf = 0;

  const center = d => { const r = d.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  // Release counts as "in the gate" when it lands inside the circle (a touch of
  // slack so it's forgiving on a touch screen).
  const inGate = (x, y) => Math.hypot(x - gate.cx, y - gate.cy) <= gate.r * 1.12;

  function onMove(e) {
    if (phase !== 'dragging') return;
    const c = center(sel);
    line.setAttribute('x1', c.x); line.setAttribute('y1', c.y);
    line.setAttribute('x2', e.clientX); line.setAttribute('y2', e.clientY);
  }
  function onUp(e) {
    if (phase !== 'dragging') return;
    removeEventListener('pointermove', onMove);
    removeEventListener('pointerup', onUp);
    if (inGate(e.clientX, e.clientY)) commit(e); else cancel();
  }
  function cancel() {
    phase = 'idle';
    if (line) { line.remove(); line = null; }
    if (sel) sel.classList.remove('s2-selected');
    sel = null;
  }

  function onDown(e, d) {
    if (phase !== 'idle') return;
    e.preventDefault();
    computeGate();                 // refresh against the current layout
    phase = 'dragging'; sel = d;
    d.classList.add('s2-selected');
    const c = center(d);
    line = el('line', { class: 's2-drag-line', x1: c.x, y1: c.y, x2: c.x, y2: c.y });
    svg.appendChild(line);
    addEventListener('pointermove', onMove);
    addEventListener('pointerup', onUp);
  }


  function commit() {
    phase = 'traveling';
    if (line) { line.remove(); line = null; }
    const start = center(sel), end = { x: gate.cx, y: gate.cy };
    const dx = end.x - start.x, dy = end.y - start.y, len = Math.hypot(dx, dy) || 1;
    // Straight line from the point to the gate — no bow.
    const ux = dx / len, uy = dy / len;

    // Dotted trail laid on that line at the fixed interface grid's own pitch and
    // dot size (--grid-dot-gap / --grid-dot-size), read from the page so it can't
    // drift from the grid. Each dot carries its distance along the line, so the
    // travelling point clears them one by one as it passes.
    const rootCS = getComputedStyle(document.documentElement);
    const GAP = parseFloat(rootCS.getPropertyValue('--grid-dot-gap')) || 5.5;
    const DOT = parseFloat(rootCS.getPropertyValue('--grid-dot-size')) || 1.6;
    const tg = el('g', { class: 's2-trail' });
    svg.appendChild(tg);
    const trail = [];
    for (let d = GAP; d < len; d += GAP) {
      const c = el('circle', { class: 's2-trail-dot', cx: start.x + ux * d, cy: start.y + uy * d, r: DOT / 2 });
      tg.appendChild(c);
      trail.push({ dist: d, el: c });
    }

    // the point travels on its own (the original dot is hidden)
    sel.classList.add('s2-consumed');
    const pt = el('circle', { class: 's2-travel-pt', cx: start.x, cy: start.y, r: 3 });
    svg.appendChild(pt);

    const DUR = 1050, t0 = performance.now();
    const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    function step(now) {
      const k = Math.min((now - t0) / DUR, 1), e = ease(k);
      const travelled = e * len;
      pt.setAttribute('cx', start.x + ux * travelled);
      pt.setAttribute('cy', start.y + uy * travelled);
      for (const td of trail) if (!td.done && td.dist <= travelled) { td.el.style.opacity = '0'; td.done = true; }
      if (k < 1) raf = requestAnimationFrame(step);
      else arrive(pt, tg);
    }
    raf = requestAnimationFrame(step);
  }

  function arrive(pt, tg) {
    pt.classList.add('s2-absorb');            // gently absorbed into the gate
    gateEl.classList.add('s2-gate-pulse');    // soft pulse
    dots.forEach(d => { if (d !== sel) d.classList.add('s2-fade'); });   // the rest fade
    setTimeout(() => {
      try { tg.remove(); pt.remove(); } catch (_) {}
      phase = 'done';
      onAbsorb && onAbsorb(sel);
    }, 640);
  }

  // wire the light points
  const handlers = new Map();
  dots.forEach(d => { const h = e => onDown(e, d); handlers.set(d, h); d.addEventListener('pointerdown', h); });

  return function teardown() {
    cancelAnimationFrame(raf);
    removeEventListener('resize', onResize);
    removeEventListener('pointermove', onMove);
    removeEventListener('pointerup', onUp);
    dots.forEach(d => {
      const h = handlers.get(d); if (h) d.removeEventListener('pointerdown', h);
      d.classList.remove('s2-selected', 's2-consumed', 's2-fade', 's2-hidden-by-gate');
    });
    try { svg.remove(); } catch (_) {}
  };
}
