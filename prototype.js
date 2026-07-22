/* ============================================================
   Distilled Identity — Experience Prototype
   Stage sequencer + typography choreography + persistent
   evolving object. PLACEHOLDER transformations only —
   real generation logic is intentionally not implemented yet.
   ============================================================ */

/* ── Stage configuration ─────────────────────────────────────
   Each stage declares: prompt, interaction type, options
   (for 'choice') or hint (for 'inscription'), and a placeholder
   layer descriptor describing what visibly accumulates onto
   the object when answered. Reordering / editing this array is
   the whole mechanism for tuning the journey. */

const STAGES = [
  {
    id: 'name',
    prompt: 'מה השם שאת/ה נושא/ת?',
    type: 'inscription',
    hint: 'הקלידו שם',
    layer: { shape: 'glyph', x: 0, y: -20, scale: 1.1, rotate: -5, glyph: '✶' },
    mood: 'warm',
    layout: 'giant',
    env: { blobX: -8, blobY: 6, blobRot: -6, gridRot: 0, gridScale: 1, objScale: 1 },
  },
  {
    id: 'heritage',
    prompt: 'מאיפה השורשים שלך מגיעים?',
    type: 'choice',
    options: ['צפון אפריקה', 'אגן הים התיכון', 'מזרח אירופה', 'אחר'],
    layer: { shape: 'chain', x: 50, y: 0, scale: 1.1, rotate: 12 },
    mood: 'blue',
    layout: 'diagonal',
    env: { blobX: 14, blobY: -10, blobRot: 18, gridRot: 3, gridScale: 1.05, objScale: 1.05 },
  },
  {
    id: 'symbol',
    prompt: 'איזה סימן את/ה בוחר/ת לשאת?',
    type: 'choice',
    options: ['חמסה', 'עין', 'כוכב', 'ירח'],
    layer: { shape: 'diamond', x: -60, y: -60, scale: 0.85, rotate: 20 },
    mood: 'contrast',
    layout: 'fragment',
    env: { blobX: -18, blobY: -14, blobRot: -28, gridRot: -4, gridScale: 0.96, objScale: 0.94 },
  },
  {
    id: 'element',
    prompt: 'לאיזה יסוד טבע את/ה הכי קרוב/ה?',
    type: 'choice',
    options: ['אש', 'מים', 'אוויר', 'אדמה'],
    layer: { shape: 'drip', x: -70, y: 70, scale: 1, rotate: 8 },
    mood: 'warm',
    layout: 'stack',
    env: { blobX: 22, blobY: 18, blobRot: 40, gridRot: 6, gridScale: 1.1, objScale: 1.08 },
  },
  {
    id: 'person',
    prompt: 'יש מישהו שאת/ה נושא/ת איתך?',
    type: 'inscription',
    hint: 'שם, או כמה מילים',
    layer: { shape: 'nested', x: 60, y: 80, scale: 0.9, rotate: -10 },
    mood: 'soft',
    layout: 'orbit',
    env: { blobX: -12, blobY: 20, blobRot: -52, gridRot: -2, gridScale: 1.0, objScale: 0.98 },
  },
  {
    id: 'intention',
    prompt: 'מה היית רוצה שהתכשיט הזה ישמור עבורך?',
    type: 'inscription',
    hint: 'כוונה, איחול, מילה אחת',
    layer: { shape: 'cross', x: -50, y: -70, scale: 1.1, rotate: 15 },
    mood: 'contrast',
    layout: 'marquee',
    env: { blobX: 26, blobY: -22, blobRot: 64, gridRot: 8, gridScale: 1.16, objScale: 1.12 },
  },
  {
    id: 'final',
    prompt: 'התכשיט שלך נוצר.',
    type: 'final',
    layer: null,
    mood: 'warm',
    layout: 'giant',
    env: { blobX: 0, blobY: 0, blobRot: 0, gridRot: 0, gridScale: 1, objScale: 1.2 },
  },
];

const EASE_BEAT_MS = 620;     // how long type-out / type-in halves take
const LAYER_STAGGER_MS = 260; // delay between prompt dissolve and layer spawn

/* ── DOM refs ─────────────────────────────────────────────── */

