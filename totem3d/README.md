# Totem 3D — accumulating dotted-symbol composition

Vertical 1080×1920 animation. A central dotted line, and 8 symbolic 3D dotted
objects that join one after another into a single vertical "totem". Each symbol
keeps its own point-cloud logic (shell intersection / mask-depth / eye-mask).

## Files
- `index.html` — page + Export button + status
- `sketch.js` — the whole sketch (build, layout, render, export)
- `p5.min.js`, `jszip.min.js` — local libs (no internet needed)
- `objs/` — the 8 OBJ files
- `server.cjs` — tiny static server

## Run it (live preview)
From this folder:

```bash
node server.cjs
# open http://localhost:8123
```

(or any static server, e.g. `npx serve`). It builds the symbols once
(~0.2s, a short "building…" message), then plays the accumulating animation.

## Export a frame sequence (the deliverable)
Click **▶ Export PNG sequence** (or press **E**).

- **Chrome/Edge:** you'll be asked to pick a folder once. Every frame is written
  straight into it as `frame_0000.png … frame_0804.png` — **no per-frame
  downloads**. Frames are transparent (no background), 1080×1920.
- **Other browsers:** falls back to a single `totem_frames.zip` download.

The status text shows progress. Keep the tab in the **foreground** while it runs.

### Turn the PNGs into a video / GIF (ffmpeg)
```bash
# MP4 over the brand background (#e2bc71)
ffmpeg -framerate 30 -i frame_%04d.png \
  -vf "pad=1080:1920:0:0:color=0xe2bc71,format=yuv420p" \
  -c:v libx264 -crf 18 totem.mp4

# transparent WebM (keeps alpha)
ffmpeg -framerate 30 -i frame_%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p totem.webm

# GIF
ffmpeg -framerate 30 -i frame_%04d.png -vf "fps=30,scale=540:-1:flags=lanczos" totem.gif
```

## Tuning (top of `sketch.js`)
- `JOIN_ORDER` — order symbols join (top → bottom in the stack).
- `FIRST_SYMBOL_HOLD` — how long the hero sits alone, big & centred.
- `SYMBOL_ADD_EVERY` — pause between joins (each symbol forms, then waits).
- `REVEAL_FRAMES` — how many frames a symbol takes to "form" (facing forward).
- `SETTLE_FRAMES` — tail after the last symbol.
- `BOB_AMPLITUDE` — subtle vertical float; set 0 for perfectly still symbols.
- `profiles[].grid` — point density per symbol (smaller = denser). For shell
  symbols this is in a common ~300u space, so it means the same across all OBJs.
- `profiles[].dotSize`, `.color`, `.targetSize` — per-symbol look.
- `layoutSymbols()` — organic, overlapping cluster around the centre line:
  - `HERO_SCALE` / `SHRINK_PER_ADD` — hero start size and how much everything
    shrinks with each new arrival (gradual, ~8% per join).
  - `EXTENT_HALF` — half-height of the central band the symbols live in. **Lower
    = tighter / denser / more overlap; higher = looser / more readable.** The
    dotted line runs a bit past this (see `drawMiddleDottedLine`) so short empty
    "tails" of line remain above and below the composition.
  - `OVERLAP` (<1 = neighbours overlap), `X_LIMIT` (side safe zone).
  - `SIZE` — per-symbol size multiplier (different sizes in the final result).
  - `DRIFT` / `YJIT` — per-symbol horizontal/vertical offsets that scatter the
    symbols asymmetrically. The cluster is auto-centred on the line. Recompose by
    editing these three arrays (indexed by `JOIN_ORDER`).
- `EXPORT_TRANSPARENT` — `true` = transparent PNGs, `false` = baked bg.

Motion & opacity:
- Each symbol enters **frontal**, then eases into its own animation (`applyMotion`:
  sway / spin / pendant / flip). `MOTION_DELAY` = ticks it stays frontal after
  entering; `MOTION_RAMP` = ease-in length. Amplitudes live in `applyMotion`.
- Dot size scales with the symbol (`p.dotSize * s.s`) so colours stay bold at any
  size. Per-symbol boldness = `profiles[].dotSize` vs its `grid` (dot/spacing).
- **Depth shading** (`drawPointsDepth`): each dot is dimmed/shrunk by its z AFTER
  the current rotation, so the cloud's real 3D volume reads (strongest while the
  symbol turns). Tune strength via the `stroke(... , 110 + 145*t)` alpha and the
  `strokeWeight(base * (0.6 + 0.75*t))` size ramp, or `DEPTH_BUCKETS` for smoothness.
- The eye/hamsa masks use few `LAYERS` and shallow `DEPTH` (in `createMaskBuilder`)
  so they read as a dotted texture like the shells (not a solid slab) and flip
  cleanly. Raise `LAYERS`/`DEPTH` or lower their `grid` to make them denser.

The camera is **orthographic** and symbols carry **no rotation**, so every symbol
stays frontal, aligned and undistorted at any position, and starts forming while
facing straight forward. Layout guarantees no collisions and keeps everything off
the canvas edges (verified from each symbol's real point-cloud bounding box).

## Notes on the merge
Each symbol originally came from a separate sketch with a `grid` tuned to that
OBJ's native scale. Those scales differ by orders of magnitude, so a shared
`grid` left half the symbols empty. The shell builder now normalizes each OBJ to
a common size *before* sampling, and buckets triangles by bounding box, so all 8
build correctly and fast (heavy ones like rimon/anah included).
