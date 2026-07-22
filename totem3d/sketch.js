p5.disableFriendlyErrors = true;

/* =========================================================================
   TOTEM 3D  —  accumulating vertical symbol composition
   - Each symbol keeps its own point-cloud builder (shell / mask / eyeMask).
   - Deterministic, tick-driven render so it can be exported frame-by-frame.
   ========================================================================= */

const CANVAS_W = 1080;
const CANVAS_H = 1920;

const OBJ_BASE = "objs/";

// ---- palette (the 4 interface colours) ---------------------------------
const PALETTE = {
  tan:    "#e2bc71",
  dark:   "#282828",
  orange: "#ff5003",
  cream:  "#f5f5ed"
};
const PALETTE_LIST = [PALETTE.tan, PALETTE.dark, PALETTE.orange, PALETTE.cream];

// centre dotted-line colour per background (contrast rule from the interface):
//   orange bg -> cream · tan bg -> dark · dark bg -> cream · cream bg -> dark
const LINE_ON_BG = {
  "#ff5003": "#f5f5ed",
  "#e2bc71": "#282828",
  "#282828": "#f5f5ed",
  "#f5f5ed": "#282828"
};

// The user picks ONE of the 4 as the background (a stage before the globe).
// Symbols are then coloured at random from the OTHER three. Default = tan.
let BG_COLOR = PALETTE.tan;
let LINE_COLOR = LINE_ON_BG[BG_COLOR];

function setBackground(hex) {
  BG_COLOR = hex;
  LINE_COLOR = LINE_ON_BG[hex] || PALETTE.dark;
}

const LINE_DOT_SIZE = 5;
const LINE_DOT_GAP = 22;

// ---- timeline (in ticks / frames @30fps) -------------------------------
const FIRST_SYMBOL_HOLD = 45;   // hero sits alone, big & centered (~1.5s)
const SYMBOL_ADD_EVERY  = 80;   // gap between joins (~2.6s): each forms ~1s, then a clear pause
const SETTLE_FRAMES     = 250;  // hold after the last symbol so all animate TOGETHER
                                //  for a few seconds before the GIF ends (~8s tail)
const REVEAL_FRAMES     = 30;   // each symbol "forms" over ~1s regardless of its point count
const EASE              = 0.07; // position / scale easing per tick
const BOB_AMPLITUDE     = 4;    // subtle vertical float (px)
const MOTION_DELAY      = 34;   // ticks a symbol stays frontal after entering, before it animates
const MOTION_RAMP       = 26;   // ticks over which its animation eases in from frontal

const BUILD_STEPS_PER_FRAME = 14;

// ---- shell builder: common working scale so `grid` means the same thing
//      across every OBJ regardless of its native units --------------------
const SHELL_NORM = 300;

// ---- export ------------------------------------------------------------
const EXPORT_TRANSPARENT = true; // true -> transparent PNGs (no bg fill)
let   EXPORT_TOTAL_FRAMES = 0;   // computed from timeline in setup

// ---- GIF export --------------------------------------------------------
const GIF_SCALE      = 1;    // 1 = full 1080x1920. Lower (e.g. 0.5) = smaller/lighter file.
const GIF_FRAME_STEP = 2;    // sample every Nth tick (2 -> ~15fps, half the frames)
const GIF_QUALITY    = 10;   // gif.js quality: lower = better colours but slower

/* ---- symbol profiles ---------------------------------------------------
   `grid` for shell types is now expressed in the SHELL_NORM (~300u) space,
   so smaller grid = denser cloud, consistent across all symbols.
   `grid` for mask/eyeMask is in the mask's own 340u space (unchanged). */
let profiles = [
  { name: "scarab",   file: "scarab.obj",   type: "shell",     grid: 3.4, dotSize: 2.7, color: "#ff5003", targetSize: 300, motion: "swayY" },
  { name: "vegvisir", file: "VEGVISIR.obj", type: "shell",     grid: 4.0, dotSize: 2.8, color: "#ff5003", targetSize: 260, motion: "swayY" },
  { name: "djed",     file: "djed.obj",     type: "shell",     grid: 4.2, dotSize: 3.2, color: "#f5f5ed", targetSize: 300, motion: "pendant" },
  { name: "eye",      file: "eye.obj",      type: "eyeMask",   grid: 5.5, dotSize: 3.2, color: "#ff5003", targetSize: 300, motion: "eyeFlip" },
  { name: "hamsa",    file: "hamsa.obj",    type: "mask",      grid: 5.5, dotSize: 3.2, color: "#f5f5ed", targetSize: 300, motion: "hamsaFlip" },
  { name: "anah",     file: "anah.obj",     type: "shell",     grid: 3.8, dotSize: 2.7, color: "#282828", targetSize: 300, motion: "spinY" },
  { name: "pyramid",  file: "pyramid.obj",  type: "shellBase", grid: 4.6, dotSize: 3.2, color: "#ff5003", targetSize: 280, motion: "spinY" },
  { name: "rimon",    file: "rimon.obj",    type: "shell",     grid: 5.2, dotSize: 3.6, color: "#282828", targetSize: 285, motion: "spinY" }
];

