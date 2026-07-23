/* jewel-engine.js — the 3D dotted "jewel" for the exhibition display screen.

   A global-mode p5 sketch (the refined totem engine) adapted for embedding:
   - transparent (no background, no own centre line — the display page owns those)
   - interactive: symbols are added by the interface via window.__jewel.setSymbols()
   - each symbol keeps its own point-cloud character; the composition accumulates,
     shrinks gradually, hugs the centre axis, is depth-shaded and animated.

   Public API (window.__jewel):
     setSymbols(keys[])  — the accumulating list of chosen symbol keys (append-only)
     reset()             — clear the jewel
     setBackground(hex)  — pick the background colour (symbols use the other 3)
     isReady()           — point clouds finished building
*/

p5.disableFriendlyErrors = true;

const CANVAS_W = 1080;
const CANVAS_H = 1920;
const TAU = Math.PI * 2;
const OBJ_BASE = "/jewel/objs/";

/* ---- palette (the 4 interface colours) --------------------------------- */
const PALETTE = { tan: "#e2bc71", dark: "#282828", orange: "#ff5003", cream: "#f5f5ed" };
const PALETTE_LIST = [PALETTE.tan, PALETTE.dark, PALETTE.orange, PALETTE.cream];

// Until the "choose background" stage exists, the display keeps its own light
// plate (#efede9). We render TRANSPARENT over it and simply avoid the near-white
// cream for symbols so they read on the light plate.
let RENDER_BG = null;               // null => transparent (clear)
let COLOR_EXCLUDE = PALETTE.cream;  // colour NOT used for symbols

/* ---- timing / motion (same feel as the standalone jewel) --------------- */
const REVEAL_FRAMES = 30;
const FRAME_MS = 1000 / 30;   // the pace is defined in 30fps "ticks"; wall-clock drives it
const EASE = 0.07;
const BOB_AMPLITUDE = 4;
const MOTION_DELAY = 34;
const MOTION_RAMP = 26;
const BUILD_STEPS_PER_FRAME = 14;
const SHELL_NORM = 300;

/* ---- symbol profiles (keyed by symbol key) ----------------------------- */
const PROFILES = {
  scarab: { file: "scarab.obj", type: "shell",     grid: 3.4, dotSize: 3.4, targetSize: 300, motion: "swayY" },
  djed:   { file: "djed.obj",   type: "shell",     grid: 4.2, dotSize: 2.7, targetSize: 300, motion: "pendant" },  // narrow pillar scales up more, so a smaller dot keeps it in line
  // eye — same 3D treatment as rimon/fish (shell surface + depth shading),
  // keeping only its own flip animation.
  eye:    { file: "eye.obj",    type: "shell",     grid: 4.2, dotSize: 3.4, targetSize: 300, motion: "eyeFlip" },
  rimon:  { file: "rimon.obj",  type: "shell",     grid: 6.6, dotSize: 3.4, targetSize: 285, motion: "spinY" },
  anah:   { file: "anah.obj",   type: "shell",     grid: 3.8, dotSize: 3.4, targetSize: 300, motion: "spinY" },
  // hamsa — same 3D treatment as rimon/fish (shell surface + depth shading),
  // keeping only its own flip animation.
  hamsa:  { file: "hamsa.obj",  type: "shell",     grid: 4.2, dotSize: 3.4, targetSize: 300, motion: "hamsaFlip" },
  fish:   { file: "fish.obj",   type: "shell",     grid: 4.4, dotSize: 3.4, targetSize: 300, zScale: 2.5, motion: "swayY" },
  // ── new symbols — same shell + depth-shaded language, each with its own
  //    animation (from the user's per-symbol sketch). ──
  lotus:   { file: "lotus.obj",    type: "shell", grid: 4.2, dotSize: 3.4, targetSize: 300, baseRotY: Math.PI / 2, motion: "pulse" },  // grows / shrinks
  dharma:  { file: "Dharma.obj",   type: "shell", grid: 4.6, dotSize: 3.4, targetSize: 300, motion: "spinY" },                          // continuous Y spin
  vegvisir:{ file: "VEGVISIR.obj", type: "shell", grid: 4.2, dotSize: 3.4, targetSize: 300, motion: "spinY" },                          // placeholder animation
  pyramid: { file: "pyramid.obj",  type: "shell", grid: 4.4, dotSize: 3.4, targetSize: 300, motion: "swayY" },                          // placeholder animation
  // ── artichoke / horseshoe / spiral / moon / tiltan — same shell + depth-shaded
  //    language as the rest; each keeps the animation from its symbols-3d entry.
  artichoke:{ file: "artichoke.obj", type: "shell", grid: 4.2, dotSize: 3.4, targetSize: 300, motion: "pulse" },                        // breathing
  horseshoe:{ file: "horseshoe.obj", type: "shell", grid: 4.2, dotSize: 3.4, targetSize: 300, zScale: 3, motion: "pendant" },           // flat OBJ → depth-boosted; gentle sway
  spiral:   { file: "spiral.obj",    type: "shell", grid: 4.4, dotSize: 3.4, targetSize: 300, motion: "spinY" },                        // continuous Y spin
  moon:     { file: "moon.obj",      type: "shell", grid: 4.2, dotSize: 3.4, targetSize: 300, motion: "pendant" },                      // gentle sway
  tiltan:   { file: "tiltan.obj",    type: "shell", grid: 4.6, dotSize: 3.4, targetSize: 300, motion: "spinY" }                         // continuous Y spin
};
const BUILD_KEYS = Object.keys(PROFILES); // build all up-front (~0.3s)

