/* ────────────────────────────────────────────────────────────────────────
   Stage 7 — "מה מניע אותך?"  ·  value profiles for the floating words and for
   every symbol in the library.

   There is deliberately NO word → symbol map. A word does not "mean" a symbol.
   Instead both are described on the SAME four axes, and the symbol is whichever
   one the visitor's whole journey — this word plus every symbol the earlier
   stages already gave them — comes closest to.

     protection  הגנה
     growth      צמיחה / התחדשות
     connection  חיבור
     path        דרך / הכוונה

   Scores are 0–100 and follow each symbol's HISTORICAL / CULTURAL meaning as
   recorded in symbol-info.js — never its shape.
   ──────────────────────────────────────────────────────────────────────── */

/* The words that float on screen. 14 — enough to feel like a field, few enough
   that each keeps its own space. */
export const WORDS = [
  { w: 'יצירה',   protection: 20, growth: 95, connection: 30, path: 60 },
  { w: 'סקרנות',  protection: 10, growth: 90, connection: 30, path: 80 },
  { w: 'חופש',    protection: 20, growth: 80, connection: 20, path: 90 },
  { w: 'משפחה',   protection: 70, growth: 40, connection: 100, path: 20 },
  { w: 'חיבור',   protection: 40, growth: 40, connection: 100, path: 20 },
  { w: 'שקט',     protection: 90, growth: 30, connection: 40, path: 30 },
  { w: 'למידה',   protection: 20, growth: 85, connection: 40, path: 75 },
  { w: 'הרפתקה',  protection: 20, growth: 90, connection: 20, path: 100 },
  { w: 'השפעה',   protection: 30, growth: 60, connection: 90, path: 60 },
  { w: 'דיוק',    protection: 70, growth: 40, connection: 30, path: 80 },
  { w: 'נתינה',   protection: 60, growth: 50, connection: 95, path: 20 },
  { w: 'אומץ',    protection: 30, growth: 70, connection: 20, path: 85 },
  { w: 'איזון',   protection: 80, growth: 40, connection: 70, path: 50 },
  { w: 'גילוי',   protection: 20, growth: 90, connection: 30, path: 90 },
];
export const DISPLAY_WORDS = WORDS.map(w => w.w);
const WORD_BY_TEXT = Object.fromEntries(WORDS.map(w => [w.w, w]));

/* Every symbol on the same four axes, read from its meaning:
   "הגנה מפני עין הרע" → protection very high · "התחדשות ולידה מחדש" → growth
   very high · "שפע, פוריות וברכה" → connection + growth · "הכוונה ושמירה
   בדרך" → path + protection. */
export const SYMBOL_VALUES = {
  hamsa:       { protection: 100, growth: 20, connection: 50, path: 20 },   // הגנה מפני עין הרע
  eye:         { protection: 100, growth: 15, connection: 30, path: 25 },   // הגנה מפני עין הרע
  diamond:     { protection: 95,  growth: 20, connection: 25, path: 30 },   // הגנה מפני עין הרע
  pyramid:     { protection: 95,  growth: 25, connection: 20, path: 40 },   // הגנה מפני עין הרע
  algiz:       { protection: 100, growth: 25, connection: 30, path: 45 },   // הגנה וחסות
  horseshoe:   { protection: 85,  growth: 30, connection: 45, path: 35 },   // מזל והגנה
  tiltan:      { protection: 60,  growth: 70, connection: 60, path: 30 },   // מזל ושגשוג
  scarab:      { protection: 35,  growth: 100, connection: 25, path: 45 },  // התחדשות ולידה מחדש
  lotus:       { protection: 30,  growth: 100, connection: 40, path: 40 },  // טוהר, צמיחה והתחדשות
  snake:       { protection: 65,  growth: 95, connection: 25, path: 40 },   // ריפוי, התחדשות והגנה
  spiral:      { protection: 25,  growth: 90, connection: 35, path: 75 },   // צמיחה, התפתחות ומחזוריות
  sun:         { protection: 40,  growth: 90, connection: 65, path: 45 },   // חיים, אור ושפע
  anah:        { protection: 45,  growth: 95, connection: 45, path: 40 },   // חיים ונצח
  rimon:       { protection: 35,  growth: 85, connection: 95, path: 20 },   // שפע, פוריות וברכה
  fish:        { protection: 60,  growth: 85, connection: 80, path: 25 },   // שפע, פריון והגנה
  cowrie:      { protection: 65,  growth: 85, connection: 85, path: 20 },   // שפע, פוריות והגנה
  bird:        { protection: 30,  growth: 60, connection: 95, path: 70 },   // נאמנות, אהבת הבריות וברכה
  endlessknot: { protection: 35,  growth: 45, connection: 100, path: 45 },  // הרמוניה, נצח וחיבור
  triquetra:   { protection: 70,  growth: 50, connection: 90, path: 40 },   // אחדות, מחזוריות והגנה
  circle:      { protection: 45,  growth: 55, connection: 80, path: 45 },   // שלמות ומחזוריות
  moon:        { protection: 70,  growth: 70, connection: 55, path: 40 },   // מחזוריות, נשיות והגנה
  solarcross:  { protection: 50,  growth: 65, connection: 60, path: 70 },   // מחזוריות, איזון והמשכיות
  triskele:    { protection: 35,  growth: 80, connection: 45, path: 80 },   // תנועה, איזון והתחדשות
  vegvisir:    { protection: 60,  growth: 30, connection: 25, path: 100 },  // הכוונה ושמירה בדרך
  dharma:      { protection: 40,  growth: 55, connection: 55, path: 95 },   // חכמה, דרך ואיזון
  hexagram:    { protection: 85,  growth: 40, connection: 60, path: 65 },   // הגנה, חכמה ואיזון
  pentagram:   { protection: 85,  growth: 35, connection: 45, path: 55 },   // הגנה ואיזון
  djed:        { protection: 80,  growth: 35, connection: 40, path: 45 },   // יציבות וחוזק
};