/* Order in which symbols JOIN the composition (top -> bottom in the stack).
   scarab = dominant opener; pyramid = base at the bottom. Reorder freely. */
const JOIN_ORDER = ["scarab", "djed", "eye", "rimon", "anah", "hamsa"];

let objFiles = {};
let symbols = [];                // in `profiles` order
let order = [];                  // symbols in JOIN_ORDER
let buildIndex = 0;
let finishedBuildingAll = false;

let activatedCount = 0;
let liveTick = 0;
let exporting = false;

function preload() {
  for (let p of profiles) {
    objFiles[p.file] = loadStrings(OBJ_BASE + p.file);
  }
}

function setup() {
  const c = createCanvas(CANVAS_W, CANVAS_H, WEBGL);
  c.parent("wrap");
  setAttributes({ alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: true });
  pixelDensity(1);
  frameRate(30);
  noFill();

  for (let p of profiles) {
    let parsed = parseOBJ(objFiles[p.file]);
    const col = color(p.color);
    symbols.push({
      profile: p,
      parsed,
      builder: createBuilder(p, parsed),
      points: [],
      visible: 0,
      active: false,
      x: 0, y: 0, s: 1,
      tx: 0, ty: 0, ts: 1,
      halfW: 0, halfH: 0, halfD: 0, // half extent of the point cloud (screen units, before ts)
      cr: red(col), cg: green(col), cb: blue(col), // colour split for per-point depth shading
      assignedColor: null,  // colour chosen (randomly, diversely) when it joins
      activatedTick: 0,     // tick when this symbol joined (drives the frontal->animate ramp)
      rotOffset: random(1000),
      ready: false
    });
  }

  order = JOIN_ORDER.map(n => symbols.find(s => s.profile.name === n)).filter(Boolean);

  const n = order.length;
  EXPORT_TOTAL_FRAMES = FIRST_SYMBOL_HOLD + (n - 1) * SYMBOL_ADD_EVERY + SETTLE_FRAMES;

  window.__totem = { startExport, startGif: startGifExport, setBackground, PALETTE, symbols, isReady: () => finishedBuildingAll };
}

/* ---- live playback (foreground browser) -------------------------------- */
function draw() {
  if (exporting) return; // export drives its own loop

  if (!finishedBuildingAll) {
    background(BG_COLOR);
    drawMiddleDottedLine();
    buildSymbolsGradually();
    drawLoadingText();
    return;
  }

  liveTick++;
  renderTotem(liveTick, false);
}

/* ---- one deterministic frame ------------------------------------------
   tick drives activation + easing. Because frames are rendered in order
   (both live and during export), the eased state evolves consistently.   */
function renderTotem(tick, transparent) {
  if (transparent) clear();
  else background(BG_COLOR);

  // orthographic camera -> no perspective distortion: every symbol reads
  // flat, frontal and aligned regardless of its position on the canvas.
  ortho(-CANVAS_W / 2, CANVAS_W / 2, -CANVAS_H / 2, CANVAS_H / 2, -4000, 4000);

  drawMiddleDottedLine();

  // how many symbols should be present by this tick
  let target = 1;
  if (tick > FIRST_SYMBOL_HOLD) {
    target = 1 + Math.floor((tick - FIRST_SYMBOL_HOLD) / SYMBOL_ADD_EVERY) + 1;
  }
  target = Math.min(target, order.length);
  while (activatedCount < target) {
    activateSymbol(activatedCount, tick);
    activatedCount++;
  }

  for (let s of order) {
    if (!s.active) continue;
    s.x = lerp(s.x, s.tx, EASE);
    s.y = lerp(s.y, s.ty, EASE);
    s.s = lerp(s.s, s.ts, EASE);
    if (s.visible < s.points.length) {
      s.visible += Math.max(30, s.points.length / REVEAL_FRAMES);
    }
    drawSymbol(s, tick);
  }
}

function resetComposition() {
  activatedCount = 0;
  liveTick = 0;
  for (let s of symbols) {
    s.active = false;
    s.visible = 0;
    s.x = 0; s.y = 0; s.s = 1;
    s.tx = 0; s.ty = 0; s.ts = 1;
    s.activatedTick = 0;
    s.assignedColor = null;
  }
}

