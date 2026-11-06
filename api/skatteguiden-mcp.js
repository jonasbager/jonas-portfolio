// /api/skatteguiden-mcp.js
// Remote MCP endpoint over Streamable HTTP (stateless, read-only).
// Compatible with: claude mcp add --transport http ask-jonas https://jonas.bager.dk/mcp

const fs = require('fs');
const path = require('path');
const cfg = require('../skatteguiden.config.js');

// ── Rate limiting ─────────────────────────────────────────────────────────────
const ipLog = new Map();
let dailySpendUSD = 0;
let dailySpendResetAt = Date.now() + 86400000;

function checkLimits(ip) {
  const now = Date.now();
  if (now > dailySpendResetAt) { dailySpendUSD = 0; dailySpendResetAt = now + 86400000; }
  if (dailySpendUSD >= cfg.DAILY_BUDGET_USD) return false;
  const s = ipLog.get(ip) || { count: 0, resetAt: now + 3600000 };
  if (now > s.resetAt) { s.count = 0; s.resetAt = now + 3600000; }
  if (s.count >= cfg.MAX_REQUESTS_PER_IP_PER_HOUR) return false;
  s.count++;
  ipLog.set(ip, s);
  return true;
}

// ── Knowledge base ────────────────────────────────────────────────────────────
function readKB(section) {
  const map = { cv: 'cv.md', projects: 'projects.md', philosophy: 'philosophy.md', availability: 'faq.md' };
  const file = map[section];
  if (!file) return null;
  const fp = path.join(__dirname, '..', 'content', 'skatteguiden', file);
  return fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : null;
}

function allKB() {
  const files = ['cv.md', 'projects.md', 'philosophy.md', 'faq.md'];
  const optional = ['letter.md'];
  let out = '';
  for (const f of [...files, ...optional]) {
    const fp = path.join(__dirname, '..', 'content', 'skatteguiden', f);
    if (fs.existsSync(fp)) out += `\n\n---\n# ${f}\n\n` + fs.readFileSync(fp, 'utf8');
  }
  return out.trim();
}

// ── ask_jonas via Claude API ──────────────────────────────────────────────────
async function askJonas(question) {
  const system = `You are jonas-applicant-agent, an AI assistant representing Jonas Bager as a candidate for the Head of IT role at Skatteguiden. You are NOT Jonas - you are his agent. Answer only from the knowledge base. Keep answers short (around 100 words unless asked to elaborate). Be direct and a little playful. Use short hyphens, never em-dashes.\n\nKNOWLEDGE BASE:\n${allKB()}`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: cfg.MODEL,
      max_tokens: cfg.MAX_TOKENS_PER_ANSWER,
      system,
      messages: [{ role: 'user', content: question }],
    }),
  });
  if (!r.ok) throw new Error('AI error: ' + await r.text());
  const d = await r.json();
  const tokens = d.usage || {};
  dailySpendUSD += ((tokens.input_tokens || 0) * 3 + (tokens.output_tokens || 0) * 15) / 1_000_000;
  return d.content?.find(b => b.type === 'text')?.text || '';
}

// ── MCP protocol ──────────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'ask_jonas',
    description: "Ask Jonas Bager's applicant agent a question about his background, skills, or approach to IT. Answers are based on his CV, projects, and philosophy.",
    inputSchema: {
      type: 'object',
      properties: { question: { type: 'string', description: 'Your question for Jonas' } },
      required: ['question'],
    },
  },
  {
    name: 'get_profile',
    description: "Get a section of Jonas Bager's knowledge base as markdown.",
    inputSchema: {
      type: 'object',
      properties: {
        section: {
          type: 'string',
          enum: ['cv', 'projects', 'philosophy', 'availability'],
          description: 'Which section to retrieve',
        },
      },
      required: ['section'],
    },
  },
  {
    name: 'get_agent_file',
    description: "Get the identity file for jonas-applicant-agent: who owns it, what it can access, and when it expires.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_audit_log',
    description: 'Get aggregate usage counts for this agent (questions answered, MCP calls, etc.).',
    inputSchema: { type: 'object', properties: {} },
  },
];

function expiredMessage() {
  return `Offboarded ${cfg.EXPIRES_AT}. Access revoked. Audit log retained. Contact Jonas: jonas@bager.dk`;
}