/* ---- IDLE GALLERY -------------------------------------------------------
   While the interface still shows its opening screen (nobody has pressed
   "לחץ להתחלה"), the display shows a 4×5 grid of 20 fixed, each-different
   talismans, every one animating with its symbols' own motions. It is one
   WEBGL canvas: each mini-jewel's grid transform is BAKED into its symbol
   instances (position + scale), because p5's strokeWeight is screen-space and
   would NOT shrink with a matrix scale() — baking s.s makes the dots scale too.
   The moment the interface goes active, the display swaps to the single live
   jewel (galleryMode off). */
const GALLERY_COLS = 4, GALLERY_ROWS = 5;
const GALLERY_PALETTE = [PALETTE.tan, PALETTE.orange, PALETTE.cream]; // never dark → visible on the dark screen
const GALLERY_CONFIGS = [
  ['hamsa', 'rimon'],            ['eye', 'lotus', 'fish'],      ['scarab', 'djed'],           ['anah', 'spiral'],
  ['moon', 'tiltan', 'dharma'],  ['pyramid', 'horseshoe'],      ['vegvisir', 'artichoke'],    ['hamsa', 'eye', 'moon'],
  ['rimon', 'lotus'],            ['fish', 'spiral', 'anah'],     ['djed', 'pyramid'],          ['scarab', 'tiltan'],
  ['dharma', 'horseshoe', 'moon'], ['lotus', 'artichoke'],      ['eye', 'hamsa'],             ['spiral', 'vegvisir', 'rimon'],
  ['moon', 'fish'],              ['tiltan', 'djed', 'eye'],      ['anah', 'lotus', 'horseshoe'], ['pyramid', 'scarab'],
];
let galleryMode = false;
let galleryInstances = null;   // flat list; each carries its baked grid transform

let objFiles = {};
let built = {};            // key -> symbol object (point cloud ready)
let buildQueue = [];
let buildingKey = null;
let finishedBuildingAll = false;

let order = [];            // symbols currently on the jewel, in add order
let pendingKeys = null;    // setSymbols() arriving before the build finished
let tick = 0;              // 30fps-equivalent tick, derived from wall-clock time
let _t0 = 0;               // millis() baseline

let gematria = 0;          // the name's gematria value (0 = no ornament)
let ornamentDots = [];     // the Moroccan floral frame — EXACTLY `gematria` dots

// Editor overrides (the post-questionnaire "tools" page): per-symbol tweaks
// (index → { scale, dx, dy, color }) and a frame/ornament colour. Applied on top
// of the auto layout/colour so the display reflects the user's manual edits.
let symbolEdits = [];
let frameColorOverride = null;

/* ======================================================================= */
function preload() {
  for (const k of BUILD_KEYS) objFiles[k] = loadStrings(OBJ_BASE + PROFILES[k].file);
}

function setup() {
  pixelDensity(1);
  // NOTE: no setAttributes() — it recreates the WEBGL canvas and leaves a stray
  // one that p5 keeps drawing to (invisible). p5's default WEBGL canvas already
  // has alpha, so clear() gives the transparent background over the plate.
  const c = createCanvas(CANVAS_W, CANVAS_H, WEBGL);
  if (document.getElementById("display-stage")) c.parent("display-stage");
  c.elt.style.height = "100%";
  c.elt.style.width = "auto";
  c.elt.style.display = "block";
  frameRate(30);
  noFill();

  buildQueue = BUILD_KEYS.slice();

  window.__jewel = {
    setSymbols, reset, setBackground, setGematria, applyEdits, setGallery,
    isReady: () => finishedBuildingAll
  };

  // The staged point-cloud build normally runs inside draw() (one chunk per
  // frame). But browsers PAUSE requestAnimationFrame — and therefore p5's draw
  // loop — for hidden/background tabs. The exhibition display is almost always
  // the background tab while the operator drives the main interface, so without
  // this the build would stall forever, leaving every symbol the interface
  // pushes stuck in `pendingKeys` and NOTHING would appear once the display is
  // looked at. A visibility-independent timer steps the build to completion
  // regardless (timers still fire — throttled — when hidden), then stops itself.
  // NOTE: installed BEFORE dispatchEvent below, because that event runs the
  // display's listener synchronously; if it ever throws it must not prevent the
  // build pump from being set up.
  const buildPump = setInterval(() => {
    if (finishedBuildingAll) { clearInterval(buildPump); return; }
    // Do a big chunk per tick so it finishes in ~1 tick even when a hidden tab
    // throttles the timer to ~1s. One-time cost; harmless if draw() also runs.
    for (let n = 0; n < 400 && !finishedBuildingAll; n++) buildStep();
    if (finishedBuildingAll) clearInterval(buildPump);
  }, 60);

  setBackground(PALETTE.dark);   // default: dark-grey background + cream centre line
  window.dispatchEvent(new Event("jewel-loaded"));
}

