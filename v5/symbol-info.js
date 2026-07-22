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
    name: 'חמסה / היד של פאטמה',
    origin: 'מדינות המגרב — צפון אפריקה',
    meaning: 'כף יד מגינה — סמל להגנה מפני עין הרע, לברכה ולמזל טוב.',
  },
  scarab: {
    name: 'חרפושית',
    origin: 'מצרים העתיקה',
    meaning: 'חיפושית הזבל הקדושה — סמל להתחדשות, ללידה מחדש ולמחזוריות החיים.',
  },
  eye: {
    name: 'עין / נזר',
    origin: 'המזרח התיכון ואגן הים התיכון',
    meaning: 'עין מגינה מפני עין הרע — סמל לשמירה, לערנות ולהגנה מכוחות מזיקים.',
  },
  rimon: {
    name: 'רימון',
    origin: 'המזרח הקדום ותרבויות הים התיכון',
    meaning: 'סמל לשפע, לפוריות ולריבוי — גרעיניו הרבים מייצגים חיים וברכה.',
  },
  fish: {
    name: 'דג',
    origin: 'תרבויות עתיקות סביב הים והנהרות',
    meaning: 'סמל לפוריות, לשפע ולמזל טוב — ולשמירה מפני עין הרע.',
  },
  lotus: {
    name: 'לוטוס',
    origin: 'מצרים העתיקה והמזרח',
    meaning: 'פרח הנפתח מן המים — סמל להתחדשות, לטוהר וללידה מחדש.',
  },
  dharma: {
    name: 'גלגל הדהרמה',
    origin: 'הודו והבודהיזם',
    meaning: 'גלגל החוק — מסמל את מסלול הרוח, את מחזוריות הקיום ואת דרך האמצע.',
  },
  vegvisir: {
    name: 'וֶגְוִיסִיר',
    origin: 'הנורדים ואיסלנד',
    meaning: 'מצפן הדרך — קמע שנועד שלא ללכת לאיבוד, להכוונה ולמציאת הדרך.',
  },
  pyramid: {
    name: 'משולש',
    origin: 'תרבות הברברים (אמאזיע׳) — צפון אפריקה',
    meaning: 'משולש — סמל לנשיות, לפוריות ולהגנה בתרבות הברברית (בתלת־ממד הוא מקבל צורת פירמידה).',
  },
  anah: {
    name: 'ענח׳ — מפתח החיים',
    origin: 'מצרים העתיקה',
    meaning: 'מפתח החיים — סמל לחיי נצח, לאיזון ולכוח החיים.',
  },
  djed: {
    name: 'עמוד הג׳ד',
    origin: 'מצרים העתיקה',
    meaning: 'עמוד השדרה של אוזיריס — סמל ליציבות, לחוסן ולהתמדה.',
  },
  artichoke: {
    name: 'ארטישוק',
    origin: 'אגן הים התיכון',
    meaning: 'עלים רבים העוטפים לב אחד — סמל לתקווה, לשגשוג ולהגנה על מה שיקר.',
  },
  horseshoe: {
    name: 'פרסה',
    origin: 'אירופה ותרבויות רבות',
    meaning: 'פרסת סוס תלויה — קמע למזל טוב ולהגנה מפני עין הרע.',
  },
  spiral: {
    name: 'ספירלה',
    origin: 'מסורות קדומות פרהיסטוריות',
    meaning: 'קו הנפתח מן המרכז — סמל לצמיחה, להתפתחות ולמסע החיים.',
  },
  moon: {
    name: 'ירח',
    origin: 'תרבויות רבות לאורך ההיסטוריה',
    meaning: 'סהר הירח — סמל למחזוריות, להתחדשות, לנשיות ולזמן החולף.',
  },
  tiltan: {
    name: 'תלתן',
    origin: 'אירלנד והמסורת הקלטית',
    meaning: 'עלה תלת-אונתי — סמל למזל טוב, לברכה ולתקווה.',
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