const AXES = ['protection', 'growth', 'connection', 'path'];

/* The visitor's profile: the chosen word, weighted against everything the
   earlier stages already gave them. Every symbol already on the talisman speaks
   for the journey so far, so they all pull the result and no single stage
   decides it alone. The word leads — it is this stage's own answer. */
export function buildProfile(word, contextKeys = []) {
  const w = WORD_BY_TEXT[word];
  const prof = {};
  for (const a of AXES) prof[a] = w ? w[a] : 50;
  const ctx = (contextKeys || []).map(k => SYMBOL_VALUES[k]).filter(Boolean);
  if (!ctx.length) return prof;
  const WORD_WEIGHT = 0.6;
  for (const a of AXES) {
    const mean = ctx.reduce((s, v) => s + v[a], 0) / ctx.length;
    prof[a] = Math.round(prof[a] * WORD_WEIGHT + mean * (1 - WORD_WEIGHT));
  }
  return prof;
}

/* Score every symbol against that profile, closest first — a symbol matches
   because it answers the same forces, never because a word was wired to it. */
export function rankSymbols(profile, availableKeys = null) {
  const keys = availableKeys && availableKeys.length ? availableKeys : Object.keys(SYMBOL_VALUES);
  return keys
    .filter(k => SYMBOL_VALUES[k])
    .map(k => {
      const v = SYMBOL_VALUES[k];
      let sq = 0;
      for (const a of AXES) { const d = (profile[a] - v[a]) / 100; sq += d * d; }
      return { key: k, score: Math.round(1000 * (1 - Math.sqrt(sq / AXES.length))) / 10 };
    })
    .sort((a, b) => b.score - a.score);
}

/* The stage's answer: the best-matching symbol not already worn. */
/* How close a symbol may be to the best match and still be considered its
   equal. Several symbols usually answer the same forces almost identically —
   picking strictly the top one made the same word always return the same
   symbol; drawing among the near-equals keeps the match honest and lets the
   same word lead to different pieces. */
const NEAR_TIE = 6;   // score points (0–100 scale) — a real "just as close" band

export function pickSymbolForWord(word, contextKeys = [], usedKeys = [], availableKeys = null) {
  const profile = buildProfile(word, contextKeys);
  const ranked = rankSymbols(profile, availableKeys);
  const used = new Set(usedKeys);
  const free = ranked.filter(r => !used.has(r.key));
  if (!free.length) return { symbol: ranked[0] ? ranked[0].key : null, profile, ranked };
  const near = free.filter(r => r.score >= free[0].score - NEAR_TIE);
  // Weighted draw: the closest match is the most likely, the ones just behind
  // it are still possible. The answer stays true to the word, but the same word
  // no longer always yields the same symbol.
  const weights = near.map(r => Math.pow(1 + (r.score - (free[0].score - NEAR_TIE)) / NEAR_TIE, 2));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total, chosen = near[near.length - 1];
  for (let i = 0; i < near.length; i++) { roll -= weights[i]; if (roll <= 0) { chosen = near[i]; break; } }
  return { symbol: chosen.key, profile, ranked, tied: near.map(r => r.key) };
}