function buildSymbolsGradually() {
  if (buildIndex >= symbols.length) {
    finishedBuildingAll = true;
    return;
  }
  let s = symbols[buildIndex];
  for (let i = 0; i < BUILD_STEPS_PER_FRAME; i++) {
    if (!s.ready) s.ready = s.builder.step();
  }
  if (s.ready) {
    s.points = s.builder.points;
    normalizePointsSize(s.points, s.profile.targetSize);
    const b = getBounds(s.points);
    s.halfW = (b.maxX - b.minX) / 2;
    s.halfH = (b.maxY - b.minY) / 2;
    s.halfD = (b.maxZ - b.minZ) / 2;
    shuffleArray(s.points);
    buildIndex++;
  }
}

function drawLoadingText() {
  push();
  resetMatrix();
  fill("#282828");
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(30);
  const nm = symbols[buildIndex] ? symbols[buildIndex].profile.name : "-";
  text("building " + buildIndex + " / " + symbols.length + "  (" + nm + ")", 0, 0);
  pop();
}

function activateSymbol(idx, tick) {
  const s = order[idx];
  if (!s) return;
  s.active = true;
  s.visible = 0;
  s.activatedTick = tick;
  assignSymbolColor(s);
  layoutSymbols();
}

// Colour a newly-joined symbol from the 3 non-background palette colours,
// choosing the least-used one (random tie-break) so each jewel is as diverse
// as possible. The colour is fixed once assigned.
function assignSymbolColor(s) {
  const pool = PALETTE_LIST.filter(c => c !== BG_COLOR);
  const counts = {};
  pool.forEach(c => (counts[c] = 0));
  for (const o of order) {
    if (o !== s && o.active && o.assignedColor && counts[o.assignedColor] != null) {
      counts[o.assignedColor]++;
    }
  }
  let min = Infinity;
  pool.forEach(c => { if (counts[c] < min) min = counts[c]; });
  const candidates = pool.filter(c => counts[c] === min);
  const chosen = candidates[floor(random(candidates.length))];
  s.assignedColor = chosen;
  const col = color(chosen);
  s.cr = red(col); s.cg = green(col); s.cb = blue(col);
}

/* ---- composition layout -----------------------------------------------
   Hero alone = large & centered. As symbols accumulate they arrange top->
   bottom along the central axis with organic left/right drift, uneven
   spacing, and sizes that shrink as the stack densifies.                  */
function layoutSymbols() {
  const active = order.filter(s => s.active);
  const n = active.length;

  // Global scale shrinks a LITTLE with every new arrival (gradual, never a jump
  // straight to the final size). Hero starts big; each join multiplies by SHRINK.
  const HERO_SCALE     = 2.1;
  const SHRINK_PER_ADD = 0.93;
  let gs = HERO_SCALE * Math.pow(SHRINK_PER_ADD, n - 1);

  // symbols live in a central band (~2*EXTENT_HALF tall) so the dotted line keeps
  // empty "tails" top & bottom. Big -> they overlap. Lower EXTENT_HALF = denser.
  const EXTENT_HALF = 740;
  const X_LIMIT     = 528;  // horizontal safe zone (canvas half-width is 540)

  // Deliberately UNEVEN, wide per-symbol size + drift + vertical stagger -> big,
  // eclectic, asymmetric, NOT aligned in a column. (indexed by JOIN_ORDER:
  // scarab, djed, eye, rimon, anah, hamsa)   [the two dark ones, rimon & anah,
  // are pushed to opposite sides so they don't merge into one dark mass]
  const SIZE  = [1.14, 0.92, 1.34, 1.16, 0.82, 1.04];
  const DRIFT = [ 120, -150,  76, -158,  140,  -70];
  const YJIT  = [   0,  -34,  46,  -16,   34,  -52];

  const OVERLAP = 0.6; // <1 => neighbours overlap. Lower = denser/wilder pile.
  const sc = active.map((s, i) => gs * SIZE[i % SIZE.length]);

  // sequential centres with a fixed overlap -> big symbols that overlap but stay
  // readable (no hard compression that turns them into mush).
  const cy = new Array(n);
  cy[0] = 0;
  for (let i = 1; i < n; i++) {
    cy[i] = cy[i - 1] + (active[i - 1].halfH * sc[i - 1] + active[i].halfH * sc[i]) * OVERLAP;
  }

  // safety: if the stack is taller than the central band, scale it all down a bit
  let top = cy[0] - active[0].halfH * sc[0];
  let bottom = cy[n - 1] + active[n - 1].halfH * sc[n - 1];
  if (bottom - top > 2 * EXTENT_HALF) {
    const k = (2 * EXTENT_HALF) / (bottom - top);
    for (let i = 0; i < n; i++) { sc[i] *= k; cy[i] *= k; }
    top = cy[0] - active[0].halfH * sc[0];
    bottom = cy[n - 1] + active[n - 1].halfH * sc[n - 1];
  }
  const mid = (top + bottom) / 2; // centre vertically

  // horizontal drift, then re-centre the whole cluster on the line (area-weighted)
  const dxs = active.map((s, i) => (n === 1) ? 0 : DRIFT[i % DRIFT.length]);
  let wsum = 0, wx = 0;
  for (let i = 0; i < n; i++) { const w = active[i].halfW * sc[i]; wsum += w; wx += w * dxs[i]; }
  const cxOffset = wsum ? wx / wsum : 0;

  for (let i = 0; i < n; i++) {
    const s = active[i];
    s.ts = sc[i];
    const hW = s.halfW * s.ts;

    let dx = dxs[i] - cxOffset;
    // keep every symbol at least TOUCHING the central line. Tall/elongated symbols
    // (height >> width, e.g. djed, anah) are pulled much closer so they sit almost
    // ON the axis; wide symbols may drift more and just graze it.
    const vertical = s.halfH > s.halfW * 1.3;
    const touchLimit = hW * (vertical ? 0.4 : 0.85);
    dx = Math.max(-touchLimit, Math.min(touchLimit, dx));
    const maxDx = X_LIMIT - hW;   // never let the cloud reach the side edges
    dx = Math.max(-maxDx, Math.min(maxDx, dx));

    s.tx = dx;
    s.ty = cy[i] - mid + (n === 1 ? 0 : YJIT[i % YJIT.length]);
  }
}

