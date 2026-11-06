// /api/skatteguiden-demo.js
// Live onboarding demo against M365 tenant.
// Creates a fictional employee, pauses for visitor approval, then offboards.

const cfg = require('../skatteguiden.config.js');

// ── State (in-memory, fine for single-instance low-traffic) ──────────────────
let dailyRuns = 0;
let dailyRunsResetAt = Date.now() + 86400000;
let liveRunning = false;
let liveRunSessionId = null;

// Active sessions: id -> { steps, pendingApproval, resolve, finished }
const sessions = new Map();

// ── Utilities ─────────────────────────────────────────────────────────────────
function resetDailyIfNeeded() {
  if (Date.now() > dailyRunsResetAt) {
    dailyRuns = 0;
    dailyRunsResetAt = Date.now() + 86400000;
  }
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

function redactId(id) {
  if (!id || id.length < 4) return '****';
  return '...' + id.slice(-4);
}

// ── Microsoft Graph helpers ───────────────────────────────────────────────────
function fetchWithTimeout(url, opts, ms = 10000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id));
}

async function getToken() {
  const url = `https://login.microsoftonline.com/${cfg.AZURE_TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: cfg.AZURE_CLIENT_ID,
    client_secret: cfg.AZURE_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
  });
  const r = await fetchWithTimeout(url, { method: 'POST', body: params }, 15000);
  if (!r.ok) throw new Error('Token fetch failed: ' + await r.text());
  const d = await r.json();
  return d.access_token;
}

async function graphPost(token, path, body) {
  const r = await fetchWithTimeout(`https://graph.microsoft.com/v1.0${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, 20000);
  const text = await r.text();
  if (!r.ok) throw new Error(`Graph POST ${path} failed (${r.status}): ${text}`);
  return text ? JSON.parse(text) : {};
}

async function graphDelete(token, path) {
  const r = await fetchWithTimeout(`https://graph.microsoft.com/v1.0${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  }, 20000);
  if (!r.ok && r.status !== 404) {
    const text = await r.text();
    throw new Error(`Graph DELETE ${path} failed (${r.status}): ${text}`);
  }
}

async function graphPatch(token, path, body) {
  const r = await fetchWithTimeout(`https://graph.microsoft.com/v1.0${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, 20000);
  if (!r.ok) throw new Error(`Graph PATCH ${path} failed (${r.status}): ` + await r.text());
}

// ── Demo runner ───────────────────────────────────────────────────────────────
async function runDemo(session, approvalCallback) {
  const log = (action, detail, result) => {
    session.steps.push({ ts: new Date().toISOString(), action, detail, result });
  };

  const suffix = randomSuffix();
  const upn = `demo-${suffix}@${cfg.DEMO_DOMAIN}`;
  const displayName = 'Mette Demo';
  let userId = null;

  try {
    const token = await getToken();
    log('get_token', 'Acquired service principal token', 'ok');

    // 1. Create user
    const pwd = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2).toUpperCase() + '!';
    const user = await graphPost(token, '/users', {
      displayName,
      userPrincipalName: upn,
      mailNickname: `demo-${suffix}`,
      accountEnabled: false,
      passwordProfile: { password: pwd, forceChangePasswordNextSignIn: false },
      usageLocation: 'DK',
    });
    userId = user.id;
    log('create_user', `Created ${displayName} (${upn}) - sign-in disabled, unrecoverable password`, `user ${redactId(userId)}`);

    // 2. Add to AllStaff
    await graphPost(token, `/groups/${cfg.DEMO_GROUP_ALLSTAFF}/members/$ref`, {
      '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`,
    });
    log('add_to_group', `Added to Demo-AllStaff`, `group ${redactId(cfg.DEMO_GROUP_ALLSTAFF)}`);

    // 3. Add to MacBook policy group
    await graphPost(token, `/groups/${cfg.DEMO_GROUP_MACBOOK}/members/$ref`, {
      '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`,
    });
    log('add_to_group', `Added to Demo-MacBook-Policy (Intune policy assigned via group targeting)`, `group ${redactId(cfg.DEMO_GROUP_MACBOOK)}`);

    // 4. Pause for approval
    log('request_approval', `Mette requests access to the Finance shared drive`, 'awaiting human decision');
    session.pendingApproval = true;

    const approved = await approvalCallback();
    session.pendingApproval = false;
    log('approval_decision', approved ? 'Visitor approved' : 'Visitor denied', approved ? 'approved' : 'denied');

    // 5. Finance group
    if (approved) {
      await graphPost(token, `/groups/${cfg.DEMO_GROUP_FINANCE}/members/$ref`, {
        '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`,
      });
      log('add_to_group', `Added to Demo-Finance (finance share access granted)`, `group ${redactId(cfg.DEMO_GROUP_FINANCE)}`);
    } else {
      log('skip_group', `Finance share access denied - not added to Demo-Finance`, 'skipped');
    }

    // 6. Offboard: remove from groups
    await graphDelete(token, `/groups/${cfg.DEMO_GROUP_ALLSTAFF}/members/${userId}/$ref`);
    await graphDelete(token, `/groups/${cfg.DEMO_GROUP_MACBOOK}/members/${userId}/$ref`);
    if (approved) await graphDelete(token, `/groups/${cfg.DEMO_GROUP_FINANCE}/members/${userId}/$ref`);
    log('remove_groups', `Removed from all groups`, 'ok');

    // Keep sign-in disabled (already false), delete user
    await graphDelete(token, `/users/${userId}`);
    log('delete_user', `User ${upn} deleted`, `user ${redactId(userId)}`);

    return { ok: true, steps: session.steps, approved };
  } catch (e) {
    log('error', e.message, 'failed');
    // Cleanup: try to delete user if it was created
    if (userId) {
      try {
        const t2 = await getToken();
        await graphDelete(t2, `/users/${userId}`);
        log('cleanup', `Deleted user after error`, 'ok');
      } catch {}
    }
    return { ok: false, steps: session.steps, error: e.message };
  }
}