function draw() {
  if (RENDER_BG) background(RENDER_BG); else clear();
  ortho(-CANVAS_W / 2, CANVAS_W / 2, -CANVAS_H / 2, CANVAS_H / 2, -4000, 4000);

  if (!finishedBuildingAll) { buildStep(); return; }

  // Wall-clock time drives the animation, so it plays at the pace defined in the
  // code REGARDLESS of the real frame rate. (A backgrounded tab throttles rAF;
  // without this the motion would run in slow-motion.)
  if (!_t0) _t0 = millis();
  tick = (millis() - _t0) / FRAME_MS;
  const dtF = Math.min((deltaTime || FRAME_MS) / FRAME_MS, 6); // frames elapsed this draw
  const easeF = 1 - Math.pow(1 - EASE, dtF);

  // Idle gallery (opening screen, nobody touching) → 20 talismans in a grid.
  if (galleryMode) { drawGallery(); return; }

  for (const s of order) {
    if (!s.active) continue;
    s.x = lerp(s.x, s.tx, easeF);
    s.y = lerp(s.y, s.ty, easeF);
    s.s = lerp(s.s, s.ts, easeF);
    if (s.visible < s.points.length) s.visible += Math.max(30, s.points.length / REVEAL_FRAMES) * dtF;
    drawSymbol(s, tick);
  }

  drawOrnament();
}

/* ---- Moroccan floral dot-ornament that frames the jewel --------------------
   Built from EXACTLY `gematria` dots: rosette "flowers" spaced around a
   rectangular border, with the remaining dots strung between them as a
   scalloped arabesque. It reveals in when the name is submitted, then breathes. */
function ornamentColor() {
  if (frameColorOverride) return frameColorOverride;   // editor override
  const order = [PALETTE.tan, PALETTE.cream, PALETTE.orange, PALETTE.dark];
  for (const c of order) if (c !== COLOR_EXCLUDE) return c;
  return PALETTE.tan;
}
// Point + outward normal at arc-length fraction t∈[0,1) of a centred rectangle.
function rectAt(t, hw, hh) {
  const W = 2 * hw, H = 2 * hh, per = 2 * (W + H);
  let d = ((t % 1) + 1) % 1 * per;
  if (d < W) return { x: -hw + d, y: -hh, nx: 0, ny: -1 };
  d -= W; if (d < H) return { x: hw, y: -hh + d, nx: 1, ny: 0 };
  d -= H; if (d < W) return { x: hw - d, y: hh, nx: 0, ny: 1 };
  d -= W;                return { x: -hw, y: hh - d, nx: -1, ny: 0 };
}
// A rosette flower: centre + two offset 8-petal rings = 17 dots. Petals point
// inward/outward off the border normal so it reads as a flower on the frame.
function addFlower(dots, cx, cy, nx, ny) {
  dots.push({ x: cx, y: cy });
  const r1 = 15, r2 = 27;
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; dots.push({ x: cx + Math.cos(a) * r1, y: cy + Math.sin(a) * r1 }); }
  for (let k = 0; k < 8; k++) { const a = (k / 8 + 0.5 / 8) * TAU; dots.push({ x: cx + Math.cos(a) * r2, y: cy + Math.sin(a) * r2 }); }
  return 17;
}
function buildOrnament(N) {
  const dots = [];
  N = Math.max(0, N | 0);
  if (N < 20) { for (let i = 0; i < N; i++) { const a = i / N * TAU; dots.push({ x: Math.cos(a) * 120, y: Math.sin(a) * 120 }); } return dots; }
  const hw = 450, hh = 900, PER_FLOWER = 17;          // frame is 900 × 1800 around the jewel
  let F = Math.max(4, Math.round(N * 0.45 / PER_FLOWER));
  while (PER_FLOWER * F > N - F && F > 1) F--;        // leave ≥1 connector per gap
  const conn = N - PER_FLOWER * F;                    // remaining dots → connectors
  for (let i = 0; i < F; i++) { const p = rectAt(i / F, hw, hh); addFlower(dots, p.x, p.y, p.nx, p.ny); }
  const base = Math.floor(conn / F); let extra = conn - base * F;
  for (let i = 0; i < F; i++) {
    const cnt = base + (extra-- > 0 ? 1 : 0), tA = i / F, tB = (i + 1) / F;
    for (let j = 1; j <= cnt; j++) {
      const f = j / (cnt + 1), p = rectAt(tA + (tB - tA) * f, hw, hh);
      dots.push({ x: p.x, y: p.y });                 // straight dotted edge (no scallop)
    }
  }
  return dots;                                         // dots.length === N
}
function setGematria(n) {
  const v = Math.max(0, n | 0);
  if (v === gematria) return;
  gematria = v;
  ornamentDots = buildOrnament(gematria);
}
// The frame is STATIC — no reveal, no breathing.
function drawOrnament() {
  if (!ornamentDots.length) return;
  const col = color(ornamentColor());
  push();
  stroke(red(col), green(col), blue(col));
  strokeWeight(4.4);
  beginShape(POINTS);
  for (const d of ornamentDots) vertex(d.x, -d.y, 0);
  endShape();
  pop();
}

