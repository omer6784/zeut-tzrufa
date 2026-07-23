import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { initQuestionnaire } from './questionnaire.js';

/* ─── Spatial canvas runtime ─────────────────────────────── */

const Canvas = (() => {
  const layers = {
    background: document.getElementById('layer-background'),
    symbols:    document.getElementById('layer-symbols'),
    questions:  document.getElementById('layer-questions'),
    preview:    document.getElementById('layer-preview'),
    ui:         document.getElementById('layer-ui'),
  };

  function spawnNode(layerName, { x, y, className = '', html = '' } = {}) {
    const layer = layers[layerName];
    if (!layer) throw new Error(`Unknown layer: ${layerName}`);
    const node = document.createElement('div');
    node.classList.add('node');
    if (className) node.classList.add(...className.split(' '));
    node.style.left = `${x}px`;
    node.style.top  = `${y}px`;
    node.innerHTML  = html;
    layer.appendChild(node);
    return node;
  }

  function moveNode(node, x, y) {
    node.style.left = `${x}px`;
    node.style.top  = `${y}px`;
  }

  function setVisible(node, visible) {
    node.classList.toggle('hidden', !visible);
  }

  return { layers, spawnNode, moveNode, setVisible };
})();

/* ─── Shared mouse state ─────────────────────────────────── */
const mouse = { x: -999, y: -999 };
const cursorDot = document.getElementById('cursor');
document.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  document.documentElement.classList.add('cursor-active');
  // Position synchronously here rather than waiting on the rAF loop in
  // initCursor() — if that loop is ever delayed/throttled, the native
  // cursor is already hidden by the line above, so the dot must not lag.
  if (cursorDot) {
    cursorDot.style.left = e.clientX + 'px';
    cursorDot.style.top = e.clientY + 'px';
  }
});

/* ─── Cursor ──────────────────────────────────────────────────
   MOUSE (testing): the hand is always visible — open while hovering, and on a
   press/drag it morphs to the finger (press) or fist (drag), back to open on
   release. TOUCH (exhibition): there is no pointer at rest, so the hand appears
   only while pressing/dragging and fades out on release. The open→finger/fist
   morph happens ~0.5s after the press begins either way. */
(() => {
  const dot = cursorDot;
  if (!dot) return;
  let downXY = null, isDrag = false, morphT = 0, hideT = 0, wasMouse = true;
  const setIcon = s => { dot.classList.toggle('cur-fist', s === 'fist'); dot.classList.toggle('cur-finger', s === 'finger'); };
  const place = (x, y) => { dot.style.left = x + 'px'; dot.style.top = y + 'px'; };
  window.addEventListener('pointermove', e => {
    place(e.clientX, e.clientY);
    if (downXY) {
      if (Math.hypot(e.clientX - downXY.x, e.clientY - downXY.y) > 8) isDrag = true;
    } else if (e.pointerType === 'mouse') {
      clearTimeout(hideT);
      document.documentElement.classList.add('cursor-active');
      setIcon('open'); dot.classList.add('is-shown');   // mouse hovering → open hand visible
    }
  }, true);
  window.addEventListener('pointerdown', e => {
    clearTimeout(hideT); clearTimeout(morphT);
    document.documentElement.classList.add('cursor-active');
    wasMouse = e.pointerType === 'mouse';
    downXY = { x: e.clientX, y: e.clientY }; isDrag = false;
    place(e.clientX, e.clientY);
    setIcon('open'); dot.classList.add('is-shown');
    morphT = setTimeout(() => setIcon(isDrag ? 'fist' : 'finger'), 500);   // open flash → action icon
  }, true);
  const end = () => {
    clearTimeout(morphT);
    setIcon(isDrag ? 'fist' : 'finger');            // settle on the final icon…
    downXY = null;
    if (wasMouse) hideT = setTimeout(() => setIcon('open'), 400);          // mouse: back to open, stay visible
    else hideT = setTimeout(() => dot.classList.remove('is-shown', 'cur-fist', 'cur-finger'), 650);  // touch: fade out
  };
  window.addEventListener('pointerup', end, true);
  window.addEventListener('pointercancel', end, true);
})();

/* ─── Dotted grid + staggered content build-in ────────────
   Runs whenever a screen other than the landing one opens: the
   dotted construction grid draws itself first, then the chrome
   elements cascade in one after another. */
function buildScreen(root) {
  const gridLines = root.querySelectorAll('.dot-grid-line-v, .dot-grid-line-h');
  const revealEls = root.querySelectorAll('.reveal-el');

  gridLines.forEach(el => el.classList.remove('is-built'));
  revealEls.forEach(el => el.classList.remove('is-revealed'));
  void root.offsetWidth; // force reflow so the removed classes take effect before re-adding

  requestAnimationFrame(() => {
    gridLines.forEach(el => el.classList.add('is-built'));
  });

  const GRID_DURATION = 500 + 200; // longest transition-delay (200ms) + its 0.5s transition
  const STAGGER = 70;
  revealEls.forEach((el, i) => {
    setTimeout(() => el.classList.add('is-revealed'), GRID_DURATION + i * STAGGER);
  });
}

/* ─── Screen transition (section-1 → section-3) ─────────── */
function initScreenTransition() {
  const s1  = document.getElementById('section-1');
  const s3  = document.getElementById('section-3');
  const cta = document.getElementById('cta-anchor');
  if (!cta || !s1 || !s3) return;

  cta.addEventListener('click', () => {
    cta.classList.add('clicked');
    setTimeout(() => {
      // The gold-dot → globe morph is dropped for now: the first stage is the
      // background-colour choice, not the globe. Build the questionnaire and swap
      // straight to its first stage.
      window.dispatchEvent(new CustomEvent('opening-morph-start'));
      buildScreen(s3);
      s1.classList.add('morphing');
      setTimeout(() => window.dispatchEvent(new CustomEvent('opening-morph-done')), 420);
    }, 120);
  });

  // When the dot lands as the globe, swap to stage 1. section-1 already looks
  // identical (cream bg, dark grid, no content), so the swap is invisible — no
  // fade, no jump.
  window.addEventListener('opening-morph-done', () => {
    s3.style.transition = 'none';
    s3.style.opacity = '1';
    s3.classList.add('entering');
    s1.style.opacity = '0';
    s1.style.pointerEvents = 'none';
  });
}

/* Morph the opening grid's dot colour from the cream landing colour to the
   stage-1 dark, per-frame (CSS gradients can't transition colour). */
