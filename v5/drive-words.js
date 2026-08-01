/* ────────────────────────────────────────────────────────────────────────
   Stage 7 — "מה מניע אותך?"  ·  DATA ONLY.

   Three layers, deliberately separate — a word is never wired to a symbol:

        WORD  →  MEANING FAMILY  →  VALID SYMBOL POOL

   The symbol IDs below are the project's existing ones (symbol-info.js /
   symbols-3d.js); nothing about the symbols themselves is defined here.
   ──────────────────────────────────────────────────────────────────────── */

/* ── 1. The full word pool. Edit freely: `display` marks the words that go on
      screen (a balanced set across the families — the rest stay available). ── */
export const WORDS = [
  // CONNECTION
  { id: 'family',      label: 'משפחה',    family: 'CONNECTION', display: true },
  { id: 'love',        label: 'אהבה',     family: 'CONNECTION', display: true },
  { id: 'belonging',   label: 'שייכות',   family: 'CONNECTION', display: true },
  { id: 'community',   label: 'קהילה',    family: 'CONNECTION' },
  { id: 'connection',  label: 'חיבור',    family: 'CONNECTION', display: true },
  { id: 'loyalty',     label: 'נאמנות',   family: 'CONNECTION' },
  { id: 'home',        label: 'בית',      family: 'CONNECTION', display: true },
  // PATH
  { id: 'freedom',     label: 'חופש',     family: 'PATH', display: true },
  { id: 'independence',label: 'עצמאות',   family: 'PATH', display: true },
  { id: 'adventure',   label: 'הרפתקה',   family: 'PATH', display: true },
  { id: 'curiosity',   label: 'סקרנות',   family: 'PATH', display: true },
  { id: 'knowledge',   label: 'ידע',      family: 'PATH', display: true },
  { id: 'learning',    label: 'למידה',    family: 'PATH' },
  { id: 'meaning',     label: 'משמעות',   family: 'PATH', display: true },
  // RENEWAL
  { id: 'creation',    label: 'יצירה',    family: 'RENEWAL', display: true },
  { id: 'development', label: 'התפתחות',  family: 'RENEWAL', display: true },
  { id: 'change',      label: 'שינוי',    family: 'RENEWAL', display: true },
  { id: 'growth',      label: 'צמיחה',    family: 'RENEWAL', display: true },
  { id: 'healing',     label: 'ריפוי',    family: 'RENEWAL', display: true },
  { id: 'inspiration', label: 'השראה',    family: 'RENEWAL' },
  { id: 'beauty',      label: 'יופי',     family: 'RENEWAL' },
  // PROTECTION
  { id: 'security',    label: 'ביטחון',   family: 'PROTECTION', display: true },
  { id: 'protection',  label: 'הגנה',     family: 'PROTECTION', display: true },
  { id: 'courage',     label: 'אומץ',     family: 'PROTECTION', display: true },
  // ABUNDANCE
  { id: 'success',     label: 'הצלחה',    family: 'ABUNDANCE', display: true },
  { id: 'fulfilment',  label: 'הגשמה',    family: 'ABUNDANCE', display: true },
  { id: 'giving',      label: 'נתינה',    family: 'ABUNDANCE', display: true },
  { id: 'luck',        label: 'מזל',      family: 'ABUNDANCE', display: true },
  // STABILITY
  { id: 'faith',       label: 'אמונה',    family: 'STABILITY', display: true },
  { id: 'stability',   label: 'יציבות',   family: 'STABILITY', display: true },
  { id: 'responsibility', label: 'אחריות', family: 'STABILITY' },
  { id: 'truth',       label: 'אמת',      family: 'STABILITY', display: true },
  { id: 'balance',     label: 'איזון',    family: 'STABILITY', display: true },
  { id: 'tradition',   label: 'מסורת',    family: 'STABILITY' },
  // LIFE
  { id: 'hope',        label: 'תקווה',    family: 'LIFE', display: true },
  { id: 'joy',         label: 'שמחה',     family: 'LIFE', display: true },
  { id: 'passion',     label: 'תשוקה',    family: 'LIFE', display: true },
  { id: 'influence',   label: 'השפעה',    family: 'LIFE', display: true },
];

/* The set that goes on screen (28 of the 39) — every family represented. */
export const DISPLAY_WORDS = WORDS.filter(w => w.display);
const BY_LABEL = Object.fromEntries(WORDS.map(w => [w.label, w]));

/* ── 2. Meaning families → pools of EXISTING symbols whose recorded meaning
      genuinely belongs to that family (ids as in symbol-info.js: the clover is
      `tiltan`, the ankh is `anah`). ── */
export const MEANING_FAMILIES = {
  PROTECTION: { id: 'PROTECTION', note: 'הגנה',            symbols: ['hamsa', 'eye', 'diamond', 'algiz', 'horseshoe'] },
  ABUNDANCE:  { id: 'ABUNDANCE',  note: 'שפע וברכה',        symbols: ['rimon', 'cowrie', 'fish', 'tiltan'] },
  RENEWAL:    { id: 'RENEWAL',    note: 'התחדשות וצמיחה',   symbols: ['snake', 'lotus', 'spiral', 'scarab'] },
  PATH:       { id: 'PATH',       note: 'דרך ותנועה',       symbols: ['vegvisir', 'triskele', 'solarcross', 'dharma'] },
  CONNECTION: { id: 'CONNECTION', note: 'חיבור ואחדות',     symbols: ['endlessknot', 'triquetra', 'circle'] },
  LIFE:       { id: 'LIFE',       note: 'חיים ואור',        symbols: ['sun', 'anah', 'moon'] },
  STABILITY:  { id: 'STABILITY',  note: 'יציבות ואיזון',    symbols: ['djed', 'hexagram', 'circle'] },
};

/* Only when a whole family is already worn: the nearest families in meaning —
   never a random symbol out of all 28. */
export const FAMILY_FALLBACK = {
  PROTECTION: ['STABILITY', 'CONNECTION'],
  ABUNDANCE:  ['LIFE', 'RENEWAL'],
  RENEWAL:    ['LIFE', 'PATH'],
  PATH:       ['RENEWAL', 'CONNECTION'],
  CONNECTION: ['STABILITY', 'ABUNDANCE'],
  LIFE:       ['ABUNDANCE', 'RENEWAL'],
  STABILITY:  ['PROTECTION', 'CONNECTION'],
};

/* ── 3. word → family → pool → one unused symbol ──
   `used` is the talisman as it already stands; a symbol never appears twice. */
export function pickSymbolForWord(label, used = []) {
  const word = BY_LABEL[label];
  if (!word) return { symbol: null, family: null, pool: [] };
  const worn = new Set(used);
  const chain = [word.family, ...(FAMILY_FALLBACK[word.family] || [])];
  for (const fam of chain) {
    const pool = (MEANING_FAMILIES[fam] || {}).symbols || [];
    const free = pool.filter(k => !worn.has(k));
    if (free.length) {
      return {
        symbol: free[Math.floor(Math.random() * free.length)],
        family: word.family,
        usedFamily: fam,               // which family actually supplied it
        pool: pool.slice(),
        free: free.slice(),
      };
    }
  }
  return { symbol: null, family: word.family, pool: [] };
}
