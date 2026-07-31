/* demo-hand.js — an automatic "ghost hand" that shows a stage's gesture on entry.
   ─────────────────────────────────────────────────────────────────────
   Purely visual: it glides the line-art hand (same one as the real cursor) to
   each target and "taps" (a brief grab + a ripple), looping, so a kiosk visitor
   sees what to do without words. It NEVER dispatches real events, and it hides
   the moment the user actually interacts. Drive it with screen-space points. */

const HAND_SVG = `
<svg viewBox="0 0 22 26" xmlns="http://www.w3.org/2000/svg">
  <g class="dh-open" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
    <line x1="7" y1="3" x2="7" y2="13"/><line x1="11" y1="1.5" x2="11" y2="13"/>
    <line x1="14.5" y1="3" x2="14.5" y2="13"/><line x1="17.5" y1="5" x2="17.5" y2="13"/>
    <path d="M5 13 Q3 13 2.5 11 Q2 9 3.5 8"/>
    <path d="M5 13 Q4 19 8 22 L13 22 Q18 22 19 17 L19 13"/>
  </g>
  <g class="dh-fist" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
    <rect x="6" y="11" width="11" height="11" rx="3.4"/>
    <path d="M8.7 11.2 L8.7 13.8"/><path d="M11.5 11 L11.5 13.8"/><path d="M14.3 11.2 L14.3 13.8"/>
    <path d="M6 14.8 Q3.5 14.5 3.7 12.5 Q3.9 11 5.7 11.5"/>
  </g>
  <g class="dh-point" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
    <rect x="7" y="12" width="10" height="10" rx="3.2"/>
    <path d="M9 12 L9 2.5"/>
    <path d="M11.6 12 L11.6 10"/><path d="M14 12 L14 10.2"/>
    <path d="M7 15 Q4.6 14.7 4.8 12.7 Q5 11.2 6.8 11.7"/>
  </g>
</svg>`;

let hand = null, ripple = null, guide = null, token = 0;
let demoLive = false;      // a stage demo is on screen right now
let aborted = false;       // the visitor touched — every running sequence must drain

function ensure() {
  if (hand) return;
  hand = document.createElement('div');
  hand.className = 'demo-hand';
  hand.setAttribute('aria-hidden', 'true');
  hand.innerHTML = HAND_SVG;
  ripple = document.createElement('span');
  ripple.className = 'demo-ripple';
  hand.appendChild(ripple);
  // The guide label rides WITH the hand (a child, so it needs no animation of
  // its own): a short dotted connector in the interface's own dot language and
  // the stage's EXISTING instruction text — no tooltip, box, frame or shadow.
  guide = document.createElement('span');
  guide.className = 'dh-guide';
  guide.innerHTML = '<span class="dh-line"></span><span class="dh-text"></span>';
  hand.appendChild(guide);
  document.body.appendChild(hand);
}

/* The stage's own instruction element — its text becomes the label while the
   demo runs, and it is put back the moment the visitor takes over. */
/* TRIAL SCOPE: the guide (bigger hand + travelling label) is switched on for the
   PATHS stage only for now; every other stage keeps the demo exactly as it was.
   Widening it later is a one-line change here. */
const GUIDE_STAGES = ['5'];
function guideAllowed() {
  const sec = document.getElementById('section-3');
  return !!sec && GUIDE_STAGES.includes(sec.dataset.stage);
}
function stageNote() {
  const els = [document.querySelector('#section-3 .stage-band .sb-note'), document.getElementById('q-instruction')];
  return els.find(e => e && e.textContent.trim() && e.offsetParent !== null) || null;
}
/* Label side chosen from where the hand IS: never off-screen, never over the
   element being demonstrated. */
function placeGuide(x, y) {
  if (!guide) return;
  const W = window.innerWidth, H = window.innerHeight;
  guide.classList.remove('to-left', 'to-right', 'to-top');
  const room = 300;
  if (x > W - room) guide.classList.add('to-left');
  else if (x < room) guide.classList.add('to-right');
  else guide.classList.add(x > W / 2 ? 'to-left' : 'to-right');
  if (y < 90 || H - y < 90) guide.classList.add('to-top');
}

const sleep = ms => new Promise(r => setTimeout(r, aborted ? 0 : ms));
function moveTo(x, y) { hand.style.left = x + 'px'; hand.style.top = y + 'px'; placeGuide(x, y); }
function pulse() { ripple.classList.remove('is-go'); void ripple.offsetWidth; ripple.classList.add('is-go'); }

/* Low-level primitives for stages that must sync the hand with their own state
   changes (e.g. the frequency stage: tap a square → it appears → tap "המשך"). */