function morphOpeningGridColor(s1) {
  const grid = s1.querySelector('.stage-grid');
  if (!grid) return;
  const from = [245, 245, 237], to = [40, 40, 40], DUR = 1200;
  let t0 = null;
  function step(ts) {
    if (!t0) t0 = ts;
    const p = Math.min((ts - t0) / DUR, 1);
    const r = Math.round(from[0] + (to[0] - from[0]) * p);
    const g = Math.round(from[1] + (to[1] - from[1]) * p);
    const b = Math.round(from[2] + (to[2] - from[2]) * p);
    grid.style.setProperty('--grid-dot', `rgb(${r},${g},${b})`);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* The gold dot baked into the landing logo (measured at 40.6% × 66.4% of the
   logo image, ⌀ ≈ 3.1% of its width) morphs into the stage-1 globe. Both are
   the same gold (#e2bc71), so the grow-and-travel reads as one continuous
   element. A separate DOM circle is overlaid exactly on the baked dot so the
   logo can fade out underneath it. */
function playDotToGlobeMorph() {
  const done = () => window.dispatchEvent(new CustomEvent('opening-morph-done'));
  const logo = document.getElementById('v5-landing-title');
  if (!logo) { done(); return; }
  const lr = logo.getBoundingClientRect();
  const dotCx = lr.left + 0.406 * lr.width;
  const dotCy = lr.top  + 0.664 * lr.height;
  const dotD  = Math.max(6, 0.031 * lr.width);

  // Globe target — measure the real widget if it's already laid out, else
  // fall back to its CSS geometry (right:780px, ⌀ = min(70vh, 520px)).
  let gCx, gCy, gD;
  const globeEl = document.querySelector('#section-3 .roots-canvas-wrap');
  const gr = globeEl && globeEl.getBoundingClientRect();
  if (gr && gr.width > 20) {
    gCx = gr.left + gr.width / 2;
    gCy = gr.top  + gr.height / 2;
    gD  = gr.width;
  } else {
    const vw = window.innerWidth, vh = window.innerHeight;
    gD  = Math.min(0.70 * vh, 520);
    gCx = (vw - 780) - gD / 2;
    gCy = vh * 0.55;
  }

  const c = document.createElement('div');
  c.setAttribute('aria-hidden', 'true');
  // z-index:-1 inside section-1 keeps the dot above the background but BEHIND
  // the grid (and the fading content), so the grid stays in front of it.
  c.style.cssText =
    `position:fixed;left:0;top:0;border-radius:50%;background:#e2bc71;` +
    `z-index:-1;pointer-events:none;will-change:transform,width,height;`;
  (document.getElementById('section-1') || document.body).appendChild(c);

  // Pure vertical descent in two parts (no arc): (1) straight down on the
  // opening screen and out below its bottom grid, then (2) in from above stage
  // 1 and straight down to the globe. It grows the whole way. The horizontal
  // shift from the logo-dot column to the globe column happens off-screen at
  // the hand-off, so on screen the motion is always straight down.
  const vh = window.innerHeight;
  const DUR = 1850;
  const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  let t0 = null;
  function step(ts) {
    if (!t0) t0 = ts;
    const p = Math.min((ts - t0) / DUR, 1);
    const size = dotD + (gD - dotD) * ease(p);   // continuous growth
    let x, y;
    if (p < 0.5) {
      const ph = p / 0.5;                          // opening screen → down & out
      x = dotCx;
      y = dotCy + (vh + size - dotCy) * ph;        // ends just below the bottom
    } else {
      const ph = (p - 0.5) / 0.5;                  // stage 1 → in from the top
      x = gCx;
      y = -size + (gCy + size) * ph;               // off-top down to the globe
    }
    c.style.width = size + 'px';
    c.style.height = size + 'px';
    c.style.transform = `translate(${x - size / 2}px,${y - size / 2}px)`;
    if (p < 1) { requestAnimationFrame(step); return; }
    // Landed — fade out to reveal the real globe, then trigger the intro text.
    c.style.transition = 'opacity 0.3s ease';
    c.style.opacity = '0';
    setTimeout(() => c.remove(), 400);
    done();
  }
  requestAnimationFrame(step);
}

/* ─── Custom cursor ──────────────────────────────────────── */
function initCursor() {
  const dot = document.getElementById('cursor');

  // The hand has to stay visible on every surface, and v5 has several dark
  // ones: the dark landing palette, stage 2, stage 3, the symbol window.
  // Rather than keep a list of those in sync (it silently rotted once already),
  // sample the background actually painted under the pointer.
  const BG_RE = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?/;

  function bgUnderPointer() {
    // #cursor is pointer-events:none, so it never shadows the surface below.
    let el = document.elementFromPoint(mouse.x, mouse.y);
    while (el) {
      const m = BG_RE.exec(getComputedStyle(el).backgroundColor);
      // A see-through layer doesn't decide the colour — keep walking up.
      if (m && (m[4] === undefined || parseFloat(m[4]) > 0.5)) return m;
      el = el.parentElement;
    }
    return null;
  }

  // WCAG relative luminance. The dark plates (#282828 ≈ 0.02, #222020 ≈ 0.02)
  // sit far below the landing orange (#ff5003 ≈ 0.27) and the cream plate
  // (≈ 0.89), so this threshold catches the dark surfaces and nothing else —
  // the cursor stays dark on orange, where it already reads at ~4.5:1.
  const DARK_MAX_LUM = 0.15;
  function isDark(m) {
    if (!m) return false;
    const lin = v => {
      v = +v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * lin(m[1]) + 0.7152 * lin(m[2]) + 0.0722 * lin(m[3]) < DARK_MAX_LUM;
  }

  function sampleSurface() {
    dot.classList.toggle('on-dark', isDark(bgUnderPointer()));
  }

  // Sampling hangs off events, NOT the rAF loop below: a throttled tab starves
  // rAF, and the colour would stick on the wrong plate. Pointer movement is the
  // usual way the surface under the cursor changes; the slow interval covers
  // the other way — the plate recolouring beneath a pointer that is sitting
  // still, e.g. the opening → stage-1 morph.
  let lastSample = 0;
  document.addEventListener('mousemove', () => {
    const now = performance.now();
    if (now - lastSample < 60) return;   // the walk is cheap, but not free
    lastSample = now;
    sampleSurface();
  });
  setInterval(sampleSurface, 250);

  function tick() {
    dot.style.left = mouse.x + 'px';
    dot.style.top  = mouse.y + 'px';
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ─── Logo metallic reveal ───────────────────────────────── */
function initLogoReveal() {
  const logoWrapper = document.getElementById('logo-wrapper');
  const logoMask    = document.getElementById('logo-metal-mask');

  const HIDE = `radial-gradient(circle 1px at -999px -999px, black, transparent)`;

  function setLogoMask(x, y) {
    if (x < 0) { logoMask.style.webkitMaskImage = logoMask.style.maskImage = HIDE; return; }
    const grads = [
      `radial-gradient(ellipse 130px 110px at ${x}px ${y}px, black 55%, transparent 100%)`,
      `radial-gradient(ellipse  90px 105px at ${x + 38}px ${y - 22}px, black 45%, transparent 95%)`,
    ].join(', ');
    logoMask.style.webkitMaskImage = grads;
    logoMask.style.maskImage = grads;
    logoMask.style.webkitMaskComposite = 'source-over';
    logoMask.style.maskComposite = 'add';
  }

  const rect = logoWrapper.getBoundingClientRect();

  function tick() {
    const mx = mouse.x - rect.left;
    const my = mouse.y - rect.top;
    if (mx < 0 || mx > rect.width || my < 0 || my > rect.height) {
      setLogoMask(-1, -1);
    } else {
      setLogoMask(mx, my);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ─── Scroll lock + CTA navigation ──────────────────────── */
function _unused_initScrollControl() {
  const section1 = document.getElementById('section-1');
  const cta = document.getElementById('cta-anchor'); if (!cta) return;

  // Computed once after layout — exact bottom of beige section
  const MAX = section1.offsetHeight - window.innerHeight;
  let navigating = false;
  let hasVisitedSection2 = false;

  // Snap back only if we overshot section 1 bottom but haven't yet navigated to section 2
  window.addEventListener('scroll', () => {
    if (!navigating && !hasVisitedSection2 && window.scrollY > MAX) {
      window.scrollTo({ top: MAX, behavior: 'instant' });
    }
  }, { passive: true });

  // Also block wheel events proactively
  window.addEventListener('wheel', (e) => {
    if (navigating) return;
    const atSection1Bottom = window.scrollY >= MAX - 5 && window.scrollY <= MAX + 10;
    if (window.scrollY >= MAX - 5 && e.deltaY > 0) {
      if (atSection1Bottom) {
        // At the boundary — block scroll and optionally trigger transition
        e.preventDefault();
        if (hasVisitedSection2) navigateToSection2();
      }
      // If deeper (section 2+), allow free scrolling — do nothing
    }
  }, { passive: false });

  // CTA click → flash blue briefly → cinematic transition to section 2
  cta.addEventListener('click', () => {
    cta.classList.add('clicked');
    setTimeout(() => cta.classList.remove('clicked'), 150);
    setTimeout(() => navigateToSection2(), 160);
  });

  // --- Step dot navigation ---
  const dots = document.querySelectorAll('.step-dot');
  const uiLeft = document.getElementById('ui-left');
  const sectionsForDots = [
    document.getElementById('section-1'),
    document.getElementById('section-2'),
    document.getElementById('section-3'),
    document.getElementById('section-4'),
  ];
  const dotThemes = [null, 'on-orange', 'on-blue', 'on-beige'];

  function updateDots() {
    const mid = window.scrollY + window.innerHeight / 2;
    let activeIndex = 0;
    
    sectionsForDots.forEach((el, idx) => {
      if (el && mid >= el.offsetTop && mid < el.offsetTop + el.offsetHeight) {
        activeIndex = idx;
      }
    });

    // Update active class on dot buttons
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === activeIndex);
    });

    // Update theme class on container for dot colors
    if (uiLeft) {
      uiLeft.className = 'step-nav ' + (dotThemes[activeIndex] || '');
    }
  }

  // Click handler to navigate
  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      if (navigating) return;
      const targetSec = sectionsForDots[idx];
      if (!targetSec) return;

      if (idx > 0 && !hasVisitedSection2) {
        // If they try to go forward from section 1, run the cinematic transition!
        navigateToSection2();
      } else {
        // Otherwise, scroll smoothly to the target section
        window.scrollTo({
          top: targetSec.offsetTop,
          behavior: 'smooth'
        });
      }
    });
  });

  window.addEventListener('scroll', updateDots, { passive: true });
  updateDots();

  /* ── Dotted S-curve worm ──────────────────────────────────
     Samples dots along a bezier S-curve.
     When navigation starts, a "worm" of dots travels the path:
     head draws forward, tail erases behind.
  ─────────────────────────────────────────────────────────── */
  // ── Spatial trail transition system (modular) ────────────────
  function initTrail() {
    const canvas = document.getElementById('s-curve-canvas');
    const ctx    = canvas.getContext('2d');

    const DOT_R   = 4;   // small, decorative
    const DOT_GAP = 12;
    const WORM    = 24;

    let dots         = [];
    let loopFrac     = { start: 0, end: 0 };
    let loopCenter   = { x: 0, y: 0 };  // screen coords at prepare-time
    let scrollOrigin = 0;

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function sampleBezier(x0,y0, cx1,cy1, cx2,cy2, x1,y1) {
      const pts = [];
      for (let i = 0; i <= 500; i++) {
        const t = i/500, u = 1-t;
        pts.push({
          x: u*u*u*x0 + 3*u*u*t*cx1 + 3*u*t*t*cx2 + t*t*t*x1,
          y: u*u*u*y0 + 3*u*u*t*cy1 + 3*u*t*t*cy2 + t*t*t*y1,
        });
      }
      return pts;
    }

    function appendDots(fine) {
      let d = 0;
      const last = () => dots[dots.length-1] || fine[0];
      for (let i = 1; i < fine.length; i++) {
        const dx = fine[i].x - last().x, dy = fine[i].y - last().y;
        d += Math.sqrt(dx*dx + dy*dy);
        if (d >= DOT_GAP) { dots.push({...fine[i]}); d = 0; }
      }
    }

    // prepare() — call with no active CSS transforms on any ancestor
    function prepare() {
      scrollOrigin = window.scrollY;
      dots = [];

      const cta = document.getElementById('cta-anchor');
      const ctaH = cta ? cta.offsetHeight : 160;
      const ctaW = cta ? cta.offsetWidth  : 122;
      const ctaScreenTop = (window.innerHeight - 100 - ctaH) - scrollOrigin;

      // Trail start: right of CTA circle (the visible circle is ~bottom 70% of image)
      const sx = window.innerWidth / 2 + ctaW / 2 + 20;
      const sy = ctaScreenTop + ctaH * 0.65;

      // Small clean loop: 60px radius, sits to the right and level with start
      const lr     = 60;
      const lcx    = sx + 140;
      const lcy    = sy;
      loopCenter   = { x: lcx, y: lcy };

      // Phase 1 — approach: gentle rightward curve to loop entry (left of circle)
      dots.push({ x: sx, y: sy });
      appendDots(sampleBezier(sx, sy, sx+60, sy, lcx-lr-10, lcy, lcx-lr, lcy));
      const i1 = dots.length;

      // Phase 2 — clean clockwise loop
      let ld = 0, prev = dots[dots.length-1];
      for (let i = 1; i <= 360; i++) {
        const a = Math.PI + (i/360) * 2 * Math.PI;  // left → CCW full circle
        const x = lcx + lr * Math.cos(a);
        const y = lcy + lr * Math.sin(a);
        const dx = x-prev.x, dy = y-prev.y;
        ld += Math.sqrt(dx*dx+dy*dy);
        if (ld >= DOT_GAP) { dots.push({x,y}); prev=dots[dots.length-1]; ld=0; }
      }
      const i2 = dots.length;

      // Phase 3 — short exit: continue rightward-down (scroll handles the rest)
      appendDots(sampleBezier(lcx-lr, lcy, lcx-lr+80, lcy+40, lcx+60, lcy+80, lcx+80, lcy+100));

      const total   = dots.length;
      loopFrac      = { start: i1/total, end: i2/total };
    }

    // draw() — applies camera transform inside canvas context (no DOM changes)
    function draw(p) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!dots.length) return;

      const sd    = window.scrollY - scrollOrigin;
      const headI = Math.min(Math.floor(p * dots.length), dots.length-1);
      const tail  = Math.max(0, headI - WORM);
      const hd    = dots[headI];

      // Camera: subtle zoom centred on loop, follows trail head
      const zoom   = cameraZoom(p);
      const pivot  = { x: loopCenter.x, y: loopCenter.y - sd };
      const follow = { x: hd.x, y: hd.y - sd };

      ctx.save();
      if (zoom > 1.005) {
        // Pan so trail head sits at viewport center, then zoom from pivot
        const cx = canvas.width / 2, cy = canvas.height / 2;
        ctx.translate(cx, cy);
        ctx.scale(zoom, zoom);
        ctx.translate(-follow.x, -follow.y);
      }

      for (let i = tail; i <= headI; i++) {
        const a = (i - tail) / WORM;
        ctx.beginPath();
        ctx.arc(dots[i].x, dots[i].y - sd, DOT_R, 0, Math.PI*2);
        ctx.fillStyle = `rgba(0,0,200,${0.2 + a * 0.8})`;
        ctx.fill();
      }
      ctx.restore();
    }

    function clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); }

    return { prepare, draw, clear,
             getLoop: () => ({ ...loopFrac, ...loopCenter }) };
  }

  // Camera zoom schedule — max 1.6x, only during loop phase
  let _trailLoop = { start: 0, end: 0 };
  function cameraZoom(tp) {
    const { start, end } = _trailLoop;
    if (tp <= start || tp >= end) return 1;
    const lp = (tp - start) / (end - start);
    function eIO(t) { return t<.5 ? 2*t*t : -1+(4-2*t)*t; }
    if (lp < 0.2) return 1 + 0.6 * eIO(lp / 0.2);   // 1 → 1.6
    if (lp < 0.8) return 1.6;
    return 1.6 - 0.6 * eIO((lp - 0.8) / 0.2);        // 1.6 → 1
  }

  const trail = initTrail();

  // ── navigateToSection2 ─────────────────────────────────────
  function navigateToSection2() {
    navigating = true;
    const sec1 = document.getElementById('section-1');
    const sec2 = document.getElementById('section-2');

    sec1.style.transform = '';

    // Reveal sections 2-4
    ['section-2','section-3','section-4'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = '';
    });

    void sec2.offsetHeight;
    const toY = sec2.offsetTop;

    // Trail image positioning
    const trailImg = document.getElementById('trail-img');
    const ctaEl2 = document.getElementById('cta-anchor');
    const ctaR   = ctaEl2 ? ctaEl2.getBoundingClientRect() : { right: window.innerWidth/2+80, top: window.innerHeight*0.7, height: 160 };
    const startX = ctaR.right + 10;
    const startY = ctaR.top + ctaR.height * 0.06;
    const imgH   = Math.max(toY + 60 - startY, 300);
    const imgW   = imgH * (699 / 296);
    trailImg.style.cssText = `position:fixed;z-index:50;pointer-events:none;
      left:${startX}px;top:${startY}px;width:${imgW}px;height:${imgH}px;
      display:block;clip-path:inset(0 100% 0 0);`;

    const DURATION = 1600;
    let t0 = null;
    function easeIO(t) { return t < .5 ? 2*t*t : -1+(4-2*t)*t; }

    // Animate trail + sec1 drift
    function step(ts) {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / DURATION, 1);
      const e = easeIO(p);
      sec1.style.transform = `translateX(${-e * 12}%)`;
      trailImg.style.clipPath = `inset(0 ${(1-e)*100}% 0 0)`;
      if (p < 1) { requestAnimationFrame(step); return; }
      sec1.style.transform = '';
      trailImg.style.display = 'none';
      navigating = false;
      hasVisitedSection2 = true;
      listenForReturnToSection1();
    }
    requestAnimationFrame(step);

    const fromY  = document.scrollingElement.scrollTop;
    const dist   = toY - fromY;
    const tStart = performance.now();
    function scrollStep(now) {
      const p = Math.min((now - tStart) / DURATION, 1);
      document.scrollingElement.scrollTop = fromY + dist * easeIO(p);
      if (p < 1) requestAnimationFrame(scrollStep);
    }
    requestAnimationFrame(scrollStep);
  }

  function navigateToSection1() {
    navigating = true;
    const section1 = document.getElementById('section-1');
    const section2 = document.getElementById('section-2');

    const fromY    = window.scrollY;
    const toY      = 0;
    const DURATION = 2200;
    let startTime  = null;

    function easeOut(t) { return 1 - Math.pow(1 - t, 2.2); }

    function step(ts) {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / DURATION, 1);
      const e = easeOut(p);

      window.scrollTo(0, fromY + (toY - fromY) * e);
      section1.style.transform = `translateX(${-(1 - e) * 15}%)`;

      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        section1.style.transform = '';
        navigating = false;
      }
    }

    requestAnimationFrame(step);
  }

  function listenForReturnToSection1() {
    // Return to section 1 only via the restart button (page reload).
    // Scrolling up from section 2 is intentionally disabled.
  }
}

