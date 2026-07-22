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
</svg>`;

let hand = null, ripple = null, token = 0;

function ensure() {
  if (hand) return;
  hand = document.createElement('div');
  hand.className = 'demo-hand';
  hand.setAttribute('aria-hidden', 'true');
  hand.innerHTML = HAND_SVG;
  ripple = document.createElement('span');
  ripple.className = 'demo-ripple';
  hand.appendChild(ripple);
  document.body.appendChild(hand);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
function moveTo(x, y) { hand.style.left = x + 'px'; hand.style.top = y + 'px'; }
function pulse() { ripple.classList.remove('is-go'); void ripple.offsetWidth; ripple.classList.add('is-go'); }

/* Low-level primitives for stages that must sync the hand with their own state
   changes (e.g. the frequency stage: tap a square → it appears → tap "המשך"). */
export function getGhostHand() {
  ensure();
  return {
    el: hand, sleep,
    show(tone) { hand.classList.toggle('is-dark', tone === 'dark'); hand.classList.add('is-on'); },
    hide() { hand.classList.remove('is-on', 'is-grab'); },
    // Jump to a point with no glide — use before show() so the hand appears
    // already on target instead of flashing in from the corner.
    place(x, y) { const tr = hand.style.transition; hand.style.transition = 'none'; moveTo(x, y); void hand.offsetWidth; hand.style.transition = tr; },
    move(x, y) { moveTo(x, y); },
    async tap() { hand.classList.add('is-grab'); pulse(); await sleep(250); hand.classList.remove('is-grab'); },
  };
}

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
