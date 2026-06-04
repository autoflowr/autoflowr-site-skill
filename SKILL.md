---
name: build-business-site
description: Generates a per-business Next.js 15 website (Hebrew RTL) from minimal input — business name + niche. Orchestrates Owl-Listener/designer-skills (color-system, typography-scale, visual-hierarchy) to design a unique visual identity per business, then drafts an HTML wireframe for approval, scaffolds the Next.js project with lead form wired to Autoflowr's /api/whatsapp/send-lead, wires Meta Pixel + GA4 + Clarity, generates hero/OG images via /peleg, and exposes the dev server through a Cloudflare Tunnel for live phone-review. Use when Bar needs to spin up a new client site fast.
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
```

**Skills this skill delegates to:**

| Stage | Skill invoked | What it returns |
|---|---|---|
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

### Step 2 — Design phase (via Owl-Listener/designer-skills)
Invoke in sequence:
1. `/ui-design:color-system` with the business name + niche + any brand notes → propose 2-3 palettes
2. Show palettes to user, let them pick (or accept the recommended one)
3. `/ui-design:typography-scale` with the picked palette + niche → pick fonts
4. `/ui-design:visual-hierarchy` to confirm section emphasis priorities

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
  "hierarchy": ["hero", "menu", "reservations", "location", "gallery", "faq"]
}
```

### Step 3 — Wireframe phase (this skill's CLI)
Save the design JSON to `<slug>/design.json` (Claude writes it), then run:

```bash
node bin/build-business-site.js "<name>" <niche> --wireframe-only --design-file <slug>/design.json
```

The CLI generates `<slug>/wireframe.html` using the design tokens from `design.json` (real colors, real fonts), not the niche fallback. Wireframe also shows the 2 unpicked palettes at the bottom as comparison swatches with re-run instructions.

### Step 4 — Bar reviews
User opens `wireframe.html` and either:
- Approves → Claude proceeds to scaffold
- Asks to swap palette → Claude re-runs Step 2 (or just changes `design.json` and re-runs CLI)
- Asks for structural changes → Claude adjusts the niche config or hierarchy and regenerates

### Step 5 — Scaffold + tunnel (later phases)
Once approved: scaffold Next.js, install deps, start dev server behind cloudflared tunnel, return the public preview URL.

### Step 6 — Ship (only on explicit go-ahead)
`--deploy` → Vercel prod. `--push` → GitHub repo for client handoff.

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
