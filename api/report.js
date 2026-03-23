// /api/report.js — Bug report endpoint
// Sends reports via email (Resend) or logs them

const reportLog = new Map();
const REPORT_LIMIT = 5; // max 5 reports per IP per hour

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  // Rate limit
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  const now = Date.now();
  const session = reportLog.get(ip) || { count: 0, resetTime: now + 3600000 };
  if (now > session.resetTime) { session.count = 0; session.resetTime = now + 3600000; }
  if (session.count >= REPORT_LIMIT) {
    return res.status(200).json({ ok: true, message: 'Thanks — I got it!' });
  }
  session.count++;
  reportLog.set(ip, session);
  
  const { type, message, url, userAgent, error } = req.body || {};
  if (!message && !error) return res.status(400).json({ error: 'No report content' });
  
  const emoji = type === 'bug' ? '🐛' : type === 'auto' ? '⚠️' : '💬';
  const label = type === 'bug' ? 'Bug Report' : type === 'auto' ? 'Auto-detected Error' : 'Feedback';
  const content = String(message || error || 'No details').slice(0, 500);
  
  // Try sending via Resend (free email API)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`
        },
        body: JSON.stringify({
          from: 'Portfolio <bugs@jonas.bager.dk>',
          to: 'jonas@bager.dk',
          subject: `${emoji} ${label} — Portfolio Site`,
          text: `${label}\n\nMessage: ${content}\n\nPage: ${url || 'Unknown'}\nTime: ${new Date().toISOString()}\nUA: ${String(userAgent || '').slice(0, 120)}`
        })
      });
    } catch (err) {
      console.error('Resend error:', err);
    }
  } else {
    // No email service — log to Vercel function logs (visible in dashboard)
    console.log(`\n===== ${emoji} ${label} =====`);
    console.log(`Message: ${content}`);
    console.log(`Page: ${url || 'Unknown'}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`UA: ${String(userAgent || '').slice(0, 120)}`);
    console.log('========================\n');
  }
  
  return res.status(200).json({ ok: true, message: 'Thanks for the report!' });
}
