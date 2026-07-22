import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import './styles.css';
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
document.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

/* ─── Screen transition (section-1 → section-3) ─────────── */
function initScreenTransition() {
  const s1  = document.getElementById('section-1');
  const s3  = document.getElementById('section-3');
  const cta = document.getElementById('cta-anchor');
  if (!cta || !s1 || !s3) return;

  cta.addEventListener('click', () => {
    cta.classList.add('clicked');
    setTimeout(() => {
      s1.classList.add('exiting');
      s3.classList.add('entering');
    }, 120);
  });
}

/* ─── Custom cursor ──────────────────────────────────────── */
function initCursor() {
  const dot = document.getElementById('cursor');

  const orangeEls = [
    document.getElementById('section-2'),
    document.getElementById('cta-anchor'),
  ];

  function tick() {
    dot.style.left = mouse.x + 'px';
    dot.style.top  = mouse.y + 'px';

    const onOrange = orangeEls.some(el => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return mouse.x >= r.left && mouse.x <= r.right &&
             mouse.y >= r.top  && mouse.y <= r.bottom;
    });
    dot.classList.toggle('on-orange', onOrange);

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
    'on-orange': ['image/חזור למסך הפתיחה.png',      'image/חזור למסך הפתיחה כחול.png'],
    'on-blue':   ['image/חזור למסך הפתיחה.png',      'image/חזור למסך הפתיחה כתום.png'],
    'on-beige':  ['image/חזור למסך הפתיחה כתום.png', 'image/חזור למסך הפתיחה כחול.png'],
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

  // Lighting — vivid orange + blue matching site palette
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xfd7041, 4);   // strong orange from above
  key.position.set(2, 6, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x0000ff, 3);   // vivid blue from below-left
  fill.position.set(-4, -3, 1);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xfd7041, 1.5);  // orange rim from back
  rim.position.set(3, -2, -4);
  scene.add(rim);
  const top = new THREE.DirectionalLight(0xffffff, 1.2);
  top.position.set(0, 8, 2);
  scene.add(top);

  const titleGroup = new THREE.Group();
  scene.add(titleGroup);

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

           // 5-color procedural gradient: solid yellow tones and beige
           vec3 c0 = pow(vec3(239.0 / 255.0, 235.0 / 255.0, 119.0 / 255.0), vec3(2.2)); // #EFEB77
           vec3 c1 = pow(vec3(252.0 / 255.0, 247.0 / 255.0, 241.0 / 255.0), vec3(2.2));
           vec3 c2 = pow(vec3(246.0 / 255.0, 175.0 / 255.0, 4.0 / 255.0), vec3(2.2));   // #F6AF04
           vec3 c3 = pow(vec3(252.0 / 255.0, 247.0 / 255.0, 241.0 / 255.0), vec3(2.2)); // #fcf7f1
           vec3 c4 = pow(vec3(246.0 / 255.0, 175.0 / 255.0, 4.0 / 255.0), vec3(2.2));   // #F6AF04

           if (t < 0.25) {
               frontColor = mix(c0, c1, t / 0.25);
           } else if (t < 0.50) {
               frontColor = mix(c1, c2, (t - 0.25) / 0.25);
           } else if (t < 0.75) {
               frontColor = mix(c2, c3, (t - 0.50) / 0.25);
           } else {
               frontColor = mix(c3, c4, (t - 0.75) / 0.25);
           }

           // Dark grey side walls matching the UI lines (#302e2e)
           vec3 darkGreySrgb = vec3(48.0 / 255.0, 46.0 / 255.0, 46.0 / 255.0);
           vec3 sideColor = pow(darkGreySrgb, vec3(2.2));

           // Clean, dark grey outline at the boundary bevels of the flat faces (#302e2e)
           float outline = smoothstep(0.32, 0.45, abs(localNorm.z)) * (1.0 - smoothstep(0.55, 0.68, abs(localNorm.z)));
           vec3 strokeColor = pow(darkGreySrgb, vec3(2.2));

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
  const key = new THREE.DirectionalLight(0xfd7041, 4);   // strong orange from above
  key.position.set(2, 6, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x0000ff, 3);   // vivid blue from below-left
  fill.position.set(-4, -3, 1);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xfd7041, 1.5);  // orange rim from back
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

          // Solid inner color #fd7041
          vec3 frontColor = pow(vec3(253.0 / 255.0, 112.0 / 255.0, 65.0 / 255.0), vec3(2.2));

          // Solid electric blue side walls matching the reference exactly
          vec3 blueSrgb = vec3(0.000, 0.050, 0.950); // Vibrant Pure Electric Blue
         vec3 sideColor = pow(blueSrgb, vec3(2.2));

         // Clean, dark blue outline at the boundary bevels of the flat faces
         float outline = smoothstep(0.32, 0.45, abs(n.z)) * (1.0 - smoothstep(0.55, 0.68, abs(n.z)));
          vec3 strokeColor = pow(vec3(0.000, 0.000, 0.250), vec3(2.2)); // Deep dark blue outline

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
});