export function getGhostHand() {
  ensure();
  return {
    el: hand, sleep,
    show(tone) {
      if (aborted) return;
      hand.classList.toggle('is-dark', tone === 'dark');
      hand.classList.add('is-on');
      hand.classList.toggle('is-demo', guideAllowed());   // is-demo: ~18% larger + slower — it reads as a guide, not the cursor
      startGuide();
    },
    hide() { hand.classList.remove('is-on', 'is-grab', 'is-demo'); endGuide(); },
    // Jump to a point with no glide — use before show() so the hand appears
    // already on target instead of flashing in from the corner.
    place(x, y) { const tr = hand.style.transition; hand.style.transition = 'none'; moveTo(x, y); void hand.offsetWidth; hand.style.transition = tr; },
    move(x, y) { moveTo(x, y); },
    async tap() { hand.classList.add('is-grab'); pulse(); await sleep(250); hand.classList.remove('is-grab'); },
    // Persistent states for the globe demo: hold a fist while dragging, switch to
    // a pointing finger to "click" a continent.
    grab(on) { hand.classList.toggle('is-grab', on !== false); if(on !== false) hand.classList.remove('is-point'); },
    point(on) { hand.classList.toggle('is-point', on !== false); if(on !== false) hand.classList.remove('is-grab'); },
    open() { hand.classList.remove('is-grab', 'is-point'); },
    async tapPoint() { hand.classList.add('is-point'); pulse(); await sleep(260); },
  };
}

/* Take the stage's existing instruction out of its fixed slot and onto the
   hand; put it back when the demo ends. */
function startGuide() {
  if (demoLive || aborted || !guideAllowed()) return;
  demoLive = true;
  const note = stageNote();
  const text = note ? note.textContent.trim() : '';
  guide.querySelector('.dh-text').textContent = text;
  guide.classList.toggle('is-on', !!text);
  if (note) { note.dataset.dhHidden = '1'; note.style.visibility = 'hidden'; }
}
function endGuide() {
  demoLive = false;
  if (guide) guide.classList.remove('is-on');
  document.querySelectorAll('[data-dh-hidden]').forEach(n => {
    n.style.visibility = '';
    delete n.dataset.dhHidden;
  });
}
/* The visitor's FIRST touch: the demo stops at once, the label + connector go,
   the hand returns to its normal size — and that same touch does its work (the
   input lock lets it through, see lockInput). Sequences already in flight drain
   instantly because sleep() returns immediately once aborted. */
export function handoffToUser() {
  if (aborted) return;
  aborted = true;
  token++;
  if (hand) hand.classList.remove('is-on', 'is-grab', 'is-point', 'is-demo');
  endGuide();
  unlockInput();
}
/* Every stage entry starts a fresh demo state (a new stage may demo again). */
export function resetDemoState() { aborted = false; endGuide(); }

/* points: array of {x,y} screen coords to tap in sequence; loops until stopped.
   opts.tone: 'light' (default, cream) or 'dark' — pick for contrast on the stage. */
export async function playHandDemo(points, opts = {}) {
  if (!points || !points.length) return;
  ensure();
  const my = ++token;
  hand.classList.toggle('is-dark', opts.tone === 'dark');
  hand.classList.remove('is-grab');

  // Appear a little off the first target, then glide in.
  hand.style.transition = 'none';
  moveTo(points[0].x + 54, points[0].y + 66);
  void hand.offsetWidth;
  hand.style.transition = '';
  hand.classList.add('is-on');
  await sleep(70);

  while (my === token) {
    for (let i = 0; i < points.length; i++) {
      if (my !== token) return;
      moveTo(points[i].x, points[i].y);
      await sleep(760);
      if (my !== token) return;
      hand.classList.add('is-grab');           // press
      pulse();
      await sleep(240);
      hand.classList.remove('is-grab');         // release
      await sleep(520);
    }
    await sleep(750);                            // beat before repeating
  }
}

export function stopHandDemo() {
  token++;
  if (hand) hand.classList.remove('is-on', 'is-grab');
}

/* ── Input lock during a demo ──────────────────────────────────────────────
   While a stage's ghost-hand demo plays, the visitor must NOT be able to click,
   drag (e.g. rotate the globe) or scroll. We swallow every TRUSTED pointer/touch/
   wheel/click at the document's capture phase — the demo's own actions are
   programmatic (isTrusted === false), so they pass through untouched. */
let _lockRelease = null;
const _LOCK_TYPES = ['pointerdown', 'pointerup', 'pointermove', 'touchstart', 'touchmove', 'touchend', 'wheel', 'click', 'contextmenu', 'keydown', 'keypress', 'keyup', 'input', 'beforeinput'];
export function lockInput() {
  if (_lockRelease) return;
  const START = { pointerdown: 1, touchstart: 1, mousedown: 1 };
  const swallow = (e) => {
    if (!e.isTrusted) return;
    // The first real touch BOTH stops the demo and counts as the visitor's own
    // action — it is never swallowed, so nothing has to be pressed twice.
    if (START[e.type]) { handoffToUser(); return; }
    e.preventDefault(); e.stopImmediatePropagation();
  };
  const opts = { capture: true, passive: false };
  _LOCK_TYPES.forEach(t => document.addEventListener(t, swallow, opts));
  window.__inputLocked = true;   // the touch-sound checks this (its window-capture listener fires first)
  _lockRelease = () => { _LOCK_TYPES.forEach(t => document.removeEventListener(t, swallow, opts)); window.__inputLocked = false; };
}
export function unlockInput() {
  if (_lockRelease) { _lockRelease(); _lockRelease = null; }
}
