/* ============================================================
   זהות עצמית — Prototype v2
   Geometric construction artifact + screen flow.
   ============================================================ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const QUESTIONS = [
  {
    id: 'origin',
    tag: 'מוצא',
    headline: 'מאיפה מתחיל<br/>הסיפור שלך?',
    sub: 'בחר/י מקום שמרגיש בית — עיר, שכונה, או נקודה על המפה.',
    placeholder: 'למשל: צפת, פלובדיב, מרקש…',
  },
  {
    id: 'word',
    tag: 'מילה',
    headline: 'איזו מילה<br/>תפסה את העין?',
    sub: 'מילה אחת שראית באחרונה ולא הלכה ממך — בעברית או בכל שפה.',
    placeholder: 'מילה אחת…',
  },
  {
    id: 'stars',
    tag: 'כוכבים',
    headline: 'בחר/י שלושה<br/>סמלים שיתלוו אליך',
    sub: 'הסמלים נכנסים לתוך התכשיט כשכבה דקה. בחר/י מתוך הסט.',
    placeholder: 'למשל: עין, חמסה, כוכב…',
  },
  {
    id: 'personal',
    tag: 'מילה אישית',
    headline: 'איזו מילה<br/>תרצה/י לשאת איתך?',
    sub: 'מילה שמייצגת אותך — ערך, תפילה, או מטרה.',
    placeholder: 'מילה אחת…',
  },
  {
    id: 'name',
    tag: 'שם',
    headline: 'איך<br/>קוראים לך?',
    sub: 'השם נחקק על גב התכשיט. רק לך.',
    placeholder: 'הקלד/י את שמך…',
  },
];

const state = {
  screen: 'landing',
  qIndex: 0,
  answers: new Array(QUESTIONS.length).fill(''),
};

const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/* ── Custom cursor ───────────────────────────────────────────── */
function initCursor() {
  const cursor = $('#p2-cursor');
  let tx = 0, ty = 0, cx = 0, cy = 0;
  window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
  (function tick() {
    cx += (tx - cx) * 0.22;
    cy += (ty - cy) * 0.22;
    cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    requestAnimationFrame(tick);
  })();
  document.addEventListener('mouseover', e => {
    if (e.target.closest('button, a, input, [data-go], .hud-link')) {
      cursor.classList.add('cursor-hover');
    }
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest('button, a, input, [data-go], .hud-link')) {
      cursor.classList.remove('cursor-hover');
    }
  });
}

/* ── Coords ticker — calm, occasional ────────────────────────── */
function initCoordsTicker() {
  const x = $('#coord-x'), y = $('#coord-y'), z = $('#coord-z');
  let vx = 8, vy = 22, vz = 4;
  setInterval(() => {
    vx = Math.max(0, Math.min(99, vx + Math.round((Math.random() - 0.5) * 3)));
    vy = Math.max(0, Math.min(99, vy + Math.round((Math.random() - 0.5) * 3)));
    vz = Math.max(0, Math.min(99, vz + Math.round((Math.random() - 0.5) * 2)));
    x.textContent = String(vx).padStart(2, '0');
    y.textContent = String(vy).padStart(2, '0');
    z.textContent = String(vz).padStart(2, '0');
  }, 1400);
}

