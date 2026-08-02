/* ────────────────────────────────────────────────────────────────────────
   editor.js — the post-questionnaire DIRECT-editing page.

   After the 8 stages (name window's "המשך"), the user lands here. The jewel
   (an iframe of the display, so it renders EXACTLY like the display) sits in
   the CENTRE, and everything is edited by touching the jewel itself — no tool
   panel:
     · tap the BACKGROUND        → floating picker, all 4 colours
     · tap the FRAME (ornament)  → floating picker, 3 colours (background blocked)
     · tap a SYMBOL              → dotted selection ring + picker, 3 colours
     · pinch a symbol            → gentle scale (0.8–1.2)
   The symbols keep the order the stages gave them: the stack IS the order the
   talisman was made in, so it is not something to rearrange by hand.
   Every change re-broadcasts the artifact, so the embedded jewel and the real
   external display update live. Undo/redo buttons remain; a ghost-hand demo
   plays once on entry to teach the tap-to-edit idea (same idiom as the stages).
   ──────────────────────────────────────────────────────────────────────── */

import { getGhostHand, lockInput, unlockInput } from './demo-hand.js';

const PALETTE = [
  { hex: '#ff5003', name: 'כתום' },
  { hex: '#e2bc71', name: 'זהב'  },
  { hex: '#282828', name: 'כהה'  },
  { hex: '#f5f5ed', name: 'קרם'  },
];
const TAGLINE = 'זהות צרופה - עיצוב התכשיט האישי שלך';
const NOTE = 'לחצו על הרקע, המסגרת או הסמלים לשינוי צבע';