function drawMiddleDottedLine() {
  push();
  stroke(LINE_COLOR);
  strokeWeight(LINE_DOT_SIZE);
  // line spans ~1000px (±520): symbols live in the central ~760px, leaving
  // short empty "tails" of dotted line above and below the composition.
  const startY = -800;
  const endY = 800;
  for (let y = startY; y <= endY; y += LINE_DOT_GAP) {
    point(0, y, -120);
  }
  pop();
}

function drawSymbol(s, f) {
  const p = s.profile;
  const bob = sin(f * 0.03 + s.rotOffset) * BOB_AMPLITUDE;

  // Frontal while entering; after MOTION_DELAY the symbol eases into its own
  // configured animation (starting from a frontal, forward-facing pose).
  const mt = f - s.activatedTick - MOTION_DELAY;
  const k = mt > 0 ? motionEase(Math.min(mt / MOTION_RAMP, 1)) : 0;
  const a = symbolAngles(p.motion, mt, k);

  push();
  translate(s.x, s.y + bob, 0);
  scale(s.s);
  rotateY(a.ry); rotateX(a.rx); rotateZ(a.rz);
  drawPointsDepth(s, a);
  pop();
}

// rotation angles for a symbol's motion. mt<=0 (entering) => frontal (all zero).
function symbolAngles(motion, mt, k) {
  // Original per-symbol motions (exactly as defined), driven by the symbol's own
  // clock `mt` (0 = just finished entering) and eased in from frontal via `k`.
  let ry = 0, rx = 0, rz = 0;
  if (mt > 0) {
    if (motion === "swayY") {
      ry = sin(mt * 0.018) * 0.45 * k;
    } else if (motion === "spinY") {
      ry = (mt * 0.01) * k;
    } else if (motion === "pendant") {
      rz = sin(mt * 0.045) * 0.32 * k;
      rx = sin(mt * 0.09) * 0.06 * k;
    } else if (motion === "eyeFlip") {
      const t = (sin(mt * 0.018) + 1) * 0.5;
      ry = lerp(-HALF_PI, HALF_PI, t) * k;
    } else if (motion === "hamsaFlip") {
      const t = (sin(mt * 0.018) + 1) * 0.5;
      rx = -lerp(0, PI, t) * k;
    }
  }
  return { ry, rx, rz };
}

// Draw the cloud with a depth cue: front dots are brighter & bigger, back dots
// dimmer & smaller (by each point's z AFTER the current rotation). This makes the
// real 3D volume read, and the shading shifts as the symbol turns.
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
    const zc = Y * sinX + z1 * cosX;         // depth after rotation
    let t = zc / R * 0.5 + 0.5;
    if (t < 0) t = 0; else if (t > 0.999) t = 0.999;
    _depthBuckets[(t * DEPTH_BUCKETS) | 0].push(i);
  }

  // one batched draw call per depth bucket (NOT one per point) -> ~100x fewer
  // draw calls, so it runs fast.
  for (let b = 0; b < DEPTH_BUCKETS; b++) {
    const arr = _depthBuckets[b];
    if (arr.length === 0) continue;
    const t = (b + 0.5) / DEPTH_BUCKETS;      // 0 = back .. 1 = front
    stroke(s.cr, s.cg, s.cb, 110 + 145 * t);  // back dimmer, front full
    strokeWeight(base * (0.6 + 0.75 * t));    // back smaller, front bigger
    beginShape(POINTS);
    for (let j = 0; j < arr.length; j++) {
      const pt = pts[arr[j]];
      vertex(pt.x, -pt.y, pt.z);
    }
    endShape();
  }
}