/* ── Screen routing ──────────────────────────────────────────── */
function showScreen(name) {
  state.screen = name;
  $$('.p2-screen').forEach(s => {
    if (s.dataset.screen === name) s.hidden = false;
    else s.hidden = true;
  });
  if (name === 'questions') renderQuestion();
  if (name === 'reveal')   renderReveal();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ── Progress list ───────────────────────────────────────────── */
function renderProgressList() {
  const list = $('#prog-list');
  list.innerHTML = '';
  QUESTIONS.forEach((q, i) => {
    const li = document.createElement('li');
    li.className = 'prog-item';
    if (i === state.qIndex) li.classList.add('is-active');
    if (i <  state.qIndex) li.classList.add('is-done');
    li.innerHTML = `
      <span class="prog-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="prog-dot"></span>
      <span class="prog-text">${q.tag}</span>
    `;
    li.addEventListener('click', () => {
      state.qIndex = i;
      renderQuestion();
    });
    list.appendChild(li);
  });
}

/* ── Render question ─────────────────────────────────────────── */
function renderQuestion() {
  const q = QUESTIONS[state.qIndex];
  $('#q-current').textContent = String(state.qIndex + 1).padStart(2, '0');
  $('#q-total').textContent   = String(QUESTIONS.length).padStart(2, '0');
  $('#q-headline').innerHTML  = q.headline;
  $('#q-sub').textContent     = q.sub;
  const input = $('#q-input');
  input.placeholder = q.placeholder;
  input.value = state.answers[state.qIndex] || '';

  const tag = document.querySelector('.q-tag');
  if (tag) tag.textContent = q.tag;

  $('#q-prev').disabled = state.qIndex === 0;
  $('#q-next').textContent = state.qIndex === QUESTIONS.length - 1 ? 'סיים' : 'המשך';

  renderProgressList();
  // Artifact reveals each layer as the user answers — layer count = current index + 1
  renderArtifact($('#artifact-svg'), state.qIndex + 1);

  setTimeout(() => input.focus(), 60);
}

function nextQuestion() {
  state.answers[state.qIndex] = $('#q-input').value.trim();
  if (state.qIndex === QUESTIONS.length - 1) { showScreen('reveal'); return; }
  state.qIndex++;
  renderQuestion();
}
function prevQuestion() {
  if (state.qIndex === 0) return;
  state.answers[state.qIndex] = $('#q-input').value.trim();
  state.qIndex--;
  renderQuestion();
}
function skipQuestion() { nextQuestion(); }

/* ────────────────────────────────────────────────────────────────
   ARTIFACT — geometric construction system
   Each layer adds a hairline geometric primitive (circle, arc,
   ellipse, dotted guide). The whole composition feels like a
   construction-line study rather than a stack of icons.
   ──────────────────────────────────────────────────────────────── */

const HAIR        = '#0c0c0c';
const HAIR_FAINT  = 'rgba(12,12,12,0.35)';
const GLOW_ORANGE = '#f4a37c';
const GLOW_BLUE   = '#aac4ec';
const GLOW_PINK   = '#f3b9ce';
const GLOW_VIOLET = '#c9b6e6';

/* Each function returns an array of SVG element specs.
   The renderer draws them in order; layers stack visually. */
const ARTIFACT_LAYERS = [
  // ── Layer 0: base atmosphere (always present) ──
  () => [
    // soft glow disc behind everything
    { tag: 'circle', attrs: { cx: 0, cy: 0, r: 80, fill: 'url(#glow-orange)', opacity: 0.7 } },
    { tag: 'circle', attrs: { cx: 14, cy: -10, r: 60, fill: 'url(#glow-blue)', opacity: 0.65 } },
    // outer construction ring (dashed)
    { tag: 'circle', attrs: { cx: 0, cy: 0, r: 95, fill: 'none', stroke: HAIR_FAINT, 'stroke-width': 0.5, 'stroke-dasharray': '2 4' } },
    // primary axis dots
    { tag: 'line',   attrs: { x1: -95, y1: 0, x2: 95, y2: 0, stroke: HAIR_FAINT, 'stroke-width': 0.5, 'stroke-dasharray': '1 3' } },
    { tag: 'line',   attrs: { x1: 0, y1: -95, x2: 0, y2: 95, stroke: HAIR_FAINT, 'stroke-width': 0.5, 'stroke-dasharray': '1 3' } },
  ],
  // ── Layer 1 (origin) — two large overlapping ellipses (vesica) ──
  () => [
    { tag: 'ellipse', attrs: { cx: -22, cy: 0, rx: 56, ry: 72, fill: 'none', stroke: HAIR, 'stroke-width': 0.6 } },
    { tag: 'ellipse', attrs: { cx:  22, cy: 0, rx: 56, ry: 72, fill: 'none', stroke: HAIR, 'stroke-width': 0.6 } },
  ],
  // ── Layer 2 (word) — central circle + dotted concentric ──
  () => [
    { tag: 'circle', attrs: { cx: 0, cy: 0, r: 32, fill: 'none', stroke: HAIR, 'stroke-width': 0.6 } },
    { tag: 'circle', attrs: { cx: 0, cy: 0, r: 22, fill: 'none', stroke: HAIR, 'stroke-width': 0.5, 'stroke-dasharray': '2 3' } },
  ],
  // ── Layer 3 (stars) — three small circles on the inner axis ──
  () => {
    const out = [];
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / 3);
      const cx = Math.cos(a) * 50;
      const cy = Math.sin(a) * 50;
      out.push({ tag: 'circle', attrs: { cx, cy, r: 10, fill: 'none', stroke: HAIR, 'stroke-width': 0.6 } });
      out.push({ tag: 'circle', attrs: { cx, cy, r: 3,  fill: 'none', stroke: HAIR_FAINT, 'stroke-width': 0.5, 'stroke-dasharray': '1 2' } });
    }
    return out;
  },
  // ── Layer 4 (personal word) — inner ellipse arc, italic letter as construction mark ──
  () => [
    { tag: 'ellipse', attrs: { cx: 0, cy: 0, rx: 70, ry: 30, fill: 'none', stroke: HAIR, 'stroke-width': 0.6 } },
    { tag: 'ellipse', attrs: { cx: 0, cy: 0, rx: 30, ry: 70, fill: 'none', stroke: HAIR_FAINT, 'stroke-width': 0.5, 'stroke-dasharray': '3 3' } },
  ],
  // ── Layer 5 (name) — hairline ring text path around composition ──
  () => [
    { tag: 'path', attrs: {
      id: 'name-arc',
      d: 'M -85 0 A 85 85 0 1 1 85 0 A 85 85 0 1 1 -85 0',
      fill: 'none', stroke: HAIR_FAINT, 'stroke-width': 0.4, 'stroke-dasharray': '1 2',
    } },
    { tag: 'text-path-host', text: state.answers[4] || 'זהות עצמית' },
  ],
];

