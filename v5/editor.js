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

export function mountEditor({ st, broadcast, symbolName }) {
  document.getElementById('editor-view')?.remove();
  st.artifactEdits = st.artifactEdits || [];
  const symbols = (st.chosenSymbols || []).slice();
  const originalBackground = st.background || null;   // for "back to original"

  const view = document.createElement('div');
  view.id = 'editor-view';
  view.dir = 'rtl';
  view.innerHTML = `
    <div class="ed-grid stage-grid" aria-hidden="true">
      <span class="sg-v" style="--x: calc(100vw - 200 * var(--sx)); --h: 85;"></span>
      <span class="sg-v" style="--x: calc(200 * var(--sx)); --h: 85;"></span>
      <span class="sg-h" style="--y: calc(85 * var(--sy));"></span>
      <span class="sg-v" style="--x: calc(100 * var(--sx)); --y: calc(85 * var(--sy)); --h: 668;"></span>
      <span class="sg-v" style="--x: calc(100vw - 100 * var(--sx)); --y: calc(85 * var(--sy)); --h: 668;"></span>
      <span class="sg-h" style="--y: calc(706 * var(--sy));"></span>
    </div>
    <div class="grid-logo ed-logo" aria-hidden="true"><img src="/image/v5-stage1/logotype.png" alt="זהות צרופה" /></div>
    <a class="ed-lib" href="/v2/symbol-library.html">מאגר הסמלים</a>
    <div class="ed-side" aria-hidden="true"><span class="ed-side-txt"></span></div>
    <div class="ed-jewel"><iframe class="ed-jewel-frame" src="/v5/display.html" title="התכשיט" tabindex="-1"></iframe></div>
    <div class="ed-tools"></div>`;
  document.body.appendChild(view);

  const tools = view.querySelector('.ed-tools');
  const editAt = (i) => (st.artifactEdits[i] = st.artifactEdits[i] || {});
  const push = () => { try { broadcast(); } catch (_) {} };

  // ---- undo / redo history -------------------------------------------------
  const snap = () => JSON.stringify({ bg: st.background || null, fr: st.frameColor || null, ed: st.artifactEdits });
  let history = [snap()];
  let hp = 0;
  function record() { history = history.slice(0, hp + 1); history.push(snap()); hp = history.length - 1; updateHistBtns(); }
  function restore(json) {
    const s = JSON.parse(json);
    st.background = s.bg; st.frameColor = s.fr; st.artifactEdits = s.ed || [];
    renderTools(); push();
  }
  function undo() { if (hp > 0) { hp--; restore(history[hp]); updateHistBtns(); } }
  function redo() { if (hp < history.length - 1) { hp++; restore(history[hp]); updateHistBtns(); } }
  function toOriginal() {
    st.background = originalBackground; st.frameColor = null; st.artifactEdits = [];
    record(); renderTools(); push();
  }

  // ---- top action bar (undo / redo / original) -----------------------------
  const bar = document.createElement('div');
  bar.className = 'ed-bar';
  const undoBtn = mkActionBtn('↶', 'בטל', undo);
  const redoBtn = mkActionBtn('↷', 'בצע שוב', redo);
  const origBtn = mkActionBtn('', 'חזרה לתכשיט המקורי', toOriginal); origBtn.classList.add('ed-orig');
  origBtn.querySelector('.ed-btn-ico').textContent = '';
  origBtn.querySelector('.ed-btn-ico').remove();
  origBtn.textContent = 'התכשיט המקורי';
  bar.append(undoBtn, redoBtn, origBtn);
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
  function swatches(current, onPick) {
    const row = document.createElement('div');
    row.className = 'ed-swatches';
    PALETTE.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ed-sw' + (current === c.hex ? ' is-on' : '');
      b.style.setProperty('--sw', c.hex);
      b.title = c.name;
      b.addEventListener('click', () => {
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

  // ---- the editable panel (rebuilt on undo/redo/reset) ---------------------
  const panel = document.createElement('div');
  panel.className = 'ed-panel';
  tools.appendChild(panel);
  let selected = symbols.length ? 0 : -1;

  function renderTools() {
    panel.innerHTML = '';

    const bg = section('צבע הרקע', panel);
    bg.appendChild(swatches(st.background || null, (hex) => { st.background = hex; record(); push(); }));

    const fr = section('צבע המסגרת', panel);
    fr.appendChild(swatches(st.frameColor || null, (hex) => { st.frameColor = hex; record(); push(); }));

    const symSec = section('הסמלים', panel);
    const chips = document.createElement('div');
    chips.className = 'ed-chips';
    symbols.forEach((key, i) => {
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

    // size
    const sizeWrap = document.createElement('div');
    sizeWrap.className = 'ed-ctrl';
    sizeWrap.innerHTML = '<span class="ed-ctrl-label">גודל</span>';
    const size = document.createElement('input');
    size.type = 'range'; size.min = '0.5'; size.max = '1.8'; size.step = '0.02';
    size.value = String(e.scale || 1);
    size.addEventListener('input', () => { editAt(selected).scale = parseFloat(size.value); push(); });
    size.addEventListener('change', record);
    sizeWrap.appendChild(size);
    controls.appendChild(sizeWrap);

    // position
    const posWrap = document.createElement('div');
    posWrap.className = 'ed-ctrl';
    posWrap.innerHTML = '<span class="ed-ctrl-label">מיקום</span>';
    const pad = document.createElement('div');
    pad.className = 'ed-pad';
    const STEP = 45;
    const nudge = (dx, dy) => { const ed = editAt(selected); ed.dx = (ed.dx || 0) + dx; ed.dy = (ed.dy || 0) + dy; push(); record(); };
    const mk = (label, dx, dy) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.addEventListener('click', () => nudge(dx, dy)); return b; };
    pad.append(mk('↑', 0, -STEP), mk('↓', 0, STEP), mk('→', STEP, 0), mk('←', -STEP, 0));
    posWrap.appendChild(pad);
    controls.appendChild(posWrap);

    // colour
    const colWrap = document.createElement('div');
    colWrap.className = 'ed-ctrl';
    colWrap.innerHTML = '<span class="ed-ctrl-label">צבע</span>';
    colWrap.appendChild(swatches(e.color || null, (hex) => { editAt(selected).color = hex; record(); push(); }));
    controls.appendChild(colWrap);
  }
  renderTools();
  updateHistBtns();
  push();

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

  return () => { if (twTimer) clearTimeout(twTimer); try { view.remove(); } catch (_) {} };
}
