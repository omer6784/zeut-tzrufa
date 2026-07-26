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
  const s1 = document.getElementById('section-1');
  const s3 = document.getElementById('section-3');
  // The opening screen (section-1) wins while it is still visible (it fades out,
  // opacity → 0, as the questionnaire fades in).
  if (s1 && parseFloat(getComputedStyle(s1).opacity || '1') > 0.5) {
    const c = getComputedStyle(s1).backgroundColor;
    return transparent(c) ? CREAM : c;
  }
  if (s3) {
    // Coloured stages paint the colour on the section itself; cream/paper stages
    // leave it transparent, so fall back to the stage's plate variable.
    let c = getComputedStyle(s3).backgroundColor;
    if (transparent(c)) c = getComputedStyle(s3).getPropertyValue('--stage-plate').trim() || CREAM;
    return c;
  }
  return CREAM;
}

let _last = '';
function sync() {
  const c = activeBg();
  if (c === _last) return;
  _last = c;
  // !important — geometric.css sets html/body background-color with !important.
  document.body.style.setProperty('background-color', c, 'important');
  document.body.style.setProperty('background-image', 'none', 'important');
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
