/* virtual-keyboard.js — Hebrew on-screen keyboard.
   Bound on demand to a text input; appears when input is focused,
   hides on outside click. Heavy-condensed styling — see virtual-keyboard.css. */

import './virtual-keyboard.css';

const HEBREW_ROWS = [
  ['ק','ר','א','ט','ו','ן','ם','פ'],
  ['ש','ד','ג','כ','ע','י','ח','ל','ך','ף'],
  ['ז','ס','ב','ה','נ','מ','צ','ת','ץ'],
];

let kbEl = null;
let boundInput = null;

function ensureBuilt() {
  if (kbEl) return kbEl;
  kbEl = document.createElement('div');
  kbEl.id = 'virtual-keyboard';
  kbEl.className = 'vk-hidden';
  kbEl.setAttribute('dir', 'ltr');
  kbEl.setAttribute('aria-hidden', 'true');

  HEBREW_ROWS.forEach((row, rowIdx) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'vk-row';
    row.forEach((letter) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vk-key';
      btn.dataset.key = letter;
      btn.textContent = letter;
      rowEl.appendChild(btn);
    });
    kbEl.appendChild(rowEl);
  });

  // Bottom row: backspace | space | enter
  const bottomRow = document.createElement('div');
  bottomRow.className = 'vk-row vk-row-controls';

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'vk-key vk-key-ctrl';
  backBtn.dataset.action = 'backspace';
  backBtn.textContent = '⌫';
  bottomRow.appendChild(backBtn);

  const spaceBtn = document.createElement('button');
  spaceBtn.type = 'button';
  spaceBtn.className = 'vk-key vk-key-space';
  spaceBtn.dataset.action = 'space';
  spaceBtn.textContent = 'רווח';
  bottomRow.appendChild(spaceBtn);

  const enterBtn = document.createElement('button');
  enterBtn.type = 'button';
  enterBtn.className = 'vk-key vk-key-ctrl';
  enterBtn.dataset.action = 'enter';
  enterBtn.textContent = '↵';
  bottomRow.appendChild(enterBtn);

  kbEl.appendChild(bottomRow);

  // Prevent input from losing focus when pressing a key
  kbEl.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });

  kbEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.vk-key');
    if (!btn || !boundInput) return;
    if (btn.dataset.action === 'backspace') {
      backspaceAt(boundInput);
    } else if (btn.dataset.action === 'space') {
      insertAt(boundInput, ' ');
    } else if (btn.dataset.action === 'enter') {
      const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      boundInput.dispatchEvent(ev);
    } else if (btn.dataset.key) {
      insertAt(boundInput, btn.dataset.key);
    }
  });

  document.body.appendChild(kbEl);
  return kbEl;
}

function insertAt(input, text) {
  const start = input.selectionStart ?? input.value.length;
  const end   = input.selectionEnd ?? input.value.length;
  input.value = input.value.slice(0, start) + text + input.value.slice(end);
  const pos = start + text.length;
  try { input.setSelectionRange(pos, pos); } catch (_) {}
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
}

function backspaceAt(input) {
  const start = input.selectionStart ?? input.value.length;
  const end   = input.selectionEnd ?? input.value.length;
  if (start !== end) {
    input.value = input.value.slice(0, start) + input.value.slice(end);
    try { input.setSelectionRange(start, start); } catch (_) {}
  } else if (start > 0) {
    input.value = input.value.slice(0, start - 1) + input.value.slice(start);
    try { input.setSelectionRange(start - 1, start - 1); } catch (_) {}
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
}

function show() {
  ensureBuilt();
  kbEl.classList.remove('vk-hidden');
  kbEl.setAttribute('aria-hidden', 'false');
}

function hide() {
  if (!kbEl) return;
  kbEl.classList.add('vk-hidden');
  kbEl.setAttribute('aria-hidden', 'true');
}

/** Attach the keyboard to a single text input. Idempotent per-input. */
export function attachKeyboardTo(input) {
  if (!input || input.dataset.vkBound === '1') return;
  input.dataset.vkBound = '1';
  ensureBuilt();

  // Only open on explicit USER interaction — never on programmatic focus.
  const open = () => { boundInput = input; show(); };
  input.addEventListener('pointerdown', open);
  input.addEventListener('click', open);
  input.addEventListener('touchstart', open, { passive: true });
}

/** Programmatically open the keyboard for a given input (e.g. when a text box
    is revealed automatically rather than by a user tap). */
export function openKeyboardFor(input) {
  if (!input) return;
  boundInput = input;
  show();
  input.focus();
}

/** Hide and unbind. Called when leaving a step. */
export function detachKeyboard() {
  boundInput = null;
  hide();
}

// The keyboard stays open once shown; it is only hidden when the step is left
// (detachKeyboard). Clicking the background / outside the text box no longer
// drops it.
