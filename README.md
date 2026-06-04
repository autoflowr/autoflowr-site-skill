# autoflowr-site-skill

A Claude Code skill that generates per-business Next.js 15 websites for [Autoflowr Studio](https://www.autoflowr.co.il/) clients.

Built for one-command site generation: `/build-business-site "<name>" <niche>` produces a wireframe, then a full RTL Hebrew Next.js project, then a Cloudflare Tunnel URL you can review on your phone — all in under 3 minutes.

## What it generates

Each invocation produces a `<business-slug>/` directory containing:

- Next.js 15 (App Router) + TypeScript + Tailwind
- RTL Hebrew layout (`lang="he-IL"`, `dir="rtl"`, Heebo + JetBrains Mono)
- OWL design tokens with per-niche accent color (restaurant=`#DC2626`, lawyer=`#1E3A8A`, etc.)
- Niche-specific page structure (menu for restaurants, articles log for lawyers, emergency CTA for tradesmen)
- Lead form wired to `https://www.autoflowr.co.il/api/whatsapp/send-lead` (proxied via `/app/api/lead/route.ts`)
- Meta Pixel + GA4 + Clarity tracking pre-installed
- JSON-LD schema (Service + LocalBusiness + BreadcrumbList + FAQPage)
- Hero + OG images generated via `/peleg` (Gemini NanoBanana)
- CSP headers matching the autoflowr-site production setup

## Install

```bash
git clone https://github.com/<your-org>/autoflowr-site-skill.git
cd autoflowr-site-skill
npm install
npm link  # makes `build-business-site` available globally
```

To register as a Claude Code skill, symlink it into `~/.claude/skills/`:

```bash
# macOS / Linux
ln -s "$PWD" ~/.claude/skills/build-business-site

# Windows PowerShell (as admin)
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.claude\skills\build-business-site" -Target (Get-Location).Path
```

## Prerequisites

| Tool | Required when | Install |
|---|---|---|
| Node.js 20+ | Always | https://nodejs.org/ |
| `cloudflared` | Default tunnel mode | `winget install --id Cloudflare.cloudflared` (Windows) / `brew install cloudflared` (macOS) |
| `ANTHROPIC_API_KEY` env var | Research phase | https://console.anthropic.com/ |
| `GEMINI_API_KEY` env var | Image generation | https://aistudio.google.com/apikey |
| Python 3.10+ | Image generation | https://www.python.org/ |
| `vercel` CLI | `--deploy` flag | `npm install -g vercel` |
| `gh` CLI | `--push` flag | https://cli.github.com/ |

## Usage

### Default flow (wireframe → approval → scaffold → tunnel)

```bash
build-business-site "מסעדת אילוז דגים" restaurant
```

1. Skill drafts a wireframe at `mizada-iluz-dagim/wireframe.html`
2. Open it, give notes or approve
3. Re-run the same command — skill scaffolds the Next.js project
4. Tunnel URL is printed; open on phone for live review

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

## Supported niches

| Niche | Page structure | Accent |
|---|---|---|
| `restaurant` | Hero / Menu / Reservations / Location / Gallery | `#DC2626` |
| `lawyer` | Hero / Practice Areas / About / Articles / Contact | `#1E3A8A` |
| `clinic` | Hero / Treatments / Pricing / Team / FAQ | `#0EA5E9` |
| `fitness` | Hero / Classes / Packages / Transformations / Trainers | `#F59E0B` |
| `tradesman` | Hero (emergency CTA) / Services / Service Area / Reviews / Contact | `#EAB308` |
| `beauty` | Hero / Services / Gallery / Booking / About | `#EC4899` |
| `_default` | Hero / Services / About / FAQ / Contact | `#A3E635` (OWL lime) |

## Modes

`--mode=lead-gen` — CTAs funnel visitors to Autoflowr (for landing pages selling sites to that niche).
`--mode=client-site` — CTAs funnel visitors to the client's own business (default — turnkey site delivered to client).

## License

MIT — see `LICENSE`.

## Status

Phase 1 (Wireframe MVP) — current. Remaining phases tracked in the skill repo's project board.
