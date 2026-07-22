/* ────────────────────────────────────────────────────────────────────────
   Stage 7 — "מה מניע אותך?" (what drives you)  ·  word → symbol mapping data.

   Kept in its own file (per spec) so words, families and their symbols can be
   changed later without touching the widget or the questionnaire flow.

   Structure:
     FAMILIES   — the meaning-families. Each has an id, a human note (what the
                  symbol represents) and the jewel `symbol` key it maps to.
                  Symbol keys must exist in symbols-3d / symbol-info / jewel
                  PROFILES (e.g. hamsa, vegvisir, lotus, anah, rimon, eye, dharma).
     WORDS      — every word in the pool → its family id. Change a word's family
                  here and it automatically leads to that family's symbol.
     DISPLAY_WORDS — the FIXED, balanced subset shown on screen at once (~21).
                  Fixed on purpose so the composition is the same every load
                  (never feels random). Draw from a spread of families.
   ──────────────────────────────────────────────────────────────────────── */

export const FAMILIES = {
  connection: { note: 'קשר והגנה',      symbol: 'hamsa'    },
  journey:    { note: 'תנועה ומסע',      symbol: 'vegvisir' },
  creation:   { note: 'יצירה והתחדשות',  symbol: 'lotus'    },
  spirit:     { note: 'רוח והמשכיות',    symbol: 'anah'     },
  abundance:  { note: 'כוח ושפע',        symbol: 'rimon'    },
  balance:    { note: 'איזון ושמירה',    symbol: 'eye'      },
  wisdom:     { note: 'חכמה והתפתחות',   symbol: 'dharma'   },
};

/* Every word in the pool → its family. */
export const WORDS = {
  // קשר והגנה → hamsa
  'משפחה': 'connection', 'בית': 'connection', 'שייכות': 'connection',
  'קהילה': 'connection', 'חיבור': 'connection', 'חברות': 'connection',
  'נאמנות': 'connection', 'אהבה': 'connection', 'נתינה': 'connection',
  // תנועה ומסע → vegvisir
  'חופש': 'journey', 'עצמאות': 'journey', 'הרפתקה': 'journey',
  'שינוי': 'journey', 'אומץ': 'journey',
  // יצירה והתחדשות → lotus
  'יצירה': 'creation', 'יופי': 'creation', 'השראה': 'creation',
  'יצירתיות': 'creation', 'תשוקה': 'creation',
  // רוח והמשכיות → anah
  'אמונה': 'spirit', 'תקווה': 'spirit', 'משמעות': 'spirit',
  'אמת': 'spirit', 'מסורת': 'spirit', 'צדק': 'spirit',
  // כוח ושפע → rimon
  'הצלחה': 'abundance', 'הגשמה': 'abundance', 'השפעה': 'abundance',
  'הכרה': 'abundance', 'אחריות': 'abundance',
  // איזון ושמירה → eye
  'שלווה': 'balance', 'ריפוי': 'balance', 'ביטחון': 'balance',
  'יציבות': 'balance', 'שמחה': 'balance',
  // חכמה והתפתחות → dharma
  'סקרנות': 'wisdom', 'ידע': 'wisdom', 'למידה': 'wisdom',
  'התפתחות': 'wisdom', 'צמיחה': 'wisdom',
};

/* Fixed, balanced set shown on screen (3 per family → 21 words). Same every
   load so the composition never feels arbitrary. Reorder / swap freely. */
export const DISPLAY_WORDS = [
  'משפחה', 'אהבה', 'שייכות',
  'חופש', 'עצמאות', 'אומץ',
  'יצירה', 'יופי', 'השראה',
  'אמונה', 'תקווה', 'אמת',
  'הצלחה', 'הגשמה', 'אחריות',
  'שלווה', 'ביטחון', 'שמחה',
  'סקרנות', 'ידע', 'צמיחה',
];

/* The jewel symbol a chosen word leads to (via its family). Falls back to a
   neutral symbol if a word is ever missing from the table. */
export function symbolForWord(word) {
  const fam = WORDS[word];
  return (fam && FAMILIES[fam] && FAMILIES[fam].symbol) || 'hamsa';
}
