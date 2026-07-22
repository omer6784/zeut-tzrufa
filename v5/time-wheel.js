/* ══════════════════════════════════════════════════════════════
   Stage 6 — Time selection ("מה השעה שלך בירום?")
   ──────────────────────────────────────────────────────────────
   MECHANISM: a native-feeling time picker with two logical wheels —
   HOURS (00–23) and MINUTES (00–59). Each is an infinite vertical
   wheel dragged by finger or mouse; the value in the centre is the
   selection and snaps smoothly on release (never rests between
   values). Minutes roll over into hours automatically (…59→00 bumps
   the hour up, 00→59 bumps it down), so the time is always valid.

   DESIGN (per the reference): five dotted grid cells — one per DIGIT
   plus the colon:  [H][H][:][M][M].  The two hour digits share the
   hours wheel's position and the two minute digits share the
   minutes wheel's position, so each pair rolls together while every
   digit sits in its own cell with a dotted divider between them.
   Big dotted numerals (0.png…9.png); only 7 cells per wheel exist
   and are recycled as it scrolls (cheap + endless).

   The sun above tracks the selected time CONTINUOUSLY while
   scrolling: low + pale yellow at dawn, high + saturated orange at
   midday, sinking + deep orange toward sunset, cream moon at night.
   ══════════════════════════════════════════════════════════════ */

const DIGIT = i => `/image/v5-stage6/${i}.png`;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wmod = (n, m) => ((n % m) + m) % m;

const SUN_STOPS = [
  { h: 0,  c: [245, 245, 237] },   // night — cream moon
  { h: 6,  c: [250, 170, 80]  },   // sunrise — warm orange
  { h: 9,  c: [248, 198, 112] },   // morning — warming to yellow
  { h: 12, c: [243, 216, 140] },   // noon — the pale-yellow sun (its prime)
  { h: 15, c: [248, 190, 100] },   // afternoon
  { h: 18, c: [222, 96, 40]   },   // sunset — deep orange
  { h: 21, c: [245, 245, 237] },   // night — cream moon
  { h: 24, c: [245, 245, 237] },
];
function sunColor(h){
  h = wmod(h, 24);
  for(let i = 0; i < SUN_STOPS.length - 1; i++){
    const a = SUN_STOPS[i], b = SUN_STOPS[i + 1];
    if(h >= a.h && h <= b.h){
      const t = (h - a.h) / (b.h - a.h || 1);
      return [0, 1, 2].map(k => Math.round(lerp(a.c[k], b.c[k], t)));
    }
  }
  return SUN_STOPS[0].c;
}

