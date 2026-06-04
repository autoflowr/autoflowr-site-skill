# autoflowr-site-skill

A Claude Code skill that generates per-business Next.js 15 websites for [Autoflowr Studio](https://www.autoflowr.co.il/) clients.

Built for one-command site generation: `/build-business-site "<name>" <niche>` produces a wireframe with niche-appropriate visual identity, then a full RTL Hebrew Next.js project, then a Cloudflare Tunnel URL you can review on your phone — all in under 3 minutes.

## How it differs from a template generator

Every generated site gets a **unique visual identity** — not a copy of Autoflowr's branding. This skill orchestrates the [Owl-Listener/designer-skills](https://github.com/Owl-Listener/designer-skills) marketplace (91 skills across 9 design plugins) to pick palette, typography, and visual hierarchy per business.

The Autoflowr OWL look (dark `#1A1A1C` + lime `#A3E635`) is reserved for `--mode=lead-gen` only — when the generated site is Autoflowr's own funnel.

## What it generates

Each invocation produces a `<business-slug>/` directory containing:

- Next.js 15 (App Router) + TypeScript + Tailwind
- RTL Hebrew layout (`lang="he-IL"`, `dir="rtl"`, Heebo + JetBrains Mono)
- Per-business design tokens (palette + typography + hierarchy) — sourced from `/ui-design:color-system` / `/ui-design:typography-scale` / `/ui-design:visual-hierarchy` (Owl-Listener)
- Niche-specific page structure (menu for restaurants, articles log for lawyers, emergency CTA for tradesmen)
- Lead form wired to `https://www.autoflowr.co.il/api/whatsapp/send-lead` (proxied via `/app/api/lead/route.ts`)
- Meta Pixel + GA4 + Clarity tracking pre-installed
- JSON-LD schema (Service + LocalBusiness + BreadcrumbList + FAQPage)
- Hero + OG images generated via `/peleg` (Gemini NanoBanana)
- CSP headers matching the autoflowr-site production setup

## Install

```bash
# 1. Clone the skill
git clone https://github.com/autoflowr/autoflowr-site-skill.git
cd autoflowr-site-skill
npm install
npm link  # makes `build-business-site` available globally

# 2. Register it as a Claude Code skill
# macOS / Linux:
ln -s "$PWD" ~/.claude/skills/build-business-site
# Windows PowerShell (as admin):
# New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.claude\skills\build-business-site" -Target (Get-Location).Path

# 3. Install the design backbone (Owl-Listener/designer-skills)
# Inside Claude Code:
# /plugin marketplace add Owl-Listener/designer-skills
# /plugin install ui-design
# /plugin install design-systems
# /plugin install visual-critique
```

## Prerequisites

| Tool | Required when | Install |
|---|---|---|
| Node.js 20+ | Always | https://nodejs.org/ |
| Owl-Listener/designer-skills (ui-design, design-systems, visual-critique plugins) | Default flow — picks palette/typography per business | `/plugin marketplace add Owl-Listener/designer-skills` inside Claude Code |
| `cloudflared` | Default tunnel mode | `winget install --id Cloudflare.cloudflared` (Windows) / `brew install cloudflared` (macOS) |
| `ANTHROPIC_API_KEY` env var | Research phase | https://console.anthropic.com/ |
| `GEMINI_API_KEY` env var | Image generation | https://aistudio.google.com/apikey |
| Python 3.10+ | Image generation | https://www.python.org/ |
| `vercel` CLI | `--deploy` flag | `npm install -g vercel` |
| `gh` CLI | `--push` flag | https://cli.github.com/ |

## Usage

### Default flow (Claude orchestrates designer-skills → wireframe → tunnel)

Invoke inside Claude Code:

```
/build-business-site "מסעדת אילוז דגים" restaurant
```

Claude follows this sequence:
1. Invokes `/ui-design:color-system` to propose 2-3 palettes for the restaurant
2. Asks you to pick one (or accepts the recommended)
3. Invokes `/ui-design:typography-scale` for the font pair
4. Writes `design.json` into the project directory
5. Runs the CLI: `node bin/build-business-site.js "..." restaurant --wireframe-only --design-file design.json`
6. Opens `wireframe.html` for review

If you say "approve" → Claude proceeds with scaffold + tunnel (later phases).
If you say "swap palette" → Claude re-runs Step 1.

### Direct CLI use (skipping designer-skills, using niche fallbacks)

```bash
# Default palette for the niche
build-business-site "מסעדת אילוז דגים" restaurant --wireframe-only

# Pick a specific niche-fallback palette
build-business-site "מסעדת אילוז דגים" restaurant --wireframe-only --palette olive-rustic

# Lead-gen mode (Autoflowr's own funnel — uses OWL palette)
build-business-site "Test landing" _default --wireframe-only --mode=lead-gen
```

### Wireframe only

```bash
build-business-site "עו''ד דנה כהן" lawyer --wireframe-only
```

### Skip wireframe gate (fast path)

```bash
build-business-site "סטודיו פליין" fitness --no-wireframe-gate
```

### Ship to production

```bash
cd <slug>
build-business-site --deploy           # Vercel prod
build-business-site --push --repo-owner <gh-username>   # GitHub repo for client handoff
```

## Supported niches + fallback palettes

If `--design-file` is not provided (and `--mode != lead-gen`), the wireframe uses niche fallback palettes. Each niche ships with 3 options — switch via `--palette <name>`.

| Niche | Page structure | Fallback palettes |
|---|---|---|
| `restaurant` | Hero / Menu / Reservations / Location / Gallery | `warm-coffee` · `olive-rustic` · `terracotta-cream` |
| `lawyer` | Hero / Practice Areas / About / Articles / Contact | `trust-navy` · `burgundy-classic` · `graphite-gold` |
| `clinic` | Hero / Treatments / Pricing / Team / FAQ | `clinical-sky` · `mint-soft` · `warm-sand` |
| `fitness` | Hero / Classes / Packages / Transformations / Trainers | `energy-amber` · `athletic-red` · `electric-lime` |
| `tradesman` | Hero (emergency CTA) / Services / Service Area / Reviews / Contact | `safety-yellow` · `industrial-orange` · `trust-steel` |
| `beauty` | Hero / Services / Gallery / Booking / About | `soft-blush` · `luxe-rose-gold` · `elegant-lavender` |
| `_default` | Hero / Services / About / FAQ / Contact | `modern-sapphire` · `warm-coral` · `minimalist-cyan` |

For client sites, prefer running through Claude so it invokes `/ui-design:color-system` and picks a palette **tailored to the specific business**, not just the niche default.

## Modes

| Mode | Use when | Palette source |
|---|---|---|
| `--mode=client-site` (default) | Building a turnkey site for a paying client | designer-skills (preferred) or niche fallback |
| `--mode=lead-gen` | Building Autoflowr's own funnel/landing page | Always uses OWL lime `#A3E635` on `#1A1A1C` (Autoflowr brand) |

## License

MIT — see `LICENSE`.

## Status

Phase 1.5 (Wireframe MVP + designer-skills integration) — current.

Remaining phases:
- Phase 2: Next.js scaffolder
- Phase 3: Cloudflare Tunnel
- Phase 4: Niche-specific components
- Phase 5: Claude API research → real Hebrew copy
- Phase 6: /peleg image generation
- Phase 7: Tracking + JSON-LD schema injection
- Phase 8: `--deploy` + `--push`
- Phase 9: `--mode=lead-gen` end-to-end