const $intro       = document.getElementById('proto-intro');
const $introCta    = document.getElementById('proto-intro-cta');
const $root        = document.getElementById('proto-root');
const $stage       = document.getElementById('proto-stage');
const $prompt      = document.getElementById('proto-prompt');
const $input       = document.getElementById('proto-input');
const $object      = document.getElementById('proto-object');
const $objectWrap  = document.getElementById('proto-object-wrap');
const $crosshair   = document.getElementById('proto-crosshair');
const $checker     = document.getElementById('proto-checker');
const $particles   = document.getElementById('proto-particles');
const $grid        = document.getElementById('proto-grid');
const $progress    = document.getElementById('proto-progress');
const $moods       = [...document.querySelectorAll('.mood')];

/* ── Floating glyph / symbol particle field ─────────────────
   A sparse layer of small marks (geometric symbols + Hebrew
   letters) drifting slowly across the whole field — visual
   "dust" that adds depth without competing with the foreground. */

/* Retro-futurist particle vocabulary — geometric marks, ornamental
   crosses, arrows, Hebrew characters, abstract symbols. */
const PARTICLE_GLYPHS = ['+', '✦', '◆', '◇', '▲', '▶', '▸', '›', '»', '⋮', '✕', '○', '◉', 'א', 'ק', '✶', '❖', '⟡', '⊕', '⌖'];

function buildParticles(count = 22) {
  $particles.innerHTML = '';
  for (let i = 0; i < count; i += 1) {
    const span = document.createElement('span');
    span.textContent = PARTICLE_GLYPHS[i % PARTICLE_GLYPHS.length];
    span.style.setProperty('--p-x', `${4 + Math.random() * 92}%`);
    span.style.setProperty('--p-y', `${4 + Math.random() * 92}%`);
    span.style.setProperty('--p-size', `${14 + Math.random() * 30}px`);
    span.style.setProperty('--p-op', String(0.18 + Math.random() * 0.4));
    span.style.setProperty('--p-rot', `${Math.random() * 360}deg`);
    span.style.setProperty('--p-dur', `${20 + Math.random() * 22}s`);
    span.style.setProperty('--p-delay', `${Math.random() * -30}s`);
    $particles.appendChild(span);
  }
}

/* ── Progress dots ───────────────────────────────────────── */

function buildProgress() {
  STAGES.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'prog-dot';
    dot.dataset.index = String(i);
    $progress.appendChild(dot);
  });
}

function updateProgress(activeIndex) {
  [...$progress.children].forEach((dot, i) => {
    dot.classList.toggle('is-active', i === activeIndex);
    dot.classList.toggle('is-done', i < activeIndex);
  });
}

/* ── Typography choreography ─────────────────────────────────
   Wraps each word in a span so words cascade in/out individually,
   producing the "type enters already in motion" feeling rather
   than a flat fade. */

function wordSpan(w, i) {
  return `<span class="word" style="transition-delay:${i * 55}ms">${w}</span>`;
}

function setPromptText(text, layout) {
  const words = text.split(' ');

  if (layout === 'orbit') {
    const mid = Math.ceil(words.length / 2);
    const top = words.slice(0, mid);
    const bottom = words.slice(mid);
    $prompt.innerHTML =
      `<span class="arc arc-top">${top.map(wordSpan).join(' ')}</span>` +
      `<span class="arc arc-bottom">${bottom.map((w, i) => wordSpan(w, i + mid)).join(' ')}</span>`;
    return;
  }

  if (layout === 'marquee') {
    // Duplicate the run so the looping ribbon reads seamlessly end-to-end
    const run = words.map(wordSpan).join(' ');
    $prompt.innerHTML =
      `<span class="marquee-track">${run} ${run}</span>`;
    return;
  }

  $prompt.innerHTML = words.map(wordSpan).join(' ');
}

function dissolvePrompt() {
  return new Promise((resolve) => {
    $prompt.classList.remove('is-in');
    $prompt.classList.add('is-out');
    setTimeout(resolve, EASE_BEAT_MS);
  });
}

function emergePrompt(text, layout) {
  return new Promise((resolve) => {
    $prompt.dataset.layout = layout || 'giant';
    $stage.dataset.layout = layout || 'giant';
    setPromptText(text, layout);
    $prompt.classList.remove('is-out');
    // force reflow so the enter transition replays
    void $prompt.offsetWidth;
    $prompt.classList.add('is-in');
    setTimeout(resolve, EASE_BEAT_MS + 120);
  });
}