export function mountEditor({ st, broadcast, symbolName, onDone }) {
  document.getElementById('editor-view')?.remove();
  st.artifactEdits = st.artifactEdits || [];

  const view = document.createElement('div');
  view.id = 'editor-view';
  view.dir = 'rtl';
  view.innerHTML = `
    <div class="ed-grid stage-grid" aria-hidden="true">
      <span class="sg-v" style="--x: calc((1360 - 200) * var(--sx)); --h: 85;"></span>
      <span class="sg-v" style="--x: calc(200 * var(--sx)); --h: 85;"></span>
      <span class="sg-h" style="--y: calc(85 * var(--sy));"></span>
      <span class="sg-v" style="--x: calc(100 * var(--sx)); --y: calc(85 * var(--sy)); --h: 668;"></span>
      <span class="sg-v" style="--x: calc((1360 - 100) * var(--sx)); --y: calc(85 * var(--sy)); --h: 668;"></span>
      <span class="sg-h" style="--y: calc(706 * var(--sy));"></span>
    </div>
    <div class="grid-logo ed-logo" aria-hidden="true"><img src="/image/v5-stage1/logotype.png" alt="זהות צרופה" /></div>
    <a class="ed-lib" href="/v5/">למסך הפתיחה</a>
    <div class="ed-side" aria-hidden="true"><span class="ed-side-txt"></span></div>
    <div class="ed-jewel"><iframe class="ed-jewel-frame" src="/v5/display.html" title="התכשיט" tabindex="-1"></iframe></div>
    <div class="ed-note">${NOTE}</div>`;
  // Mount inside the fixed-aspect wrapper so it shares the 1360×768 logical space.
  (document.getElementById('app-viewport') || document.body).appendChild(view);

  const editAt = (i) => (st.artifactEdits[i] = st.artifactEdits[i] || {});
  // Apply the current state to THIS page's preview only (the editor's jewel is
  // an iframe of the display, so it normally updates through the same
  // broadcast). Used while the teaching demo plays.
  const previewOnly = () => {
    const j = engine();
    if (!j) return;
    if (st.background && j.setBackground) j.setBackground(st.background);
    if (j.setSymbolColors) j.setSymbolColors((st.chosenSymbolColors || []).slice());
    if (j.applyEdits) j.applyEdits({ symbols: st.artifactEdits || [], frameColor: st.frameColor || null });
  };
  // The ghost-hand demo changes colours to TEACH the gesture — that is not the
  // visitor's jewel, so it must never travel to the big display. The demo's
  // changes stay in this page's preview; every real edit broadcasts live.
  const push = () => {
    if (demoGuard) { previewOnly(); return; }
    try { broadcast(); } catch (_) {}
  };

  // ---- undo / redo history -------------------------------------------------
  // The snapshot covers EVERYTHING the editor can change: colours, edits, AND the
  // stack order (+ the per-symbol colour/size arrays that travel with a reorder).
  const snap = () => JSON.stringify({
    bg: st.background || null, fr: st.frameColor || null, ed: st.artifactEdits,
    sy: (st.chosenSymbols || []).slice(),
    sz: (st.chosenSymbolSizes || []).slice(),
    sc: (st.chosenSymbolColors || []).slice(),
  });
  let history = [snap()];
  let hp = 0;
  let demoGuard = false;   // the entry demo must not pollute the history
  function record() {
    if (demoGuard) return;
    history = history.slice(0, hp + 1); history.push(snap()); hp = history.length - 1; updateHistBtns();
  }
  function restore(json) {
    const s = JSON.parse(json);
    st.background = s.bg; st.frameColor = s.fr; st.artifactEdits = s.ed || [];
    if (s.sy) st.chosenSymbols = s.sy;
    if (s.sz) st.chosenSymbolSizes = s.sz;
    if (s.sc) st.chosenSymbolColors = s.sc;
    closePicker();
    const j = engine(); if (j && j.setHighlight) j.setHighlight(null);
    push();
  }
  function undo() { if (hp > 0) { hp--; restore(history[hp]); updateHistBtns(); } }
  function redo() { if (hp < history.length - 1) { hp++; restore(history[hp]); updateHistBtns(); } }

  // ---- undo / redo buttons (the ONLY buttons besides "סיימתי") --------------
  const bar = document.createElement('div');
  bar.className = 'ed-bar';
  const undoBtn = mkActionBtn('↶', 'בטל', undo);
  const redoBtn = mkActionBtn('↷', 'בצע שוב', redo);
  bar.append(undoBtn, redoBtn);
  view.appendChild(bar);
  function updateHistBtns() {
    undoBtn.disabled = hp <= 0;
    redoBtn.disabled = hp >= history.length - 1;
  }
  function mkActionBtn(ico, label, onClick) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ed-act'; b.title = label;
    b.innerHTML = `<span class="ed-btn-ico">${ico}</span>`;
    b.addEventListener('click', onClick);
    return b;
  }
  updateHistBtns();

  // Background changed → nothing may stay in that colour. The FRAME and any
  // MANUALLY-recoloured symbol matching the new background revert to automatic
  // (the auto paths never blend: the frame's auto map and the stored per-symbol
  // colours are both self-repairing against the background).
  /* A new background must never swallow a symbol. Any symbol that would now be
     the SAME colour as the plate is repainted in the colour that is missing
     from the other symbols (the least used, if all three are present) — so the
     recolour is visible immediately, including while the demo is showing it. */
  function fixBlends(newBg) {
    const bg = String(newBg || '').toLowerCase();
    if (st.frameColor && String(st.frameColor).toLowerCase() === bg) st.frameColor = null;
    const pool = PALETTE.map((c) => c.hex).filter((h) => h.toLowerCase() !== bg);
    const cols = (st.chosenSymbolColors || []).slice();
    const eff = (i) => String((((st.artifactEdits || [])[i]) || {}).color || cols[i] || '').toLowerCase();
    (st.chosenSymbols || []).forEach((_, i) => {
      if (eff(i) !== bg) return;
      const others = (st.chosenSymbols || []).map((__, j) => (j === i ? null : eff(j))).filter(Boolean);
      let best = pool[0], bestN = Infinity;
      for (const h of pool) {
        const n = others.filter((o) => o === h.toLowerCase()).length;
        if (n < bestN) { bestN = n; best = h; }
      }
      if ((st.artifactEdits || [])[i]) st.artifactEdits[i].color = best;
      cols[i] = best;
    });
    st.chosenSymbolColors = cols;
  }

  // ---- engine access + world-coordinate mapping ------------------------------
  const jewelBox = view.querySelector('.ed-jewel');
  const jf = view.querySelector('.ed-jewel-frame');
  const engine = () => { try { return jf.contentWindow && jf.contentWindow.__jewel; } catch (_) { return null; } };
  // Client point → the engine's world coords (the canvas is height-fitted and
  // centred in the iframe; its 9/16 aspect equals the iframe's, so it fills it).
  function worldPt(clientX, clientY) {
    const j = engine();
    const L = j && j.getLayout ? j.getLayout() : null;
    if (!L) return null;
    const r = jf.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return {
      L,
      x: (clientX - (r.left + r.width / 2)) * (L.w / r.width),
      y: (clientY - (r.top + r.height / 2)) * (L.h / r.height),
    };
  }
  // The symbol under the tap — generous grab in BOTH axes: the tap must be near
  // the symbol's row AND near the centre axis (its actual width), so tapping the
  // empty background BESIDE a symbol correctly falls through to frame/background.
  // `loose` skips the checks entirely (pinch: two fingers straddle a symbol, so
  // their midpoint can easily land between bands — just take the nearest row).
  function hitIndex(clientX, clientY, loose) {
    const w = worldPt(clientX, clientY);
    if (!w || !w.L.items.length) return -1;
    let best = -1, bd = Infinity;
    w.L.items.forEach((it, i) => { const d = Math.abs(w.y - it.y); if (d < bd) { bd = d; best = i; } });
    if (best < 0) return -1;
    if (loose) return best;
    const it = w.L.items[best];
    if (bd > Math.max(it.hh * 1.6, w.L.h * 0.045)) return -1;
    if (Math.abs(w.x) > Math.max((it.hw || 0) * 1.6, 140)) return -1;
    return best;
  }
  // Was the tap on the gematria ornament? A band around its rectangle (world px).
  function onFrame(clientX, clientY) {
    const w = worldPt(clientX, clientY);
    if (!w || !w.L.ornament || !w.L.ornament.on) return false;
    const { hw, hh } = w.L.ornament;
    const B = 85, ax = Math.abs(w.x), ay = Math.abs(w.y);
    return (Math.abs(ax - hw) <= B && ay <= hh + B) || (Math.abs(ay - hh) <= B && ax <= hw + B);
  }
  // ---- floating colour picker -------------------------------------------------
  // A small plate of colour dots that opens AT the tap point. One open at a time;
  // a tap anywhere else (the backdrop) closes it.
  let pickerRef = null;
  function closePicker() { if (pickerRef) { const p = pickerRef; pickerRef = null; p.close(); } }
  function showPicker({ colors, current, clientX, clientY, onPick, onClose }) {
    closePicker();
    const scale = window.__appScale || 1;
    const vr = view.getBoundingClientRect();
    const lx = Math.max(90, Math.min(1270, (clientX - vr.left) / scale));
    const ly = Math.max(150, Math.min(690, (clientY - vr.top) / scale));
    const back = document.createElement('div'); back.className = 'ed-picker-backdrop';
    const box = document.createElement('div'); box.className = 'ed-picker';
    box.style.left = lx + 'px'; box.style.top = ly + 'px';
    let closed = false;
    function close() {
      if (closed) return; closed = true;
      try { back.remove(); box.remove(); } catch (_) {}
      if (pickerRef && pickerRef.box === box) pickerRef = null;
      onClose && onClose();
    }
    function apply(hex) { try { onPick(hex); } catch (_) {} close(); }
    colors.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ed-sw' + (current === c.hex ? ' is-on' : '');
      b.style.setProperty('--sw', c.hex);
      b.title = c.name;
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.addEventListener('click', () => apply(c.hex));
      box.appendChild(b);
    });
    back.addEventListener('pointerdown', (e) => { e.stopPropagation(); close(); });
    view.append(back, box);
    pickerRef = { box, close, pickByHex: apply };
    return pickerRef;
  }

  // ---- tap routing: symbol → frame → background -------------------------------
  function openSymbolPicker(idx, cx, cy) {
    const j = engine(); if (j && j.setHighlight) j.setHighlight(idx);   // dotted selection ring
    const cur = (st.artifactEdits[idx] && st.artifactEdits[idx].color) || (st.chosenSymbolColors || [])[idx] || null;
    return showPicker({
      colors: PALETTE.filter((c) => c.hex !== st.background),   // background colour blocked
      current: cur, clientX: cx, clientY: cy,
      onPick: (hex) => { editAt(idx).color = hex; record(); push(); },
      onClose: () => { const e2 = engine(); if (e2 && e2.setHighlight) e2.setHighlight(null); },
    });
  }
  function openFramePicker(cx, cy) {
    return showPicker({
      colors: PALETTE.filter((c) => c.hex !== st.background),   // background colour blocked
      current: st.frameColor || null, clientX: cx, clientY: cy,
      onPick: (hex) => { st.frameColor = hex; record(); push(); },
    });
  }
  function openBackgroundPicker(cx, cy) {
    return showPicker({
      colors: PALETTE.slice(),                                   // all 4
      current: st.background || null, clientX: cx, clientY: cy,
      onPick: (hex) => { st.background = hex; fixBlends(hex); record(); push(); },
    });
  }
  function routeTap(cx, cy) {
    const idx = hitIndex(cx, cy);
    if (idx >= 0) return openSymbolPicker(idx, cx, cy);
    if (onFrame(cx, cy)) return openFramePicker(cx, cy);
    return openBackgroundPicker(cx, cy);
  }

  // ---- touch gestures ON the jewel ------------------------------------------
  // Tap = open the right picker (routeTap). Two-finger pinch = gentle scale
  // (0.8–1.2). A single finger never moves a symbol: the stack's order is the
  // order the stages gave it.
  const gest = document.createElement('div');
  gest.className = 'ed-gesture';
  jewelBox.appendChild(gest);

  const ptrs = new Map();   // active pointers on the gesture layer
  let held = -1;            // the symbol a first finger is on (the pinch target)
  let pinch = null;         // { idx, d0, s0 }  two-finger scale
  let tapCand = null;       // {x,y} — becomes a routed tap if the finger never moves
  const dist = () => { const p = [...ptrs.values()]; return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); };

  gest.addEventListener('pointerdown', (ev) => {
    gest.setPointerCapture(ev.pointerId);
    ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (ptrs.size === 1) {
      tapCand = { x: ev.clientX, y: ev.clientY };
      held = hitIndex(ev.clientX, ev.clientY);
    } else if (ptrs.size === 2) {
      tapCand = null;
      // Pinch target: the symbol the first finger is on, else the NEAREST one to
      // the fingers' midpoint (loose — no band check, so the pinch always lands).
      const mid = [...ptrs.values()].reduce((a, p) => a + p.y, 0) / 2;
      const idx = held >= 0 ? held : hitIndex(0, mid, true);
      if (idx >= 0) pinch = { idx, d0: dist(), s0: (st.artifactEdits[idx] && st.artifactEdits[idx].scale) || 1 };
    }
  });
  gest.addEventListener('pointermove', (ev) => {
    const p = ptrs.get(ev.pointerId);
    if (!p) return;
    p.x = ev.clientX; p.y = ev.clientY;
    if (tapCand && Math.hypot(ev.clientX - tapCand.x, ev.clientY - tapCand.y) > 8) tapCand = null;
    if (pinch && ptrs.size === 2) {
      const s = Math.max(0.8, Math.min(1.2, pinch.s0 * (dist() / pinch.d0)));
      editAt(pinch.idx).scale = Math.round(s * 100) / 100;
      push();
    }
    // A single finger moving does nothing: dragging a symbol out of its place is
    // no longer possible — its place is the stage that gave it.
  });
  const endPtr = (ev) => {
    ptrs.delete(ev.pointerId);
    if (pinch && ptrs.size < 2) { pinch = null; record(); }
    if (ptrs.size === 0) {
      if (tapCand) routeTap(tapCand.x, tapCand.y);
      held = -1; tapCand = null;
    }
  };
  gest.addEventListener('pointerup', endPtr);
  gest.addEventListener('pointercancel', endPtr);
  // Belt-and-braces for the kiosk touch screen: swallow raw touch gestures on the
  // layer so the BROWSER's own pinch-zoom / scroll can never hijack the two-finger
  // pinch before our pointer events see it (touch-action:none alone is not always
  // honoured for page zoom on every kiosk browser).
  ['touchstart', 'touchmove'].forEach((t) =>
    gest.addEventListener(t, (e) => e.preventDefault(), { passive: false }));

  // ---- ghost-hand demo: teaches tap-to-edit (plays once on entry) -------------
  // Same idiom as every stage: the hand taps the background → the picker opens →
  // it picks a colour (live), then taps a symbol → the selection ring + picker →
  // picks a colour — then everything restores and the visitor starts clean.
  let demoToken = 0;
  async function runEditorDemo() {
    const my = ++demoToken;
    const gh = getGhostHand();
    const dead = () => my !== demoToken || !view.isConnected;
    lockInput();
    demoGuard = true;
    const saved = snap();
    const finish = () => {
      try { restore(saved); } catch (_) {}
      demoGuard = false;
      const j = engine(); if (j && j.setHighlight) j.setHighlight(null);
      closePicker(); gh.hide(); unlockInput();
    };
    // Wait for the iframe engine + a laid-out stack (bounded — ~8s worst case).
    for (let t = 0; t < 50; t++) {
      const j = engine();
      if (j && j.isReady && j.isReady() && j.getLayout && (j.getLayout().items || []).length) break;
      await gh.sleep(160); if (dead()) return finish();
    }
    const j = engine();
    if (!j || !(j.getLayout().items || []).length) return finish();

    const r = jf.getBoundingClientRect();
    const vr = view.getBoundingClientRect();
    const light = !st.background || st.background === '#f5f5ed' || st.background === '#e2bc71';
    const tone = light ? 'dark' : undefined;

    // 1. tap the BACKGROUND (inside the jewel plate, away from the axis) → picker
    const bx = r.left + r.width * 0.16, by = r.top + r.height * 0.42;
    gh.open(); gh.place(bx, (window.innerHeight || 900) + 60); gh.show(tone);
    await gh.sleep(120); if (dead()) return finish();
    gh.point(true); gh.move(bx, by);
    await gh.sleep(700); if (dead()) return finish();
    await gh.tapPoint();
    const p1 = openBackgroundPicker(bx, by);
    await gh.sleep(600); if (dead()) return finish();
    // pick the first colour that differs from the current background
    const hex1 = (PALETTE.find((c) => c.hex !== st.background) || PALETTE[0]).hex;
    const btn1 = [...p1.box.children].find((b) => b.style.getPropertyValue('--sw') === hex1);
    if (btn1) { const b = btn1.getBoundingClientRect(); gh.move(b.left + b.width / 2, b.top + b.height / 2); }
    await gh.sleep(650); if (dead()) return finish();
    await gh.tapPoint();
    p1.pickByHex(hex1);                        // live: the background really changes
    await gh.sleep(900); if (dead()) return finish();

    // 2. tap the FIRST SYMBOL → selection ring + picker → pick a colour
    const L = j.getLayout();
    const sx = r.left + r.width / 2;
    const sy = r.top + r.height / 2 + (L.items[0].y * (r.height / L.h));
    gh.move(sx, sy);
    await gh.sleep(700); if (dead()) return finish();
    await gh.tapPoint();
    const p2 = openSymbolPicker(0, sx, sy);
    await gh.sleep(700); if (dead()) return finish();
    const cur2 = (st.chosenSymbolColors || [])[0] || null;
    const hex2 = (PALETTE.find((c) => c.hex !== st.background && c.hex !== cur2) || PALETTE[0]).hex;
    const btn2 = [...p2.box.children].find((b) => b.style.getPropertyValue('--sw') === hex2);
    if (btn2) { const b = btn2.getBoundingClientRect(); gh.move(b.left + b.width / 2, b.top + b.height / 2); }
    await gh.sleep(650); if (dead()) return finish();
    await gh.tapPoint();
    p2.pickByHex(hex2);
    await gh.sleep(900); if (dead()) return finish();

    gh.open();
    await gh.sleep(250);
    finish();                                   // restore → the visitor starts clean
  }
  const demoTimer = setTimeout(runEditorDemo, 1400);

  // ---- left wordmark typewriter (matches the stage sidebar) ----------------
  const sideTxt = view.querySelector('.ed-side-txt');
  let twTimer = null, pos = 0, deleting = false;
  (function typeLoop() {
    sideTxt.textContent = TAGLINE.slice(0, pos);
    if (!deleting && pos >= TAGLINE.length) { deleting = true; twTimer = setTimeout(typeLoop, 2600); return; }
    if (deleting && pos <= 0) { deleting = false; twTimer = setTimeout(typeLoop, 700); return; }
    pos += deleting ? -1 : 1;
    twTimer = setTimeout(typeLoop, deleting ? 45 : 105);
  })();

  // "סיימתי" — leaves the editor and shows the final completion page.
  const doneBtn = document.createElement('button');
  doneBtn.type = 'button';
  doneBtn.className = 'ed-done';
  doneBtn.textContent = 'סיימתי';
  doneBtn.addEventListener('click', () => { onDone && onDone(); });
  view.appendChild(doneBtn);

  push();

  return () => {
    demoToken++;
    clearTimeout(demoTimer);
    if (twTimer) clearTimeout(twTimer);
    try { unlockInput(); } catch (_) {}
    try { view.remove(); } catch (_) {}
  };
}
