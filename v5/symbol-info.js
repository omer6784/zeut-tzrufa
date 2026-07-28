/* symbol-info.js — the "SymbolInfoPanel" for the TOUCH screen.
   ─────────────────────────────────────────────────────────────────────
   Whenever a symbol is added to the jewel (after a stage completes), the big
   DISPLAY screen shows the live 3D build, and this panel shows the momentary
   CONTEXT on the touch screen: the symbol in 2D, plus its name, its origin /
   tradition, and its meaning.

   Keyed by the MOTIF/symbol key (the same key the interface's choices map to,
   e.g. Morocco → 'hamsa'). Its on-screen position can change per stage via the
   `variant` argument.

   Usage:
     import { showSymbolInfo, hideSymbolInfo } from './symbol-info.js';
     showSymbolInfo('hamsa', svgInnerHTML, 'right');
   ───────────────────────────────────────────────────────────────────── */

/* Per-symbol text (authored). Add an entry per motif key. */
export const SYMBOL_INFO = {
  hamsa: {
    name: 'חמסה',
    origin: 'יהדות צפון אפריקה והעולם האסלאמי',
    meaning: 'הגנה מפני עין הרע',
  },
  scarab: {
    name: 'חרפושית',
    origin: 'מצרים העתיקה',
    meaning: 'התחדשות ולידה מחדש',
  },
  eye: {
    name: 'עין',
    origin: 'יהדות צפון אפריקה והעולם האסלאמי',
    meaning: 'הגנה מפני עין הרע',
  },
  rimon: {
    name: 'רימון',
    origin: 'המסורת היהודית',
    meaning: 'שפע, פוריות וברכה',
  },
  fish: {
    name: 'דג',
    origin: 'יהדות מרוקו',
    meaning: 'שפע, פריון והגנה',
  },
  lotus: {
    name: 'לוטוס',
    origin: 'מצרים העתיקה',
    meaning: 'טוהר, צמיחה והתחדשות',
  },
  dharma: {
    name: 'גלגל הדהרמה',
    origin: 'בודהיזם',
    meaning: 'חכמה, דרך ואיזון',
  },
  vegvisir: {
    name: 'וגוויסיר',
    origin: 'המסורת הנורדית האיסלנדית',
    meaning: 'הכוונה ושמירה בדרך',
  },
  pyramid: {
    name: 'משולש',
    origin: 'יהדות מרוקו',
    meaning: 'הגנה מפני עין הרע',
  },
  anah: {
    name: 'ענח',
    origin: 'מצרים העתיקה',
    meaning: 'חיים ונצח',
  },
  djed: {
    name: 'עמוד הג\'ד',
    origin: 'מצרים העתיקה',
    meaning: 'יציבות וחוזק',
  },
  horseshoe: {
    name: 'פרסה',
    origin: 'הפולקלור האירופי',
    meaning: 'מזל והגנה',
  },
  spiral: {
    name: 'ספירלה',
    origin: 'התרבויות הנאוליתיות באירופה',
    meaning: 'צמיחה, התפתחות ומחזוריות',
  },
  moon: {
    name: 'חצי סהר',
    origin: 'מסופוטמיה העתיקה',
    meaning: 'מחזוריות, נשיות והגנה',
  },
  tiltan: {
    name: 'תלתן ארבעה עלים',
    origin: 'הפולקלור האירי',
    meaning: 'מזל ושגשוג',
  },
  // ── the authored North-African / Berber set (generated OBJs — tools/gen-symbols.mjs) ──
  circle: {
    name: 'עיגול',
    origin: 'יהדות מרוקו',
    meaning: 'שלמות ומחזוריות',
  },
  bird: {
    name: 'ציפור',
    origin: 'יהדות צפון אפריקה והעולם האסלאמי',
    meaning: 'נאמנות, אהבת הבריות וברכה',
  },
  sun: {
    name: 'שמש',
    origin: 'יהדות מרוקו',
    meaning: 'חיים, אור ושפע',
  },
  diamond: {
    name: 'מעוין',
    origin: 'יהדות מרוקו',
    meaning: 'הגנה מפני עין הרע',
  },
  hexagram: {
    name: 'חותם שלמה',
    origin: 'המסורת היהודית והעולם האסלאמי',
    meaning: 'הגנה, חכמה ואיזון',
  },
  pentagram: {
    name: 'פנטגרם',
    origin: 'יהדות מרוקו',
    meaning: 'הגנה ואיזון',
  },
  cowrie: {
    name: 'צדף קאורי',
    origin: 'מערב אפריקה',
    meaning: 'שפע, פוריות והגנה',
  },
  snake: {
    name: 'נחש',
    origin: 'מצרים העתיקה',
    meaning: 'ריפוי, התחדשות והגנה',
  },
  algiz: {
    name: 'רונה אלגיז',
    origin: 'התרבות הנורדית',
    meaning: 'הגנה וחסות',
  },
  triskele: {
    name: 'טריסקל',
    origin: 'התרבות הקלטית',
    meaning: 'תנועה, איזון והתחדשות',
  },
  solarcross: {
    name: 'צלב השמש',
    origin: 'אירופה הפרה־נוצרית',
    meaning: 'מחזוריות, איזון והמשכיות',
  },
  endlessknot: {
    name: 'הקשר האינסופי',
    origin: 'בודהיזם טיבטי',
    meaning: 'הרמוניה, נצח וחיבור',
  },
  triquetra: {
    name: 'טריקווטרה',
    origin: 'התרבות הקלטית',
    meaning: 'אחדות, מחזוריות והגנה',
  },
  // Add more symbols here as they are registered.
};

let panelEl = null;

function ensurePanel(){
  if(panelEl) return panelEl;
  // Mount on <body> so it can sit above the keyboard (see symbol-window.js).
  const host = document.body;
  panelEl = document.createElement('div');
  panelEl.id = 'symbol-info-panel';
  panelEl.setAttribute('aria-live', 'polite');
  panelEl.innerHTML = `
    <div class="sip-symbol" aria-hidden="true"></div>
    <div class="sip-text">
      <div class="sip-name"></div>
      <div class="sip-origin"></div>
      <div class="sip-meaning"></div>
    </div>`;
  host.appendChild(panelEl);
  return panelEl;
}

/** Show the panel for a symbol (by motif key). `svgInner` is the motif's 2D
    SVG inner markup (paths etc., drawn in a 0..40 box); `variant` positions it. */
export function showSymbolInfo(motif, svgInner, variant){
  const info = SYMBOL_INFO[motif];
  if(!info) return;
  const el = ensurePanel();
  el.setAttribute('data-variant', variant || 'right');
  el.querySelector('.sip-symbol').innerHTML = svgInner
    ? `<svg viewBox="0 0 40 40" width="100%" height="100%">${svgInner}</svg>`
    : '';
  el.querySelector('.sip-name').textContent = info.name || '';
  el.querySelector('.sip-origin').textContent = info.origin || '';
  el.querySelector('.sip-meaning').textContent = info.meaning || '';
  el.classList.remove('is-in');
  void el.offsetWidth;   // retrigger the entry animation
  el.classList.add('is-in');
}

/** Hide the panel (e.g. on stage restart). */
export function hideSymbolInfo(){
  if(panelEl) panelEl.classList.remove('is-in');
}