function motionEase(t) { return t * t * (3 - 2 * t); } // smoothstep

/* ========================================================================
   BUILDERS
   ======================================================================== */
function createBuilder(profile, parsed) {
  if (profile.type === "mask" || profile.type === "eyeMask") {
    return createMaskBuilder(profile, parsed);
  }
  return createShellBuilder(profile, parsed);
}

/* Shell builder: normalizes verts to SHELL_NORM first (so `grid` is
   consistent), buckets triangles by axis-aligned bbox so each scan column
   only tests relevant triangles — keeps heavy OBJs (rimon/anah) feasible. */
function createShellBuilder(profile, parsed) {
  // work on a normalized copy so grid means the same across all symbols
  const verts = parsed.vertices.map(v => v.copy());
  normalizeVertices(verts, SHELL_NORM);
  const faces = parsed.faces;

  let triangles = [];
  let horizontalTriangles = [];

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
    if (profile.type === "shellBase" && isHorizontalTriangle(v0, v1, v2)) {
      horizontalTriangles.push(tri);
    }
  }

  const bounds = getBounds(verts);
  const g = profile.grid;

  let points = [];
  let used = {};
  let mode = "frontBack";
  let currentX = bounds.minX;
  let currentZ = bounds.minZ;
  let colTris = null; // triangles whose bbox spans the current column

  return {
    points,
    step() {
      if (mode === "frontBack") {
        // candidate triangles for this X column
        colTris = [];
        for (const t of triangles) {
          if (currentX >= t.minX && currentX <= t.maxX) colTris.push(t);
        }
        for (let y = bounds.minY; y <= bounds.maxY; y += g) {
          let hits = [];
          for (const t of colTris) {
            if (y < t.minY || y > t.maxY) continue;
            const z = getZIntersection(currentX, y, t.v0, t.v1, t.v2);
            if (z !== null) hits.push(z);
          }
          if (hits.length > 0) {
            hits.sort((a, b) => a - b);
            addPointOnce(points, used, currentX, y, hits[0]);
            addPointOnce(points, used, currentX, y, hits[hits.length - 1]);
          }
        }
        currentX += g;
        if (currentX > bounds.maxX) { mode = "sides"; currentZ = bounds.minZ; }
        return false;
      }

      if (mode === "sides") {
        colTris = [];
        for (const t of triangles) {
          if (currentZ >= t.minZ && currentZ <= t.maxZ) colTris.push(t);
        }
        for (let y = bounds.minY; y <= bounds.maxY; y += g) {
          let hits = [];
          for (const t of colTris) {
            if (y < t.minY || y > t.maxY) continue;
            const x = getXIntersection(currentZ, y, t.v0, t.v1, t.v2);
            if (x !== null) hits.push(x);
          }
          if (hits.length > 0) {
            hits.sort((a, b) => a - b);
            addPointOnce(points, used, hits[0], y, currentZ);
            addPointOnce(points, used, hits[hits.length - 1], y, currentZ);
          }
        }
        currentZ += g;
        if (currentZ > bounds.maxZ) {
          if (profile.type === "shellBase") {
            mode = "base"; currentX = bounds.minX; currentZ = bounds.minZ;
            return false;
          }
          return true;
        }
        return false;
      }

      if (mode === "base") {
        for (let z = bounds.minZ; z <= bounds.maxZ; z += g) {
          for (const t of horizontalTriangles) {
            if (currentX < t.minX || currentX > t.maxX || z < t.minZ || z > t.maxZ) continue;
            const y = getYIntersection(currentX, z, t.v0, t.v1, t.v2);
            if (y !== null) addPointOnce(points, used, currentX, y, z);
          }
        }
        currentX += g;
        if (currentX > bounds.maxX) return true;
        return false;
      }
    }
  };
}

