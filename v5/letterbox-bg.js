/* letterbox-bg.js — keep the fixed-aspect letterbox margins matching the stage.
   ─────────────────────────────────────────────────────────────────────
   The interface is a 1360×768 canvas centred + scaled inside the real screen
   (#app-viewport). On a differently-proportioned screen (e.g. 1920×1200) that
   leaves small margins top/bottom (or sides). Those margins are the <body> area
   behind the wrapper; without this they'd show a foreign stripe. Here we mirror
   the ACTIVE screen's background colour onto <body> so the margins always read
   as an extension of the current stage. */

const CREAM = 'rgb(245, 245, 237)';
const transparent = (c) => !c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)';

function activeBg() {
  const s = activeScreen();
  if (!s) return CREAM;
  const c = getComputedStyle(s).backgroundColor;
  if (!transparent(c)) return c;
  // Cream/paper stages leave the section transparent → fall back to the plate var.
  return getComputedStyle(s).getPropertyValue('--stage-plate').trim() || CREAM;
}

// The active screen element: the opening (section-1) wins while it is still
// visible (it fades opacity → 0 as the questionnaire fades in), else section-3.
function activeScreen() {
  const s1 = document.getElementById('section-1');
  if (s1 && parseFloat(getComputedStyle(s1).opacity || '1') > 0.5) return s1;
  return document.getElementById('section-3');
}

let _lastBg = '', _lastDot = '';
function sync() {
  const c = activeBg();
  if (c !== _lastBg) {
    _lastBg = c;
    // !important — geometric.css sets html/body background-color with !important.
    document.body.style.setProperty('background-color', c, 'important');
    document.body.style.setProperty('background-image', 'none', 'important');
  }
  // Mirror the active screen's grid-dot colour onto the grid-bleed layer so its
  // margin dots match the in-screen grid (--grid-dot lives on the .stage-grid).
  const s = activeScreen();
  const bleed = document.getElementById('grid-bleed');
  const src = s && (s.querySelector('.stage-grid') || s);
  if (src && bleed) {
    const dot = getComputedStyle(src).getPropertyValue('--grid-dot').trim();
    if (dot && dot !== _lastDot) { _lastDot = dot; bleed.style.setProperty('--grid-dot', dot); }
  }
}

export function initLetterboxBg() {
  sync();
  const mo = new MutationObserver(sync);
  ['section-1', 'section-3'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) mo.observe(el, { attributes: true, attributeFilter: ['style', 'class', 'data-stage'] });
  });
  // The opacity crossfade + p5-driven time-sky recolour aren't all attribute
  // mutations, so also poll on a timer (fires even when the tab throttles rAF).
  setInterval(sync, 200);
}

initLetterboxBg();
