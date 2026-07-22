/* symbols-registry.js — the single home for every symbol's dot-art code.
   ─────────────────────────────────────────────────────────────────────
   Format: see SYMBOLS.md (same folder). Each entry is one symbol:

     'key': {
       name:  'שם בעברית',
       stage: 'origin' | 'word' | 'stars' | 'personal' | 'roots' | 'name',
       draw(p, t) { ...dots inside a 100×100 box... },
     }

   Rules recap:
   • Draw ONLY inside (0,0)–(100,100); the display positions/scales it.
   • Never touch the background and never hard-code colors — the display
     sets the dot color before calling draw() (it changes from time to
     time). For multi-tone symbols use p.__palette (array of colors the
     display provides) instead of fixed hex values.
   • Dots, not strokes. Optional subtle animation via `t` (seconds since
     the symbol appeared) only — no timers, no global state.
   ───────────────────────────────────────────────────────────────────── */

export const SYMBOLS = {

  /* ── EXAMPLE (delete/replace freely) ─────────────────────────────
     A simple dotted circle — 24 dots on a ring, with a soft breathing
     motion driven by t. Shows the normalized-box + animation pattern. */
  'example-ring': {
    name: 'טבעת (דוגמה)',
    stage: 'origin',
    draw(p, t) {
      const N = 24;                       // dots on the ring
      const r = 38 + Math.sin(t * 1.4) * 1.5;   // gentle breathing
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        p.circle(50 + Math.cos(a) * r, 50 + Math.sin(a) * r, 3);
      }
    },
  },

  /* ── Paste real symbols below this line ────────────────────────── */

};

/* Convenience: list of keys per stage, in insertion order. */
export function symbolsForStage(stage) {
  return Object.entries(SYMBOLS)
    .filter(([, def]) => def.stage === stage)
    .map(([key]) => key);
}
