/* ═══════════════════════════════════════════════════════════════
   Symbol Library — JavaScript
   Populates the 5×5 grid with symbols from the project's
   existing motif SVG library + SYMBOL_INFO metadata.
═══════════════════════════════════════════════════════════════ */

import './symbol-library.css';

/* ── SVG artwork for each symbol — redesigned for true-to-life recognizability.
   All symbols use viewBox 0 0 40 40 and currentColor for theming. ── */
const MOTIF_SVG = {
  // ── Pure geometric forms ──────────────────────────────────
  circle:   '<circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  triangle: '<polygon points="20,6 35,33 5,33" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  diamond:  '<polygon points="20,4 36,20 20,36 4,20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  star:     '<polygon points="20,3 24,15 37,15 26,23 30,36 20,28 10,36 14,23 3,15 16,15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  crescent: '<path d="M27,5 A16,16 0 1 0 27,35 A13,13 0 1 1 27,5 Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',

  // ── Artichoke — pointed oval bulb with three rows of overlapping leaf scales
  artichoke: '<path d="M20,4 Q14,7 12,13 Q9,20 11,28 Q14,35 20,36 Q26,35 29,28 Q31,20 28,13 Q26,7 20,4 Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'
          + '<path d="M20,4 L20,11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'
          + '<path d="M12,15 Q20,20 28,15" fill="none" stroke="currentColor" stroke-width="1.2"/>'
          + '<path d="M11,22 Q20,28 29,22" fill="none" stroke="currentColor" stroke-width="1.2"/>'
          + '<path d="M13,29 Q20,34 27,29" fill="none" stroke="currentColor" stroke-width="1.2"/>',

  // ── Horseshoe — a thick U open at the top, with nail-hole dots along the arms
  horseshoe: '<path d="M12,7 A13,15 0 1 0 28,7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'
          + '<circle cx="12" cy="11" r="1" fill="currentColor"/>'
          + '<circle cx="10" cy="20" r="1" fill="currentColor"/>'
          + '<circle cx="14" cy="29" r="1" fill="currentColor"/>'
          + '<circle cx="28" cy="11" r="1" fill="currentColor"/>'
          + '<circle cx="30" cy="20" r="1" fill="currentColor"/>'
          + '<circle cx="26" cy="29" r="1" fill="currentColor"/>',

  // ── Moon — a clean waning crescent
  moon:     '<path d="M27,5 A16,16 0 1 0 27,35 A13,13 0 1 1 27,5 Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',

  // ── Tiltan (clover / shamrock) — three round leaves around a center + a stem
  tiltan:   '<circle cx="20" cy="11" r="6.6" fill="none" stroke="currentColor" stroke-width="1.4"/>'
          + '<circle cx="12.5" cy="23" r="6.6" fill="none" stroke="currentColor" stroke-width="1.4"/>'
          + '<circle cx="27.5" cy="23" r="6.6" fill="none" stroke="currentColor" stroke-width="1.4"/>'
          + '<path d="M20,24 Q21,31 25,36" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',

  // ── Eye of Horus (Wedjat) — brow, almond eye, descending tail + diagonal hook
  eye:      '<path d="M5,13 Q15,7 27,10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'
          + '<path d="M4,20 C9,14 31,14 36,20 C31,26 9,26 4,20 Z" fill="none" stroke="currentColor" stroke-width="1.4"/>'
          + '<circle cx="20" cy="20" r="3" fill="currentColor"/>'
          + '<path d="M30,21 Q33,27 38,28 Q35,30 31,29" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>'
          + '<path d="M16,24 L11,33 Q9,34 8,32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',

  // ── Hamsa — symmetric stylized hand silhouette + eye in palm
  hamsa:    '<path d="M10,32 L10,18 Q8,16 8,13 Q8,10 11,10 Q14,10 14,13 L14,16 L14,9 Q14,5 17,5 Q20,5 20,9 L20,16 L20,5 Q20,2 22,2 Q24,2 24,5 L24,16 L24,9 Q24,5 27,5 Q30,5 30,9 L30,16 L30,13 Q30,10 33,10 Q36,10 36,13 Q36,16 34,18 L34,32 Q34,36 30,36 L14,36 Q10,36 10,32 Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/>'
          + '<path d="M14,26 C18,23 26,23 30,26 C26,29 18,29 14,26 Z" fill="none" stroke="currentColor" stroke-width="1.2"/>'
          + '<circle cx="22" cy="26" r="1.3" fill="currentColor"/>',

  // ── Flower of Life — 7-circle "seed" pattern
  flower:   '<circle cx="20" cy="20" r="6" fill="none" stroke="currentColor" stroke-width="1.2"/>'
          + [0,60,120,180,240,300].map(a=>{
              const r=a*Math.PI/180, x=20+Math.cos(r)*6, y=20+Math.sin(r)*6;
              return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="6" fill="none" stroke="currentColor" stroke-width="1.2"/>`;
            }).join(''),

  // ── Ankh — teardrop loop atop a T-cross
  anah:     '<path d="M20,4 C13,4 13,16 20,16 C27,16 27,4 20,4 Z" fill="none" stroke="currentColor" stroke-width="1.4"/>'
          + '<line x1="8" y1="20" x2="32" y2="20" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'
          + '<line x1="20" y1="16" x2="20" y2="37" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',

  // ── Yaz / Tifinagh ⵣ — Amazigh "free man" emblem
  yaz:      '<line x1="20" y1="5" x2="20" y2="35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
          + '<line x1="9" y1="13" x2="31" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
          + '<line x1="9" y1="27" x2="31" y2="27" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
          + '<line x1="9" y1="13" x2="31" y2="27" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
          + '<line x1="31" y1="13" x2="9" y2="27" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',

  // ── Meti / Borjgali — Georgian seven-armed sun whirl
  meti:     (() => {
              let s = '<circle cx="20" cy="20" r="3.5" fill="none" stroke="currentColor" stroke-width="1.4"/>';
              for (let i = 0; i < 7; i++) {
                const a = (i / 7) * Math.PI * 2 - Math.PI/2;
                const x1 = 20 + Math.cos(a) * 4;
                const y1 = 20 + Math.sin(a) * 4;
                const x2 = 20 + Math.cos(a) * 16;
                const y2 = 20 + Math.sin(a) * 16;
                const cAng = a + 0.7;
                const cx = 20 + Math.cos(cAng) * 12;
                const cy = 20 + Math.sin(cAng) * 12;
                s += `<path d="M${x1.toFixed(2)},${y1.toFixed(2)} Q${cx.toFixed(2)},${cy.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`;
              }
              return s;
            })(),

  // ── Nazar — three concentric rings + iris dot
  nazar:    '<circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/>'
          + '<circle cx="20" cy="20" r="11" fill="none" stroke="currentColor" stroke-width="1.4"/>'
          + '<circle cx="20" cy="20" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/>'
          + '<circle cx="20" cy="20" r="2.5" fill="currentColor"/>',

  // ── Rosette — Mesopotamian eight-petal flower
  rosette:  (() => {
              let s = '<circle cx="20" cy="20" r="2.8" fill="none" stroke="currentColor" stroke-width="1.2"/>';
              for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2;
                const x = 20 + Math.cos(a) * 9;
                const y = 20 + Math.sin(a) * 9;
                const deg = (a * 180 / Math.PI).toFixed(2);
                s += `<ellipse cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" rx="6" ry="2.3" transform="rotate(${deg} ${x.toFixed(2)} ${y.toFixed(2)})" fill="none" stroke="currentColor" stroke-width="1.2"/>`;
              }
              return s;
            })(),

  // ── Tyet (Knot of Isis) — looped knot with arms folded down
  tyet:     '<ellipse cx="20" cy="11" rx="5.5" ry="6" fill="none" stroke="currentColor" stroke-width="1.4"/>'
          + '<path d="M11,17 L29,17" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'
          + '<path d="M14,17 Q11,21 12,26 Q14,32 20,33 Q26,32 28,26 Q29,21 26,17" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/>'
          + '<line x1="20" y1="17" x2="20" y2="36" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',

  // ── Cross of Agadez (Tuareg) — diamond head, central ring, lobed arms
  agadez:   '<polygon points="20,3 24,11 20,19 16,11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'
          + '<circle cx="20" cy="23" r="4.5" fill="none" stroke="currentColor" stroke-width="1.4"/>'
          + '<line x1="20" y1="27.5" x2="20" y2="34" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'
          + '<line x1="15.5" y1="23" x2="7" y2="23" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'
          + '<line x1="24.5" y1="23" x2="33" y2="23" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'
          + '<circle cx="7" cy="23" r="1.6" fill="currentColor"/>'
          + '<circle cx="33" cy="23" r="1.6" fill="currentColor"/>'
          + '<circle cx="20" cy="34" r="1.6" fill="currentColor"/>',

  // ── Shatkona / Star of David — two interlocking triangles
  shatkona:  '<polygon points="20,4 34,28 6,28" fill="none" stroke="currentColor" stroke-width="1.4"/>'
           + '<polygon points="20,36 34,12 6,12" fill="none" stroke="currentColor" stroke-width="1.4"/>',

  // ── Triskele — three running spirals (Celtic)
  triskele: (() => {
              let s = '';
              for (let i = 0; i < 3; i++) {
                const a = (i / 3) * Math.PI * 2 - Math.PI/2;
                const cx = 20 + Math.cos(a) * 6.5;
                const cy = 20 + Math.sin(a) * 6.5;
                const outAng = a;
                const oX = cx + Math.cos(outAng) * 6;
                const oY = cy + Math.sin(outAng) * 6;
                const tipAng = a + Math.PI * 0.9;
                const tipX = cx + Math.cos(tipAng) * 2;
                const tipY = cy + Math.sin(tipAng) * 2;
                s += `<path d="M${oX.toFixed(2)},${oY.toFixed(2)} A6,6 0 1 1 ${tipX.toFixed(2)},${tipY.toFixed(2)}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`;
              }
              s += '<circle cx="20" cy="20" r="1.4" fill="currentColor"/>';
              return s;
            })(),

  // ── Spiral — true logarithmic curve
  spiral:   (() => {
              let d = 'M20,20';
              const turns = 2.5;
              const steps = 80;
              for (let i = 1; i <= steps; i++) {
                const t = (i / steps) * turns * Math.PI * 2;
                const r = 0.4 + (i / steps) * 14;
                const x = 20 + Math.cos(t) * r;
                const y = 20 + Math.sin(t) * r;
                d += ` L${x.toFixed(2)},${y.toFixed(2)}`;
              }
              return `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`;
            })(),

  // ── Om / Aum (ॐ) — body, tail, crescent, bindu
  om:       '<path d="M11,17 Q11,12 16,12 Q21,12 21,17 Q21,21 17,21 Q13,21 13,25 Q13,30 18,30 Q24,30 25,25" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>'
          + '<path d="M21,17 Q26,15 28,18 Q29,21 26,22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'
          + '<path d="M25,25 Q31,26 32,22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'
          + '<path d="M22,7 Q26,9 30,7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'
          + '<circle cx="26" cy="4" r="1.3" fill="currentColor"/>',

  // ── Evil eye — eye outline, iris, pupil
  evil_eye: '<path d="M3,20 C9,11 31,11 37,20 C31,29 9,29 3,20 Z" fill="none" stroke="currentColor" stroke-width="1.4"/>'
          + '<circle cx="20" cy="20" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/>'
          + '<circle cx="20" cy="20" r="2.5" fill="currentColor"/>',

  // ── Vegvisir — Norse compass with 8 staves, each crowned and barbed
  vegvisir: (() => {
              let s = '<circle cx="20" cy="20" r="1.8" fill="none" stroke="currentColor" stroke-width="1.2"/>';
              for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2 - Math.PI/2;
                const ex = 20 + Math.cos(a) * 17;
                const ey = 20 + Math.sin(a) * 17;
                const sx = 20 + Math.cos(a) * 2;
                const sy = 20 + Math.sin(a) * 2;
                s += `<line x1="${sx.toFixed(2)}" y1="${sy.toFixed(2)}" x2="${ex.toFixed(2)}" y2="${ey.toFixed(2)}" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`;
                const perp = a + Math.PI/2;
                // crown bar at tip
                const c1x = ex + Math.cos(perp) * 2.5;
                const c1y = ey + Math.sin(perp) * 2.5;
                const c2x = ex - Math.cos(perp) * 2.5;
                const c2y = ey - Math.sin(perp) * 2.5;
                s += `<line x1="${c1x.toFixed(2)}" y1="${c1y.toFixed(2)}" x2="${c2x.toFixed(2)}" y2="${c2y.toFixed(2)}" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>`;
                // midpoint barb
                const mx = 20 + Math.cos(a) * 10;
                const my = 20 + Math.sin(a) * 10;
                const h1x = mx + Math.cos(perp) * 1.6;
                const h1y = my + Math.sin(perp) * 1.6;
                const h2x = mx - Math.cos(perp) * 1.6;
                const h2y = my - Math.sin(perp) * 1.6;
                s += `<line x1="${h1x.toFixed(2)}" y1="${h1y.toFixed(2)}" x2="${h2x.toFixed(2)}" y2="${h2y.toFixed(2)}" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>`;
              }
              return s;
            })(),

  // ── Dharmachakra — Buddhist 8-spoked wheel
  dharmachakra: (() => {
              let s = '<circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-width="1.4"/>'
                    + '<circle cx="20" cy="20" r="3.2" fill="none" stroke="currentColor" stroke-width="1.4"/>'
                    + '<circle cx="20" cy="20" r="0.9" fill="currentColor"/>';
              for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2;
                const x1 = 20 + Math.cos(a) * 3.2;
                const y1 = 20 + Math.sin(a) * 3.2;
                const x2 = 20 + Math.cos(a) * 15;
                const y2 = 20 + Math.sin(a) * 15;
                s += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="currentColor" stroke-width="1.2"/>`;
              }
              return s;
            })(),

  // ── Pentagram — five-point star inside circle (geometrically precise)
  pentagram: (() => {
              const cx = 20, cy = 20, R = 15;
              const pts = [];
              for (let i = 0; i < 5; i++) {
                const a = -Math.PI/2 + i * (Math.PI * 2 / 5);
                pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
              }
              // unicursal star path order: 0 → 2 → 4 → 1 → 3 → 0
              const order = [0, 2, 4, 1, 3];
              const polyPts = order.map(i => `${pts[i][0].toFixed(2)},${pts[i][1].toFixed(2)}`).join(' ');
              return `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="currentColor" stroke-width="1.4"/>`
                   + `<polygon points="${polyPts}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>`;
            })(),

  // ── Scarab — Egyptian beetle: head, pronotum, elytra, six legs
  scarab:   '<path d="M16,4 Q15,2 17,2 L23,2 Q25,2 24,4 L24,7 Q24,9 22,9 L18,9 Q16,9 16,7 Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'
          + '<ellipse cx="20" cy="14" rx="7" ry="4" fill="none" stroke="currentColor" stroke-width="1.4"/>'
          + '<ellipse cx="20" cy="26" rx="9" ry="10" fill="none" stroke="currentColor" stroke-width="1.4"/>'
          + '<line x1="20" y1="18" x2="20" y2="36" stroke="currentColor" stroke-width="1.2"/>'
          + '<path d="M13,15 L7,12 M13,21 L5,21 M14,29 L6,33" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'
          + '<path d="M27,15 L33,12 M27,21 L35,21 M26,29 L34,33" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',

  // ── Lotus — central upright + four side petals
  lotus:    '<path d="M20,5 C16,11 16,22 20,28 C24,22 24,11 20,5 Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'
          + '<path d="M20,28 C12,26 7,18 9,11 C14,15 18,22 20,28 Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'
          + '<path d="M20,28 C28,26 33,18 31,11 C26,15 22,22 20,28 Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'
          + '<path d="M20,28 C9,32 4,28 5,20 C10,22 16,26 20,28 Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'
          + '<path d="M20,28 C31,32 36,28 35,20 C30,22 24,26 20,28 Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',

  // ── Below: kept as-is for non-grid references ──────────────
  pomegranate: '<path d="M20,13 C14,13 10,17 10,24 C10,31 15,35 20,35 C25,35 30,31 30,24 C30,17 26,13 20,13 Z M20,13 L17,8 L20,10 L23,8 Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  sun:      '<circle cx="20" cy="20" r="7" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M20,5 L20,9 M20,31 L20,35 M5,20 L9,20 M31,20 L35,20 M9.4,9.4 L12.2,12.2 M27.8,27.8 L30.6,30.6 M9.4,30.6 L12.2,27.8 M27.8,12.2 L30.6,9.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  sri_yantra: '<circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-width="1.4"/><polygon points="20,8 30,26 10,26" fill="none" stroke="currentColor" stroke-width="1.2"/><polygon points="20,32 30,14 10,14" fill="none" stroke="currentColor" stroke-width="1.2"/><polygon points="20,12 27,24 13,24" fill="none" stroke="currentColor" stroke-width="1.2"/><polygon points="20,28 27,16 13,16" fill="none" stroke="currentColor" stroke-width="1.2"/>',
  yin_yang: '<circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M20,5 A7.5,7.5 0 0,0 20,20 A7.5,7.5 0 0,1 20,35 A15,15 0 0,0 20,5" fill="currentColor"/><circle cx="20" cy="12.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="20" cy="27.5" r="2.5" fill="currentColor"/>',

  // ── Ensō — open zen brush ring
  enso: '<path d="M29,9 A14.5,14.5 0 1 1 24,6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',

  // ── Gankyil — three swirling arms inside a ring
  gankyil: (() => {
            let s = '<circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-width="1.4"/>';
            for (let i = 0; i < 3; i++) {
              const a = (i / 3) * Math.PI * 2 - Math.PI/2;
              const ex = 20 + Math.cos(a) * 11, ey = 20 + Math.sin(a) * 11;
              const cA = a + 1.1;
              const cx = 20 + Math.cos(cA) * 10, cy = 20 + Math.sin(cA) * 10;
              s += `<path d="M20,20 Q${cx.toFixed(2)},${cy.toFixed(2)} ${ex.toFixed(2)},${ey.toFixed(2)}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
              s += `<circle cx="${ex.toFixed(2)}" cy="${ey.toFixed(2)}" r="1.5" fill="currentColor"/>`;
            }
            return s;
          })(),

  // ── Triple Moon — full circle flanked by two crescents
  triple_moon: '<circle cx="20" cy="20" r="7" fill="none" stroke="currentColor" stroke-width="1.4"/>'
             + '<path d="M10,12 A8,8 0 1 0 10,28 A6,6 0 1 1 10,12 Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'
             + '<path d="M30,12 A8,8 0 1 1 30,28 A6,6 0 1 0 30,12 Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',

  // ── Valknut — three interlocking triangles
  valknut: (() => {
            const tri = (ox, oy) => `<polygon points="${20+ox},${7+oy} ${28+ox},${24+oy} ${12+ox},${24+oy}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>`;
            return tri(0, -2) + tri(-6, 4) + tri(6, 4);
          })(),

  // ── Wheel of the Year — plain eight-spoke wheel
  wheel: (() => {
            let s = '<circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-width="1.4"/>'
                  + '<circle cx="20" cy="20" r="2" fill="none" stroke="currentColor" stroke-width="1.2"/>';
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * Math.PI * 2;
              s += `<line x1="${(20+Math.cos(a)*2).toFixed(2)}" y1="${(20+Math.sin(a)*2).toFixed(2)}" x2="${(20+Math.cos(a)*15).toFixed(2)}" y2="${(20+Math.sin(a)*15).toFixed(2)}" stroke="currentColor" stroke-width="1.2"/>`;
            }
            return s;
          })(),

  // ── Infinity — lemniscate
  infinity: '<path d="M20,20 C16.5,14 7,14 7,20 C7,26 16.5,26 20,20 C23.5,14 33,14 33,20 C33,26 23.5,26 20,20 Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',

  // ── Tree of Life — trunk, branches and roots within a ring
  tree_of_life: '<circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" stroke-width="1.3"/>'
              + '<line x1="20" y1="20" x2="20" y2="8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'
              + '<path d="M20,13 Q15,10 13,6 M20,13 Q25,10 27,6 M20,10 Q17,7 16,4 M20,10 Q23,7 24,4" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
              + '<line x1="20" y1="20" x2="20" y2="30" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'
              + '<path d="M20,27 Q15,30 13,34 M20,27 Q25,30 27,34 M20,30 Q17,33 15,36 M20,30 Q23,33 25,36" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>',

  // ── Ichthys — vesica fish with a tail notch
  ichthys: '<path d="M6,20 Q20,10 33,15 Q26,20 33,25 Q20,30 6,20 Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',

  // ── Triquetra — trinity of interlocking vesicae
  triquetra: (() => {
            let s = '';
            for (let i = 0; i < 3; i++) {
              const a = (i / 3) * Math.PI * 2 - Math.PI/2;
              const cx = 20 + Math.cos(a) * 5.2, cy = 20 + Math.sin(a) * 5.2;
              s += `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="8" fill="none" stroke="currentColor" stroke-width="1.4"/>`;
            }
            return s;
          })(),

  // ── Endless Knot — interwoven Buddhist lattice
  endless_knot: '<g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round">'
              + '<rect x="15" y="15" width="10" height="10"/>'
              + '<path d="M15,18 H8 V12 H21"/>'
              + '<path d="M25,22 H32 V28 H19"/>'
              + '<path d="M18,15 V8 H12 V21"/>'
              + '<path d="M22,25 V32 H28 V19"/>'
              + '</g>',

  // ── Celtic Cross — ringed cross
  celtic_cross: '<circle cx="20" cy="16" r="7" fill="none" stroke="currentColor" stroke-width="1.4"/>'
              + '<line x1="20" y1="4" x2="20" y2="36" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
              + '<line x1="9" y1="16" x2="31" y2="16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',

  // ── Thunderbird — stylized spread-wing bird
  thunderbird: '<g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round">'
             + '<path d="M20,9 V22"/>'
             + '<path d="M20,9 L17,6 M20,9 L23,6"/>'
             + '<path d="M20,13 L8,13 L11,18 M20,13 L32,13 L29,18"/>'
             + '<path d="M16,22 L20,34 L24,22 Z"/>'
             + '</g>',

  // ── Medicine Wheel — quartered circle with four points
  medicine_wheel: '<circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-width="1.4"/>'
               + '<line x1="5" y1="20" x2="35" y2="20" stroke="currentColor" stroke-width="1.2"/>'
               + '<line x1="20" y1="5" x2="20" y2="35" stroke="currentColor" stroke-width="1.2"/>'
               + '<circle cx="13" cy="13" r="1.8" fill="currentColor"/><circle cx="27" cy="13" r="1.8" fill="currentColor"/>'
               + '<circle cx="13" cy="27" r="1.8" fill="currentColor"/><circle cx="27" cy="27" r="1.8" fill="currentColor"/>',

  // ── Zia Sun — central disc with four groups of rays
  zia_sun: (() => {
            let s = '<circle cx="20" cy="20" r="5" fill="none" stroke="currentColor" stroke-width="1.4"/>';
            [0, 90, 180, 270].forEach(d => {
              const a = d * Math.PI/180;
              const dx = Math.cos(a), dy = Math.sin(a);
              const px = Math.cos(a + Math.PI/2), py = Math.sin(a + Math.PI/2);
              [-1.5, -0.5, 0.5, 1.5].forEach(k => {
                const ox = px * k * 2.2, oy = py * k * 2.2;
                s += `<line x1="${(20+dx*6+ox).toFixed(2)}" y1="${(20+dy*6+oy).toFixed(2)}" x2="${(20+dx*16+ox).toFixed(2)}" y2="${(20+dy*16+oy).toFixed(2)}" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>`;
              });
            });
            return s;
          })(),

  // ── Tribal Diamond — nested stepped lozenges
  aztec_diamond: (() => {
            let s = '';
            [16, 11, 6].forEach(r => {
              s += `<polygon points="20,${20-r} ${20+r},20 20,${20+r} ${20-r},20" fill="none" stroke="currentColor" stroke-width="1.3"/>`;
            });
            return s + '<circle cx="20" cy="20" r="1.8" fill="currentColor"/>';
          })(),

  // ── Spiral Triskele — three curved arms
  triskele_spiral: (() => {
            let s = '<circle cx="20" cy="20" r="1.4" fill="currentColor"/>';
            for (let i = 0; i < 3; i++) {
              const a = (i / 3) * Math.PI * 2 - Math.PI/2;
              const x1 = 20 + Math.cos(a) * 2, y1 = 20 + Math.sin(a) * 2;
              const x2 = 20 + Math.cos(a) * 15, y2 = 20 + Math.sin(a) * 15;
              const cA = a + 1.2;
              const cx = 20 + Math.cos(cA) * 12, cy = 20 + Math.sin(cA) * 12;
              s += `<path d="M${x1.toFixed(2)},${y1.toFixed(2)} Q${cx.toFixed(2)},${cy.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`;
              s += `<circle cx="${x2.toFixed(2)}" cy="${y2.toFixed(2)}" r="1.3" fill="currentColor"/>`;
            }
            return s;
          })(),
};