/* ---- idle gallery: 20 mini-jewels in a 4×5 grid ------------------------ */
function setGallery(on) {
  galleryMode = !!on;
  if (!on) return;
  if (finishedBuildingAll && !galleryInstances) buildGallery();  // else built lazily in draw
}
// A lightweight symbol instance that reuses a pre-built point cloud (no builder).
function galleryInstance(key, hex) {
  const proto = built[key];
  const col = color(hex);
  return {
    key, profile: PROFILES[key], points: proto.points,
    halfW: proto.halfW, halfH: proto.halfH, halfD: proto.halfD,
    visible: proto.points.length, x: 0, y: 0, s: 1, lx: 0, ly: 0, phase: 0,
    cr: red(col), cg: green(col), cb: blue(col),
    activatedTick: 0, rotOffset: random(1000)
  };
}
// Stack a cell's symbols in a clean vertical column, centred on the cell origin.
function layoutGalleryCell(insts) {
  const n = insts.length, OVERLAP = 1.6;
  const ly = new Array(n); ly[0] = 0;
  for (let i = 1; i < n; i++) ly[i] = ly[i - 1] + (insts[i - 1].halfH + insts[i].halfH) * OVERLAP;
  const top = ly[0] - insts[0].halfH, bottom = ly[n - 1] + insts[n - 1].halfH, mid = (top + bottom) / 2;
  insts.forEach((s, i) => { s.lx = 0; s.ly = ly[i] - mid; });
}
function galleryExtent(insts) {
  let minY = Infinity, maxY = -Infinity, maxHW = 0;
  insts.forEach(s => { minY = Math.min(minY, s.ly - s.halfH); maxY = Math.max(maxY, s.ly + s.halfH); maxHW = Math.max(maxHW, s.halfW); });
  return { w: maxHW * 2, h: maxY - minY };
}
function buildGallery() {
  const cellW = CANVAS_W / GALLERY_COLS, cellH = CANVAS_H / GALLERY_ROWS;
  const all = [];
  GALLERY_CONFIGS.forEach((keys, idx) => {
    const c = idx % GALLERY_COLS, r = Math.floor(idx / GALLERY_COLS);
    const cx = -CANVAS_W / 2 + cellW * (c + 0.5);
    const cy = -CANVAS_H / 2 + cellH * (r + 0.5);
    const insts = [];
    keys.forEach((key, i) => { if (built[key]) insts.push(galleryInstance(key, GALLERY_PALETTE[(idx + i) % GALLERY_PALETTE.length])); });
    if (!insts.length) return;
    layoutGalleryCell(insts);
    const ext = galleryExtent(insts);
    const scale = Math.min((cellW * 0.80) / (ext.w || 1), (cellH * 0.78) / (ext.h || 1));
    // Bake the grid transform into each instance (position + scale), so drawSymbol
    // needs no extra push/scale and the dots shrink WITH the jewel.
    insts.forEach(s => { s.s = scale; s.x = cx + s.lx * scale; s.y = cy + s.ly * scale; s.phase = idx * 11.7; });
    all.push(...insts);
  });
  galleryInstances = all;
}
function drawGallery() {
  if (!galleryInstances) buildGallery();
  if (!galleryInstances) return;
  for (const s of galleryInstances) drawSymbol(s, tick + s.phase);
}

/* ---- build all point clouds up-front, staged over frames --------------- */
function buildStep() {
  if (!buildingKey) {
    if (buildQueue.length === 0) {
      finishedBuildingAll = true;
      if (pendingKeys) { const p = pendingKeys; pendingKeys = null; setSymbols(p); }
      return;
    }
    const key = buildQueue.shift();
    const parsed = parseOBJ(objFiles[key]);
    built[key] = makeSymbol(key, parsed);
    buildingKey = built[key];
  }
  const s = buildingKey;
  for (let i = 0; i < BUILD_STEPS_PER_FRAME; i++) {
    if (!s.ready) s.ready = s.builder.step();
  }
  if (s.ready) {
    s.points = s.builder.points;
    normalizePointsSize(s.points, s.profile.targetSize);
    // Optional per-symbol depth (volume) boost: some OBJ files are flatter than
    // others, so their front/back shells sit close together and read flat. A
    // zScale spreads the cloud in Z, widening the depth-shading gradient so the
    // shape reads with more volume — without changing its silhouette.
    if (s.profile.zScale && s.profile.zScale !== 1) {
      for (const pt of s.points) pt.z *= s.profile.zScale;
    }
    const b = getBounds(s.points);
    s.halfW = (b.maxX - b.minX) / 2;
    s.halfH = (b.maxY - b.minY) / 2;
    s.halfD = (b.maxZ - b.minZ) / 2;
    shuffleArray(s.points);
    buildingKey = null;
  }
}

function makeSymbol(key, parsed) {
  const p = PROFILES[key];
  return {
    key, profile: p, parsed,
    builder: createBuilder(p, parsed),
    points: [], visible: 0, active: false,
    x: 0, y: 0, s: 1, tx: 0, ty: 0, ts: 1,
    halfW: 0, halfH: 0, halfD: 0,
    cr: 40, cg: 40, cb: 40, assignedColor: null,
    activatedTick: 0, rotOffset: random(1000), ready: false
  };
}

/* ======================================================================= */
/* Public API                                                              */
function setSymbols(keys) {
  keys = (keys || []).filter(k => PROFILES[k]); // ignore unknown keys safely
  if (!finishedBuildingAll) { pendingKeys = keys.slice(); return; }

  // If the incoming list still starts with what we already show, just append the
  // new ones (the interface's list is append-only). Otherwise rebuild from scratch.
  const cur = order.map(s => s.key);
  let isExtension = keys.length >= cur.length;
  for (let i = 0; i < cur.length && isExtension; i++) if (keys[i] !== cur[i]) isExtension = false;

  if (!isExtension) { order = []; }
  for (let i = order.length; i < keys.length; i++) addSymbol(keys[i]);
}

function reset() {
  order = [];
  _t0 = millis();
  tick = 0;
  gematria = 0; ornamentDots = [];
  symbolEdits = []; frameColorOverride = null;
}

/* Apply the editor's manual tweaks: per-symbol { scale, dx, dy, color } (indexed
   by add order) + an ornament/frame colour. Recolours the symbols and re-runs the
   layout so the position/size overrides take effect; the frame colour is read
   live at draw time (ornamentColor). */