/* ─── Halftone blob renderer ─────────────────────────────── */
function initBlobs() {
  document.querySelectorAll('.blob-canvas').forEach(canvas => {
    const color  = canvas.dataset.color  || '#FD7041';
    const rx     = parseInt(canvas.dataset.rx)  || 200;
    const ry     = parseInt(canvas.dataset.ry)  || 200;
    const dot    = parseInt(canvas.dataset.dot) || 6;
    const xPct   = parseFloat(canvas.dataset.x) || 50;  // % from left
    const yPct   = parseFloat(canvas.dataset.y) || 50;  // % from top

    const W = rx * 2 + dot * 4;
    const H = ry * 2 + dot * 4;
    canvas.width  = W;
    canvas.height = H;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    canvas.style.left   = `calc(${xPct}% - ${W/2}px)`;
    canvas.style.top    = `calc(${yPct}% - ${H/2}px)`;

    const ctx = canvas.getContext('2d');
    const cx = W / 2, cy = H / 2;

    // Draw halftone: dot size = f(radial gradient intensity)
    for (let y = dot; y < H - dot; y += dot) {
      for (let x = dot; x < W - dot; x += dot) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= 1) continue;

        // Smooth falloff: cosine curve — large dots at center, tiny at edge
        const intensity = Math.pow(Math.cos(dist * Math.PI * 0.5), 1.4);
        const r = intensity * dot * 0.52;
        if (r < 0.4) continue;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
    }
  });
}

