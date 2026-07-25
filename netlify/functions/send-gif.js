/* Netlify Function: email the talisman GIF to the visitor via Resend.
   Reads RESEND_API_KEY and RESEND_FROM from the site's environment variables —
   the key is NEVER in the repo. POST { email, gif } where `gif` is base64 (no
   data: prefix). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'method not allowed' }) };
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'onboarding@resend.dev';
  if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: 'server not configured (RESEND_API_KEY)' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (_) { return { statusCode: 400, body: JSON.stringify({ error: 'bad json' }) }; }

  const email = (body.email || '').trim();
  const gif = body.gif;
  if (!EMAIL_RE.test(email)) return { statusCode: 400, body: JSON.stringify({ error: 'invalid email' }) };
  if (!gif || typeof gif !== 'string') return { statusCode: 400, body: JSON.stringify({ error: 'missing gif' }) };
  const base64 = gif.replace(/^data:image\/gif;base64,/, '');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'התכשיט שלך — זהות צרופה',
        html: '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7">התכשיט שיצרת מצורף כאן כ־GIF.<br>תודה שיצרת איתנו ✦</div>',
        attachments: [{ filename: 'talisman.gif', content: base64 }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { statusCode: 502, body: JSON.stringify({ error: 'send failed', detail }) };
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'send error', detail: String(e && e.message || e) }) };
  }
};