async function callTool(name, args) {
  if (new Date() > new Date(cfg.EXPIRES_AT)) {
    return [{ type: 'text', text: expiredMessage() }];
  }

  if (name === 'ask_jonas') {
    const answer = await askJonas(args.question || '');
    return [{ type: 'text', text: answer }];
  }

  if (name === 'get_profile') {
    const md = readKB(args.section);
    if (!md) return [{ type: 'text', text: `Section "${args.section}" not found.` }];
    return [{ type: 'text', text: md }];
  }

  if (name === 'get_agent_file') {
    return [{
      type: 'text',
      text: [
        '# Agent Identity File',
        '',
        '- **Name:** jonas-applicant-agent',
        '- **Owner:** Jonas Bager (jonas@bager.dk)',
        '- **Scope:** Read-only. Public information about Jonas Bager as a candidate for Head of IT at Skatteguiden.',
        '- **Data access:** None. No write access, no personal data stored beyond aggregate usage counts.',
        '- **Created:** November 2026',
        `- **Expires:** ${cfg.EXPIRES_AT}`,
        '',
        'Skatteguiden asked for agents with identities, scoped access, and lifecycles. This is one.',
      ].join('\n'),
    }];
  }

  if (name === 'get_audit_log') {
    // Aggregate counts only - no IPs, no question text
    const logPath = path.join(__dirname, '..', 'content', 'skatteguiden', 'audit.json');
    let log = { chatQuestions: 0, mcpCalls: 0, demoRuns: 0, lastActive: null };
    try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch {}
    return [{
      type: 'text',
      text: [
        '# Audit Log (aggregate counts)',
        `- Chat questions answered: ${log.chatQuestions}`,
        `- MCP tool calls: ${log.mcpCalls}`,
        `- Demo runs: ${log.demoRuns}`,
        `- Last active: ${log.lastActive || 'n/a'}`,
        '',
        'No IPs, names, or question text are stored.',
      ].join('\n'),
    }];
  }

  return [{ type: 'text', text: `Unknown tool: ${name}` }];
}

// ── Handler ───────────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

  // GET /.well-known/mcp or /mcp - return server info
  if (req.method === 'GET') {
    if (new Date() > new Date(cfg.EXPIRES_AT)) {
      return res.status(410).json({ error: expiredMessage() });
    }
    return res.status(200).json({
      name: 'ask-jonas',
      version: '1.0.0',
      description: `Jonas Bager's applicant agent for the Head of IT role at Skatteguiden. Read-only. Expires ${cfg.EXPIRES_AT}.`,
      tools: TOOLS,
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null }); }

  const { jsonrpc, method, params, id } = body || {};

  if (jsonrpc !== '2.0') {
    return res.status(400).json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: id || null });
  }

  // initialize
  if (method === 'initialize') {
    return res.status(200).json({
      jsonrpc: '2.0',
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'ask-jonas', version: '1.0.0' },
        instructions: `You are talking to Jonas Bager's applicant agent for the Head of IT role at Skatteguiden. Read-only. Expires ${cfg.EXPIRES_AT}.`,
      },
      id,
    });
  }

  // tools/list
  if (method === 'tools/list') {
    return res.status(200).json({ jsonrpc: '2.0', result: { tools: TOOLS }, id });
  }

  // tools/call
  if (method === 'tools/call') {
    if (new Date() > new Date(cfg.EXPIRES_AT)) {
      return res.status(200).json({
        jsonrpc: '2.0',
        result: { content: [{ type: 'text', text: expiredMessage() }] },
        id,
      });
    }

    if (!checkLimits(ip)) {
      return res.status(200).json({
        jsonrpc: '2.0',
        result: { content: [{ type: 'text', text: "I've hit my daily budget or rate limit. Email Jonas instead: jonas@bager.dk" }] },
        id,
      });
    }

    try {
      const content = await callTool(params?.name, params?.arguments || {});

      // Increment MCP audit count
      const logPath = path.join(__dirname, '..', 'content', 'skatteguiden', 'audit.json');
      try {
        let log = { chatQuestions: 0, mcpCalls: 0, demoRuns: 0, lastActive: null };
        try { log = JSON.parse(fs.readFileSync(logPath, 'utf8')); } catch {}
        log.mcpCalls++;
        log.lastActive = new Date().toISOString();
        fs.writeFileSync(logPath, JSON.stringify(log));
      } catch {}

      return res.status(200).json({ jsonrpc: '2.0', result: { content }, id });
    } catch (e) {
      return res.status(200).json({
        jsonrpc: '2.0',
        result: { content: [{ type: 'text', text: 'Error: ' + e.message }], isError: true },
        id,
      });
    }
  }

  // notifications/initialized (no response needed)
  if (method === 'notifications/initialized') return res.status(200).end();

  return res.status(200).json({
    jsonrpc: '2.0',
    error: { code: -32601, message: 'Method not found' },
    id: id || null,
  });
};
