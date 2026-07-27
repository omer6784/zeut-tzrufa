/* ────────────────────────────────────────────────────────────────────────
   editor.js — the post-questionnaire "tools" page.

   After the 8 stages (name window's "המשך"), the user lands here — an extra page
   (NOT a stage) to play with the jewel they built: pick any symbol and change its
   SIZE / POSITION / COLOUR, and change the BACKGROUND and FRAME colours. Every
   change re-broadcasts the artifact, so both the embedded jewel (left — an iframe
   of the display, so it's rendered EXACTLY like the display) and the real external
   display update live.

   Same chrome as the stages (the exact logo image, the rotated left wordmark, the
   "מאגר הסמלים" button, the fixed dotted grid) — WITHOUT the right stage-dots and
   the top "which stage" text. Plus: undo / redo and "back to the original jewel".
   ──────────────────────────────────────────────────────────────────────── */

const PALETTE = [
  { hex: '#ff5003', name: 'כתום' },
  { hex: '#e2bc71', name: 'זהב'  },
  { hex: '#282828', name: 'כהה'  },
  { hex: '#f5f5ed', name: 'קרם'  },
];
const TAGLINE = 'זהות צרופה - עיצוב התכשיט האישי שלך';

export function mountEditor({ st, broadcast, symbolName, onDone }) {
  document.getElementById('editor-view')?.remove();
  st.artifactEdits = st.artifactEdits || [];
  // LIVE view of the stack (drag-reorder changes it) — never a frozen copy.
  const syms = () => st.chosenSymbols || [];

  const view = document.createElement('div');
  view.id = 'editor-view';
  view.dir = 'rtl';
  view.innerHTML = `
    <div class="ed-grid stage-grid" aria-hidden="true">
      <span class="sg-v" style="--x: calc(1360px - 200 * var(--sx)); --h: 85;"></span>
      <span class="sg-v" style="--x: calc(200 * var(--sx)); --h: 85;"></span>
      <span class="sg-h" style="--y: calc(85 * var(--sy));"></span>
      <span class="sg-v" style="--x: calc(100 * var(--sx)); --y: calc(85 * var(--sy)); --h: 668;"></span>
      <span class="sg-v" style="--x: calc(1360px - 100 * var(--sx)); --y: calc(85 * var(--sy)); --h: 668;"></span>
      <span class="sg-h" style="--y: calc(706 * var(--sy));"></span>
    </div>
    <div class="grid-logo ed-logo" aria-hidden="true"><img src="/image/v5-stage1/logotype.png" alt="זהות צרופה" /></div>
    <a class="ed-lib" href="/v2/symbol-library.html">מאגר הסמלים</a>
    <div class="ed-side" aria-hidden="true"><span class="ed-side-txt"></span></div>
    <div class="ed-jewel"><iframe class="ed-jewel-frame" src="/v5/display.html" title="התכשיט" tabindex="-1"></iframe></div>
    <div class="ed-tools"></div>`;
  // Mount inside the fixed-aspect wrapper so it shares the 1360×768 logical space.
  (document.getElementById('app-viewport') || document.body).appendChild(view);

  const tools = view.querySelector('.ed-tools');
  const editAt = (i) => (st.artifactEdits[i] = st.artifactEdits[i] || {});
  const push = () => { try { broadcast(); } catch (_) {} };

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
  function record() { history = history.slice(0, hp + 1); history.push(snap()); hp = history.length - 1; updateHistBtns(); }
  function restore(json) {
    const s = JSON.parse(json);
    st.background = s.bg; st.frameColor = s.fr; st.artifactEdits = s.ed || [];
    if (s.sy) st.chosenSymbols = s.sy;
    if (s.sz) st.chosenSymbolSizes = s.sz;
    if (s.sc) st.chosenSymbolColors = s.sc;
    renderTools(); push();
  }
  function undo() { if (hp > 0) { hp--; restore(history[hp]); updateHistBtns(); } }
  function redo() { if (hp < history.length - 1) { hp++; restore(history[hp]); updateHistBtns(); } }

  // ---- top action bar (undo / redo) -----------------------------------------
  const bar = document.createElement('div');
  bar.className = 'ed-bar';
  const undoBtn = mkActionBtn('↶', 'בטל', undo);
  const redoBtn = mkActionBtn('↷', 'בצע שוב', redo);
  bar.append(undoBtn, redoBtn);
  view.querySelector('.ed-tools').appendChild(bar);
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

  // ---- colour-swatch row ---------------------------------------------------
  // `blocked` (a hex) disables that colour in the row — used to block the CURRENT
  // BACKGROUND colour in the frame/symbol pickers, so nothing can be set to a
  // colour that would blend into the background.
  function swatches(current, onPick, blocked) {
    const row = document.createElement('div');
    row.className = 'ed-swatches';
    PALETTE.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      const isBlocked = blocked && c.hex === blocked;
      b.className = 'ed-sw' + (current === c.hex ? ' is-on' : '') + (isBlocked ? ' is-blocked' : '');
      b.style.setProperty('--sw', c.hex);
      b.title = isBlocked ? 'זהה לצבע הרקע' : c.name;
      if (isBlocked) b.disabled = true;
      b.addEventListener('click', () => {
        if (isBlocked) return;
        row.querySelectorAll('.ed-sw').forEach((x) => x.classList.remove('is-on'));
        b.classList.add('is-on');
        onPick(c.hex);
      });
      row.appendChild(b);
    });
    return row;
  }
  function section(title, parent) {
    const s = document.createElement('div');
    s.className = 'ed-section';
    s.innerHTML = `<div class="ed-label">${title}</div>`;
    (parent || tools).appendChild(s);
    return s;
  }

  // ---- the editable panel (rebuilt on undo/redo/reorder) --------------------
  const panel = document.createElement('div');
  panel.className = 'ed-panel';
  tools.appendChild(panel);
  let selected = syms().length ? 0 : -1;

  // Background changed → nothing may stay in that colour. The FRAME and any
  // MANUALLY-recoloured symbol matching the new background revert to automatic
  // (the auto paths never blend: the frame's auto map and the stored per-symbol
  // colours are both self-repairing against the background).
  function fixBlends(newBg) {
    if (st.frameColor === newBg) st.frameColor = null;
    (st.artifactEdits || []).forEach((e) => { if (e && e.color === newBg) e.color = null; });
  }

  function renderTools() {
    panel.innerHTML = '';

    const bg = section('צבע הרקע', panel);
    bg.appendChild(swatches(st.background || null, (hex) => { st.background = hex; fixBlends(hex); record(); push(); renderTools(); }));

    // The current background colour is BLOCKED in the frame + symbol pickers.
    const fr = section('צבע המסגרת', panel);
    fr.appendChild(swatches(st.frameColor || null, (hex) => { st.frameColor = hex; record(); push(); }, st.background || null));

    const symSec = section('הסמלים', panel);
    const chips = document.createElement('div');
    chips.className = 'ed-chips';
    syms().forEach((key, i) => {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'ed-chip' + (i === selected ? ' is-on' : '');
      c.textContent = symbolName ? (symbolName(key) || key) : key;
      c.addEventListener('click', () => { selected = i; renderTools(); });
      chips.appendChild(c);
    });
    symSec.appendChild(chips);

    const controls = document.createElement('div');
    controls.className = 'ed-controls';
    symSec.appendChild(controls);
    if (selected < 0) { controls.innerHTML = '<div class="ed-hint">אין סמלים לעריכה</div>'; return; }
    const e = editAt(selected);

    // Colour only — size is a PINCH on the jewel itself, order is a vertical DRAG
    // on the jewel itself (see the gesture layer below).
    const colWrap = document.createElement('div');
    colWrap.className = 'ed-ctrl';
    colWrap.innerHTML = '<span class="ed-ctrl-label">צבע</span>';
    colWrap.appendChild(swatches(e.color || null, (hex) => { editAt(selected).color = hex; record(); push(); }, st.background || null));
    controls.appendChild(colWrap);

    const hint = document.createElement('div');
    hint.className = 'ed-hint';
    hint.textContent = 'גררו סמל למעלה או למטה לשינוי הסדר · צבטו להגדלה או הקטנה';
    controls.appendChild(hint);
  }
  renderTools();
  updateHistBtns();
  push();

  // ---- touch gestures ON the jewel ------------------------------------------
  // One finger, vertical drag = REORDER: the dragged symbol moves to the slot
  // under the finger and the others close ranks in their existing order. No
  // sideways movement. Two fingers = PINCH: gently scale the symbol (0.8–1.2).
  // Hit-testing uses the engine's real layout (iframe __jewel.getLayout()).
  const jewelBox = view.querySelector('.ed-jewel');
  const jf = view.querySelector('.ed-jewel-frame');
  const gest = document.createElement('div');
  gest.className = 'ed-gesture';
  jewelBox.appendChild(gest);

  const engine = () => { try { return jf.contentWindow && jf.contentWindow.__jewel; } catch (_) { return null; } };
  // Map a clientY to the engine's world-y (canvas is height-fitted + centred in the iframe).
  function worldY(clientY) {
    const L = engine() && engine().getLayout ? engine().getLayout() : null;
    if (!L || !L.items.length) return null;
    const r = jf.getBoundingClientRect();
    return { L, y: (clientY - (r.top + r.height / 2)) * (L.h / r.height) };
  }
  // The symbol whose band contains (or is nearest to) the world y — generous grab.
  // `loose` skips the band check entirely (pinch: two fingers straddle a symbol,
  // so their midpoint can easily land BETWEEN bands — just take the nearest).
  function hitIndex(clientY, loose) {
    const w = worldY(clientY);
    if (!w) return -1;
    let best = -1, bd = Infinity;
    w.L.items.forEach((it, i) => { const d = Math.abs(w.y - it.y); if (d < bd) { bd = d; best = i; } });
    if (best < 0) return -1;
    if (loose) return best;
    const it = w.L.items[best];
    return bd <= Math.max(it.hh * 1.6, w.L.h * 0.045) ? best : -1;
  }
  // The stack SLOT under the finger (boundaries = midpoints between neighbours).
  function slotAt(clientY) {
    const w = worldY(clientY);
    if (!w) return -1;
    let slot = 0;
    for (let i = 0; i < w.L.items.length - 1; i++) {
      if (w.y > (w.L.items[i].y + w.L.items[i + 1].y) / 2) slot = i + 1;
    }
    return slot;
  }
  function applyReorder(from, to) {
    if (from === to) return;
    const move = (arr) => { if (Array.isArray(arr) && arr.length > from) { const v = arr.splice(from, 1)[0]; arr.splice(to, 0, v); } };
    move(st.chosenSymbols); move(st.chosenSymbolSizes); move(st.chosenSymbolColors); move(st.artifactEdits);
    if (selected === from) selected = to;
    else if (from < selected && to >= selected) selected--;
    else if (from > selected && to <= selected) selected++;
    push(); renderTools();
  }

  const ptrs = new Map();   // active pointers on the gesture layer
  let drag = null;          // { idx, moved } single-finger reorder
  let pinch = null;         // { idx, d0, s0 }  two-finger scale
  const dist = () => { const p = [...ptrs.values()]; return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); };

  gest.addEventListener('pointerdown', (ev) => {
    gest.setPointerCapture(ev.pointerId);
    ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (ptrs.size === 1) {
      const idx = hitIndex(ev.clientY);
      drag = idx >= 0 ? { idx, y0: ev.clientY, moved: false } : null;
    } else if (ptrs.size === 2) {
      // Pinch target: the symbol the first finger grabbed, else the NEAREST one to
      // the fingers' midpoint (loose — no band check, so the pinch always lands).
      const mid = [...ptrs.values()].reduce((a, p) => a + p.y, 0) / 2;
      const idx = (drag && drag.idx >= 0) ? drag.idx : hitIndex(mid, true);
      drag = null;
      if (idx >= 0) pinch = { idx, d0: dist(), s0: (st.artifactEdits[idx] && st.artifactEdits[idx].scale) || 1 };
    }
  });
  gest.addEventListener('pointermove', (ev) => {
    const p = ptrs.get(ev.pointerId);
    if (!p) return;
    p.x = ev.clientX; p.y = ev.clientY;
    if (pinch && ptrs.size === 2) {
      const s = Math.max(0.8, Math.min(1.2, pinch.s0 * (dist() / pinch.d0)));
      editAt(pinch.idx).scale = Math.round(s * 100) / 100;
      push();
    } else if (drag) {
      if (!drag.moved && Math.abs(ev.clientY - drag.y0) > 8) drag.moved = true;
      const slot = slotAt(ev.clientY);
      if (slot >= 0 && slot !== drag.idx) { applyReorder(drag.idx, slot); drag.idx = slot; drag.moved = true; }
    }
  });
  const endPtr = (ev) => {
    ptrs.delete(ev.pointerId);
    if (pinch && ptrs.size < 2) { pinch = null; record(); }
    if (drag && ptrs.size === 0) {
      if (drag.moved) record();
      else { selected = drag.idx; renderTools(); }   // simple tap → select in the panel
      drag = null;
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

  return () => { if (twTimer) clearTimeout(twTimer); try { view.remove(); } catch (_) {} };
}