function createMaskBuilder(profile, parsed) {
  const MASK_SIZE = 1000;
  const OBJ_SCALE = 340;
  const DEPTH = 16; // shallow -> mask flips as a clean card-turn (no z-layer "doubling")
  const LAYERS = 2; // few z-layers -> a dotted/textured fill (not a solid slab), like the shells

  let verts = parsed.vertices.map(v => v.copy());
  let faces = parsed.faces;
  normalizeVertices(verts, OBJ_SCALE);

  let maskLayer = createGraphics(MASK_SIZE, MASK_SIZE);
  let pupilMaskLayer = null;
  maskLayer.pixelDensity(1);
  maskLayer.background(0);
  maskLayer.noStroke();
  maskLayer.fill(255);

  if (profile.type === "eyeMask") {
    pupilMaskLayer = createGraphics(MASK_SIZE, MASK_SIZE);
    pupilMaskLayer.pixelDensity(1);
    pupilMaskLayer.background(0);
    pupilMaskLayer.noStroke();
    pupilMaskLayer.fill(255);
  }

  for (let f of faces) {
    let a = verts[f.ids[0]], b = verts[f.ids[1]], c = verts[f.ids[2]];
    if (!a || !b || !c) continue;
    let targetLayer = maskLayer;
    if (profile.type === "eyeMask" && isPupilGroup(f.group)) targetLayer = pupilMaskLayer;
    targetLayer.triangle(
      MASK_SIZE / 2 + a.x, MASK_SIZE / 2 - a.y,
      MASK_SIZE / 2 + b.x, MASK_SIZE / 2 - b.y,
      MASK_SIZE / 2 + c.x, MASK_SIZE / 2 - c.y
    );
  }

  maskLayer.loadPixels();
  if (pupilMaskLayer) pupilMaskLayer.loadPixels();

  const bounds = getBounds(verts);
  const points = [];
  let layerIndex = 0;
  let y = bounds.minY;
  let x = bounds.minX;

  return {
    points,
    step() {
      const cellsPerStep = 500;
      for (let c = 0; c < cellsPerStep; c++) {
        if (layerIndex >= LAYERS) return true;
        let z = map(layerIndex, 0, LAYERS - 1, -DEPTH / 2, DEPTH / 2);
        let dotX = x + (layerIndex % 2) * profile.grid * 0.5;
        let dotY = y - (layerIndex % 3) * profile.grid * 0.25;
        let px = floor(MASK_SIZE / 2 + dotX);
        let py = floor(MASK_SIZE / 2 - dotY);
        if (px >= 0 && px < MASK_SIZE && py >= 0 && py < MASK_SIZE) {
          let index = 4 * (py * MASK_SIZE + px);
          let value = maskLayer.pixels[index];
          if (profile.type === "eyeMask" && pupilMaskLayer) {
            if (pupilMaskLayer.pixels[index] > 10 || value > 10) points.push(createVector(dotX, dotY, z));
          } else if (value > 10) {
            points.push(createVector(dotX, dotY, z));
          }
        }
        x += profile.grid;
        if (x > bounds.maxX) { x = bounds.minX; y += profile.grid; }
        if (y > bounds.maxY) { y = bounds.minY; layerIndex++; }
      }
      return false;
    }
  };
}

/* ========================================================================
   FRAME-BY-FRAME EXPORT
   Writes PNGs straight to a folder (File System Access API) when available,
   otherwise falls back to a single ZIP download. No per-frame prompts.
   ======================================================================== */
async function startExport() {
  if (exporting) return;
  if (!finishedBuildingAll) { setStatus("still building… try again in a moment"); return; }

  exporting = true;
  noLoop();
  resetComposition();

  const total = EXPORT_TOTAL_FRAMES;
  let dirHandle = null;
  let zip = null;

  if (window.showDirectoryPicker) {
    try {
      dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    } catch (e) {
      setStatus("folder pick cancelled — using ZIP fallback");
    }
  }
  if (!dirHandle) {
    if (typeof JSZip === "undefined") {
      setStatus("no folder access and JSZip missing — aborting");
      exporting = false; loop(); return;
    }
    zip = new JSZip();
  }

  for (let t = 0; t < total; t++) {
    renderTotem(t, EXPORT_TRANSPARENT);
    const blob = await frameToPngBlob();
    const name = "frame_" + String(t).padStart(4, "0") + ".png";
    if (dirHandle) {
      const fh = await dirHandle.getFileHandle(name, { create: true });
      const w = await fh.createWritable();
      await w.write(blob);
      await w.close();
    } else {
      zip.file(name, blob);
    }
    if (t % 5 === 0 || t === total - 1) {
      setStatus("exporting frame " + (t + 1) + " / " + total);
    }
    // yield every frame so the GPU/event loop breathes (prevents context loss)
    await new Promise(r => setTimeout(r, 0));
  }

  if (zip) {
    setStatus("zipping " + total + " frames…");
    const content = await zip.generateAsync({ type: "blob" }, m => {
      setStatus("zipping… " + m.percent.toFixed(0) + "%");
    });
    downloadBlob(content, "jewel_frames.zip");
  }

  setStatus("done — " + total + " frames exported ✓");
  exporting = false;
  resetComposition();
  loop();
}

