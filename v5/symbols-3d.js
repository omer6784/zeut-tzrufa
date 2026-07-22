/* symbols-3d.js — the registry of 3D symbols shown on the DISPLAY screen.
   ─────────────────────────────────────────────────────────────────────
   Each entry is ONE symbol's "code": which OBJ it is built from, how it is
   sampled into a dotted point-cloud, its dot colour/size, and its OWN
   animation. The display looks a symbol up by its motif key — the same key
   the interface's choices map to (e.g. Morocco → 'hamsa') — pulls it from
   here, and renders it with its own animation.

   To add a new symbol: add one entry below. No other file needs to change.
   artifact3d.js preloads every entry's OBJ, samples the dots, and drives
   each object's `animate` every frame.

   Entry shape:
     'key': {
       obj:      '/file.obj',                 // served OBJ path
       sample:   { OBJ_SCALE, DEPTH, LAYERS, GRID_STEP },  // dot-cloud params
       color:    0x282828,                    // dot colour
       dotSize:  (size) => number,            // point size for a given motif size
       animate:  (object3D, timeMs) => void,  // this symbol's OWN animation
     }
   ───────────────────────────────────────────────────────────────────── */

export const SYMBOLS_3D = {
  /* Hamsa — MASK sampler (filled silhouette, depth-layered) with a flip
     toward the viewer (0→π), exactly as in its p5 sketch. */
  hamsa: {
    obj: '/hamsa.obj',
    sampler: 'mask',
    sample: { OBJ_SCALE: 340, DEPTH: 70, LAYERS: 10, GRID_STEP: 10 },
    color: 0x282828,
    dotSize: (size) => Math.max(1.4, size * 0.02),
    animate: (obj, tMs) => {
      const t = (Math.sin(tMs * 0.00108) + 1) * 0.5;   // 0..1
      obj.rotation.x = -t * Math.PI;                    // flip toward viewer
    },
  },

  /* Scarab — SHELL sampler (ray-cast front/back + sides surface) with a gentle
     back-and-forth Y rotation, as in its p5 sketch. Dots in the brand orange. */
  scarab: {
    obj: '/scarab.obj',
    sampler: 'shell',
    sample: { GRID_SPACING: 6 },
    color: 0xff5003,
    dotSize: (size) => Math.max(1.4, size * 0.02),
    animate: (obj, tMs) => {
      obj.rotation.y = Math.sin(tMs * 0.0012) * 0.6;    // ROTATION_SPEED 0.02/frame
    },
  },

  /* NOTE on colour: `color` here is a NEUTRAL PLACEHOLDER only. On the real
     display the dot colour is DYNAMIC — chosen from the palette relative to the
     background the user picks (see jewel-engine's assignSymbolColor). It is not
     a fixed per-symbol property. */

  /* Eye — the user's own EYE motion: a Y flip between −90° and +90° (eyeFlip).
     (The display samples it as an eyeMask with a separate pupil; here in the
     interface-pendant registry we keep the simpler 'mask' sampler.) */
  eye: {
    obj: '/eye.obj',
    sampler: 'mask',
    sample: { OBJ_SCALE: 340, DEPTH: 60, LAYERS: 8, GRID_STEP: 10 },
    color: 0xf5f5ed,                                  // placeholder — dynamic on display
    dotSize: (size) => Math.max(1.4, size * 0.02),
    animate: (obj, tMs) => {
      obj.rotation.y = Math.sin(tMs * 0.0011) * (Math.PI / 2);   // eyeFlip ±90°
    },
  },

  /* Pomegranate — the user's own RIMON motion: a continuous Y spin (spinY). */
  rimon: {
    obj: '/rimon.obj',
    sampler: 'shell',
    sample: { GRID_SPACING: 6 },
    color: 0xf5f5ed,                                  // placeholder — dynamic on display
    dotSize: (size) => Math.max(1.4, size * 0.02),
    animate: (obj, tMs) => {
      obj.rotation.y = tMs * 0.0006;                  // spinY — continuous rotation
    },
  },

  /* Fish — the user's own motion: swayY (rotateY(sin(t·SPEED)·0.6)), SHELL
     sampler at GRID_SPACING 4. Same sway as the scarab. */
  fish: {
    obj: '/fish.obj',
    sampler: 'shell',
    sample: { GRID_SPACING: 4 },
    color: 0xf5f5ed,                                  // placeholder — dynamic on display
    dotSize: (size) => Math.max(1.4, size * 0.02),
    animate: (obj, tMs) => {
      obj.rotation.y = Math.sin(tMs * 0.0012) * 0.6;   // swayY ±0.6
    },
  },

  /* Lotus — the user's own motion: grows and shrinks (pulse), held at a fixed
     90° Y orientation so it faces the viewer. */
  lotus: {
    obj: '/lotus.obj',
    sampler: 'shell',
    sample: { GRID_SPACING: 4 },
    color: 0xfffae6,
    dotSize: (size) => Math.max(1.4, size * 0.02),
    animate: (obj, tMs) => {
      const p = (Math.sin(tMs * 0.0027 - Math.PI / 2) + 1) / 2;   // 0..1 breathing
      const s = 1 + 0.2 * p;
      obj.scale.set(s, s, s);
      obj.rotation.y = Math.PI / 2;
    },
  },

  /* Dharma wheel — the user's own motion: a continuous Y spin. */
  dharma: {
    obj: '/Dharma.obj',
    sampler: 'shell',
    sample: { GRID_SPACING: 5 },
    color: 0xff5003,
    dotSize: (size) => Math.max(1.4, size * 0.02),
    animate: (obj, tMs) => {
      obj.rotation.y = tMs * 0.0012;                   // continuous spin
    },
  },

  /* Djed pillar — the user's own motion: a pendant sway (Z swing + slight X tilt). */
  djed: {
    obj: '/djed.obj',
    sampler: 'shell',
    sample: { GRID_SPACING: 4 },
    color: 0xf5f5ed,
    dotSize: (size) => Math.max(1.4, size * 0.02),
    animate: (obj, tMs) => {
      const swing = Math.sin(tMs * 0.0027);
      obj.rotation.z = swing * 0.32;
      obj.rotation.x = Math.sin(tMs * 0.0054) * 0.06;
    },
  },

  /* Vegvisir — placeholder animation (gentle spin) until its own is provided. */
  vegvisir: {
    obj: '/VEGVISIR.obj',
    sampler: 'shell',
    sample: { GRID_SPACING: 4 },
    color: 0xf5f5ed,
    dotSize: (size) => Math.max(1.4, size * 0.02),
    animate: (obj, tMs) => {
      obj.rotation.y = tMs * 0.0006;
    },
  },

  /* Pyramid — placeholder animation (gentle sway) until its own is provided. */
  pyramid: {
    obj: '/pyramid.obj',
    sampler: 'shell',
    sample: { GRID_SPACING: 4 },
    color: 0xf5f5ed,
    dotSize: (size) => Math.max(1.4, size * 0.02),
    animate: (obj, tMs) => {
      obj.rotation.y = Math.sin(tMs * 0.0012) * 0.6;
    },
  },

  /* Anah — placeholder animation (gentle spin) until its own is provided. */
  anah: {
    obj: '/anah.obj',
    sampler: 'shell',
    sample: { GRID_SPACING: 4 },
    color: 0xf5f5ed,
    dotSize: (size) => Math.max(1.4, size * 0.02),
    animate: (obj, tMs) => {
      obj.rotation.y = tMs * 0.0006;
    },
  },

  /* Artichoke — SHELL sampler; the user's own motion: a slow breathing pulse
     (grows and shrinks), like the lotus, so the bulb feels alive. */
  artichoke: {
    obj: '/artichoke.obj',
    sampler: 'shell',
    sample: { GRID_SPACING: 4 },
    color: 0xf5f5ed,                                  // placeholder — dynamic on display
    dotSize: (size) => Math.max(1.4, size * 0.02),
    animate: (obj, tMs) => {
      const p = (Math.sin(tMs * 0.0027 - Math.PI / 2) + 1) / 2;   // 0..1 breathing
      const s = 1 + 0.18 * p;
      obj.scale.set(s, s, s);
    },
  },

  /* Horseshoe — a FLAT silhouette (planar OBJ), so it uses the MASK sampler
     (filled + depth-layered) like the hamsa/eye. Motion: a gentle pendant sway,
     as a horseshoe hangs. */
  horseshoe: {
    obj: '/horseshoe.obj',
    sampler: 'mask',
    sample: { OBJ_SCALE: 340, DEPTH: 55, LAYERS: 8, GRID_STEP: 10 },
    color: 0xf5f5ed,                                  // placeholder — dynamic on display
    dotSize: (size) => Math.max(1.4, size * 0.02),
    animate: (obj, tMs) => {
      obj.rotation.z = Math.sin(tMs * 0.0027) * 0.14;   // gentle sway
    },
  },

  /* Spiral — SHELL sampler; a continuous Y spin (like the rimon / dharma), which
     suits the coil unwinding into depth. */
  spiral: {
    obj: '/spiral.obj',
    sampler: 'shell',
    sample: { GRID_SPACING: 4 },
    color: 0xf5f5ed,                                  // placeholder — dynamic on display
    dotSize: (size) => Math.max(1.4, size * 0.02),
    animate: (obj, tMs) => {
      obj.rotation.y = tMs * 0.0006;                  // continuous spin
    },
  },

  /* Moon — a crescent with a little depth, SHELL sampler. Motion: a gentle
     pendant sway, like a crescent hanging in the sky. */
  moon: {
    obj: '/moon.obj',
    sampler: 'shell',
    sample: { GRID_SPACING: 4 },
    color: 0xf5f5ed,                                  // placeholder — dynamic on display
    dotSize: (size) => Math.max(1.4, size * 0.02),
    animate: (obj, tMs) => {
      obj.rotation.z = Math.sin(tMs * 0.0022) * 0.14;   // gentle sway
    },
  },

  /* Tiltan (clover / trefoil) — SHELL sampler; a slow continuous Y spin, so the
     three leaves turn and catch the light. */
  tiltan: {
    obj: '/tiltan.obj',
    sampler: 'shell',
    sample: { GRID_SPACING: 4 },
    color: 0xf5f5ed,                                  // placeholder — dynamic on display
    dotSize: (size) => Math.max(1.4, size * 0.02),
    animate: (obj, tMs) => {
      obj.rotation.y = tMs * 0.0006;                  // continuous spin
    },
  },

  /* Add more symbols here — one card each: obj + sampler + sample + color +
     dotSize + its own animate. */
};
