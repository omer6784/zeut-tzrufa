/* hamsa-pendulum.js — the landing-screen eye.
   ─────────────────────────────────────────────────────────────────────
   The SAME 3D dotted eye as the exhibition display (shell-sampled surface
   with depth shading, ported from jewel-engine), but instead of the
   display's flip it hangs from a cord and swings like a PENDULUM. Only
   points + a dotted cord; transparent background. */
import p5 from 'p5';

export function mountHamsaPendulum(container) {
  const sketch = (p) => {
    let objLines;
    let vertices = [];
    let faces = [];

    let dots = [];               // shell-sampled point cloud
    let staticCordDots = [];
    let movingCordDots = [];

    // A RANDOM 3D symbol from the database hangs each time the landing screen is
    // reached (the eye is just one of them). Same shell sampling + swing/spin
    // animation for all. Volumetric symbols only (flat ones read thin here).
    const SYMBOL_OBJS = [
      '/jewel/objs/eye.obj', '/jewel/objs/hamsa.obj', '/jewel/objs/scarab.obj',
      '/jewel/objs/rimon.obj', '/jewel/objs/fish.obj', '/jewel/objs/lotus.obj',
      '/jewel/objs/Dharma.obj', '/jewel/objs/anah.obj', '/jewel/objs/djed.obj',
      '/jewel/objs/VEGVISIR.obj', '/jewel/objs/pyramid.obj', '/jewel/objs/artichoke.obj',
      '/jewel/objs/spiral.obj', '/jewel/objs/tiltan.obj',
    ];
    // Story/recording frame (demo.html loads index.html with ?story=1) forces the
    // eye so the portrait opening matches the mockup; the exhibition stays random.
    const STORY_MODE = /[?&]story=1\b/.test(window.location.search);
    const fileName = STORY_MODE
      ? '/jewel/objs/eye.obj'
      : SYMBOL_OBJS[Math.floor(Math.random() * SYMBOL_OBJS.length)];

    const OBJ_SCALE = 560;
    const VIEW_SCALE = 1.0;
    const OBJECT_SIZE = 1.0;

    const GRID = 7;              // shell sampling step (in model units)
    const DEPTH_BUCKETS = 9;

    const CORD_STEP = 15;

    const DOT_COLOR = '#e2bc71';

    // The eye stays gold on every landing palette, but gold-on-cream is by far
    // the weakest of the three pairings (against the orange and #282828 plates
    // it carries itself). On the cream one the dots get a little more weight —
    // slightly larger, and a higher alpha floor so the far side of the shell
    // doesn't wash out entirely.
    const ON_CREAM = document.documentElement.classList.contains('landing-cream');
    // Base dot size, depth-scaled per point. Not const: after the shell is
    // sampled we nudge it per-symbol so the sparser symbols (fewer dots) don't
    // read fainter than the dense ones — optical balancing (see buildShellDots).
    let DOT_SIZE = ON_CREAM ? 4.2 : 3.6;
    const CORD_DOT_SIZE = ON_CREAM ? 5.6 : 5;
    const ALPHA_MIN = ON_CREAM ? 155 : 110;  // depth shading runs ALPHA_MIN → 255

    const FIXED_FLIP_X = Math.PI;
    const PENDULUM_SPEED = 0.035;
    // Longer cord so its top (the pivot) reaches up to the top horizontal grid
    // line and the eye reads as hanging FROM it. The swing angle is trimmed in
    // proportion (0.17·620/900) so the eye's side-to-side travel stays the same
    // despite the longer arm.
    const PENDULUM_RANGE = 0.117;  // gentle side-to-side swing, arm-compensated
    // The cord top is anchored to the ACTUAL top horizontal grid line, measured
    // at runtime (see computeCordTopY). A fixed model-y can't do this: the grid
    // line is CSS-positioned while the canvas is sized in vh, so the two scale
    // differently — a value that lands on the line at one viewport height falls
    // short (or overshoots) at another. Measuring keeps the top dot right on the
    // line for EVERY symbol and EVERY screen. This constant is only the fallback
    // used until/if the measurement is available (VIEW_SCALE and OBJECT_SIZE are
    // 1 and the cord sits on the focal plane z=0, so model-y maps 1:1 to canvas
    // px from centre — it lands near the line on the ~720px-tall dev viewport).
    const CORD_TOP_Y_FALLBACK = -770;

    // The eye also turns on its own vertical axis, ADDED on top of the pendulum
    // swing. Same cadence as the display's "eyeFlip" motion (jewel-engine), but
    // only a small turn each way rather than its half-turn.
    const EYE_SPIN_SPEED = 0.018;
    const EYE_SPIN_RANGE = 20 * Math.PI / 180;   // ±20°

    // Story mode only: the eye's own central iris reads as a flat disc/ring.
    // Remove it (PUPIL_CLEAR) and drop in ONE true dotted BALL at the pupil —
    // a solid, volume-filled sphere shaded by its OWN local depth (drawDotsDepth)
    // so it reads volumetric. It lives in the eye's transform group, so it swings
    // and turns with the eye. Model units (OBJ_SCALE = 560 → eye spans ≈±280).
    // The eye's own iris/pupil is the small sparse central zone (r ≲ 70); the
    // dense radial eye BODY begins at r ≈ 80. So replace ONLY that iris zone:
    // clear r < PUPIL_CLEAR and drop the ball there, leaving the eye body (and
    // its radial spokes) intact — no starburst hole.
    const PUPIL_R = 62;       // ball radius ≈ the iris zone
    const PUPIL_CZ = 24;      // nudge forward so it bulges out of the eye face
    const PUPIL_CLEAR = 70;
    // Story: the cord hangs ON the ר of צרופה. Its top dot touches the letter's
    // HORIZONTAL bar, which sits at this fraction down the logotype box (measured
    // from the letters art) — so the cord reads as slung over the bar.
    const STORY_RESH_BAR_FRAC = 0.52;

    let objectMinY = 0, objectMaxY = 0;
    let cordAnchorY = 0, cordPivotY = 0, cordAttachY = 0;
    let halfD = 1, halfW = 1;
    let canvasEl = null;        // the p5 canvas element, for measuring its screen rect
    let cordCalibrated = false; // true once the cord top has been anchored to the real grid line

    // Canvas is wider than the eye needs at rest so the pointed tips still
    // have margin at the peak of the swing — otherwise they cross the WEBGL
    // canvas edge and get clipped ("disappear" into the background). The eye
    // itself is sized in fixed pixels (OBJ_SCALE), so extra width is pure
    // side-margin; the CSS width ratio (geometric.css) matches W/H so the eye
    // keeps its on-screen size.
    const W = 1300, H = 1900;

    p.preload = () => { objLines = p.loadStrings(fileName); };

    p.setup = () => {
      const c = p.createCanvas(W, H, p.WEBGL);
      c.parent(container);
      canvasEl = c.elt;
      p.pixelDensity(1);
      parseOBJ();
      normalizeModel();
      getObjectBounds();
      buildShellDots();     // ← surface sampling + depth shading (display look)
      if (STORY_MODE) {
        // Drop the eye's own flat iris, then add the single 3D ball in its place.
        const rc2 = PUPIL_CLEAR * PUPIL_CLEAR;
        dots = dots.filter(d => (d.x * d.x + d.y * d.y) > rc2);
        addPupilSphere();
      }
      buildCordDots();
      // Expose the sketch so a recorder can force a render if needed.
      if (STORY_MODE) window.__pend = p;
    };

    // One dotted BALL at the pupil (story mode): several CONCENTRIC Fibonacci
    // shells (spherically distributed — no cubic-lattice perspective lines), so
    // it projects to a solid filled disc. Each dot carries its offset from the
    // ball centre (d.sph) so drawBall shades it by LOCAL depth — bright/fat at
    // the front, faint/small at the back: a true 3D ball.
    function addPupilSphere() {
      const gold = (Math.sqrt(5) + 1) / 2;
      const shells = [[1.0, 320], [0.8, 220], [0.58, 130], [0.34, 64]];
      for (const [rf, n] of shells) {
        const R = PUPIL_R * rf;
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          const inc = Math.acos(1 - 2 * t);
          const az = 2 * Math.PI * i / gold;
          const ox = R * Math.sin(inc) * Math.cos(az);
          const oy = R * Math.cos(inc);
          const oz = R * Math.sin(inc) * Math.sin(az);
          dots.push({ x: ox, y: oy, z: PUPIL_CZ + oz, sph: { ox, oz, R: PUPIL_R } });
        }
      }
    }

    p.draw = () => {
      p.clear();
      // Anchor the cord to the real grid line as soon as layout is measurable
      // (setup can run a frame before the canvas/grid have their final boxes).
      if (!cordCalibrated) cordCalibrated = buildCordDots();
      // Motion phase. The exhibition runs at ~60fps so frameCount is fine, but a
      // headless recording renders below 60fps — a frameCount phase would then
      // play back in slow motion. In Story mode derive the phase from wall-clock
      // time (millis × 60 = "frames at 60fps"), so the swing/turn run at the
      // intended speed regardless of the actual render framerate.
      // A recorder can inject window.__storyPhase (in 60fps-frame units) to drive
      // the motion deterministically frame-by-frame (headless throttles rAF, so a
      // real-time loop barely advances). Otherwise use wall-clock time.
      const phase = STORY_MODE
        ? (window.__storyPhase != null ? window.__storyPhase : p.millis() / 1000 * 60)
        : p.frameCount;
      const swing = p.sin(phase * PENDULUM_SPEED) * PENDULUM_RANGE;
      const spin  = p.sin(phase * EYE_SPIN_SPEED) * EYE_SPIN_RANGE;

      p.rotateX(-FIXED_FLIP_X);
      p.scale(VIEW_SCALE, -VIEW_SCALE, VIEW_SCALE);

      drawStaticCordDots();

      // Everything else swings around the top anchor (pendulum).
      p.push();
      p.scale(OBJECT_SIZE);
      p.translate(0, cordPivotY, 0);
      p.rotateZ(swing);
      p.translate(0, -cordPivotY, 0);
      drawMovingCordDots();
      // The eye turns on its own axis IN ADDITION to the swing. Scoped to its
      // own push/pop so the cord above it stays hanging straight.
      p.push();
      p.rotateY(spin);
      drawDotsDepth(spin);
      if (STORY_MODE) drawBall(spin);
      p.pop();
      p.pop();
    };

    // Re-anchor the cord to the grid line when the viewport changes size (the
    // canvas is sized in vh, the grid line in CSS px, so their relation shifts).
    p.windowResized = () => { cordCalibrated = buildCordDots(); };

    function parseOBJ() {
      for (let line of objLines) {
        line = line.trim();
        if (line.startsWith('v ')) {
          const q = line.split(/\s+/);
          vertices.push(p.createVector(p.float(q[1]), p.float(q[2]), p.float(q[3])));
        }
        if (line.startsWith('f ')) {
          const q = line.split(/\s+/).slice(1);
          const ids = q.map(part => p.int(part.split('/')[0]) - 1);
          for (let i = 1; i < ids.length - 1; i++) faces.push([ids[0], ids[i], ids[i + 1]]);
        }
      }
    }

    function normalizeModel() {
      let minV = p.createVector(Infinity, Infinity, Infinity);
      let maxV = p.createVector(-Infinity, -Infinity, -Infinity);
      for (const v of vertices) {
        minV.x = p.min(minV.x, v.x); minV.y = p.min(minV.y, v.y); minV.z = p.min(minV.z, v.z);
        maxV.x = p.max(maxV.x, v.x); maxV.y = p.max(maxV.y, v.y); maxV.z = p.max(maxV.z, v.z);
      }
      const center = p5.Vector.add(minV, maxV).mult(0.5);
      const size = p.max(maxV.x - minV.x, maxV.y - minV.y, maxV.z - minV.z);
      for (const v of vertices) { v.sub(center); v.mult(OBJ_SCALE / size); }
      // Flip Y so the symbol hangs in the SAME orientation as the display screen
      // (jewel-engine renders vertex y negated; this pendulum's global transform
      // does not, so without this the opening symbols came out upside-down vs the
      // display). The model is centred at the origin, so this leaves objectMinY /
      // objectMaxY — and therefore the cord attachment — unchanged.
      for (const v of vertices) { v.y = -v.y; }
    }

    function getObjectBounds() {
      objectMinY = Infinity; objectMaxY = -Infinity;
      for (const v of vertices) { objectMinY = p.min(objectMinY, v.y); objectMaxY = p.max(objectMaxY, v.y); }
    }

    /* ── Shell sampling — ray-cast the surface front/back + sides into a dotted
          point cloud, exactly like the display's eye (jewel-engine shell). ── */
    function buildShellDots() {
      dots = [];
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const v of vertices) {
        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
      }
      const tris = [];
      for (const f of faces) {
        const v0 = vertices[f[0]], v1 = vertices[f[1]], v2 = vertices[f[2]];
        if (!v0 || !v1 || !v2) continue;
        tris.push({ v0, v1, v2,
          minX: Math.min(v0.x, v1.x, v2.x), maxX: Math.max(v0.x, v1.x, v2.x),
          minY: Math.min(v0.y, v1.y, v2.y), maxY: Math.max(v0.y, v1.y, v2.y),
          minZ: Math.min(v0.z, v1.z, v2.z), maxZ: Math.max(v0.z, v1.z, v2.z) });
      }
      const used = {};
      const addOnce = (x, y, z) => {
        const k = Math.round(x / 1.8) + ',' + Math.round(y / 1.8) + ',' + Math.round(z / 1.8);
        if (used[k]) return; used[k] = 1; dots.push({ x, y, z });
      };
      for (let x = minX; x <= maxX; x += GRID) {
        for (let y = minY; y <= maxY; y += GRID) {
          let hits = [];
          for (const t of tris) { if (x < t.minX || x > t.maxX || y < t.minY || y > t.maxY) continue; const z = getZIntersection(x, y, t.v0, t.v1, t.v2); if (z !== null) hits.push(z); }
          if (hits.length) { hits.sort((a, b) => a - b); addOnce(x, y, hits[0]); addOnce(x, y, hits[hits.length - 1]); }
        }
      }
      for (let z = minZ; z <= maxZ; z += GRID) {
        for (let y = minY; y <= maxY; y += GRID) {
          let hits = [];
          for (const t of tris) { if (z < t.minZ || z > t.maxZ || y < t.minY || y > t.maxY) continue; const x = getXIntersection(z, y, t.v0, t.v1, t.v2); if (x !== null) hits.push(x); }
          if (hits.length) { hits.sort((a, b) => a - b); addOnce(hits[0], y, z); addOnce(hits[hits.length - 1], y, z); }
        }
      }
      halfD = (maxZ - minZ) / 2 || 1;
      halfW = (maxX - minX) / 2 || 1;   // needed to re-measure depth once spun

      // Optical balancing: symbols with a smaller surface sample fewer dots and
      // read fainter than the dense ones (the eye). Scale the base dot size up
      // for the sparse ones only — a symbol at the reference count keeps 3.6,
      // sparser symbols grow (capped) so they carry equal visual weight. Dense
      // symbols are left at the base (we never shrink below it).
      const REF_COUNT = 2200;
      DOT_SIZE = Math.min(5.4, Math.max(3.6, 3.6 * Math.sqrt(REF_COUNT / Math.max(1, dots.length))));
    }

    function getZIntersection(px, py, v0, v1, v2) {
      const x0 = v0.x, y0 = v0.y, z0 = v0.z, x1 = v1.x, y1 = v1.y, z1 = v1.z, x2 = v2.x, y2 = v2.y, z2 = v2.z;
      const denom = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
      if (Math.abs(denom) < 1e-6) return null;
      const a = ((y1 - y2) * (px - x2) + (x2 - x1) * (py - y2)) / denom;
      const b = ((y2 - y0) * (px - x2) + (x0 - x2) * (py - y2)) / denom;
      const c = 1 - a - b;
      if (a < 0 || b < 0 || c < 0) return null;
      return a * z0 + b * z1 + c * z2;
    }
    function getXIntersection(pz, py, v0, v1, v2) {
      const x0 = v0.x, y0 = v0.y, z0 = v0.z, x1 = v1.x, y1 = v1.y, z1 = v1.z, x2 = v2.x, y2 = v2.y, z2 = v2.z;
      const denom = (y1 - y2) * (z0 - z2) + (z2 - z1) * (y0 - y2);
      if (Math.abs(denom) < 1e-6) return null;
      const a = ((y1 - y2) * (pz - z2) + (z2 - z1) * (py - y2)) / denom;
      const b = ((y2 - y0) * (pz - z2) + (z0 - z2) * (py - y2)) / denom;
      const c = 1 - a - b;
      if (a < 0 || b < 0 || c < 0) return null;
      return a * x0 + b * x1 + c * x2;
    }

    // Model-y that renders exactly on the top horizontal grid line (.sg-h), found
    // by measuring the line and the canvas on screen. The cord sits at z=0 (the
    // focal plane) with unit scale, so a canvas-internal y maps 1:1 to model-y as
    // (internalY - H/2); and internalY = (screenY - canvasTop)/canvasHeight * H.
    // Returns null until both elements have a real on-screen box (e.g. very first
    // frame before layout), so the caller can fall back and retry.
    function computeCordTopY() {
      if (!canvasEl) return null;
      const cr = canvasEl.getBoundingClientRect();
      if (!cr.height) return null;
      let anchorTop;
      if (STORY_MODE) {
        // Portrait Story: the cord hangs from the ר of צרופה (the CSS shifts the
        // canvas so its centre sits under that letter). Anchor to the ר's
        // BASELINE — a fixed fraction down the logotype box (the art's aspect is
        // constant) — not the box bottom, which sits ~100px below the letter.
        const logo = document.getElementById('v5-landing-title');
        if (!logo) return null;
        const lb = logo.getBoundingClientRect();
        if (!lb.height) return null;
        anchorTop = lb.top + STORY_RESH_BAR_FRAC * lb.height;
      } else {
        const lines = document.querySelectorAll('.sg-h');
        if (!lines.length) return null;
        let gridTop = Infinity;
        for (const el of lines) gridTop = Math.min(gridTop, el.getBoundingClientRect().top);
        if (!isFinite(gridTop)) return null;
        anchorTop = gridTop;
      }
      const internalY = (anchorTop - cr.top) / cr.height * H;
      return internalY - H / 2;
    }

    function buildCordDots() {
      staticCordDots = []; movingCordDots = [];
      const measured = computeCordTopY();
      cordAttachY = objectMinY - 8;
      cordAnchorY = (measured != null) ? measured : CORD_TOP_Y_FALLBACK;
      cordPivotY = cordAnchorY;
      staticCordDots.push({ x: 0, y: cordAnchorY, z: 0 });
      for (let y = cordAnchorY + CORD_STEP; y <= cordAttachY; y += CORD_STEP) movingCordDots.push({ x: 0, y, z: 0 });
      return measured != null;
    }

    function drawStaticCordDots() {
      p.stroke(DOT_COLOR); p.strokeWeight(CORD_DOT_SIZE); p.noFill();
      for (const d of staticCordDots) p.point(d.x, d.y, d.z);
    }
    function drawMovingCordDots() {
      p.stroke(DOT_COLOR); p.strokeWeight(CORD_DOT_SIZE); p.noFill();
      for (const d of movingCordDots) p.point(d.x, d.y, d.z);
    }

    /* Depth-shaded dots: bucket by depth (toward the viewer), each bucket drawn
       with a size + alpha that grows with depth — the volumetric look of the
       display eye. The eye barely rotates (it only swings in-plane), so the
       depth per point is effectively constant and can be bucketed cheaply. */
    function drawDotsDepth(spin = 0) {
      const col = p.color(DOT_COLOR);
      const cr = p.red(col), cg = p.green(col), cb = p.blue(col);
      const buckets = Array.from({ length: DEPTH_BUCKETS }, () => []);
      // Depth is measured AFTER the spin: p5 rotates the geometry, but the
      // shading is ours to compute, and keying it to the stored z would leave it
      // stuck on the rest pose — dots turned to the back would still draw near
      // (bright + fat). The visible half-depth grows with the turn too, since at
      // 45° the silhouette mixes the model's x extent into its z extent.
      const sa = Math.sin(spin), ca = Math.cos(spin);
      const R = (halfW * Math.abs(sa) + halfD * Math.abs(ca)) || 1;
      for (const d of dots) {
        if (d.sph) continue;                 // the pupil ball draws in its own pass
        const dz = -d.x * sa + d.z * ca;     // z after rotateY(spin)
        let t = (-dz) / (2 * R) + 0.5;       // −z faces the viewer after the flip
        if (t < 0) t = 0; else if (t > 0.999) t = 0.999;
        buckets[(t * DEPTH_BUCKETS) | 0].push(d);
      }
      p.noFill();
      // Story mode gives the eye's own dots a touch more weight (higher alpha
      // floor + slightly larger) so the gold reads a little bolder against the
      // orange. The pupil ball (drawBall) is left as-is — already prominent.
      const aMin = STORY_MODE ? 145 : ALPHA_MIN;
      const sBase = STORY_MODE ? 0.7 : 0.55;
      for (let b = 0; b < DEPTH_BUCKETS; b++) {
        const arr = buckets[b]; if (!arr.length) continue;
        const t = (b + 0.5) / DEPTH_BUCKETS;
        p.stroke(cr, cg, cb, aMin + (255 - aMin) * t);
        p.strokeWeight(DOT_SIZE * (sBase + 0.75 * t));
        p.beginShape(p.POINTS);
        for (const d of arr) p.vertex(d.x, d.y, d.z);
        p.endShape();
      }
    }

    /* The pupil ball — its own pass, drawn AFTER the eye so it sits cleanly on
       top of the eye's radial texture. Shaded by each dot's LOCAL depth (own
       centre/radius) for a true sphere, with larger, more opaque dots than the
       eye so it reads as one solid orb rather than blending into the spokes. */
    function drawBall(spin = 0) {
      const col = p.color(DOT_COLOR);
      const cr = p.red(col), cg = p.green(col), cb = p.blue(col);
      const sa = Math.sin(spin), ca = Math.cos(spin);
      const buckets = Array.from({ length: DEPTH_BUCKETS }, () => []);
      for (const d of dots) {
        if (!d.sph) continue;
        const ldz = -d.sph.ox * sa + d.sph.oz * ca;
        let t = (-ldz) / (2 * d.sph.R) + 0.5;
        if (t < 0) t = 0; else if (t > 0.999) t = 0.999;
        buckets[(t * DEPTH_BUCKETS) | 0].push(d);
      }
      p.noFill();
      for (let b = 0; b < DEPTH_BUCKETS; b++) {
        const arr = buckets[b]; if (!arr.length) continue;
        const t = (b + 0.5) / DEPTH_BUCKETS;
        // Match the eye's own dots exactly (same size + alpha ramp as drawDotsDepth).
        p.stroke(cr, cg, cb, ALPHA_MIN + (255 - ALPHA_MIN) * t);
        p.strokeWeight(DOT_SIZE * (0.55 + 0.75 * t));
        p.beginShape(p.POINTS);
        for (const d of arr) p.vertex(d.x, d.y, d.z);
        p.endShape();
      }
    }
  };

  return new p5(sketch, container);
}
