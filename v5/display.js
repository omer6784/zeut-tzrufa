/* display.js — external portrait display screen.

   Renders the generated 3D "jewel", driven entirely by state the main interface
   publishes. The jewel itself is the global p5 engine loaded in display.html
   (window.__jewel); this module only forwards the accumulating list of chosen
   symbols (payload.symbols3d) to it. It never mutates interface state and has
   no UI. */

const ARTIFACT_CHANNEL = 'zehut-artifact';
const ARTIFACT_STORAGE_KEY = 'zehut-artifact-data';

// Centre-line dot colour per background — the contrast rule that mirrors the
// interface's background swatches (see LINE_ON in questionnaire.js).
const LINE_ON = {
  '#282828': '#f5f5ed',   // dark  → cream line
  '#f5f5ed': '#282828',   // cream → dark line
  '#e2bc71': '#282828',   // tan   → dark line
  '#ff5003': '#f5f5ed',   // orange→ cream line
};

let latest = null;

// Restore the latest snapshot immediately, so a display opened mid-session
// shows the object as it currently stands rather than starting empty.
try {
  const raw = localStorage.getItem(ARTIFACT_STORAGE_KEY);
  if (raw) latest = JSON.parse(raw);
} catch (_) { latest = null; }

// Push the chosen-symbols stack into the jewel. Safe to call before the engine
// has finished building — it queues the request internally.
function applyData(data) {
  if (!data) return;
  latest = data;
  // Centre-line colour follows the chosen background — pure CSS, so apply it
  // even before the 3D engine is ready.
  if (data.background) {
    const line = LINE_ON[String(data.background).toLowerCase()] || '#f5f5ed';
    document.documentElement.style.setProperty('--center-line-color', line);
  }
  if (!window.__jewel) return;
  if (data.background) window.__jewel.setBackground(data.background);
  const keys = Array.isArray(data.symbols3d) ? data.symbols3d : [];
  window.__jewel.setSymbols(keys);
  // Name's gematria → the dotted Moroccan floral frame around the jewel.
  if (window.__jewel.setGematria) window.__jewel.setGematria(data.gematria || 0);
  // Editor tweaks (per-symbol size/position/colour + frame colour), applied AFTER
  // the symbols exist so the overrides land on the right instances.
  if (window.__jewel.applyEdits && (data.edits || data.frameColor)) {
    window.__jewel.applyEdits({ symbols: data.edits || [], frameColor: data.frameColor || null });
  }
}

// The engine sets window.__jewel in its p5 setup() and fires 'jewel-loaded'.
function whenJewelReady(cb) {
  if (window.__jewel) cb();
  else window.addEventListener('jewel-loaded', cb, { once: true });
}
whenJewelReady(() => applyData(latest));

// Live updates from the main interface (same-origin, any tab/window).
try {
  if ('BroadcastChannel' in window) {
    const bc = new BroadcastChannel(ARTIFACT_CHANNEL);
    bc.onmessage = (e) => {
      if (e.data && e.data.type === 'artifact' && e.data.payload) applyData(e.data.payload);
    };
  }
} catch (_) { /* BroadcastChannel unsupported — storage fallback covers it */ }

// Fallback / secondary channel: localStorage writes fire `storage` events
// in OTHER documents, so this catches updates even without BroadcastChannel.
window.addEventListener('storage', (e) => {
  if (e.key === ARTIFACT_STORAGE_KEY && e.newValue) {
    try { applyData(JSON.parse(e.newValue)); } catch (_) { /* ignore */ }
  }
});
