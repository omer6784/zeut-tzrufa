/* completion.js — the final "process complete" page, shown after the editor.
   ─────────────────────────────────────────────────────────────────────
   Interface-orange plate with the dotted grid frame, a short message, and two
   dotted-frame buttons: back to the opening screen, and "send me as a GIF"
   (which opens an email modal). "שלח" captures the animated talisman from a
   hidden display iframe, encodes it to a GIF (gifenc), and POSTs it to the
   Netlify function that emails it via Resend. */

/* Poll `cond` until true or timeout (ms). */
function waitFor(cond, timeout) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    (function tick() {
      try { if (cond()) return resolve(); } catch (_) {}
      if (Date.now() - t0 > timeout) return reject(new Error('timeout'));
      setTimeout(tick, 150);
    })();
  });
}
/* Base64-encode a Uint8Array in chunks (avoids call-stack overflow on big GIFs). */
function bytesToBase64(bytes) {
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CH, bytes.length)));
  return btoa(bin);
}

export function mountCompletion({ } = {}) {
  document.getElementById('completion-view')?.remove();

  const view = document.createElement('div');
  view.id = 'completion-view';
  view.dir = 'rtl';
  view.innerHTML = `
    <div class="cv-grid stage-grid" aria-hidden="true">
      <span class="sg-v" style="--x: calc(100vw - 200 * var(--sx)); --h: 85;"></span>
      <span class="sg-v" style="--x: calc(200 * var(--sx)); --h: 85;"></span>
      <span class="sg-h" style="--y: calc(85 * var(--sy));"></span>
      <span class="sg-v" style="--x: calc(100 * var(--sx)); --y: calc(85 * var(--sy)); --h: 668;"></span>
      <span class="sg-v" style="--x: calc(100vw - 100 * var(--sx)); --y: calc(85 * var(--sy)); --h: 668;"></span>
      <span class="sg-h" style="--y: calc(726 * var(--sy));"></span>
    </div>
    <div class="cv-text">תהליך היצירה הושלם,<br>והתכשיט שיצרת מוכן.</div>
    <div class="cv-actions">
      <button class="cv-btn" id="cv-gif" type="button">שלח לי כ-GIF</button>
      <button class="cv-btn" id="cv-home" type="button">חזור למסך הפתיחה</button>
    </div>
    <div class="cv-modal" id="cv-modal" hidden>
      <div class="cv-modal-box">
        <div class="cv-modal-title">קבלת התכשיט כ-GIF</div>
        <input class="cv-modal-input" id="cv-email" type="email" inputmode="email" dir="rtl" placeholder="הזינו כתובת מייל" autocomplete="email" />
        <div class="cv-modal-actions">
          <button class="cv-btn cv-btn-dark" id="cv-send" type="button">שלח</button>
          <button class="cv-btn cv-btn-dark" id="cv-cancel" type="button">ביטול</button>
        </div>
        <div class="cv-modal-msg" id="cv-msg" aria-live="polite"></div>
      </div>
    </div>`;
  document.body.appendChild(view);

  // Hidden, off-screen display iframe that renders the final talisman — the frame
  // capture reads from ITS canvas (via window.__jewel). Kept present (not
  // display:none) so p5's draw loop runs and the WebGL buffer stays fresh.
  const jewel = document.createElement('iframe');
  jewel.id = 'cv-jewel';
  jewel.src = '/v5/display.html';
  jewel.setAttribute('aria-hidden', 'true');
  jewel.style.cssText = 'position:fixed; left:-10000px; top:0; width:360px; height:640px; border:0; pointer-events:none;';
  document.body.appendChild(jewel);

  const modal = view.querySelector('#cv-modal');
  const emailEl = view.querySelector('#cv-email');
  const msgEl = view.querySelector('#cv-msg');
  const sendBtn = view.querySelector('#cv-send');
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  view.querySelector('#cv-home').addEventListener('click', () => location.reload());
  view.querySelector('#cv-gif').addEventListener('click', () => {
    msgEl.textContent = '';
    modal.hidden = false;
    setTimeout(() => emailEl.focus(), 50);
  });
  view.querySelector('#cv-cancel').addEventListener('click', () => { modal.hidden = true; });

  async function captureGifBase64() {
    const win = jewel.contentWindow;
    await waitFor(() => win && win.__jewel && win.__jewel.isReady && win.__jewel.isReady(), 15000);
    const frames = [];
    await new Promise((resolve, reject) => {
      let settled = false;
      const to = setTimeout(() => { if (!settled) { settled = true; reject(new Error('capture timeout')); } }, 15000);
      win.__jewel.captureFrames({
        count: 24, everyN: 2, size: 300,
        onFrame: (data, w, h) => { frames.push({ data: new Uint8ClampedArray(data), w, h }); },
        onDone: () => { if (!settled) { settled = true; clearTimeout(to); resolve(); } },
      });
    });
    if (!frames.length) throw new Error('no frames');
    const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
    const enc = GIFEncoder();
    for (const f of frames) {
      const palette = quantize(f.data, 256);
      const index = applyPalette(f.data, palette);
      enc.writeFrame(index, f.w, f.h, { palette, delay: 90 });
    }
    enc.finish();
    return bytesToBase64(enc.bytes());
  }

  sendBtn.addEventListener('click', async () => {
    const email = emailEl.value.trim();
    if (!EMAIL_RE.test(email)) { msgEl.textContent = 'כתובת מייל לא תקינה'; return; }
    sendBtn.disabled = true;
    msgEl.textContent = 'מכין את ה-GIF…';
    try {
      const gif = await captureGifBase64();
      msgEl.textContent = 'שולח…';
      const res = await fetch('/.netlify/functions/send-gif', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, gif }),
      });
      if (!res.ok) throw new Error('send failed');
      msgEl.textContent = 'נשלח! בדקו את תיבת המייל שלכם';
    } catch (_) {
      msgEl.textContent = 'השליחה נכשלה, נסו שוב';
    } finally {
      sendBtn.disabled = false;
    }
  });

  return function teardown() { try { jewel.remove(); } catch (_) {} try { view.remove(); } catch (_) {} };
}