export function mountTimeWheel(host, { onDone, onHour } = {}){
  if(!host) return () => {};
  host.innerHTML = '';
  host.classList.add('tw-root');
  const el = (t, c) => { const e = document.createElement(t); if(c) e.className = c; return e; };

  // ── Sun ─────────────────────────────────────────────────────
  const sky = el('div', 'tw-sky');
  const sun = el('div', 'tw-sun');
  sky.appendChild(sun);
  host.appendChild(sky);

  // ── Five digit cells:  [H tens][H units][:][M tens][M units] ──
  const VIS = 7, MID = 3;
  const row = el('div', 'tw-row');
  // A single-digit virtual wheel. `count` = values of the parent wheel it
  // belongs to (24 hours / 60 minutes); `kind` = which digit it draws.
  function makeDigitWheel(count, kind, cls){
    const cellWrap = el('div', 'tw-cell');
    const wheel = el('div', 'tw-wheel ' + cls);
    const cells = [];
    for(let i = 0; i < VIS; i++){
      const num = el('div', 'tw-num');
      const img = el('img', 'tw-d'); img.draggable = false;
      num.appendChild(img);
      wheel.appendChild(num);
      cells.push({ num, img, val: -1 });
    }
    wheel._count = count; wheel._kind = kind; wheel._cells = cells;
    cellWrap.appendChild(wheel);
    return wheel;
  }
  const hTens  = makeDigitWheel(24, 'tens',  'tw-ht');
  const hUnits = makeDigitWheel(24, 'units', 'tw-hu');
  // Colon — two dotted rings, not a ":" glyph, so it is built from the same gold
  // dots as the numerals beside it. The viewBox is 400 tall against a rendered
  // height of --tw-item, and the ring stroke is non-scaling, so the dot size and
  // pitch are set in CSS in real screen px (matched to the digit artwork).
  const colonWrap = el('div', 'tw-cell tw-colon-cell');
  colonWrap.innerHTML =
    '<svg class="tw-colon" viewBox="0 0 120 400" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
      '<circle class="tw-colon-dot" cx="60" cy="74" r="42"/>' +
      '<circle class="tw-colon-dot" cx="60" cy="326" r="42"/>' +
    '</svg>';
  const mTens  = makeDigitWheel(60, 'tens',  'tw-mt');
  const mUnits = makeDigitWheel(60, 'units', 'tw-mu');
  row.append(hTens.parentElement, hUnits.parentElement, colonWrap, mTens.parentElement, mUnits.parentElement);
  host.appendChild(row);
  const hourWheels = [hTens, hUnits], minWheels = [mTens, mUnits];

  // ── Prompt artwork, right-hand column (per the stage-6 reference). Supplied
  //    artwork rather than live text, so it carries the same display face as the
  //    rest of the piece. The stage's instruction line is NOT drawn here — it
  //    uses the shared #q-instruction slot, like every other stage. ──
  const question = el('img', 'tw-question');
  question.src = '/image/v5-stage6/your-hour.png';
  question.alt = 'מה השעה שלכם ביום?';
  question.draggable = false;
  host.appendChild(question);

  // ── State ───────────────────────────────────────────────────
  let absMinutes = 0, hourManual = 0, hRender = 0;
  const hourTarget = () => Math.floor(absMinutes / 60) + hourManual;

  // ── Cached layout ───────────────────────────────────────────
  let skyW = 1, skyH = 1, itemH = 1, centerC = 0, sunD = 1, sunR = 1;
  function measure(){
    skyW = sky.clientWidth || skyW;
    skyH = sky.clientHeight || skyH;
    const n = hTens._cells[0].num;
    itemH = n.offsetHeight || itemH;
    centerC = (hTens.clientHeight - itemH) / 2;
    // Same proportions the sun always had, nudged up ~13%. The skyH term is
    // what binds, and it can't grow much: the disc is only ever as visible as
    // skyH allows, so pushing it far past the sky height would cost the moment
    // at sunrise/sunset where nearly the whole disc clears the frame.
    sunD = Math.min(skyW * 0.68, skyH * 1.25);
    sunR = sunD / 2;
    sun.style.width = sun.style.height = sunD + 'px';
    sun.style.left = (skyW / 2 - sunR) + 'px';
    sun.style.top = (-sunR) + 'px';
  }

  // ── Render one digit-wheel at float position `pos` ──────────
  function renderWheel(w, pos){
    const base = Math.round(pos);
    for(let k = 0; k < VIS; k++){
      const idx = base - MID + k;
      const value = wmod(idx, w._count);
      const digit = w._kind === 'tens' ? Math.floor(value / 10) : value % 10;
      const c = w._cells[k];
      if(c.val !== digit){ c.img.src = DIGIT(digit); c.val = digit; }
      c.num.style.transform = `translateY(${(centerC + (idx - pos) * itemH).toFixed(1)}px)`;
    }
  }
  function renderAll(){
    renderWheel(hTens, hRender);  renderWheel(hUnits, hRender);
    renderWheel(mTens, absMinutes); renderWheel(mUnits, absMinutes);
  }

  // ── Sun: continuous arc + colour from the (float) current time ──
  function paintSun(){
    const hf = wmod(absMinutes / 60 + hourManual, 24);
    const alt = 0.5 + 0.5 * Math.cos((hf - 12) / 12 * Math.PI);   // 0 (midnight) → 1 (noon)
    // Drive the disc's CENTRE down the sky. At NOON the whole disc sits big and
    // centred in the sky (its prime moment); through morning/evening it drops
    // toward the digit band, and at night it rests low like a moon. (Peak is a
    // full centred disc, not a clipped dome — that big disc is the midday sun.)
    const cy = lerp(skyH * 0.95, skyH * 0.46, alt);
    sun.style.transform = `translateY(${cy.toFixed(1)}px)`;
    const [r, g, b] = sunColor(hf);
    sun.style.background = `rgb(${r}, ${g}, ${b})`;
    // Report the time-of-day so the stage can tint its sky (day → bright,
    // evening/night → progressively dark). `alt` is the daylight factor.
    onHour && onHour(hf, alt);
  }
  function frameUpdate(){ renderAll(); paintSun(); }

  // ── Snap + momentum ─────────────────────────────────────────
  let raf = 0, animTO = 0, wheelSnapTO = 0;
  function stopAnim(){ cancelAnimationFrame(raf); raf = 0; clearTimeout(animTO); }
  function snap(){
    stopAnim();
    absMinutes = Math.round(absMinutes);
    hourManual = Math.round(hourManual);
    hRender = hourTarget();
    frameUpdate();
  }
  function startAnim(isMinutes, vel){
    stopAnim();
    let v = clamp(vel, -0.05, 0.05);
    const step = () => {
      if(isMinutes) absMinutes += v * 16; else hourManual += v * 16;
      v *= 0.92;
      hRender += (hourTarget() - hRender) * 0.2;
      frameUpdate();
      if(Math.abs(v) > 0.003 || Math.abs(hourTarget() - hRender) > 0.01) raf = requestAnimationFrame(step);
      else snap();
    };
    raf = requestAnimationFrame(step);
    animTO = setTimeout(snap, 1000);
  }

  // ── Drag (touch + mouse) — any hour cell scrolls hours; any
  //    minute cell scrolls minutes. ───────────────────────────
  function attachDrag(wheel, isMinutes){
    let dragging = false, lastY = 0, lastT = 0, vel = 0;
    const onMove = e => {
      if(!dragging) return;
      const y = e.clientY, dPos = (lastY - y) / itemH;
      if(isMinutes){ absMinutes += dPos; hRender += (hourTarget() - hRender) * 0.3; }
      else { hourManual += dPos; hRender = hourTarget(); }
      const now = performance.now(), dt = now - lastT;
      if(dt > 0) vel = clamp(dPos / dt, -0.06, 0.06);
      lastY = y; lastT = now;
      frameUpdate();
      e.preventDefault();
    };
    const onUp = () => {
      if(!dragging) return; dragging = false;
      wheel.classList.remove('is-grabbing');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      startAnim(isMinutes, vel);
    };
    wheel.addEventListener('pointerdown', e => {
      dragging = true; userTouched = true; stopAnim();
      lastY = e.clientY; lastT = performance.now(); vel = 0;
      wheel.classList.add('is-grabbing');
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
      e.preventDefault();
    });

    // Mouse wheel / trackpad scroll — scroll over the hour cells to change the
    // hours, over the minute cells to change the minutes; snap once it stops.
    wheel.addEventListener('wheel', e => {
      e.preventDefault();
      userTouched = true; stopAnim();
      let dy = e.deltaY;
      if(e.deltaMode === 1) dy *= 16;            // lines → px
      else if(e.deltaMode === 2) dy *= skyH;     // pages → px
      const dPos = dy / itemH;                   // scroll down → later time
      if(isMinutes){ absMinutes += dPos; hRender += (hourTarget() - hRender) * 0.3; }
      else { hourManual += dPos; hRender = hourTarget(); }
      frameUpdate();
      clearTimeout(wheelSnapTO);
      wheelSnapTO = setTimeout(snap, 150);
    }, { passive: false });
  }
  hourWheels.forEach(w => attachDrag(w, false));
  minWheels.forEach(w => attachDrag(w, true));
  // The reverse move: drag or scroll anywhere on the SKY/background (the sun is a
  // child, so grabbing it works too) and the hour follows. Same handler as the
  // hour wheel, so both directions stay in step — the sun re-paints from the new
  // time along its arc and the sky recolours, exactly as when the wheel drives it.
  attachDrag(sky, false);

  // ── Init to the current Israel time (once; retried for layout race) ──
  function israelNow(){
    try {
      const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      const g = t => +p.find(x => x.type === t).value;
      return { hh: g('hour') % 24, mm: g('minute') };
    } catch(_) { const d = new Date(); return { hh: d.getHours(), mm: d.getMinutes() }; }
  }
  let userTouched = false;
  const initAt = () => {
    measure();
    if(userTouched){ frameUpdate(); return; }
    const { hh, mm } = israelNow();
    absMinutes = hh * 60 + mm; hourManual = 0; hRender = hourTarget();
    frameUpdate();
  };
  const onResize = () => { measure(); frameUpdate(); };
  window.addEventListener('resize', onResize);
  initAt();
  setTimeout(initAt, 60);
  setTimeout(initAt, 240);
  setTimeout(initAt, 600);

  // ── Confirm ─────────────────────────────────────────────────
  const confirm = el('button', 'tw-confirm');
  confirm.type = 'button';
  confirm.textContent = 'זו השעה שלי';
  confirm.addEventListener('click', () => {
    snap();
    const hh = wmod(Math.floor(absMinutes / 60) + hourManual, 24);
    const mm = wmod(absMinutes, 60);
    onDone && onDone(String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'));
  });
  host.appendChild(confirm);

  return () => { stopAnim(); window.removeEventListener('resize', onResize); };
}