/* ── Symbol metadata ── */
const SYMBOL_INFO = {
  circle:       { name: 'עיגול',               tradition: 'זן ומסורות רוחניות',                    meaning: 'שלמות, אינסוף ומחזוריות נצחית' },
  triangle:     { name: 'משולש',               tradition: 'אלכימיה פילוסופית',                     meaning: 'איזון, שאיפה קדימה ושילוש' },
  diamond:      { name: 'מעוין',                tradition: 'סימבוליזם שבטי',                        meaning: 'יציבות, מיקוד וכוח אדמה' },
  star:         { name: 'כוכב',                 tradition: 'קוסמולוגיה ומיסטיקה',                   meaning: 'הדרכה, שאיפה ואור פנימי' },
  crescent:     { name: 'חצי סהר',              tradition: 'מסורות קדומות ואסלאם',                  meaning: 'התחדשות, מחזוריות וזמן' },
  eye:          { name: 'עין הורוס',            tradition: 'מצרים העתיקה',                          meaning: 'הגנה, ריפוי ושמירה' },
  hamsa:        { name: 'חמסה',                 tradition: 'המזרח התיכון',                          meaning: 'הגנה, מזל ושמירה מעין הרע' },
  flower:       { name: 'פרח החיים',            tradition: 'גיאומטריה מקודשת',                      meaning: 'מחזוריות, הרמוניה וחיבור הבריאה' },
  anah:         { name: 'אנח',                  tradition: 'מצרים העתיקה',                          meaning: 'חיים, התחדשות וחיי נצח' },
  yaz:          { name: 'יאז',                  tradition: 'המסורת האמזיגית (ברברים)',               meaning: 'אדם חופשי, חיבור לאדמה ולחירות' },
  meti:         { name: 'מטי',                  tradition: 'המסורת הגיאורגית (קווקז)',               meaning: 'זרימה, תנועה והרמוניה נצחית' },
  nazar:        { name: 'נזאר בונז׳וק',        tradition: 'מסורות המזרח התיכון ואנטוליה',           meaning: 'עין כחולה להגנה מפני אנרגיות שליליות' },
  rosette:      { name: 'רוזטה',                tradition: 'מסופוטמיה והמזרח הקדום',                 meaning: 'פריחה, יופי ומחזוריות הטבע' },
  tyet:         { name: 'הקשר של איזיס',       tradition: 'מצרים העתיקה',                          meaning: 'הגנה קוסמית, כוח נשי וחיוניות' },
  agadez:       { name: 'צלב אגדס',            tradition: 'המסורת הטוארגית (סהרה)',                 meaning: 'הדרכה, הגנה בדרכים וארבע רוחות השמים' },
  shatkona:     { name: 'אשטאקונה',             tradition: 'הינדואיזם מקודש',                       meaning: 'איחוד בין זכרי לנקבי, איזון יקומי' },
  triskele:     { name: 'טריסקל',               tradition: 'המסורת הקלטית',                         meaning: 'תנועה, מחזוריות והתפתחות' },
  spiral:       { name: 'ספירלה',               tradition: 'מסורות קדומות פרהיסטוריות',             meaning: 'צמיחה אינסופית, התפתחות ומסע החיים' },
  artichoke:    { name: 'ארטישוק',              tradition: 'אגן הים התיכון',                        meaning: 'עלים רבים העוטפים לב אחד — תקווה, שגשוג והגנה' },
  horseshoe:    { name: 'פרסה',                 tradition: 'אירופה ותרבויות רבות',                  meaning: 'קמע למזל טוב ולהגנה מפני עין הרע' },
  moon:         { name: 'ירח',                  tradition: 'תרבויות רבות לאורך ההיסטוריה',          meaning: 'מחזוריות, התחדשות, נשיות וזמן החולף' },
  tiltan:       { name: 'תלתן',                 tradition: 'אירלנד והמסורת הקלטית',                 meaning: 'עלה תלת-אונתי — מזל טוב, ברכה ותקווה' },
  om:           { name: 'אום',                  tradition: 'הינדואיזם ובבודהיזם',                   meaning: 'אחדות, צליל הבריאה וחיבור רוחני' },
  evil_eye:     { name: 'עין הרע',              tradition: 'פולקלור ים תיכוני',                     meaning: 'שמירה מפני קנאה ומיקוד אנרגיה חיובית' },
  vegvisir:     { name: 'וק-ויסיר',            tradition: 'המסורת הנורדית',                        meaning: 'מצפן רוחני, שלא תלך לאיבוד בסערה' },
  dharmachakra: { name: 'גלגל הדהרמה',          tradition: 'בודהיזם',                               meaning: 'נתיב שמונת השלבים לשחרור ואיזון' },
  pentagram:    { name: 'פנטגרם',               tradition: 'מיסטיקה קדומה ואלכימיה',                meaning: 'איזון חמשת היסודות והרמוניה עם הטבע' },
  scarab:       { name: 'חרפושית',              tradition: 'מצרים העתיקה',                          meaning: 'התחדשות עצמית, הגנה ומזל טוב' },
  lotus:        { name: 'לוטוס',                tradition: 'בודהיזם והמזרח הרחוק',                  meaning: 'טוהר, התעוררות רוחנית וצמיחה מתוך הקושי' },
  pomegranate:  { name: 'רימון',                tradition: 'המזרח הקדום והיהדות',                   meaning: 'שפע, פוריות וברכה' },
  enso:         { name: 'אנסו',                 tradition: 'זן בודהיזם',                            meaning: 'הארה, ריקות ושלמות הרגע' },
  gankyil:      { name: 'גנקיל',                tradition: 'בודהיזם טיבטי',                         meaning: 'איחוד שלוש האמיתות ותנועת החיים' },
  triple_moon:  { name: 'ירח משולש',            tradition: 'הוויקה והפגאניות',                      meaning: 'שלושת פני האלה: עלמה, אם וזקנה' },
  valknut:      { name: 'ואלקנוט',              tradition: 'המסורת הנורדית',                        meaning: 'קשר בין החיים למוות וכוחו של אודין' },
  wheel:        { name: 'גלגל השנה',            tradition: 'מסורות פגאניות',                        meaning: 'מחזוריות העונות והזמן' },
  infinity:     { name: 'אינסוף',               tradition: 'מתמטיקה ומיסטיקה',                      meaning: 'נצחיות, איזון וזרימה בלתי פוסקת' },
  tree_of_life: { name: 'עץ החיים',             tradition: 'מסורות רבות וקבלה',                     meaning: 'חיבור בין שמים לארץ, שורשים וצמיחה' },
  ichthys:      { name: 'דג',                   tradition: 'סמליות קדומה',                          meaning: 'חיים, שפע ופריון' },
  triquetra:    { name: 'טריקווטרה',            tradition: 'המסורת הקלטית',                         meaning: 'שילוש, נצח וחיבור בלתי נפרד' },
  endless_knot: { name: 'הקשר האינסופי',        tradition: 'בודהיזם',                               meaning: 'תלות הדדית ורצף אינסופי של החיים' },
  celtic_cross: { name: 'הצלב הקלטי',           tradition: 'הנצרות הקלטית',                         meaning: 'איחוד הרוח והחומר ונצחיות' },
  thunderbird:  { name: 'ציפור הרעם',           tradition: 'עמי הילידים באמריקה',                   meaning: 'כוח, הגנה וכוחות הטבע' },
  medicine_wheel:{ name: 'גלגל הרפואה',         tradition: 'עמי הילידים באמריקה',                   meaning: 'איזון, ריפוי וארבעת הכיוונים' },
  zia_sun:      { name: 'שמש זיה',              tradition: 'עם הזוני, ניו מקסיקו',                  meaning: 'השמש, ארבעת הכיוונים ומחזור החיים' },
  aztec_diamond:{ name: 'מעוין שבטי',           tradition: 'מסורות ילידיות ושבטיות',                meaning: 'הגנה, פוריות ומחזוריות' },
  triskele_spiral:{ name: 'טריסקל ספירלי',      tradition: 'המסורת הקלטית',                         meaning: 'תנועה מתמדת, התקדמות ואיזון' },
};