// ── Replay fallback ───────────────────────────────────────────────────────────
function getReplay() {
  const fp = require('path').join(__dirname, '..', 'content', 'skatteguiden', 'replay.json');
  try { return JSON.parse(require('fs').readFileSync(fp, 'utf8')); }
  catch { return null; }
}

// ── Handler ───────────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Expiry check
  if (new Date() > new Date(cfg.EXPIRES_AT)) {
    return res.status(410).json({ expired: true, message: `Offboarded ${cfg.EXPIRES_AT}. Access revoked.` });
  }

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const { action, code, sessionId, decision } = body || {};

  // ── Start demo ──
  if (action === 'start') {
    if (code !== cfg.ACCESS_CODE) return res.status(401).json({ error: 'Invalid access code' });

    // Check if tenant config is set
    if (!cfg.AZURE_TENANT_ID || !cfg.AZURE_CLIENT_ID || !cfg.AZURE_CLIENT_SECRET ||
        !cfg.DEMO_GROUP_ALLSTAFF || !cfg.DEMO_GROUP_MACBOOK || !cfg.DEMO_GROUP_FINANCE || !cfg.DEMO_DOMAIN) {
      // Fall back to replay
      const replay = getReplay();
      if (replay) return res.status(200).json({ mode: 'replay', ...replay });
      return res.status(503).json({ error: 'Live demo not yet configured. Tenant setup in progress.' });
    }

    resetDailyIfNeeded();
    if (dailyRuns >= cfg.DEMO_MAX_RUNS_PER_DAY) {
      return res.status(429).json({ error: `Daily limit of ${cfg.DEMO_MAX_RUNS_PER_DAY} demo runs reached. Try tomorrow.` });
    }
    if (liveRunning) {
      return res.status(409).json({ error: 'A demo is already running. Wait a moment and try again.' });
    }

    dailyRuns++;
    liveRunning = true;
    const sid = Math.random().toString(36).slice(2, 10);
    liveRunSessionId = sid;

    // Set up session with approval gate
    let approveResolve;
    const approvalPromise = new Promise(r => { approveResolve = r; });
    const session = { steps: [], pendingApproval: false, resolve: approveResolve, finished: false, result: null };
    sessions.set(sid, session);

    // Run demo async, don't await
    runDemo(session, () => approvalPromise).then(result => {
      const s = sessions.get(sid);
      if (s) { s.finished = true; s.pendingApproval = false; s.result = result; }
      liveRunning = false;
      liveRunSessionId = null;

      // Save as replay if successful
      if (result.ok) {
        const replayData = { recordedAt: new Date().toISOString(), steps: result.steps, approved: result.approved };
        try {
          require('fs').writeFileSync(
            require('path').join(__dirname, '..', 'content', 'skatteguiden', 'replay.json'),
            JSON.stringify(replayData, null, 2)
          );
        } catch {}
      }
    }).catch(() => { liveRunning = false; liveRunSessionId = null; });

    // Stream: return sessionId immediately, client polls /status
    return res.status(200).json({ mode: 'live', sessionId: sid });
  }

  // ── Poll status ──
  if (action === 'status') {
    const s = sessions.get(sessionId);
    if (!s) return res.status(404).json({ error: 'Session not found' });
    return res.status(200).json({
      pendingApproval: s.pendingApproval,
      finished: s.finished,
      steps: s.steps,
      ok: s.result?.ok,
      error: s.result?.error,
      approved: s.result?.approved,
    });
  }

  // ── Approval decision ──
  if (action === 'decide') {
    const s = sessions.get(sessionId);
    if (!s || !s.pendingApproval) return res.status(400).json({ error: 'No pending approval for this session' });
    s.pendingApproval = false;
    s.resolve(decision === 'approve');
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
};
