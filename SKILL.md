---
name: build-business-site
description: Generates a per-business Next.js 15 website (Hebrew RTL) from minimal input — business name + niche. Drafts an HTML wireframe for approval first, then scaffolds the full project with OWL design tokens, lead form wired to Autoflowr's /api/whatsapp/send-lead, Meta Pixel + GA4 + Clarity tracking, JSON-LD schema, and hero/OG images via /peleg. Exposes the dev server through a Cloudflare Tunnel for live phone-review. Use when Bar needs to spin up a new client site fast.
---

# /build-business-site — Autoflowr's per-business site generator

## When to invoke

Bar asks to build a website for a specific business — examples:
- "תבנה אתר ל[שם עסק] — [נישה]"
- "build a site for X restaurant"
- "צריך אתר חדש לעורך דין דנה כהן"

## Inputs

```
/build-business-site <business-name> <niche> [flags]
```

**Required:**
- `<business-name>` — Hebrew or English, in quotes if it contains spaces
- `<niche>` — one of: `restaurant`, `lawyer`, `clinic`, `fitness`, `tradesman`, `beauty`, `_default`

**Optional flags:**
- `--wireframe-only` — generate `wireframe.html` and exit (default flow generates wireframe, waits for approval, then scaffolds)
- `--no-wireframe-gate` — skip wireframe approval, scaffold immediately
- `--local-only` — scaffold + print `npm run dev` instructions, no tunnel
- `--deploy` — promote to Vercel production (only after iteration is done)
- `--push` — create GitHub repo + push (for client handoff)
- `--mode=lead-gen|client-site` — CTAs for Autoflowr leads (lead-gen) or client's own customers (client-site, default)
- `--location "תל אביב"` — override location for local SEO copy
- `--pixel-id <id>` `--ga4-id <id>` `--clarity-id <id>` — per-business tracking overrides
- `--price-from <number>` — show pricing band starting from this number

## How to run

The CLI lives in `bin/build-business-site.js`. From this skill's directory:

```bash
node bin/build-business-site.js "<name>" <niche> [flags]
```

Or installed as a global npm package, just:

```bash
build-business-site "<name>" <niche> [flags]
```

## Default workflow

1. **Wireframe phase** (always first, unless `--no-wireframe-gate`):
   - Skill loads `templates/niches/<niche>.json`
   - Calls Claude API to research the niche+business (pain points, FAQ, pricing band)
   - Generates a self-contained `<slug>/wireframe.html` (B&W boxes, real Hebrew copy)
   - Prints the path → Bar opens it in browser → approves or sends notes
2. **Scaffold phase** (after approval):
   - Runs `create-next-app@latest` with TypeScript + Tailwind + App Router
   - Copies `templates/base/` over, applies niche-specific structure
   - Generates copy, images (via /peleg), tracking, schema, lead form
3. **Tunnel phase** (default):
   - `npm install` + `npm run dev` in background
   - Spawns `cloudflared tunnel --url localhost:3000`
   - Prints the `*.trycloudflare.com` URL
4. **Ship phase** (only on explicit go-ahead):
   - `--deploy` → Vercel prod URL
   - `--push` → GitHub repo

## Output directory

Generated projects land in the **current working directory** as `./<business-slug>/`. The slug is derived from the business name (transliterated Hebrew → kebab-case ASCII).

## Defaults inherited from Autoflowr

These are baked into every generated site unless overridden:
- Meta Pixel: `2784866505209727`
- GA4: `G-BJQGX3335C`
- Clarity: `wowvd5lwqt`
- Lead endpoint: `https://www.autoflowr.co.il/api/whatsapp/send-lead`
- OWL CSS tokens (bg `#1A1A1C`, accent adapts per niche)
- RTL + Hebrew (`lang="he-IL"`, `dir="rtl"`)
- Heebo + JetBrains Mono fonts

## Prerequisites

- Node.js 20+ (for `create-next-app@latest`)
- `cloudflared` installed (one-time: `winget install --id Cloudflare.cloudflared` on Windows)
- `ANTHROPIC_API_KEY` in env (for research phase)
- Python 3 + `GEMINI_API_KEY` (for /peleg image generation in Phase 6)
- `vercel` CLI (only if using `--deploy`)
- `gh` CLI (only if using `--push`)

## Gotchas

- The wireframe gate is the most important step — don't skip it on first runs of a new niche, even if `--no-wireframe-gate` is tempting.
- `cloudflared tunnel --url` (no auth required) gives a free throwaway `trycloudflare.com` URL. Don't try `cloudflared tunnel run <name>` — that requires a named tunnel and Cloudflare account setup.
- Generated `.env.local` contains tracking IDs but **never** commit it. The skill writes a `.gitignore` that excludes it.
- The lead form proxies through `app/api/lead/route.ts` rather than calling autoflowr.co.il directly from the client, to keep the source business slug authoritative and avoid CORS.
- When re-running with the same slug, the skill preserves the existing `app/(content)/copy.ts` if Bar has hand-edited it — don't blow away manual edits.