/* ── Curated grid order (6×5 = 30 symbols) — matches the reference sheet ── */
const GRID_ORDER = [
  'hamsa',        'eye',         'triskele',      'spiral',      'enso',            'gankyil',
  'triple_moon',  'valknut',     'vegvisir',      'wheel',       'dharmachakra',    'lotus',
  'om',           'infinity',    'tree_of_life',  'flower',      'pentagram',       'shatkona',
  'anah',         'scarab',      'ichthys',       'pomegranate', 'triquetra',       'endless_knot',
  'celtic_cross', 'thunderbird', 'medicine_wheel','zia_sun',     'triskele_spiral', 'aztec_diamond',
  'artichoke',    'horseshoe',  'moon',          'tiltan',
];

/* ── Build the grid ── */
function buildGrid() {
  const grid = document.getElementById('symbol-grid');
  if (!grid) return;

  GRID_ORDER.forEach((key, idx) => {
    const info = SYMBOL_INFO[key];
    const svg  = MOTIF_SVG[key];
    if (!info || !svg) return;

    const cell = document.createElement('div');
    cell.className = 'symbol-cell';
    cell.style.animationDelay = `${idx * 35}ms`;
    cell.id = `symbol-${key}`;

    // Info panel (visible on hover)
    const infoPanel = document.createElement('div');
    infoPanel.className = 'symbol-info';
    infoPanel.innerHTML = `
      <div class="info-name">${info.name}</div>
      <div class="info-tradition">${info.tradition}</div>
      <div class="info-sep"></div>
      <div class="info-meaning">${info.meaning}</div>
    `;

    // SVG artwork
    const artwork = document.createElement('div');
    artwork.className = 'symbol-artwork';
    artwork.innerHTML = `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`;

    // Index number
    const index = document.createElement('span');
    index.className = 'symbol-index';
    index.textContent = String(idx + 1).padStart(2, '0');

    cell.appendChild(infoPanel);
    cell.appendChild(artwork);
    cell.appendChild(index);
    grid.appendChild(cell);
  });
}

/* ── Custom cursor ── */
function initCursor() {
  const dot = document.getElementById('cursor');
  if (!dot) return;

  let mx = -999, my = -999;
  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
  });

  function tick() {
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ── Boot ── */
window.addEventListener('DOMContentLoaded', () => {
  buildGrid();
  initCursor();
});