function applyEdits(edits) {
  edits = edits || {};
  symbolEdits = Array.isArray(edits.symbols) ? edits.symbols : [];
  frameColorOverride = edits.frameColor || null;
  order.forEach((s, i) => applySymbolColor(s, i));
  layoutSymbols();
}
/* Set s.cr/cg/cb from the per-symbol edit colour if present, else its auto colour. */
function applySymbolColor(s, i) {
  const hex = (symbolEdits[i] && symbolEdits[i].color) || s.assignedColor;
  if (!hex) return;
  const col = color(hex);
  s.cr = red(col); s.cg = green(col); s.cb = blue(col);
}

function setBackground(hex) {
  if (!hex) return;
  const prev = COLOR_EXCLUDE;
  COLOR_EXCLUDE = hex;                  // symbols use the OTHER 3 palette colours
  // Any AUTO-coloured symbol that now matches the background (so it would blend
  // into it) takes the colour the background just vacated — the one palette
  // colour that wasn't on the jewel before. (Symbols the user manually recoloured
  // keep their choice.)
  if (prev && prev !== hex) {
    const t = color(hex);
    const tr = red(t), tg = green(t), tb = blue(t);
    order.forEach((s, i) => {
      const userSet = symbolEdits[i] && symbolEdits[i].color;
      if (!userSet && Math.abs(s.cr - tr) < 4 && Math.abs(s.cg - tg) < 4 && Math.abs(s.cb - tb) < 4) {
        s.assignedColor = prev;
        const c = color(prev); s.cr = red(c); s.cg = green(c); s.cb = blue(c);
      }
    });
  }
  // The DISPLAY page shows the chosen colour as its background; the canvas stays
  // transparent (RENDER_BG null) so the centre line — behind the jewel — shows
  // through the gaps. The centre-line colour is owned by display.js (the
  // --center-line-color CSS variable), so the engine only sets the backdrop.
  if (document.body) document.body.style.background = hex;
}

/* ---- add one symbol to the accumulating jewel -------------------------- */
function addSymbol(key) {
  const proto = built[key];
  if (!proto) return;
  // a fresh instance per appearance (so the same symbol can repeat with its own
  // colour / animation phase) — shares the prebuilt point cloud.
  const s = Object.assign(makeSymbol(key, proto.parsed), {
    points: proto.points, halfW: proto.halfW, halfH: proto.halfH, halfD: proto.halfD,
    ready: true, builder: null
  });
  s.active = true;
  s.visible = 0;
  s.activatedTick = tick;
  order.push(s);
  assignSymbolColor(s);
  layoutSymbols();
}

/* colour a new symbol from the 3 non-background palette colours (least used) */
function assignSymbolColor(s) {
  const pool = PALETTE_LIST.filter(c => c !== COLOR_EXCLUDE);
  const counts = {};
  pool.forEach(c => (counts[c] = 0));
  for (const o of order) {
    if (o !== s && o.assignedColor && counts[o.assignedColor] != null) counts[o.assignedColor]++;
  }
  let min = Infinity;
  pool.forEach(c => { if (counts[c] < min) min = counts[c]; });
  const cands = pool.filter(c => counts[c] === min);
  const chosen = cands[floor(random(cands.length))];
  s.assignedColor = chosen;
  const col = color(chosen);
  s.cr = red(col); s.cg = green(col); s.cb = blue(col);
}

/* ---- composition layout (accumulate, shrink, hug the axis) ------------- */
function layoutSymbols() {
  const active = order.filter(s => s.active);
  const n = active.length;
  if (n === 0) return;

  // The first symbol lands large (a "hero"); every time another symbol joins,
  // the whole group eases down a step — so a new arrival visibly makes room. The
  // per-position SIZE array keeps them from ever being uniform.
  const HERO_SCALE = 2.6;
  const SHRINK_PER_ADD = 0.9;
  let gs = HERO_SCALE * Math.pow(SHRINK_PER_ADD, n - 1);

  const EXTENT_HALF = 740;
  const X_LIMIT = 528;

  // per-position size / drift / stagger (indexed by add order). Drift + jitter
  // are ZERO so the symbols stack in a clean VERTICAL column on the axis, in add
  // order (stage 2 on top, then 3, 4 …); the group still centres and shrinks as
  // each new one joins (the first appears centred, then rises + shrinks).
  const SIZE  = [1.14, 0.92, 1.34, 1.16, 0.82, 1.04];
  const DRIFT = [ 0, 0, 0, 0, 0, 0];
  const YJIT  = [ 0, 0, 0, 0, 0, 0];

  const OVERLAP = 1.85;   // clear gap between symbols so their (animated) shapes never touch
  const sc = active.map((s, i) => gs * SIZE[i % SIZE.length]);

  const cy = new Array(n);
  cy[0] = 0;
  for (let i = 1; i < n; i++) {
    cy[i] = cy[i - 1] + (active[i - 1].halfH * sc[i - 1] + active[i].halfH * sc[i]) * OVERLAP;
  }
  let top = cy[0] - active[0].halfH * sc[0];
  let bottom = cy[n - 1] + active[n - 1].halfH * sc[n - 1];
  if (bottom - top > 2 * EXTENT_HALF) {
    const k = (2 * EXTENT_HALF) / (bottom - top);
    for (let i = 0; i < n; i++) { sc[i] *= k; cy[i] *= k; }
    top = cy[0] - active[0].halfH * sc[0];
    bottom = cy[n - 1] + active[n - 1].halfH * sc[n - 1];
  }
  const mid = (top + bottom) / 2;

  const dxs = active.map((s, i) => (n === 1) ? 0 : DRIFT[i % DRIFT.length]);
  let wsum = 0, wx = 0;
  for (let i = 0; i < n; i++) { const w = active[i].halfW * sc[i]; wsum += w; wx += w * dxs[i]; }
  const cxOffset = wsum ? wx / wsum : 0;

  for (let i = 0; i < n; i++) {
    const s = active[i];
    s.ts = sc[i];
    const hW = s.halfW * s.ts;
    let dx = (n === 1) ? 0 : dxs[i] - cxOffset;
    // tall/elongated symbols sit almost ON the axis; wide ones may drift & graze it
    const vertical = s.halfH > s.halfW * 1.3;
    const touchLimit = hW * (vertical ? 0.4 : 0.85);
    dx = Math.max(-touchLimit, Math.min(touchLimit, dx));
    const maxDx = X_LIMIT - hW;
    dx = Math.max(-maxDx, Math.min(maxDx, dx));
    s.tx = dx;
    s.ty = cy[i] - mid + (n === 1 ? 0 : YJIT[i % YJIT.length]);
    // Editor per-symbol overrides (scale multiplier + x/y nudge), by add order.
    const e = symbolEdits[order.indexOf(s)];
    if (e) {
      if (e.scale) s.ts *= e.scale;
      if (e.dx) s.tx += e.dx;
      if (e.dy) s.ty += e.dy;
    }
  }
}

