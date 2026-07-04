# Interactive Portfolio Site

A single-file interactive portfolio site with a live terminal, AI chat, project case studies, and PM challenge. Deployed on Vercel with serverless API routes.

## Architecture

```
public/
  index.html       ← entire frontend (HTML + CSS + JS, ~2300 lines)
  it.html          ← IT-focused variant (same structure, different content)
  joe.html         ← bespoke job application page (GSAP animations)
  logos/           ← project logo PNGs (48×48)
  joe-cup.png      ← hero image for joe.html

api/
  chat.js          ← Vercel serverless: proxies to Claude API (Anthropic)
  report.js        ← Vercel serverless: sends email via Resend
  challenge.js     ← Vercel serverless: PM challenge scenarios

vercel.json        ← static output from public/, cleanUrls: true
```

**No build step.** Everything in `public/` is served as-is. The `api/` folder is Vercel Node.js serverless functions.

## What to customise for a new person

All personal content lives in `public/index.html`. Work top to bottom through these sections:

### 1. Identity & meta
- Page `<title>` — line ~5
- Hero name/headline — search `hero h1`
- Hero subtitle (`hero-sub`) — your positioning statement
- Hero stats (years / products / companies) — search `hero-stats`
- Nav logo — search `nav-logo`

### 2. The AI chat (`chatResponses` object, ~line 795)
Pre-written responses for: "Who are you?", "What are your skills?", "What have you built?", "How do you think about product?", "What's your take on AI?", "Why should we hire you?", "Tell me something fun", "How do I reach you?"

Replace all content with your own. The `fuzzyChat` map below it routes keywords to these responses.

### 3. The live terminal (`commands` object, ~line 966)
Commands: `about`, `skills`, `stack`, `projects`, `ai`, `philosophy`, `experience`, `education`, `contact`, `why-me`, `fun-facts`. All plain text with `<span>` colour classes. Replace content with your own.

### 4. Project cards (`proj-grid`, ~line 452)
Two-tier grid: Commercial Products (top), Side Projects (bottom). Each card:
```html
<div class="proj-card" style="--card-c:#COLOR" onclick="openM('key')">
  <div class="proj-logo"><img src="/logos/name.png"></div>
  <div class="tag">Tag · Tag</div>
  <h3>Project Name</h3>
  <p>Short description</p>
  <div class="arrow">→ Full case study</div>
</div>
```

### 5. Project modals (`pData` object, ~line 1660)
Full case studies. Each entry:
```js
key: {
  label: 'Case Study',
  title: 'Name',
  color: '#hex or var(--color)',
  link: 'https://...',    // or null
  sections: [
    { h: 'THE PROBLEM', p: 'Description' },
    { h: 'THE SOLUTION', p: 'Description' },
    // ...
  ],
  tags: ['Tag1', 'Tag2']
}
```

### 6. Timeline / Journey (~line 557)
`.tl-item` blocks with year, company, role, description. Update dates, companies, and bullet points.

### 7. "How I Build" section (~line 509)
Four `.tech-card` blocks (AI Engineering, Automation, Infrastructure, Development). Replace with your own technical depth.

### 8. "What I Bring" traits (~line 569)
Six `.trait` cards. Replace with your own core competencies.

### 9. "How I Lead" (~line 596)
Three `.lead-card` blocks. Replace with your leadership principles.

### 10. CTA / contact details
Search for email, phone, LinkedIn. Replace throughout (appears in multiple places: footer, CTA section, modal, terminal `contact` command).

### 11. Education (~line 607)
`.edu-card` blocks. Replace with your own.

### 12. Easter eggs (optional, keep or remove)
- Konami code (`↑↑↓↓←→←→BA`) — search `konamiSequence`
- Terminal easter eggs — `hiddenCmds` object (~line 1390)
- Chat easter eggs — `chatEggs` object (~line 916)

---

## API system prompt (`api/chat.js`)

The `SYSTEM_PROMPT` constant is what the AI chat uses when no pre-written response matches. Replace every detail about Jonas with your own:
- Who you are
- Commercial products (with technical specifics)
- Side projects
- Skills and stack
- Personal facts
- Contact details

The system prompt tells the AI to speak *as you* — keep the tone rules at the bottom, just update the facts.

---

## Environment variables (set in Vercel dashboard)

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Powers the AI chat (get from console.anthropic.com) |
| `RESEND_API_KEY` | Powers email notifications on visit/bug report (get from resend.com) |
| `NOTIFY_EMAIL` | Where bug reports and visit alerts get sent |
| `BUGS_EMAIL` | Sender address for Resend (must be a verified domain) |

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
```

Or connect the GitHub repo to Vercel for auto-deploy on push (recommended).

Set the four environment variables in the Vercel dashboard under Project → Settings → Environment Variables.

---

## Ref tracking

The site captures `?ref=` query params on load, POSTs to `/api/report`, and cleans the URL. Use it to track where visitors come from:

```
yourdomain.com?ref=linkedin
yourdomain.com?ref=job-application-company
```

You'll get an email each time someone visits via a tracked link.

There's also a built-in bug report button (bottom-right corner) that lets visitors send you feedback directly to your email.

---

## Adding a page variant (e.g. for a specific job application)

See `public/joe.html` as an example of a fully bespoke page for a single application. It uses GSAP for animations and has its own visual language. You can copy it as a starting point and customise for any specific opportunity.

## Design system

CSS custom properties in `:root` (top of `<style>`):
- `--lime` (#b8f000) — primary accent
- `--coral`, `--sky`, `--violet`, `--amber` — card colours
- `--bg`, `--bg2`, `--bg-card` — dark backgrounds
- `--font-head` (Outfit) / `--font-mono` (JetBrains Mono)

To change the accent colour, replace `--lime` and `--lime-glow`/`--lime-dim` throughout.