/* ─── Organic ambient motion ─────────────────────────────── */
function initOrganicFloat() {
  // Each element gets multiple sine waves at irrational-ratio frequencies.
  // Sum of waves → no perceptible repeat period.
  // baseTransform: CSS transforms that must be preserved (e.g. centering).

  const PHI = 1.6180339887;
  const S2  = 1.4142135623;
  const SPD = 1.6; // speed multiplier

  const entities = [
    {
      id: 'logo-wrapper',
      base: 'translateX(-50%)',
      waves: [
        { ax:'y', f:0.00028,        a:14,  ph:0      },
        { ax:'y', f:0.00028/PHI,    a:7,   ph:1.4    },
        { ax:'x', f:0.00028/S2,     a:6,   ph:2.7    },
        { ax:'x', f:0.00028*PHI/S2, a:4,   ph:0.9    },
        { ax:'r', f:0.00028/PHI/S2, a:0.5, ph:3.3    },
      ],
    },


    {
      id: 'ui-top-left',
      base: '',
      waves: [
        { ax:'y', f:0.00015, a:3, ph:0.5 },
        { ax:'x', f:0.00012, a:2, ph:1.2 }
      ]
    },
    {
      id: 'ui-top-right',
      base: '',
      waves: [
        { ax:'y', f:0.00014, a:3, ph:1.8 },
        { ax:'x', f:0.00016, a:2, ph:0.3 }
      ]
    },
    {
      id: 'ui-bottom-left',
      base: '',
      waves: [
        { ax:'y', f:0.00016, a:3, ph:2.5 },
        { ax:'x', f:0.00013, a:2, ph:0.9 }
      ]
    },
    {
      id: 'ui-bottom-right',
      base: '',
      waves: [
        { ax:'y', f:0.00013, a:3, ph:3.1 },
        { ax:'x', f:0.00015, a:2, ph:2.0 }
      ]
    }
  ].map(e => ({ ...e, el: document.getElementById(e.id) }))
   .filter(e => e.el);

  const elCoordX = document.getElementById('coord-x');
  const elCoordY = document.getElementById('coord-y');
  const elCoordZ = document.getElementById('coord-z');

  let rotX = 0;
  let rotY = 0;
  const mouseLerp = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  function tick(ts) {
    const targetMouseX = mouse.x === -999 ? window.innerWidth / 2 : mouse.x;
    const targetMouseY = mouse.y === -999 ? window.innerHeight / 2 : mouse.y;
    mouseLerp.x += (targetMouseX - mouseLerp.x) * 0.08;
    mouseLerp.y += (targetMouseY - mouseLerp.y) * 0.08;

    const dx = mouseLerp.x - window.innerWidth / 2;
    const dy = mouseLerp.y - window.innerHeight / 2;

    const targetRotY = (dx / (window.innerWidth / 2)) * 10;
    const targetRotX = -(dy / (window.innerHeight / 2)) * 10;

    rotX += (targetRotX - rotX) * 0.08;
    rotY += (targetRotY - rotY) * 0.08;

    if (elCoordX && elCoordY && elCoordZ) {
      const halfW = window.innerWidth / 2 || 1;
      const halfH = window.innerHeight / 2 || 1;
      const valX = Math.min(99, Math.max(0, Math.floor(((dx / halfW) + 1) * 49.5)));
      const valY = Math.min(99, Math.max(0, Math.floor(((dy / halfH) + 1) * 49.5)));
      const maxDist = Math.sqrt(halfW * halfW + halfH * halfH) || 1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const valZ = Math.min(99, Math.max(0, Math.floor((dist / maxDist) * 99)));

      elCoordX.textContent = `X: ${String(valX).padStart(2, '0')}`;
      elCoordY.textContent = `Y: ${String(valY).padStart(2, '0')}`;
      elCoordZ.textContent = `Z: ${String(valZ).padStart(2, '0')}`;
    }

    entities.forEach(({ id, el, base, waves }) => {
      let x = 0, y = 0, r = 0;
      waves.forEach(w => {
        const v = w.a * Math.sin(w.f * SPD * ts + w.ph);
        if (w.ax === 'x') x += v;
        if (w.ax === 'y') y += v;
        if (w.ax === 'r') r += v;
      });
      


      const transformStr = `${base} translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${r.toFixed(3)}deg)`;
      el.style.transform = transformStr;
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ─── Interactive 3D Perspective Grid ──────────────────────── */
function initGridBackground() {
  const canvas = document.getElementById('grid-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = canvas.width = canvas.offsetWidth;
  let height = canvas.height = canvas.offsetHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
  });

  const mouseLerp = { x: width / 2, y: height / 2 };

  // Load the user's transparent grid PNG image
  const gridImg = new Image();
  gridImg.src = '/image/grid.png';

  function draw() {
    ctx.clearRect(0, 0, width, height);

    const targetMouseX = mouse.x === -999 ? width / 2 : mouse.x;
    const targetMouseY = mouse.y === -999 ? height / 2 : mouse.y;
    mouseLerp.x += (targetMouseX - mouseLerp.x) * 0.05;
    mouseLerp.y += (targetMouseY - mouseLerp.y) * 0.05;

    // Subtle opposite 2D parallax offset to keep layout dynamic
    const parallaxX = -(mouseLerp.x - width / 2) * 0.04;
    const parallaxY = -(mouseLerp.y - height / 2) * 0.04;

    const centerX = width / 2 + parallaxX;
    const centerY = height / 2 + parallaxY;

    if (gridImg.complete && gridImg.naturalWidth !== 0) {
      // Scale the custom grid image responsively to cover the logo area nicely (62% of min dimension)
      const gridW = Math.min(width, height) * 0.62;
      const gridH = gridW * (gridImg.naturalHeight / gridImg.naturalWidth);
      
      ctx.drawImage(
        gridImg,
        centerX - gridW / 2,
        centerY - gridH / 2,
        gridW,
        gridH
      );
    }

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}

/* ─── Restart button visibility ─────────────────────────── */
function initRestartButton() {
  const btn = document.getElementById('btn-restart');
  const img = document.getElementById('btn-restart-img');

  // src for each background context: [default, hover]
  const themes = {
    'on-orange': ['/image/חזור למסך הפתיחה.png',      '/image/חזור למסך הפתיחה כחול.png'],
    'on-blue':   ['/image/חזור למסך הפתיחה.png',      '/image/חזור למסך הפתיחה כתום.png'],
    'on-beige':  ['/image/חזור למסך הפתיחה כתום.png', '/image/חזור למסך הפתיחה כחול.png'],
  };

  const sections = [
    { el: document.getElementById('section-1'), cls: null        },
    { el: document.getElementById('section-2'), cls: 'on-orange' },
    { el: document.getElementById('section-3'), cls: 'on-blue'   },
    { el: document.getElementById('section-4'), cls: 'on-beige'  },
  ];

  let currentTheme = null;

  function update() {
    const mid = window.scrollY + window.innerHeight / 2;
    let active = null;
    sections.forEach(({ el, cls }) => {
      if (el && mid >= el.offsetTop && mid < el.offsetTop + el.offsetHeight) active = cls;
    });

    btn.className    = active || '';
    btn.style.display = active ? 'block' : 'none';

    if (active !== currentTheme) {
      currentTheme = active;
      if (active) img.src = themes[active][0];
    }
  }

  btn.addEventListener('mouseenter', () => {
    if (currentTheme) img.src = themes[currentTheme][1];
  });
  btn.addEventListener('mouseleave', () => {
    if (currentTheme) img.src = themes[currentTheme][0];
  });

  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ─── Halftone gradient background ──────────────────────── */
function initBgCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function draw() {
    const W = canvas.width  = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const oc  = off.getContext('2d');

    oc.fillStyle = '#ffffff';
    oc.fillRect(0, 0, W, H);

    const g1 = oc.createRadialGradient(W*0.2, H*0.8, 0, W*0.2, H*0.8, W*0.75);
    g1.addColorStop(0, '#FD7041');
    g1.addColorStop(0.5, '#fd8f68');
    g1.addColorStop(1, 'transparent');
    oc.fillStyle = g1;
    oc.fillRect(0, 0, W, H);

    const g2 = oc.createRadialGradient(W*0.8, H*0.2, 0, W*0.8, H*0.2, W*0.5);
    g2.addColorStop(0, '#ff7755');
    g2.addColorStop(1, 'transparent');
    oc.fillStyle = g2;
    oc.fillRect(0, 0, W, H);

    const pixels = oc.getImageData(0, 0, W, H).data;
    const DOT = 10;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    for (let y = DOT/2; y < H; y += DOT) {
      for (let x = DOT/2; x < W; x += DOT) {
        const i = (Math.floor(y) * W + Math.floor(x)) * 4;
        const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
        const brightness = (r + g + b) / 3;
        const intensity  = 1 - brightness / 255;
        const dotR       = DOT * 0.55 * Math.pow(intensity, 0.65);
        if (dotR < 0.4) continue;
        ctx.beginPath();
        ctx.arc(x, y, dotR, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fill();
      }
    }
  }

  draw();
  window.addEventListener('resize', draw);
}

/* ─── Radial halftone grain overlay ─────────────────────── */
function initGrainOverlay() {
  const canvas = document.getElementById('grain-canvas');
  if (!canvas) return;

  function draw() {
    const W = canvas.offsetWidth  || 800;
    const H = canvas.offsetHeight || 600;
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const cx = W / 2, cy = H / 2;
    const maxR = Math.sqrt(cx*cx + cy*cy);
    const DOT  = 8;

    ctx.clearRect(0, 0, W, H);

    for (let y = 0; y < H; y += DOT) {
      for (let x = 0; x < W; x += DOT) {
        const dx   = x - cx, dy = y - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const t    = Math.min(dist / maxR, 1); // 0=center, 1=edge

        // Color: white at center → pink at edges
        const r = 255;
        const g = Math.round(255 - 140 * (t * t));   // 255→115
        const b = Math.round(255 - 100 * (t * t));   // 255→155

        // Dot size: tiny at center, larger at edges
        const intensity = 0.12 + 0.72 * (t * t);
        const dotR = DOT * 0.5 * intensity;
        if (dotR < 0.4) continue;

        ctx.beginPath();
        ctx.arc(x + DOT/2, y + DOT/2, dotR, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fill();
      }
    }
  }

  // Wait for layout then draw
  setTimeout(draw, 100);
}

/* ─── Title 3D (section 1) ───────────────────────────────── */
function initTitleScene3D() {
  const canvas   = document.getElementById('canvas-title3d');
  const section1 = document.getElementById('section-1');
  if (!canvas || !section1) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(15, 1, 0.1, 100);
  camera.position.set(0, 0, 13.82);

  // Lighting — neon yellow + beige + white theme palette
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 4);   // white key light
  key.position.set(2, 6, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xfffae6, 3);   // beige fill light
  fill.position.set(-4, -3, 1);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x6b4938, 1.5);  // solid orange rim from back
  rim.position.set(3, -2, -4);
  scene.add(rim);
  const top = new THREE.DirectionalLight(0xffffff, 1.2);
  top.position.set(0, 8, 2);
  scene.add(top);

  const titleGroup = new THREE.Group();
  scene.add(titleGroup);

  /* ── Construction grid (dashed frame + yellow × corners) ──
     Lives inside titleGroup so it inherits the same camera
     perspective, base pose, mouse parallax and float motion as the
     3D text — no manual sync needed. */
  (function buildConstructionGrid() {
    const group = new THREE.Group();
    const gw = 2.6, gh = 1.55;
    const cmx = 0.32, cmy = 0.28;
    const dashColor = 0x6b4938;
    const xColor = 0x6b4938;

    const dashedPts = [];
    const push = (x1,y1,x2,y2) => dashedPts.push(
      new THREE.Vector3(x1,y1,0), new THREE.Vector3(x2,y2,0)
    );
    // Outer frame
    push(-gw/2, -gh/2,  gw/2, -gh/2);
    push( gw/2, -gh/2,  gw/2,  gh/2);
    push( gw/2,  gh/2, -gw/2,  gh/2);
    push(-gw/2,  gh/2, -gw/2, -gh/2);
    // Inner clear-space dividers
    push(-gw/2+cmx, -gh/2, -gw/2+cmx, gh/2);
    push( gw/2-cmx, -gh/2,  gw/2-cmx, gh/2);
    push(-gw/2, -gh/2+cmy,  gw/2, -gh/2+cmy);
    push(-gw/2,  gh/2-cmy,  gw/2,  gh/2-cmy);

    const dgeo = new THREE.BufferGeometry().setFromPoints(dashedPts);
    const dmat = new THREE.LineDashedMaterial({
      color: dashColor,
      dashSize: 0.055,
      gapSize: 0.035,
      transparent: true,
      opacity: 0.7,
    });
    const dlines = new THREE.LineSegments(dgeo, dmat);
    dlines.computeLineDistances();
    group.add(dlines);

    // Yellow × marks in the four outer corner cells
    const xSize = 0.11;
    const xPts = [];
    const pushX = (cx, cy) => xPts.push(
      new THREE.Vector3(cx-xSize, cy-xSize, 0.01), new THREE.Vector3(cx+xSize, cy+xSize, 0.01),
      new THREE.Vector3(cx-xSize, cy+xSize, 0.01), new THREE.Vector3(cx+xSize, cy-xSize, 0.01),
    );
    const ix = gw/2 - cmx/2;
    const iy = gh/2 - cmy/2;
    pushX(-ix, -iy); pushX( ix, -iy);
    pushX(-ix,  iy); pushX( ix,  iy);

    const xgeo = new THREE.BufferGeometry().setFromPoints(xPts);
    const xmat = new THREE.LineBasicMaterial({ color: xColor });
    group.add(new THREE.LineSegments(xgeo, xmat));

    group.position.z = -0.25;
    titleGroup.add(group);
  })();

  let model = null;
  new GLTFLoader().load('/image/3d/zehut hadash.glb', gltf => {
    model = gltf.scene;

    // Helper function to create custom neon material with procedural front faces gradient (projected coordinate mapping, flat opaque colors)
    function createTitleMaterial() {
      const mat = new THREE.MeshPhysicalMaterial({
        transmission: 0.0,
        roughness: 0.5,
        metalness: 0.0,
        clearcoat: 0.0,
        side: THREE.DoubleSide
      });
      mat.userData = {
        bboxMin: { value: new THREE.Vector2(-1.0, -0.5) },
        bboxMax: { value: new THREE.Vector2(1.0, 0.5) }
      };

      mat.onBeforeCompile = (shader) => {
        shader.uniforms.bboxMin = mat.userData.bboxMin;
        shader.uniforms.bboxMax = mat.userData.bboxMax;

        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `#include <common>
           varying vec3 vLocalNormal;
           varying vec3 vLocalPos;`
        );
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vLocalNormal = normal;
           vLocalPos = position;`
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `#include <common>
           varying vec3 vLocalNormal;
           varying vec3 vLocalPos;
           uniform vec2 bboxMin;
           uniform vec2 bboxMax;
           vec3 frontColor; // Shared global variable for exact unlit front face coloring`
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <map_fragment>',
          ''
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <output_fragment>',
          `#include <output_fragment>
           // On the front faces (factor=1), override diffuse lighting with pure unlit frontColor
           vec3 finalColor = mix(gl_FragColor.rgb, frontColor, factor);
           gl_FragColor = vec4(finalColor, gl_FragColor.a);`
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          `
            vec3 localNorm = normalize(vLocalNormal);

            // Detect front and back flat faces using absolute Z normal
            float factor = smoothstep(0.45, 0.55, abs(localNorm.z));

            // Project local position into [0, 1] range based on bounding box
            float uVal = (vLocalPos.x - bboxMin.x) / (bboxMax.x - bboxMin.x);
            float t = clamp(uVal, 0.0, 1.0);

            // Brand blue fill on the front faces (#ff601a)
            frontColor = pow(vec3(255.0 / 255.0, 96.0 / 255.0, 26.0 / 255.0), vec3(2.2));

            // Bright orange side walls (#976b43)
            vec3 sideSrgb = vec3(151.0 / 255.0, 107.0 / 255.0, 67.0 / 255.0);
            vec3 sideColor = pow(sideSrgb, vec3(2.2));

            // Matching orange stroke at the boundary bevels (#976b43)
            float outline = smoothstep(0.32, 0.45, abs(localNorm.z)) * (1.0 - smoothstep(0.55, 0.68, abs(localNorm.z)));
            vec3 strokeColor = pow(sideSrgb, vec3(2.2));

            vec3 finalDiffuse = mix(sideColor, frontColor, factor);
            finalDiffuse = mix(finalDiffuse, strokeColor, outline);

            vec4 diffuseColor = vec4( finalDiffuse, opacity );
          `
        );
      };

      return mat;
    }

    const materialTop = createTitleMaterial();
    const materialBottom = createTitleMaterial();

    // 1. Hide default Cube node and filter meshes into top and bottom words
    const topMeshes = [];
    const bottomMeshes = [];

    model.traverse(child => {
      if (child.isMesh) {
        if (child.name.toLowerCase().includes('cube')) {
          child.visible = false;
        } else {
          child.visible = true;
          if (child.geometry) {
            child.geometry.computeBoundingBox();
            const centerY = child.geometry.boundingBox.getCenter(new THREE.Vector3()).y;
            if (centerY > 0) {
              topMeshes.push(child);
              child.material = materialTop;
            } else {
              bottomMeshes.push(child);
              child.material = materialBottom;
            }
          }
        }
      }
    });

    // Helper to cluster meshes by proximity in X coordinate (so parts of same letter stay together)
    function getWordClusters(wordMeshes) {
      const clusters = [];
      wordMeshes.forEach(mesh => {
        const meshCenterX = mesh.geometry.boundingBox.getCenter(new THREE.Vector3()).x;
        let foundCluster = null;
        for (const c of clusters) {
          const isClose = c.some(m => {
            const cx = m.geometry.boundingBox.getCenter(new THREE.Vector3()).x;
            return Math.abs(cx - meshCenterX) < 0.045;
          });
          if (isClose) {
            foundCluster = c;
            break;
          }
        }
        if (foundCluster) {
          foundCluster.push(mesh);
        } else {
          clusters.push([mesh]);
        }
      });
      return clusters;
    }

    const topClusters = getWordClusters(topMeshes);
    const bottomClusters = getWordClusters(bottomMeshes);

    // Function to apply spacing reduction towards word center in X
    function compressWordSpacing(clusters, k) {
      if (clusters.length === 0) return;
      
      const clusterCenters = clusters.map(c => {
        let sumX = 0;
        c.forEach(mesh => {
          sumX += mesh.geometry.boundingBox.getCenter(new THREE.Vector3()).x;
        });
        return sumX / c.length;
      });

      const minCenterX = Math.min(...clusterCenters);
      const maxCenterX = Math.max(...clusterCenters);
      const wordCenterX = (minCenterX + maxCenterX) / 2;

      clusters.forEach((c, idx) => {
        const cx = clusterCenters[idx];
        const shiftX = k * (wordCenterX - cx);
        c.forEach(mesh => {
          mesh.geometry.translate(shiftX, 0, 0);
          mesh.geometry.computeBoundingBox();
        });
      });
    }

    // Reduce spaces between letters inside each word (6% for 'זהות', 3% for 'צרופה' to prevent touching)
    compressWordSpacing(topClusters, 0.06);
    compressWordSpacing(bottomClusters, 0.03);

    // Shift the top word 'זהות' slightly upwards (+0.060) and to the left (-0.035) relative to the bottom word
    topMeshes.forEach(mesh => {
      mesh.geometry.translate(-0.035, 0.060, 0);
      mesh.geometry.computeBoundingBox();
    });

    // Shift the bottom word 'צרופה' slightly upwards (+0.05) to bring the words closer
    bottomMeshes.forEach(mesh => {
      mesh.geometry.translate(0, 0.05, 0);
      mesh.geometry.computeBoundingBox();
    });

    // 2. Compute overall bounding box of visible meshes
    const box = new THREE.Box3();
    model.traverse(child => {
      if (child.isMesh && child.visible) {
        if (child.geometry) {
          child.geometry.computeBoundingBox();
          box.union(child.geometry.boundingBox);
        }
      }
    });

    // 3. Scale geometries directly on the CPU
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetDim = 2.0;
    const scaleFactor = targetDim / maxDim;

    model.traverse(child => {
      if (child.isMesh && child.visible) {
        if (child.geometry) {
          child.geometry.scale(scaleFactor, scaleFactor, scaleFactor);
          child.geometry.computeBoundingBox();
          child.geometry.computeBoundingSphere();
          child.geometry.computeVertexNormals();
        }
      }
    });

    // 4. Recalculate bounding box of scaled meshes for precise CPU-level centering
    const finalBox = new THREE.Box3();
    model.traverse(child => {
      if (child.isMesh && child.visible) {
        if (child.geometry) {
          finalBox.union(child.geometry.boundingBox);
        }
      }
    });

    const center = finalBox.getCenter(new THREE.Vector3());
    
    // 5. Compute word bounding boxes and center geometries locally
    const topBox = new THREE.Box3();
    topMeshes.forEach(mesh => {
      if (mesh.geometry) {
        topBox.union(mesh.geometry.boundingBox);
      }
    });
    const topCenter = topBox.getCenter(new THREE.Vector3());

    const bottomBox = new THREE.Box3();
    bottomMeshes.forEach(mesh => {
      if (mesh.geometry) {
        bottomBox.union(mesh.geometry.boundingBox);
      }
    });
    const bottomCenter = bottomBox.getCenter(new THREE.Vector3());

    // Center geometries locally
    topMeshes.forEach(mesh => {
      if (mesh.geometry) {
        mesh.geometry.translate(-topCenter.x, -topCenter.y, -topCenter.z);
        mesh.geometry.computeBoundingBox();
        mesh.geometry.computeBoundingSphere();
      }
    });

    bottomMeshes.forEach(mesh => {
      if (mesh.geometry) {
        mesh.geometry.translate(-bottomCenter.x, -bottomCenter.y, -bottomCenter.z);
        mesh.geometry.computeBoundingBox();
        mesh.geometry.computeBoundingSphere();
      }
    });

    // Update materials projected UV bounds
    const finalTopBox = new THREE.Box3();
    topMeshes.forEach(mesh => {
      if (mesh.geometry) finalTopBox.union(mesh.geometry.boundingBox);
    });
    materialTop.userData.bboxMin.value.set(finalTopBox.min.x, finalTopBox.min.y);
    materialTop.userData.bboxMax.value.set(finalTopBox.max.x, finalTopBox.max.y);

    const finalBottomBox = new THREE.Box3();
    bottomMeshes.forEach(mesh => {
      if (mesh.geometry) finalBottomBox.union(mesh.geometry.boundingBox);
    });
    materialBottom.userData.bboxMin.value.set(finalBottomBox.min.x, finalBottomBox.min.y);
    materialBottom.userData.bboxMax.value.set(finalBottomBox.max.x, finalBottomBox.max.y);

    // Create groups inside titleGroup
    const topGroup = new THREE.Group();
    const bottomGroup = new THREE.Group();
    titleGroup.add(topGroup);
    titleGroup.add(bottomGroup);

    // Position the groups at the centers relative to the overall combined center
    topGroup.position.copy(topCenter).sub(center);
    bottomGroup.position.copy(bottomCenter).sub(center);

    // Add meshes to groups instead of model
    topMeshes.forEach(mesh => topGroup.add(mesh));
    bottomMeshes.forEach(mesh => bottomGroup.add(mesh));

    // Store references on titleGroup for easy access/rotation in animation loop if needed
    titleGroup.userData.topGroup = topGroup;
    titleGroup.userData.bottomGroup = bottomGroup;

    // Apply relative rotation offsets to topGroup to align its perspective with bottomGroup
    // Since topGroup is higher, we tilt it slightly forward on X, and rotate slightly on Y/Z to correct perspective skew
    topGroup.rotation.set(-0.07, 0.035, -0.015);

    // Initial scale and position
    titleGroup.userData.maxDim = 2.0;
    updateGroupScale();
  }, undefined, e => console.error('Title GLTF load error:', e));

  function updateGroupScale() {
    if (!titleGroup.userData.maxDim) return;
    const maxDim = titleGroup.userData.maxDim;
    let scale = 3.9 / maxDim;
    if (camera.aspect < 1) {
      scale = (3.9 * camera.aspect) / maxDim;
    }
    titleGroup.scale.setScalar(scale);
    titleGroup.position.set(0, 0.1, 0);
  }

  function resize() {
    const w = section1.clientWidth || window.innerWidth;
    const h = section1.clientHeight || window.innerHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    updateGroupScale();
  }
  new ResizeObserver(resize).observe(section1);
  resize();

  // Eased mouse state for 3D title parallax
  const mouseLerp = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let rotX = 0;
  let rotY = 0;

  const clock = new THREE.Clock();
  (function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    const targetMouseX = mouse.x === -999 ? window.innerWidth / 2 : mouse.x;
    const targetMouseY = mouse.y === -999 ? window.innerHeight / 2 : mouse.y;
    mouseLerp.x += (targetMouseX - mouseLerp.x) * 0.08;
    mouseLerp.y += (targetMouseY - mouseLerp.y) * 0.08;

    const dx = mouseLerp.x - window.innerWidth / 2;
    const dy = mouseLerp.y - window.innerHeight / 2;

    const targetRotY = (dx / (window.innerWidth / 2)) * 0.22;
    const targetRotX = (dy / (window.innerHeight / 2)) * 0.22;

    rotX += (targetRotX - rotX) * 0.08;
    rotY += (targetRotY - rotY) * 0.08;

    if (titleGroup && titleGroup.userData.maxDim) {
      const PHI = 1.618, S2 = 1.414;
      const timeMs = t * 1000;
      
      const floatY =
          0.12 * Math.sin(0.00028 * timeMs) +
          0.06 * Math.sin(0.00028/PHI * timeMs + 1.4) +
          0.04 * Math.sin(0.00028/S2 * timeMs + 0.9);
      const floatX =
          0.05 * Math.sin(0.00028/S2 * timeMs + 2.7) +
          0.03 * Math.sin(0.00028*PHI/S2 * timeMs + 0.9);
      const floatRotZ =
          0.012 * Math.sin(0.00028/PHI/S2 * timeMs + 3.3);

      titleGroup.position.y = 0.1 + floatY;
      titleGroup.position.x = floatX;

      // Restored base pose: viewed from slightly above (baseRotX = 0.36)
      // and turned to the left (baseRotY = -0.32), with mouse parallax.
      titleGroup.rotation.x = 0.36 + rotX;
      titleGroup.rotation.y = -0.32 + rotY;
      titleGroup.rotation.z = floatRotZ;
    }

    renderer.render(scene, camera);
  })();
}

/* ─── 3D Scene (section 4) ──────────────────────────────── */
function initScene3D() {
  const canvas   = document.getElementById('canvas-3d');
  const section4 = document.getElementById('section-4');
  if (!canvas || !section4) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(15, 1, 0.1, 100);
  camera.position.set(0, 0, 13.82);

  scene.add(new THREE.AmbientLight(0xffffff, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  key.position.set(3, 4, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xf9edde, 0.8);
  fill.position.set(-3, -2, 2);
  scene.add(fill);

  let model = null;
  new GLTFLoader().load('/image/3d/circle 3d.glb', gltf => {
    model = gltf.scene;
    const box   = new THREE.Box3().setFromObject(model);
    const size  = box.getSize(new THREE.Vector3());
    const scale = 2.2 / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(scale);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center.multiplyScalar(scale));
    scene.add(model);
  }, undefined, e => console.error('GLB error:', e));

  function resize() {
    const w = section4.clientWidth || window.innerWidth;
    const h = section4.clientHeight || window.innerHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // Resize whenever section 4 becomes visible or changes size
  new ResizeObserver(resize).observe(section4);
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  (function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    if (model) {
      model.rotation.y = t * 0.3;
      model.rotation.x = Math.sin(t * 0.18) * 0.1;
    }
    renderer.render(scene, camera);
  })();
}

/* ─── Hamsa 3D symbol (section 1) ─────────────────────────── */
function initHamsaScene3D() {
  const canvas = document.getElementById('sym-hand');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 4);

  // Lighting — matching the "זהות צרופה" title scene exactly
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 4);   // white key light
  key.position.set(2, 6, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xfffae6, 3);   // beige fill light
  fill.position.set(-4, -3, 1);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x6b4938, 1.5);  // solid orange rim
  rim.position.set(3, -2, -4);
  scene.add(rim);
  const top = new THREE.DirectionalLight(0xffffff, 1.2);
  top.position.set(0, 8, 2);
  scene.add(top);

  // Custom neon material — identical color scheme to the title scene
  function createHamsaMaterial() {
    const mat = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide
    });

    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         varying vec3 vLocalNormal;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vLocalNormal = normal;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         varying vec3 vLocalNormal;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `
         vec3 n = normalize(vLocalNormal);

         // Detect front and back flat faces using absolute Z normal
         float factor = smoothstep(0.45, 0.55, abs(n.z));

         // Solid inner color #dcf000
         vec3 frontColor = pow(vec3(241.0 / 255.0, 235.0 / 255.0, 17.0 / 255.0), vec3(2.2));

         // Solid electric blue side walls matching the reference exactly
         vec3 blueSrgb = vec3(26.0 / 255.0, 26.0 / 255.0, 26.0 / 255.0); // Almost Black
         vec3 sideColor = pow(blueSrgb, vec3(2.2));

         // Clean, dark blue outline at the boundary bevels of the flat faces
         float outline = smoothstep(0.32, 0.45, abs(n.z)) * (1.0 - smoothstep(0.55, 0.68, abs(n.z)));
         vec3 strokeColor = pow(vec3(26.0 / 255.0, 26.0 / 255.0, 26.0 / 255.0), vec3(2.2)); // Dark outline

         vec3 finalDiffuse = mix(sideColor, frontColor, factor);
         finalDiffuse = mix(finalDiffuse, strokeColor, outline);

         vec4 diffuseColor = vec4( finalDiffuse, opacity );
        `
      );
    };

    return mat;
  }

  let model = null;
  new GLTFLoader().load('/image/3d/hamsa.gltf', gltf => {
    model = gltf.scene;

    model.traverse(child => {
      if (child.isMesh) {
        child.material = createHamsaMaterial();
      }
    });

    const box   = new THREE.Box3().setFromObject(model);
    const size  = box.getSize(new THREE.Vector3());
    const scale = 2.2 / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(scale);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center.multiplyScalar(scale));
    scene.add(model);
  }, undefined, e => console.error('GLB error:', e));

  function resize() {
    const w = canvas.clientWidth || 130;
    const h = canvas.clientHeight || 168;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  (function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    if (model) {
      // Angled view that reveals the side walls for a stronger 3D feel, with subtle floating motion
      // Match the angle of the "זהות צרופה" title scene (rotation.x = 0.44, rotation.y = -0.42)
      model.rotation.x = 0.44 + Math.sin(t * 0.13) * 0.08;
      model.rotation.y = -0.42 + Math.sin(t * 0.18) * 0.15;
      model.rotation.z = 0;
    }
    renderer.render(scene, camera);
  })();
}

