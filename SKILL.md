---
name: build-business-site
description: Generates a per-business Next.js 15 website (Hebrew RTL) from minimal input — business name + niche. Scans the top 5 Google competitors for the niche+location and extracts conversion patterns, orchestrates Owl-Listener/designer-skills (color-system, typography-scale, visual-hierarchy) to design a unique visual identity per business, drafts an HTML wireframe for approval, then scaffolds the Next.js project with full SEO + GEO infrastructure (Metadata API, sitemap, robots, LocalBusiness JSON-LD, geocoded coordinates, NAP consistency), a lead form wired to Autoflowr's /api/whatsapp/send-lead, Meta Pixel + GA4 + Clarity, and a Telegram-approved weekly blog system (3 articles/week via Claude Haiku → Telegram approval → auto-publish). Exposes the dev server through a Cloudflare Tunnel for live phone-review. Use when Bar needs to spin up a new client site fast.
---

# /build-business-site — Autoflowr's per-business site generator

This skill orchestrates other skills. It is not a self-contained generator.

## Design backbone: Owl-Listener/designer-skills

Visual decisions (palette, typography, layout grid, hierarchy) are delegated to the **Owl-Listener/designer-skills** marketplace — a 91-skill collection across 9 design plugins. This skill installs them as a prerequisite and invokes the relevant ones per run, so every generated site gets a unique visual identity rather than a copy of Autoflowr's branding.

**Required plugins (install once):**

```
/plugin marketplace add Owl-Listener/designer-skills
/plugin install ui-design
/plugin install design-systems
/plugin install visual-critique
/plugin install ux-strategy
```

**Skills this skill delegates to:**

| Stage | Skill invoked | What it returns |
|---|---|---|
| Competitive analysis | `/ux-strategy:competitive-analysis` (paired with WebSearch + WebFetch) | Conversion patterns from top 5 Google results in the niche+location |
| Palette generation | `/ui-design:color-system` | 2-3 palette options with semantic tokens (bg, surface, accent, text, mute) + WCAG contrast checks |
| Typography pairing | `/ui-design:typography-scale` | Heading + body font pair, modular scale (sizes for h1-h6 + body) |
| Section weighting | `/ui-design:visual-hierarchy` | Which sections dominate, which support |
| Grid system | `/ui-design:layout-grid` | Container widths, gutter spacing, column count |
| Brand consistency check | `/visual-critique:brand-consistency-evaluation` | Run after scaffold to verify the generated site holds together |

The niche JSON fallbacks (in `templates/niches/<niche>.json`) are seed palettes used only when designer-skills is not installed or Claude is invoked in a non-interactive mode.

## When to invoke

Bar asks to build a website for a specific business — examples:
- "תבנה אתר ל[שם עסק] — [נישה]"
- "build a site for X restaurant"
- "צריך אתר חדש לעורך דין דנה כהן"

## Workflow Claude follows when invoked

When this skill is triggered, Claude executes this orchestration (the CLI is a helper for the mechanical scaffold steps — design decisions go through designer-skills first):

### Step 1 — Gather minimal input
Confirm with the user:
- Business name (Hebrew or English)
- Niche (restaurant / lawyer / clinic / fitness / tradesman / beauty / _default)
- Optional: location, target mode (`client-site` vs `lead-gen`), any brand notes

### Step 2 — Competitive intelligence (scan top Google results)

Before designing, Claude performs a competitive scan to learn what actually converts in this niche+location:

1. **WebSearch** the niche query: `"<niche> <location>"` (e.g., `"מסעדת דגים תל אביב"`) — fetch the top 5 organic results (skip ads, directories, Wikipedia).
2. **WebFetch** each result and extract:
   - Hero headline + subtitle (what promise opens the page?)
   - Primary + secondary CTAs (what's the conversion action?)
   - Pricing display (shown? hidden? from-X format?)
   - Trust signals (testimonials, awards, certifications, photos)
   - Page structure (what sections, in what order?)
   - Above-the-fold density (text-heavy vs image-heavy?)
3. **Score conversion-likely patterns** — what 3+ of the top 5 do, that's a pattern. What only 1 does, that's a differentiator opportunity.
4. **Save findings** to `<slug>/competitive-intel.json`:

```json
{
  "query": "מסעדת דגים תל אביב",
  "competitors": [
    { "url": "...", "hero": "...", "ctas": [...], "trustSignals": [...], "structure": [...] }
  ],
  "patterns": {
    "common": ["שעות פעילות בהירו", "תמונה גדולה של מנה", "טלפון בולט בכותרת"],
    "gaps": ["אף אחד לא מציע הזמנת שולחן בטופס", "אף אחד לא מציג תפריט עסקי בעמוד הבית"]
  },
  "recommendations": {
    "hero_pattern": "image-first with phone CTA above the fold",
    "must_include": ["food gallery", "reservation form", "Waze/Maps embed"],
    "differentiate_via": ["online table reservation", "weekly chef's special"]
  }
}
```

This file is later passed to the wireframe + copy generation so the output isn't generic — it's a deliberate response to what's working in the market.

### Step 3 — Design phase (via Owl-Listener/designer-skills)
Invoke in sequence, **informed by the competitive intel from Step 2**:
1. `/ui-design:color-system` with the business name + niche + competitive notes → propose 2-3 palettes (deliberately differentiated from what the top 5 use)
2. Show palettes to user, let them pick (or accept the recommended one)
3. `/ui-design:typography-scale` with the picked palette + niche → pick fonts
4. `/ui-design:visual-hierarchy` to confirm section emphasis priorities (weighted by which sections convert in the top 5)

Capture the design decisions as a JSON object:

```json
{
  "palette": {
    "name": "warm-coffee",
    "bg": "#1A1410",
    "surface": "#241B16",
    "accent": "#DC2626",
    "text": "#F5F0E8",
    "mute": "#A8998A"
  },
  "typography": {
    "headingFont": "Heebo",
    "bodyFont": "Heebo",
    "scale": "1.250"
  },
  "hierarchy": ["hero", "menu", "reservations", "location", "gallery", "faq"],
  "competitiveIntelPath": "competitive-intel.json"
}
```

### Step 4 — Wireframe phase (this skill's CLI)
Save the design JSON to `<slug>/design.json` (Claude writes it), then run:

```bash
node bin/build-business-site.js "<name>" <niche> --wireframe-only --design-file <slug>/design.json
```

The CLI generates `<slug>/wireframe.html` using the design tokens from `design.json` (real colors, real fonts), not the niche fallback. Wireframe also shows the 2 unpicked palettes at the bottom as comparison swatches with re-run instructions.

### Step 5 — Bar reviews
User opens `wireframe.html` and either:
- Approves → Claude proceeds to scaffold
- Asks to swap palette → Claude re-runs Step 3 (or just changes `design.json` and re-runs CLI)
- Asks for structural changes → Claude adjusts the niche config or hierarchy and regenerates

### Step 6 — Scaffold with SEO + GEO baked in
Once approved: scaffold Next.js with all SEO/GEO infrastructure already wired:

**Technical SEO (every generated site):**
- `app/layout.tsx` uses Next.js Metadata API — title template, OG, Twitter Cards
- `app/sitemap.ts` + `app/robots.ts` auto-generated routes
- `app/(seo)/<schemas>.tsx` server components inject Service + LocalBusiness + BreadcrumbList + FAQPage JSON-LD
- Per-page metadata via `generateMetadata` (each page has unique title + description)
- Hreflang `he-IL` set in `<html>`
- Canonical URL on every page
- Open Graph image generated via /peleg (1200×630), cached in `public/og/`

**Local GEO SEO (for businesses with a physical location):**
- LocalBusiness schema with address, geo coordinates, opening hours, phone, priceRange, image
- NAP block (Name / Address / Phone) consistent across header, footer, and contact page
- Waze + Google Maps embed in location section
- Google Business Profile link in footer (placeholder for manual setup)
- `aggregateRating` schema with placeholder until real reviews exist

**Crawlability:**
- Static export of all marketing pages (Next.js SSG)
- IndexNow ping on build (`/api/_ops/indexnow` endpoint)
- Sitemap submitted via Search Console API on first deploy (if `GSC_CREDENTIALS` env var present)

### Step 7 — Blog automation (Telegram-approved, 3 articles/week)

Every generated site ships with a blog system + GitHub Action that auto-drafts 3 articles per week, sends them to Telegram for Bar's approval, and publishes on approval.

**Architecture (matches the pattern in autoflowr-site):**

1. **`.github/workflows/weekly-blog.yml`** — cron triggers Sunday 09:00 IST.
2. **Action calls `api/blog/draft.ts`** (the generated site's own route) with `Authorization: Bearer ${CRON_SECRET}`.
3. **`draft.ts`** uses Claude Haiku to generate 3 article drafts based on:
   - Business niche + business name
   - Topics from `content/blog/topic-queue.json` (Claude refills this monthly)
   - Existing posts (to avoid duplication)
4. **Telegram** receives 3 messages with `[APPROVE]` and `[REJECT]` inline buttons per draft.
5. **Bar taps APPROVE** → Telegram webhook hits `api/blog/approve.ts` → commits the MDX file to the repo → Vercel auto-redeploys → live at `/blog/<slug>`.
6. **Bar taps REJECT** → draft discarded; next draft offered.

**Generated files for the blog:**
- `app/blog/page.tsx` — blog index
- `app/blog/[slug]/page.tsx` — post renderer with MDX
- `content/blog/*.mdx` — posts (one per file)
- `content/blog/topic-queue.json` — pending topics
- `app/api/blog/draft/route.ts` — drafts 3 articles via Claude Haiku
- `app/api/blog/approve/route.ts` — Telegram webhook handler
- `.github/workflows/weekly-blog.yml` — cron trigger

**Required env vars (per business):**
- `TELEGRAM_BOT_TOKEN` — bot to message
- `TELEGRAM_CHAT_ID` — Bar's chat (one bot, can serve many sites)
- `ANTHROPIC_API_KEY` — for Haiku drafts
- `CRON_SECRET` — random string, used by GitHub Action

**Topic queue strategy (per niche):**
- Restaurant → seasonal menus, chef interviews, ingredient origin stories, wine pairing
- Lawyer → law explainer posts, case study summaries, "what to do if..." guides
- Clinic → treatment explainers, before/after stories, expert Q&A
- Fitness → workout guides, nutrition tips, member transformation stories
- Tradesman → "how to diagnose X" guides, "when to call a pro vs DIY"
- Beauty → trend posts, product reviews, transformation stories

The skill generates a starter `topic-queue.json` with 30 niche-appropriate seed topics; the system refills it via a separate monthly action.

### Step 8 — Tunnel (Phase 3+)
Once approved: install deps, start dev server behind cloudflared tunnel, return the public preview URL.

### Step 9 — Ship (only on explicit go-ahead)
`--deploy` → Vercel prod. `--push` → GitHub repo for client handoff. The GitHub Action workflows (blog, indexnow, sitemap submit) take over once the repo exists.

## CLI flags (the mechanical layer)

```
build-business-site <business-name> <niche> [flags]
```

**Core:**
- `--wireframe-only` — generate wireframe and exit
- `--no-wireframe-gate` — skip wireframe approval, scaffold immediately
- `--local-only` — scaffold + print `npm run dev` instructions (no tunnel)
- `--deploy` — Vercel production
- `--push` — new GitHub repo for client handoff

**Design (filled by Claude after Step 2):**
- `--design-file <path>` — JSON file with palette + typography + hierarchy decisions
- `--palette <name>` — pick a niche-fallback palette by name (used when designer-skills not invoked)

**Mode:**
- `--mode=client-site` (default) — CTAs sell the client's product
- `--mode=lead-gen` — CTAs sell Autoflowr's service (this is the only mode that uses Autoflowr OWL branding — dark `#1A1A1C` + lime `#A3E635`)

**Optional overrides:**
- `--location "תל אביב"` — local SEO copy
- `--pixel-id <id>` `--ga4-id <id>` `--clarity-id <id>` — per-business tracking
- `--price-from <number>` — pricing band starting from

## Defaults inherited from Autoflowr

These are baked into every generated site **unless `--mode=lead-gen` is set** (lead-gen uses Autoflowr's own funnel, where these are first-party):
- Meta Pixel: `2784866505209727` (override per business via `--pixel-id`)
- GA4: `G-BJQGX3335C`
- Clarity: `wowvd5lwqt`
- Lead endpoint: `https://www.autoflowr.co.il/api/whatsapp/send-lead` (proxied — keeps the source business slug authoritative)
- RTL + Hebrew (`lang="he-IL"`, `dir="rtl"`)

What is **NOT** inherited (and must come from designer-skills per business):
- Color palette (bg, surface, accent, text)
- Typography pair (heading + body fonts)
- Visual hierarchy weighting

## Prerequisites

- Node.js 20+
- Owl-Listener/designer-skills installed via marketplace
- `cloudflared` (one-time: `winget install --id Cloudflare.cloudflared` on Windows)
- `ANTHROPIC_API_KEY` env var (for research phase in Phase 5+)
- Python 3 + `GEMINI_API_KEY` (for /peleg image generation)
- `vercel` CLI for `--deploy`
- `gh` CLI for `--push`

## Gotchas

- **Designer-skills must be installed before invoking this skill**, otherwise the wireframe falls back to the hardcoded niche palettes in `templates/niches/*.json` (which are seeds, not branded designs).
- The wireframe is **color**, not B&W — Bar wants to see the actual visual direction before scaffolding, not just hierarchy.
- The `_default` niche is for generic businesses that don't fit one of the 6 specific niches — its palettes are deliberately neutral and do NOT include Autoflowr OWL lime. OWL palette is reserved for `--mode=lead-gen`.
- When re-running with the same slug, preserve any hand-edited `app/(content)/copy.ts` or `design.json` — don't blow away manual edits.
- `cloudflared tunnel --url` gives a free throwaway `trycloudflare.com` URL. Don't use `cloudflared tunnel run <name>` — that requires a named tunnel + Cloudflare account setup.
- `.env.local` contains tracking IDs — never commit. The skill's `.gitignore` excludes it.
- **Competitive analysis (Step 2) takes 30-60 seconds** — 5 WebFetches × ~5s each. Don't skip it: the wireframe quality depends on knowing what already works in the market. If a niche has very few Hebrew competitors online, fall back to top 5 English-market equivalents and translate the patterns.
- **Blog automation requires per-business Telegram setup**: bot token + chat ID + GitHub Action secrets. The skill generates a setup checklist in `<slug>/SETUP-BLOG.md` after scaffolding — Bar walks through it once per client. One Telegram bot can serve many sites (chat ID is shared).
- **GEO schema needs real coordinates** — the skill geocodes the business address using free OpenStreetMap Nominatim during scaffold. If Nominatim is rate-limited or returns no match, the schema still ships but with `geo: null` and a placeholder for manual fill.
- **Article publishing flow respects Telegram's rate limits** — drafts are sent one at a time, with 2-second spacing. Approval webhooks must respond within 6 seconds (Telegram retry threshold) — the route returns immediately and processes the commit in the background.
