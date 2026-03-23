# Jonas Bager — Interactive Portfolio

An interactive product portfolio with dual-mode exploration (Terminal + AI Chat), project case studies, PM challenges, and easter eggs.

## Quick Deploy to Vercel

### 1. Push to GitHub
```bash
cd jonas-portfolio
git init
git add .
git commit -m "Initial deploy"
gh repo create jonas-portfolio --private --push
```

### 2. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Import Project" → select your `jonas-portfolio` repo
3. Framework: **Other** (no framework)
4. Click Deploy

### 3. Add your Claude API key
1. In your Vercel project dashboard → **Settings** → **Environment Variables**
2. Add: `ANTHROPIC_API_KEY` = your key from [console.anthropic.com](https://console.anthropic.com)
3. Redeploy (Deployments → click ⋯ on latest → Redeploy)

### 4. Custom domain (jonas.bager.dk)
1. In Vercel → **Settings** → **Domains**
2. Add `jonas.bager.dk`
3. Vercel will give you DNS records to add at your domain registrar
4. Once DNS propagates, redirect `portfolio.bager.dk` → `jonas.bager.dk`

## Project Structure
```
jonas-portfolio/
├── public/
│   └── index.html      ← The entire portfolio (single file)
├── api/
│   └── chat.js         ← Serverless function (Claude API proxy)
├── vercel.json         ← Vercel routing config
├── package.json
└── .env.example        ← Environment variable reference
```

## Cost Guardrails
The API function includes:
- **200 requests/day** global limit
- **20 messages/hour** per IP
- **350 max tokens** per response
- **15 message** per-session cap (in frontend)
- **10 message** context window (trims old messages)
- Graceful fallback to pre-written responses if API is down

Estimated cost: **$2–15/month** depending on traffic.

## How the Chat Works
1. Suggested questions → instant pre-written responses (no API call)
2. Free text matching keywords → instant pre-written responses (no API call)
3. Anything else → Claude API with Jonas's system prompt
4. API down or rate limited → friendly fallback message

## Updating Content
- **Portfolio content**: Edit `public/index.html`
- **AI personality/knowledge**: Edit the `SYSTEM_PROMPT` in `api/chat.js`
- **Rate limits**: Adjust constants at top of `api/chat.js`