/* ─── Boot ───────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  initTitleScene3D();
  initHamsaScene3D();
  initScreenTransition();
  initCursor();
  initOrganicFloat();
  initQuestionnaire();
  initStage2FloatDots();
  initBackgroundMusic();
  initIdleReset();
});

/* Kiosk auto-reset: once the experience has started, if nobody touches or presses
   anything for a minute, return to the opening screen. A full reload gives a clean
   start and re-broadcasts 'idle' to the display (its gallery comes back). Only armed
   after "לחץ להתחלה" — the idle opening screen itself never needs resetting. */
function initIdleReset() {
  const IDLE_MS = 60000;
  let timer = null;
  const arm = () => { clearTimeout(timer); timer = setTimeout(() => location.reload(), IDLE_MS); };
  window.addEventListener('opening-morph-start', () => {
    arm();
    // Any real interaction restarts the countdown. (The auto-demos move a ghost
    // hand visually and dispatch no pointer events, so they don't reset it.)
    ['pointerdown', 'touchstart', 'keydown'].forEach(ev =>
      window.addEventListener(ev, arm, { passive: true, capture: true }));
  }, { once: true });
}

/* Ambient background track — "Calm your Nervous System · 432 Hz" — loops forever
   under the whole interface. Browsers block autoplay until a user gesture, so it
   starts on the first touch/click (e.g. "לחץ להתחלה"). Kept at a low volume so the
   per-stage symbol sound plays clearly ON TOP of it. Streams (progressive) so the
   long track doesn't delay start. */