/* ── Input choreography (choice / inscription) ──────────────── */

function dissolveInput() {
  return new Promise((resolve) => {
    if (!$input.firstChild) return resolve();
    $input.classList.remove('is-in');
    $input.classList.add('is-out');
    setTimeout(() => {
      $input.innerHTML = '';
      $input.classList.remove('is-out');
      resolve();
    }, 380);
  });
}

function emergeChoice(stage, onAnswer) {
  $input.innerHTML = '';
  stage.options.forEach((label) => {
    const btn = document.createElement('button');
    btn.className = 'opt-card';
    btn.type = 'button';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      if ($input.classList.contains('is-locked')) return;
      $input.classList.add('is-locked');
      btn.classList.add('is-chosen');
      setTimeout(() => onAnswer(label), 360);
    });
    $input.appendChild(btn);
  });
  $input.classList.remove('is-locked');
  void $input.offsetWidth;
  $input.classList.add('is-in');
}

function emergeInscription(stage, onAnswer) {
  $input.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'inscribe-wrap';

  const field = document.createElement('input');
  field.className = 'inscribe-line';
  field.type = 'text';
  field.placeholder = stage.hint || '';
  field.autocomplete = 'off';

  const hint = document.createElement('div');
  hint.className = 'inscribe-hint';
  hint.textContent = 'Enter ⏎ להמשיך';

  const go = document.createElement('button');
  go.className = 'inscribe-go';
  go.type = 'button';
  go.textContent = 'חרוט';

  const submit = () => {
    const value = field.value.trim();
    if (!value || $input.classList.contains('is-locked')) return;
    $input.classList.add('is-locked');
    onAnswer(value);
  };

  field.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  go.addEventListener('click', submit);

  wrap.appendChild(field);
  wrap.appendChild(hint);
  wrap.appendChild(go);
  $input.appendChild(wrap);

  $input.classList.remove('is-locked');
  void $input.offsetWidth;
  $input.classList.add('is-in');
  requestAnimationFrame(() => field.focus());
}

/* ── Persistent object: shatter-and-settle accumulation ──────
   Every answer doesn't add one tidy layer — it SHATTERS into a
   small cluster of fragments (stroke / arc / wedge / dot / hook,
   or a glyph) that drift apart from a shared origin and settle
   at independent offsets, scales and rotations. The mapping from
   "answer meaning" to "visual result" is intentionally a stub —
   the goal is to validate that each answer FEELS like a breaking-
   apart-and-reforming moment, echoing the reference's letterform
   disintegration. */

/* Retro-futurist fragment vocabulary — shapes available for scatter */
const FRAGMENT_SHAPES = ['chain', 'drip', 'chevron', 'diamond', 'wire', 'nested', 'cross'];
let layerCount = 0;

function flashChecker() {
  $checker.classList.remove('is-flash');
  void $checker.offsetWidth;
  $checker.classList.add('is-flash');
  setTimeout(() => $checker.classList.remove('is-flash'), 600);
}