/* ---- draw one symbol with depth shading + its own motion --------------- */
function drawSymbol(s, f) {
  const p = s.profile;
  const bob = sin(f * 0.03 + s.rotOffset) * BOB_AMPLITUDE;
  const mt = f - s.activatedTick - MOTION_DELAY;
  const k = mt > 0 ? motionEase(Math.min(mt / MOTION_RAMP, 1)) : 0;
  const a = symbolAngles(p.motion, mt, k);
  // "pulse" motion grows/shrinks the symbol (lotus) instead of rotating it.
  let pulse = 1;
  if(p.motion === 'pulse' && mt > 0) pulse = 1 + 0.2 * k * (0.5 + 0.5 * Math.sin(mt * 0.045 - Math.PI / 2));
  push();
  translate(s.x, s.y + bob, 0);
  scale(s.s * pulse);
  rotateY((p.baseRotY || 0) + a.ry); rotateX(a.rx); rotateZ(a.rz);
  drawPointsDepth(s, a);
  pop();
}

function symbolAngles(motion, mt, k) {
  let ry = 0, rx = 0, rz = 0;
  if (mt > 0) {
    if (motion === "swayY") ry = sin(mt * 0.018) * 0.45 * k;
    else if (motion === "spinY") ry = (mt * 0.01) * k;
    else if (motion === "pendant") { rz = sin(mt * 0.045) * 0.32 * k; rx = sin(mt * 0.09) * 0.06 * k; }
    else if (motion === "eyeFlip") ry = lerp(-HALF_PI, HALF_PI, (sin(mt * 0.018) + 1) * 0.5) * k;
    else if (motion === "hamsaFlip") rx = -lerp(0, PI, (sin(mt * 0.018) + 1) * 0.5) * k;
  }
  return { ry, rx, rz };
}

const DEPTH_BUCKETS = 9;
const _depthBuckets = [[], [], [], [], [], [], [], [], []];
function drawPointsDepth(s, a) {
  const p = s.profile;
  const pts = s.points;
  const limit = min(floor(s.visible), pts.length);
  const R = Math.max(s.halfW, s.halfH, s.halfD, 1);
  const sinY = Math.sin(a.ry), cosY = Math.cos(a.ry);
  const sinX = Math.sin(a.rx), cosX = Math.cos(a.rx);
  const base = p.dotSize * s.s;

  for (let b = 0; b < DEPTH_BUCKETS; b++) _depthBuckets[b].length = 0;
  for (let i = 0; i < limit; i++) {
    const pt = pts[i];
    const X = pt.x, Y = -pt.y, Z = pt.z;
    const z1 = -X * sinY + Z * cosY;
    const zc = Y * sinX + z1 * cosX;
    let t = zc / R * 0.5 + 0.5;
    if (t < 0) t = 0; else if (t > 0.999) t = 0.999;
    _depthBuckets[(t * DEPTH_BUCKETS) | 0].push(pt);
  }
  for (let b = 0; b < DEPTH_BUCKETS; b++) {
    const arr = _depthBuckets[b];
    if (arr.length === 0) continue;
    const t = (b + 0.5) / DEPTH_BUCKETS;
    stroke(s.cr, s.cg, s.cb, 110 + 145 * t);
    strokeWeight(base * (0.6 + 0.75 * t));
    beginShape(POINTS);
    for (let j = 0; j < arr.length; j++) { const pt = arr[j]; vertex(pt.x, -pt.y, pt.z); }
    endShape();
  }
}

function motionEase(t) { return t * t * (3 - 2 * t); }

/* ======================================================================= */
/* Builders + geometry (unchanged from the standalone jewel)               */
function createBuilder(profile, parsed) {
  if (profile.type === "mask" || profile.type === "eyeMask") return createMaskBuilder(profile, parsed);
  return createShellBuilder(profile, parsed);
}