// Render the whole 1080x1920 canvas, frame by frame (deterministic), into an
// animated GIF and download it. Opaque (background baked in) -> clean GIF.
async function startGifExport() {
  if (exporting) return;
  if (typeof GIF === "undefined") { setStatus("gif.js not loaded"); return; }
  if (!finishedBuildingAll) { setStatus("still building… try again in a moment"); return; }

  exporting = true;
  noLoop();
  resetComposition();

  const total = EXPORT_TOTAL_FRAMES;
  const outW = Math.round(CANVAS_W * GIF_SCALE);
  const outH = Math.round(CANVAS_H * GIF_SCALE);
  const delay = Math.round(1000 / 30) * GIF_FRAME_STEP; // ms per GIF frame

  const gif = new GIF({
    workers: 4,
    quality: GIF_QUALITY,
    width: outW,
    height: outH,
    workerScript: "gif.worker.js"
  });

  // WebGL canvas -> flip into a full-res 2D canvas -> (optionally) downscale
  const cnv = document.querySelector("canvas");
  const gl = cnv.getContext("webgl2") || cnv.getContext("webgl");
  const pixels = new Uint8Array(CANVAS_W * CANVAS_H * 4);

  const fullc = document.createElement("canvas");
  fullc.width = CANVAS_W; fullc.height = CANVAS_H;
  const fctx = fullc.getContext("2d");

  const outc = document.createElement("canvas");
  outc.width = outW; outc.height = outH;
  const octx = outc.getContext("2d");

  const rowBytes = CANVAS_W * 4;

  for (let t = 0; t < total; t += GIF_FRAME_STEP) {
    renderTotem(t, false); // opaque: bg baked in
    gl.readPixels(0, 0, CANVAS_W, CANVAS_H, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const img = fctx.createImageData(CANVAS_W, CANVAS_H);
    for (let y = 0; y < CANVAS_H; y++) {
      const src = (CANVAS_H - 1 - y) * rowBytes; // WebGL is bottom-up
      img.data.set(pixels.subarray(src, src + rowBytes), y * rowBytes);
    }
    fctx.putImageData(img, 0, 0);
    octx.drawImage(fullc, 0, 0, outW, outH);
    gif.addFrame(octx, { copy: true, delay: delay });

    if (t % 6 === 0 || t + GIF_FRAME_STEP >= total) {
      setStatus("capturing frame " + t + " / " + total);
      await new Promise(r => setTimeout(r, 0)); // yield so the tab stays alive
    }
  }

  gif.on("progress", p => setStatus("encoding GIF… " + Math.round(p * 100) + "%"));
  gif.on("finished", blob => {
    downloadBlob(blob, "jewel.gif");
    setStatus("done — GIF saved (" + Math.round(blob.size / 1048576) + " MB)");
    exporting = false;
    resetComposition();
    loop();
  });

  setStatus("encoding GIF… (this can take a while at full size)");
  gif.render();
}

function frameToPngBlob() {
  const cnv = document.querySelector("canvas");
  const gl = cnv.getContext("webgl2") || cnv.getContext("webgl");
  const W = cnv.width, H = cnv.height;
  const pixels = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  const out = document.createElement("canvas");
  out.width = W; out.height = H;
  const ctx = out.getContext("2d");
  const img = ctx.createImageData(W, H);
  const rowBytes = W * 4;
  for (let yy = 0; yy < H; yy++) {
    const src = (H - 1 - yy) * rowBytes;
    img.data.set(pixels.subarray(src, src + rowBytes), yy * rowBytes);
  }
  ctx.putImageData(img, 0, 0);
  return new Promise(res => out.toBlob(res, "image/png"));
}

function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function setStatus(msg) {
  const el = document.getElementById("status");
  if (el) el.textContent = msg;
  console.log("[totem] " + msg);
}

/* ========================================================================
   OBJ PARSING + GEOMETRY HELPERS
   ======================================================================== */
function parseOBJ(lines) {
  let vertices = [];
  let faces = [];
  let currentGroup = "default";
  for (let line of lines) {
    line = line.trim();
    if (line.startsWith("o ") || line.startsWith("g ")) {
      currentGroup = line.substring(2).trim().toLowerCase();
    }
    if (line.startsWith("v ")) {
      let p = line.split(/\s+/);
      vertices.push(createVector(float(p[1]), float(p[2]), float(p[3])));
    }
    if (line.startsWith("f ")) {
      let p = line.split(/\s+/).slice(1);
      let ids = p.map(part => int(part.split("/")[0]) - 1);
      for (let i = 1; i < ids.length - 1; i++) {
        faces.push({ ids: [ids[0], ids[i], ids[i + 1]], group: currentGroup });
      }
    }
  }
  return { vertices, faces };
}

function isPupilGroup(groupName) {
  const keywords = ["pupil", "iris", "center", "circle", "אישון"];
  groupName = (groupName || "").toLowerCase();
  return keywords.some(k => groupName.includes(k.toLowerCase()));
}

function normalizeVertices(vertices, targetSize) {
  let b = getBounds(vertices);
  const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2, cz = (b.minZ + b.maxZ) / 2;
  const size = max(b.maxX - b.minX, b.maxY - b.minY, b.maxZ - b.minZ) || 1;
  const sc = targetSize / size;
  for (let v of vertices) { v.x = (v.x - cx) * sc; v.y = (v.y - cy) * sc; v.z = (v.z - cz) * sc; }
}

function normalizePointsSize(points, targetSize) {
  if (points.length === 0) return;
  let b = getBounds(points);
  const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2, cz = (b.minZ + b.maxZ) / 2;
  const size = max(b.maxX - b.minX, b.maxY - b.minY, b.maxZ - b.minZ) || 1;
  const sc = targetSize / size;
  for (let p of points) { p.x = (p.x - cx) * sc; p.y = (p.y - cy) * sc; p.z = (p.z - cz) * sc; }
}

function getBounds(arr) {
  let b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (let v of arr) {
    b.minX = min(b.minX, v.x); b.maxX = max(b.maxX, v.x);
    b.minY = min(b.minY, v.y); b.maxY = max(b.maxY, v.y);
    b.minZ = min(b.minZ, v.z); b.maxZ = max(b.maxZ, v.z);
  }
  return b;
}

function addPointOnce(arr, used, x, y, z) {
  const key = round(x / 1.8) + "," + round(y / 1.8) + "," + round(z / 1.8);
  if (used[key]) return;
  used[key] = true;
  arr.push(createVector(x, y, z));
}

function isHorizontalTriangle(v0, v1, v2) {
  const ax = v1.x - v0.x, ay = v1.y - v0.y, az = v1.z - v0.z;
  const bx = v2.x - v0.x, by = v2.y - v0.y, bz = v2.z - v0.z;
  const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
  const len = sqrt(nx * nx + ny * ny + nz * nz);
  if (len < 0.000001) return false;
  return abs(ny / len) > 0.75;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = floor(random(i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function fract(x) { return x - Math.floor(x); }

function getZIntersection(px, py, v0, v1, v2) {
  const x0 = v0.x, y0 = v0.y, z0 = v0.z, x1 = v1.x, y1 = v1.y, z1 = v1.z, x2 = v2.x, y2 = v2.y, z2 = v2.z;
  const denom = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
  if (abs(denom) < 0.000001) return null;
  const a = ((y1 - y2) * (px - x2) + (x2 - x1) * (py - y2)) / denom;
  const b = ((y2 - y0) * (px - x2) + (x0 - x2) * (py - y2)) / denom;
  const c = 1 - a - b;
  if (a < 0 || b < 0 || c < 0) return null;
  return a * z0 + b * z1 + c * z2;
}

function getXIntersection(pz, py, v0, v1, v2) {
  const x0 = v0.x, y0 = v0.y, z0 = v0.z, x1 = v1.x, y1 = v1.y, z1 = v1.z, x2 = v2.x, y2 = v2.y, z2 = v2.z;
  const denom = (y1 - y2) * (z0 - z2) + (z2 - z1) * (y0 - y2);
  if (abs(denom) < 0.000001) return null;
  const a = ((y1 - y2) * (pz - z2) + (z2 - z1) * (py - y2)) / denom;
  const b = ((y2 - y0) * (pz - z2) + (z0 - z2) * (py - y2)) / denom;
  const c = 1 - a - b;
  if (a < 0 || b < 0 || c < 0) return null;
  return a * x0 + b * x1 + c * x2;
}

function getYIntersection(px, pz, v0, v1, v2) {
  const x0 = v0.x, y0 = v0.y, z0 = v0.z, x1 = v1.x, y1 = v1.y, z1 = v1.z, x2 = v2.x, y2 = v2.y, z2 = v2.z;
  const denom = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2);
  if (abs(denom) < 0.000001) return null;
  const a = ((z1 - z2) * (px - x2) + (x2 - x1) * (pz - z2)) / denom;
  const b = ((z2 - z0) * (px - x2) + (x0 - x2) * (pz - z2)) / denom;
  const c = 1 - a - b;
  if (a < 0 || b < 0 || c < 0) return null;
  return a * y0 + b * y1 + c * y2;
}

/* keyboard: E = export */
function keyPressed() {
  if (key === "e" || key === "E") startExport();
}
