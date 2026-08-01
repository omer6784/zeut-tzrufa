/* ────────────────────────────────────────────────────────────────────────
   sfx.js — the interface's own small sounds, synthesised in WebAudio.

   No assets: the same approach as the ceremonial touch chime in app.js, and
   tuned to the same family of frequencies as the 432 Hz ambient track, so a
   detent or a swipe never clashes with the music underneath.

   Two voices:
     tick()  — a wheel detent, for the hour/minute wheels of the time stage.
     sweep() — a soft swish, for the row of tiles passing under the hand.

   Everything is wrapped: if the browser gives us no audio, the interface goes
   on in silence rather than throwing mid-frame.
   ──────────────────────────────────────────────────────────────────────── */

let ctx = null, noiseBuf = null;

function ac() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch (_) { return null; }
}

function noise(c) {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
  const n = Math.floor(c.sampleRate * 0.4), buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf = buf;
  return buf;
}

/* One detent of a wheel: a short wooden tick — a little filtered noise for the
   click itself over a soft 864 Hz body (432×2), so it sits in tune. */
export function tick(strength = 1) {
  const c = ac(); if (!c) return;
  try {
    const t = c.currentTime, s = Math.max(0.25, Math.min(1, strength));
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.13 * s, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
    g.connect(c.destination);

    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(864, t);
    o.frequency.exponentialRampToValueAtTime(648, t + 0.05);
    const og = c.createGain(); og.gain.value = 0.55;
    o.connect(og); og.connect(g);
    o.start(t); o.stop(t + 0.09);

    const src = c.createBufferSource(); src.buffer = noise(c);
    src.playbackRate.value = 1.6;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 1.2;
    const ng = c.createGain(); ng.gain.value = 0.5;
    src.connect(bp); bp.connect(ng); ng.connect(g);
    src.start(t); src.stop(t + 0.05);
  } catch (_) { /* silence rather than a broken frame */ }
}

/* One tile passing under the hand: filtered noise whose band sweeps with the
   direction of travel — air, not a UI click. `speed` (0..1) opens it up a
   little as the row moves faster. */
export function sweep(dir = 1, speed = 0.5) {
  const c = ac(); if (!c) return;
  try {
    const t = c.currentTime, s = Math.max(0.2, Math.min(1, speed)), dur = 0.20;
    const src = c.createBufferSource();
    src.buffer = noise(c);
    src.playbackRate.value = 0.9;

    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    const f0 = dir >= 0 ? 700 : 2000, f1 = dir >= 0 ? 2000 : 700;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + dur);

    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05 + 0.06 * s, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(bp); bp.connect(g); g.connect(c.destination);
    src.start(t); src.stop(t + dur + 0.02);
  } catch (_) { /* silence rather than a broken frame */ }
}