function spawnFragmentCluster(descriptor) {
  if (!descriptor) return;

  // Checker flash on every spawn — like a strobe beat
  flashChecker();

  const baseX  = descriptor.x ?? 0;
  const baseY  = descriptor.y ?? 0;
  const isGlyphOnly = !!descriptor.glyph;
  const pieces = isGlyphOnly ? 1 : 2 + Math.floor(Math.random() * 2);

  for (let i = 0; i < pieces; i += 1) {
    const el = document.createElement('div');
    const isGlyph = isGlyphOnly && i === 0;
    const shape = isGlyph
      ? 'glyph'
      : (descriptor.shape && i === 0)
        ? descriptor.shape
        : FRAGMENT_SHAPES[(layerCount + i) % FRAGMENT_SHAPES.length];
    el.className = `obj-layer shape-${shape}`;

    // Each piece settles at a unique offset radiating from the anchor
    const spread = 55 + i * 52;
    const angle  = (i / pieces) * Math.PI * 2 + (descriptor.rotate ?? 0) * 0.017;
    const lx     = baseX + Math.cos(angle) * spread;
    const ly     = baseY + Math.sin(angle) * spread * 0.72;
    const sc     = (descriptor.scale ?? 1) * (0.72 + Math.random() * 0.46);
    const rot    = (descriptor.rotate ?? 0) + (Math.random() * 70 - 35);

    el.style.setProperty('--lx',      `${lx.toFixed(1)}px`);
    el.style.setProperty('--ly',      `${ly.toFixed(1)}px`);
    el.style.setProperty('--ls',      sc.toFixed(2));
    el.style.setProperty('--lr',      `${Math.round(rot)}deg`);
    el.style.setProperty('--l-op',    isGlyph ? '1' : '0.9');
    el.style.setProperty('--l-dur',   `${9 + Math.random() * 5}s`);
    el.style.setProperty('--l-delay', `${-(Math.random() * 9).toFixed(1)}s`);
    el.style.zIndex = String(10 + layerCount);
    if (isGlyph && descriptor.glyph) el.textContent = descriptor.glyph;

    $object.appendChild(el);
    layerCount += 1;

    const delay = i * 100;
    setTimeout(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
    }, delay);
  }

  // Impact ring shockwave
  const ring = document.createElement('div');
  ring.className = 'impact-ring';
  $object.appendChild(ring);
  setTimeout(() => ring.remove(), 750);

  // Sharp snap-rebound — matches the hard retro-futurist feel
  $object.style.transition = 'transform 0.35s cubic-bezier(.7,0,.3,1)';
  $object.style.transform  = 'scale(1.07) rotate(-1.6deg)';
  setTimeout(() => { $object.style.transform = 'scale(1) rotate(0deg)'; }, 180);
}

/* ── Environment shift between stages ────────────────────────
   Drifts the crosshair, rotates/scales the grid, scales the
   object wrap — creating a subtle "camera reframe" on each stage. */

function shiftEnvironment(stage) {
  const env   = stage.env || {};
  const bx    = env.blobX   ?? 0;
  const by    = env.blobY   ?? 0;
  const brot  = env.blobRot ?? 0;
  const grot  = env.gridRot ?? 0;
  const gscale = env.gridScale ?? 1;
  const oscale = env.objScale  ?? 1;

  $crosshair.style.transform =
    `translate3d(${(bx * 0.55).toFixed(1)}vw, ${(by * 0.55).toFixed(1)}vh, 0) rotate(${(brot * 0.12).toFixed(1)}deg)`;
  $grid.style.transform = `rotate(${grot}deg) scale(${gscale})`;
  $objectWrap.style.transform = `scale(${oscale})`;
}

function applyMood(moodName) {
  $moods.forEach((m) => m.classList.toggle('is-active', m.dataset.mood === moodName));
}

function fireBeat() {
  $root.classList.remove('is-beating');
  void $root.offsetWidth;
  $root.classList.add('is-beating');
}

/* ── Sequencer ────────────────────────────────────────────── */

let current = -1;
let answers = {};

async function goToStage(index) {
  current = index;
  const stage = STAGES[index];
  if (!stage) return;

  updateProgress(index);
  fireBeat();
  applyMood(stage.mood);
  shiftEnvironment(stage);

  await Promise.all([dissolvePrompt(), dissolveInput()]);

  if (stage.type === 'final') {
    await emergePrompt(stage.prompt, stage.layout);
    return;
  }

  await emergePrompt(stage.prompt, stage.layout);

  const onAnswer = (value) => {
    answers[stage.id] = value;
    setTimeout(() => {
      spawnFragmentCluster(stage.layer);
    }, LAYER_STAGGER_MS);
    setTimeout(() => {
      goToStage(index + 1);
    }, LAYER_STAGGER_MS + 520);
  };

  if (stage.type === 'choice') emergeChoice(stage, onAnswer);
  else if (stage.type === 'inscription') emergeInscription(stage, onAnswer);
}

/* ── Boot ─────────────────────────────────────────────────── */

buildProgress();
buildParticles();

$introCta.addEventListener('click', () => {
  $intro.classList.add('is-leaving');
  setTimeout(() => {
    $intro.style.display = 'none';
    goToStage(0);
  }, 900);
});