function initBackgroundMusic() {
  const music = new Audio('/sounds/bg-432hz.m4a');
  music.loop = true;
  music.volume = 0.4;
  music.preload = 'auto';
  // First real user gesture kicks it off; retry on the next gesture if it was blocked.
  const onGesture = () => {
    music.play().then(() => {
      window.removeEventListener('pointerdown', onGesture, true);
    }).catch(() => { /* still blocked — leave the listener for the next gesture */ });
  };
  window.addEventListener('pointerdown', onGesture, true);
}

/* Stage 2 — scatter many small equal-size gold dots that drift gently inside
   the central rectangle. */
function initStage2FloatDots() {
  const host = document.getElementById('stage2-float-dots');
  if (!host || host.childElementCount) return;
  const COUNT = 140;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < COUNT; i++) {
    const d = document.createElement('span');
    d.className = 's2-float-dot';
    d.style.left = (Math.random() * 100).toFixed(2) + '%';
    d.style.top  = (Math.random() * 100).toFixed(2) + '%';
    d.style.animationDuration = (5.5 + Math.random() * 4.5).toFixed(2) + 's';
    d.style.animationDelay = (-Math.random() * 7).toFixed(2) + 's';
    frag.appendChild(d);
  }
  host.appendChild(frag);
}

/* Press highlight for the dotted-frame buttons: a tap fills the interface
   orange with a cream label. Driven by a class rather than :active so it never
   sticks unintentionally on a touch screen.
   Two kinds:
   · STICKY — the button commits and the screen moves on ("סיימתי", "סימנתי"),
     so the orange stays; the stage rebuild clears it.
   · MOMENTARY — repeatable / per-keystroke buttons ("הוסף", keyboard keys),
     which flash back to normal so each press reads. */
document.addEventListener('pointerdown', (e) => {
  const btn = e.target.closest('.roots-add-country, .roots-finish, #roots-done, #virtual-keyboard .vk-key');
  if (!btn) return;
  btn.classList.add('is-pressed');
  const sticky = btn.matches('.roots-finish, #roots-done');
  if (sticky) return;   // leave it orange; the outgoing stage transition clears it
  const release = () => setTimeout(() => btn.classList.remove('is-pressed'), 160);
  btn.addEventListener('pointerup', release, { once: true });
  btn.addEventListener('pointercancel', release, { once: true });
  btn.addEventListener('pointerleave', release, { once: true });
});