function createShellBuilder(profile, parsed) {
  const verts = parsed.vertices.map(v => v.copy());
  normalizeVertices(verts, SHELL_NORM);
  const faces = parsed.faces;
  let triangles = [], horizontalTriangles = [];
  for (const face of faces) {
    const ids = face.ids;
    const v0 = verts[ids[0]], v1 = verts[ids[1]], v2 = verts[ids[2]];
    if (!v0 || !v1 || !v2) continue;
    const tri = {
      v0, v1, v2,
      minX: Math.min(v0.x, v1.x, v2.x), maxX: Math.max(v0.x, v1.x, v2.x),
      minY: Math.min(v0.y, v1.y, v2.y), maxY: Math.max(v0.y, v1.y, v2.y),
      minZ: Math.min(v0.z, v1.z, v2.z), maxZ: Math.max(v0.z, v1.z, v2.z)
    };
    triangles.push(tri);
    if (profile.type === "shellBase" && isHorizontalTriangle(v0, v1, v2)) horizontalTriangles.push(tri);
  }
  const bounds = getBounds(verts);
  const g = profile.grid;
  let points = [], used = {}, mode = "frontBack";
  let currentX = bounds.minX, currentZ = bounds.minZ, colTris = null;
  return {
    points,
    step() {
      if (mode === "frontBack") {
        colTris = [];
        for (const t of triangles) if (currentX >= t.minX && currentX <= t.maxX) colTris.push(t);
        for (let y = bounds.minY; y <= bounds.maxY; y += g) {
          let hits = [];
          for (const t of colTris) { if (y < t.minY || y > t.maxY) continue; const z = getZIntersection(currentX, y, t.v0, t.v1, t.v2); if (z !== null) hits.push(z); }
          if (hits.length > 0) { hits.sort((a, b) => a - b); addPointOnce(points, used, currentX, y, hits[0]); addPointOnce(points, used, currentX, y, hits[hits.length - 1]); }
        }
        currentX += g;
        if (currentX > bounds.maxX) { mode = "sides"; currentZ = bounds.minZ; }
        return false;
      }
      if (mode === "sides") {
        colTris = [];
        for (const t of triangles) if (currentZ >= t.minZ && currentZ <= t.maxZ) colTris.push(t);
        for (let y = bounds.minY; y <= bounds.maxY; y += g) {
          let hits = [];
          for (const t of colTris) { if (y < t.minY || y > t.maxY) continue; const x = getXIntersection(currentZ, y, t.v0, t.v1, t.v2); if (x !== null) hits.push(x); }
          if (hits.length > 0) { hits.sort((a, b) => a - b); addPointOnce(points, used, hits[0], y, currentZ); addPointOnce(points, used, hits[hits.length - 1], y, currentZ); }
        }
        currentZ += g;
        if (currentZ > bounds.maxZ) { if (profile.type === "shellBase") { mode = "base"; currentX = bounds.minX; currentZ = bounds.minZ; return false; } return true; }
        return false;
      }
      if (mode === "base") {
        for (let z = bounds.minZ; z <= bounds.maxZ; z += g) {
          for (const t of horizontalTriangles) { if (currentX < t.minX || currentX > t.maxX || z < t.minZ || z > t.maxZ) continue; const y = getYIntersection(currentX, z, t.v0, t.v1, t.v2); if (y !== null) addPointOnce(points, used, currentX, y, z); }
        }
        currentX += g;
        if (currentX > bounds.maxX) return true;
        return false;
      }
    }
  };
}

function createMaskBuilder(profile, parsed) {
  const MASK_SIZE = 1000, OBJ_SCALE = 340, DEPTH = 16, LAYERS = 2;
  let verts = parsed.vertices.map(v => v.copy());
  let faces = parsed.faces;
  normalizeVertices(verts, OBJ_SCALE);
  let maskLayer = createGraphics(MASK_SIZE, MASK_SIZE);
  let pupilMaskLayer = null;
  maskLayer.pixelDensity(1); maskLayer.background(0); maskLayer.noStroke(); maskLayer.fill(255);
  if (profile.type === "eyeMask") { pupilMaskLayer = createGraphics(MASK_SIZE, MASK_SIZE); pupilMaskLayer.pixelDensity(1); pupilMaskLayer.background(0); pupilMaskLayer.noStroke(); pupilMaskLayer.fill(255); }
  for (let f of faces) {
    let a = verts[f.ids[0]], b = verts[f.ids[1]], c = verts[f.ids[2]];
    if (!a || !b || !c) continue;
    let target = maskLayer;
    if (profile.type === "eyeMask" && isPupilGroup(f.group)) target = pupilMaskLayer;
    target.triangle(MASK_SIZE / 2 + a.x, MASK_SIZE / 2 - a.y, MASK_SIZE / 2 + b.x, MASK_SIZE / 2 - b.y, MASK_SIZE / 2 + c.x, MASK_SIZE / 2 - c.y);
  }
  maskLayer.loadPixels();
  if (pupilMaskLayer) pupilMaskLayer.loadPixels();
  const bounds = getBounds(verts);
  const points = [];
  let layerIndex = 0, y = bounds.minY, x = bounds.minX;
  return {
    points,
    step() {
      const cellsPerStep = 500;
      for (let c = 0; c < cellsPerStep; c++) {
        if (layerIndex >= LAYERS) return true;
        let z = map(layerIndex, 0, LAYERS - 1, -DEPTH / 2, DEPTH / 2);
        let dotX = x + (layerIndex % 2) * profile.grid * 0.5;
        let dotY = y - (layerIndex % 3) * profile.grid * 0.25;
        let px = floor(MASK_SIZE / 2 + dotX), py = floor(MASK_SIZE / 2 - dotY);
        if (px >= 0 && px < MASK_SIZE && py >= 0 && py < MASK_SIZE) {
          let index = 4 * (py * MASK_SIZE + px);
          let value = maskLayer.pixels[index];
          if (profile.type === "eyeMask" && pupilMaskLayer) { if (pupilMaskLayer.pixels[index] > 10 || value > 10) points.push(createVector(dotX, dotY, z)); }
          else if (value > 10) points.push(createVector(dotX, dotY, z));
        }
        x += profile.grid;
        if (x > bounds.maxX) { x = bounds.minX; y += profile.grid; }
        if (y > bounds.maxY) { y = bounds.minY; layerIndex++; }
      }
      return false;
    }
  };
}

