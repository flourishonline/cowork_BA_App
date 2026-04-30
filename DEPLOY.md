# Deploying the FO Brand Kick Start Generator

## What you're deploying

A full-stack Vercel app with:
- 7-step brand workbook (static HTML/CSS/JS)
- Values quiz with custom value entry
- AI generation via Claude (Anthropic API)
- Save/resume via Vercel KV (Redis)
- PDF and Word doc download

---

## Step 1: Get the fonts

The app uses your existing **EightiesComeback** font. Copy these files into a `/fonts/` folder at the project root:
- `fonts/EightiesComebackIt-Regular.woff2`
- `fonts/EightiesComebackIt-Bold.woff2`

Also copy your `/images/bg-florals.png` background image (from the existing Nurturer app).

---

## Step 2: Create a new Vercel project

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import this folder (or push to GitHub first, then import)
3. **Framework preset:** Other
4. **Root directory:** leave as `/`
5. Click Deploy

---

## Step 3: Add Vercel KV (for save/resume)

1. In your Vercel project dashboard → **Storage** tab
2. **Create → KV Database** → give it a name like `fo-kickstart-kv`
3. Connect it to your project
4. Vercel will automatically add `KV_URL`, `KV_REST_API_URL`, etc. as env vars

---

## Step 4: Set Environment Variables

In **Vercel Project → Settings → Environment Variables**, add:

| Variable | Value | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Your Anthropic API key |
| `VALID_ACCESS_CODES` | `FLOURISH-ABCD,FLOURISH-EFGH,...` | Comma-separated list of valid codes you've sold. Leave empty for prefix-only mode (any `FLOURISH-XXXX` works). |
| `OPEN_ACCESS` | `true` | Set to `true` to remove the access gate entirely (useful for testing) |

---

## Step 5: Redeploy

After setting env vars, trigger a redeploy:
- Go to Deployments → click the latest → **Redeploy**

---

## Managing Access Codes

### Option A: Specific codes (recommended for paid access)
Set `VALID_ACCESS_CODES` to a comma-separated list of codes you create. 
Example: `FLOURISH-B3K9,FLOURISH-X7M2,FLOURISH-P4Q1`

You can generate codes however you like — just keep them in the format `FLOURISH-XXXX`.

### Option B: Prefix-only (any FLOURISH- code works)
Leave `VALID_ACCESS_CODES` empty. Anyone who types any `FLOURISH-XXXX` code gets in.

### Option C: Open access (testing/demo)
Set `OPEN_ACCESS=true`. No code required at all.

---

## File structure

```
/
├── index.html          ← Main app (all views)
├── styles.css          ← All styles
├── app.js              ← Frontend logic
├── package.json        ← Dependencies
├── vercel.json         ← Vercel config
├── DEPLOY.md           ← This file
├── fonts/
│   ├── EightiesComebackIt-Regular.woff2  ← Copy from existing app
│   └── EightiesComebackIt-Bold.woff2     ← Copy from existing app
├── images/
│   └── bg-florals.png                    ← Copy from existing app
└── api/
    ├── generate.js     ← AI generation (main endpoint)
    ├── verify-code.js  ← Access code validation
    ├── save-progress.js ← Save to KV
    ├── load.js         ← Load from KV
    └── download.js     ← PDF/DOCX export
```

---

## The output

Each user gets a 12-section personalised brand strategy:

1. Brand Foundation (Why, Vision, Mission)
2. Your Values (core 3, top 10, value statements)
3. Your Weird (uniqueness, do/don't, superpower, archnemesis, personality)
4. Your Love Factor (why clients choose you, brand experience)
5. Your People (dream client profile, challenges, quotes, marketing messages)
6. Brand Messaging (5 tagline options, value prop, elevator pitch)
7. Brand Voice & Tone (voice chart, verbs, keywords, button copy)
8. Brand Story (full narrative)
9. Social Bio (short + long)
10. Content Pillars (4 pillars × 8–10 post ideas each)
11. Offer Structure (reviewed + recommended suite + refinements)
12. 90-Day Plan (12 weeks of specific tasks)

---

## Notes

- The values quiz data (custom values, top 10, core 3) is automatically included in the AI prompt
- Sessions are stored in Vercel KV for 90 days
- Auto-saves to localStorage on every field change
- Server saves when the user clicks "Save my progress"
- The app works for all 12 Flourish Online archetypes: Adventuress, Alchemist, Badass, Creatress, Girl Next Door, Heroine, Lover, Mischief Maker, Nurturer, Pure Heart, Queen, Sage
