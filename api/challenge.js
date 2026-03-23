// /api/challenge.js — AI-generated PM challenge scenarios
// Generates fresh product dilemmas each time

const CHALLENGE_PROMPT = `You are generating a product management challenge scenario for Jonas Bager's interactive portfolio website.

Generate a realistic product dilemma that a PM would face. Return ONLY valid JSON with this exact structure, no markdown fences:

{
  "icon": "emoji that fits the scenario",
  "title": "The dilemma as a short punchy headline (max 15 words)",
  "desc": "2-3 sentence context paragraph with specific details (numbers, roles, stakes)",
  "options": [
    { "label": "Option A", "text": "First option (1 sentence)", "id": "a" },
    { "label": "Option B", "text": "Second option (1 sentence)", "id": "b" },
    { "label": "Option C", "text": "Third option (1 sentence)", "id": "c" },
    { "label": "Option D", "text": "Fourth option (1 sentence)", "id": "d" }
  ],
  "jonasChoice": "the id of the best option (a, b, c, or d)",
  "take": "Jonas's reasoning in 3-4 sentences. Confident, opinionated, practical. Reference why other options fall short. Write in first person as Jonas."
}

RULES:
- Make it a genuinely hard tradeoff with no obvious answer
- Cover diverse PM topics: growth, prioritization, stakeholder management, pricing, technical debt, team dynamics, AI/ML decisions, go-to-market, user research, platform strategy
- Include specific numbers/metrics where relevant
- The "Jonas choice" should show nuanced product thinking — not the obvious answer
- Jonas's take should be warm but opinionated, showing real experience
- Do NOT repeat common textbook scenarios
- Make it feel like a real conversation at a product offsite`;

let dailyChallengeCount = 0;
let challengeResetTime = Date.now() + 86400000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  // Simple daily limit for challenge generation
  const now = Date.now();
  if (now > challengeResetTime) { dailyChallengeCount = 0; challengeResetTime = now + 86400000; }
  if (dailyChallengeCount >= 100) {
    return res.status(200).json({ fallback: true });
  }
  dailyChallengeCount++;
  
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(200).json({ fallback: true });
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: CHALLENGE_PROMPT,
        messages: [{ role: 'user', content: 'Generate a fresh PM challenge scenario.' }]
      })
    });
    
    if (!response.ok) {
      console.error('Challenge API error:', await response.text());
      return res.status(200).json({ fallback: true });
    }
    
    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    
    // Parse JSON (strip any accidental markdown fences)
    const clean = text.replace(/```json\s*|```\s*/g, '').trim();
    const scenario = JSON.parse(clean);
    
    return res.status(200).json({ scenario, fallback: false });
    
  } catch (err) {
    console.error('Challenge error:', err);
    return res.status(200).json({ fallback: true });
  }
}