function parseOBJ(lines) {
  let vertices = [], faces = [], currentGroup = "default";
  for (let line of lines) {
    line = line.trim();
    if (line.startsWith("o ") || line.startsWith("g ")) currentGroup = line.substring(2).trim().toLowerCase();
    if (line.startsWith("v ")) { let p = line.split(/\s+/); vertices.push(createVector(float(p[1]), float(p[2]), float(p[3]))); }
    if (line.startsWith("f ")) {
      let p = line.split(/\s+/).slice(1);
      let ids = p.map(part => int(part.split("/")[0]) - 1);
      for (let i = 1; i < ids.length - 1; i++) faces.push({ ids: [ids[0], ids[i], ids[i + 1]], group: currentGroup });
    }
  }
  return { vertices, faces };
}

function isPupilGroup(g) { g = (g || "").toLowerCase(); return ["pupil", "iris", "center", "circle", "אישון"].some(k => g.includes(k)); }
function normalizeVertices(v, t) { let b = getBounds(v); const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2, cz = (b.minZ + b.maxZ) / 2; const size = max(b.maxX - b.minX, b.maxY - b.minY, b.maxZ - b.minZ) || 1; const sc = t / size; for (let p of v) { p.x = (p.x - cx) * sc; p.y = (p.y - cy) * sc; p.z = (p.z - cz) * sc; } }
function normalizePointsSize(pts, t) { if (!pts.length) return; let b = getBounds(pts); const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2, cz = (b.minZ + b.maxZ) / 2; const size = max(b.maxX - b.minX, b.maxY - b.minY, b.maxZ - b.minZ) || 1; const sc = t / size; for (let p of pts) { p.x = (p.x - cx) * sc; p.y = (p.y - cy) * sc; p.z = (p.z - cz) * sc; } }
function getBounds(arr) { let b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity }; for (let v of arr) { b.minX = min(b.minX, v.x); b.maxX = max(b.maxX, v.x); b.minY = min(b.minY, v.y); b.maxY = max(b.maxY, v.y); b.minZ = min(b.minZ, v.z); b.maxZ = max(b.maxZ, v.z); } return b; }
function addPointOnce(arr, used, x, y, z) { const key = round(x / 1.8) + "," + round(y / 1.8) + "," + round(z / 1.8); if (used[key]) return; used[key] = true; arr.push(createVector(x, y, z)); }
function isHorizontalTriangle(v0, v1, v2) { const ax = v1.x - v0.x, ay = v1.y - v0.y, az = v1.z - v0.z; const bx = v2.x - v0.x, by = v2.y - v0.y, bz = v2.z - v0.z; const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const len = sqrt(nx * nx + ny * ny + nz * nz); if (len < 1e-6) return false; return abs(ny / len) > 0.75; }
function shuffleArray(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = floor(random(i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; } }
function getZIntersection(px, py, v0, v1, v2) { const x0 = v0.x, y0 = v0.y, z0 = v0.z, x1 = v1.x, y1 = v1.y, z1 = v1.z, x2 = v2.x, y2 = v2.y, z2 = v2.z; const denom = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2); if (abs(denom) < 1e-6) return null; const a = ((y1 - y2) * (px - x2) + (x2 - x1) * (py - y2)) / denom; const b = ((y2 - y0) * (px - x2) + (x0 - x2) * (py - y2)) / denom; const c = 1 - a - b; if (a < 0 || b < 0 || c < 0) return null; return a * z0 + b * z1 + c * z2; }
function getXIntersection(pz, py, v0, v1, v2) { const x0 = v0.x, y0 = v0.y, z0 = v0.z, x1 = v1.x, y1 = v1.y, z1 = v1.z, x2 = v2.x, y2 = v2.y, z2 = v2.z; const denom = (y1 - y2) * (z0 - z2) + (z2 - z1) * (y0 - y2); if (abs(denom) < 1e-6) return null; const a = ((y1 - y2) * (pz - z2) + (z2 - z1) * (py - y2)) / denom; const b = ((y2 - y0) * (pz - z2) + (z0 - z2) * (py - y2)) / denom; const c = 1 - a - b; if (a < 0 || b < 0 || c < 0) return null; return a * x0 + b * x1 + c * x2; }
function getYIntersection(px, pz, v0, v1, v2) { const x0 = v0.x, y0 = v0.y, z0 = v0.z, x1 = v1.x, y1 = v1.y, z1 = v1.z, x2 = v2.x, y2 = v2.y, z2 = v2.z; const denom = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2); if (abs(denom) < 1e-6) return null; const a = ((z1 - z2) * (px - x2) + (x2 - x1) * (pz - z2)) / denom; const b = ((z2 - z0) * (px - x2) + (x0 - x2) * (pz - z2)) / denom; const c = 1 - a - b; if (a < 0 || b < 0 || c < 0) return null; return a * y0 + b * y1 + c * y2; }
