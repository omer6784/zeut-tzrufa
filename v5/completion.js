/* completion.js — the final "process complete" page, shown after the editor.
   ─────────────────────────────────────────────────────────────────────
   Interface-orange plate with the dotted grid frame, a short message, and two
   dotted-frame buttons: back to the opening screen, and "send me as a GIF"
   (which opens an email modal). The actual GIF capture + email send is wired via
   the optional `onSendGif(email)` hook (Part B). */

export function mountCompletion({ onSendGif } = {}) {
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

  const modal = view.querySelector('#cv-modal');
  const emailEl = view.querySelector('#cv-email');
  const msgEl = view.querySelector('#cv-msg');
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  view.querySelector('#cv-home').addEventListener('click', () => location.reload());
  view.querySelector('#cv-gif').addEventListener('click', () => {
    msgEl.textContent = '';
    modal.hidden = false;
    setTimeout(() => emailEl.focus(), 50);
  });
  view.querySelector('#cv-cancel').addEventListener('click', () => { modal.hidden = true; });
  view.querySelector('#cv-send').addEventListener('click', async () => {
    const email = emailEl.value.trim();
    if (!EMAIL_RE.test(email)) { msgEl.textContent = 'כתובת מייל לא תקינה'; return; }
    msgEl.textContent = 'שולח…';
    try {
      if (onSendGif) { await onSendGif(email); msgEl.textContent = 'נשלח! בדקו את תיבת המייל שלכם'; }
      else { msgEl.textContent = 'שליחת ה-GIF תופעל בקרוב'; }   // Part B not wired yet
    } catch (_) {
      msgEl.textContent = 'השליחה נכשלה, נסו שוב';
    }
  });

  return function teardown() { try { view.remove(); } catch (_) {} };
}