function renderArtifact(svg, layerCount) {
  svg.innerHTML = '';

  // defs for soft glows
  const defs = svgEl('defs');
  defs.appendChild(radialGlow('glow-orange', GLOW_ORANGE));
  defs.appendChild(radialGlow('glow-blue',   GLOW_BLUE));
  defs.appendChild(radialGlow('glow-pink',   GLOW_PINK));
  defs.appendChild(radialGlow('glow-violet', GLOW_VIOLET));
  svg.appendChild(defs);

  const max = Math.min(layerCount, ARTIFACT_LAYERS.length - 1);
  for (let i = 0; i <= max; i++) {
    const elems = ARTIFACT_LAYERS[i]();
    const group = svgEl('g', { class: i === max ? 'draw-in' : '' });
    elems.forEach((spec, j) => {
      if (spec.tag === 'text-path-host') {
        const t = svgEl('text', {
          'font-family': 'SmokerSerif, serif',
          'font-style': 'italic',
          'font-size': 7,
          'letter-spacing': '0.4em',
          fill: HAIR,
        });
        const tp = svgEl('textPath', { href: '#name-arc', startOffset: '25%' });
        tp.textContent = spec.text;
        t.appendChild(tp);
        group.appendChild(t);
      } else {
        const el = svgEl(spec.tag, spec.attrs);
        if (spec.text) el.textContent = spec.text;
        // calm staggered emergence for the new layer
        if (i === max) {
          el.style.setProperty('--delay', `${j * 0.08}s`);
          el.style.setProperty('--len',   '420');
        }
        group.appendChild(el);
      }
    });
    svg.appendChild(group);
  }
}

function radialGlow(id, color) {
  const r = svgEl('radialGradient', { id });
  r.appendChild(svgEl('stop', { offset: '0%',   'stop-color': color, 'stop-opacity': '0.85' }));
  r.appendChild(svgEl('stop', { offset: '60%',  'stop-color': color, 'stop-opacity': '0.15' }));
  r.appendChild(svgEl('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0'    }));
  return r;
}

/* ── Reveal screen ───────────────────────────────────────────── */
function renderReveal() {
  renderArtifact($('#artifact-final'), ARTIFACT_LAYERS.length - 1);
  const name = state.answers[4] || 'אנונימי';
  $('#spec-code').textContent  = `ZH·${String(hashStr(name)).slice(0, 4)}·02`;
  $('#spec-gem').textContent   = String(gematria(name) || 0);
  $('#spec-layers').textContent = `${String(ARTIFACT_LAYERS.length - 1).padStart(2, '0')} / ${String(ARTIFACT_LAYERS.length - 1).padStart(2, '0')}`;

  const list = $('#ans-list');
  list.innerHTML = '';
  QUESTIONS.forEach((q, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="ans-key">${q.tag}</span>
      <span class="ans-val">${state.answers[i] || '—'}</span>
    `;
    list.appendChild(li);
  });
}

const GEMATRIA = {
  'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,
  'י':10,'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,'נ':50,'ן':50,
  'ס':60,'ע':70,'פ':80,'ף':80,'צ':90,'ץ':90,'ק':100,'ר':200,'ש':300,'ת':400
};
function gematria(s) { return [...s].reduce((a, c) => a + (GEMATRIA[c] || 0), 0); }
function hashStr(s)  {
  let h = 0x9e3779b1;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) >>> 0;
  return h;
}

/* ────────────────────────────────────────────────────────────
   3D — peace.glb on the landing screen, rotating on Y axis.
   Sits inside the construction geometry, behind the typography.
   ──────────────────────────────────────────────────────────── */
function initPeace3D() {
  const canvas = document.getElementById('peace-canvas');
  if (!canvas) return;
  const stage = canvas.parentElement;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 5);

  // Soft museum lighting
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(2.5, 3, 4);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xfde2c2, 0.7);
  fill.position.set(-3, -1.5, 2);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xb6d2f4, 0.5);
  rim.position.set(0, -2, -4);
  scene.add(rim);

  let model = null;
  new GLTFLoader().load('/image/3d/peace.glb', (gltf) => {
    model = gltf.scene;

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const targetSize = 2.2;
    model.scale.setScalar(targetSize / maxDim);

    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center.multiplyScalar(targetSize / maxDim));

    scene.add(model);
  }, undefined, (err) => console.error('peace.glb load error:', err));

  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  (function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    if (model) model.rotation.y = t * 0.45;
    renderer.render(scene, camera);
  })();
}

/* ── Wire up ────────────────────────────────────────────────── */
function init() {
  initCursor();
  initCoordsTicker();
  initPeace3D();

  document.addEventListener('click', e => {
    const target = e.target.closest('[data-go]');
    if (target) {
      e.preventDefault();
      showScreen(target.dataset.go);
    }
  });

  $('#q-next').addEventListener('click', nextQuestion);
  $('#q-prev').addEventListener('click', prevQuestion);
  $('#q-skip').addEventListener('click', skipQuestion);
  $('#q-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); nextQuestion(); }
  });

  showScreen('landing');
}

document.addEventListener('DOMContentLoaded', init);
