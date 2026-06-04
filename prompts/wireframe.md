# Wireframe prompt

You are generating a low-fidelity HTML wireframe for a Hebrew RTL business website. Output a single self-contained HTML document — no external assets, no JS, inline CSS only.

## Visual rules

- **Black-and-white only.** No accent colors yet (the niche accent is shown only as a small swatch in the corner for reference).
- Sections rendered as boxes with dashed borders (`border: 1.5px dashed #111`).
- Real Hebrew copy in headings (not lorem ipsum) — taken from the research output below.
- Image slots = grey boxes with the label `[IMAGE: <description>]` centered inside.
- Buttons/CTAs = filled black boxes with white text.
- Form fields = bordered rectangles labeled in Hebrew.
- Hierarchy must be obvious from typography weight + size, NOT color.

## Document shell

```html
<!DOCTYPE html>
<html lang="he-IL" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>WIREFRAME — {{businessName}}</title>
  <style>
    body { font-family: "Heebo", "Segoe UI", Arial, sans-serif; background: #fff; color: #111; max-width: 720px; margin: 0 auto; padding: 40px 24px; }
    .wf-section { border: 1.5px dashed #111; padding: 24px; margin: 16px 0; }
    .wf-img { background: #ddd; padding: 60px; text-align: center; font-size: 14px; color: #555; border: 1px solid #aaa; }
    .wf-btn { display: inline-block; background: #111; color: #fff; padding: 12px 24px; font-weight: 600; font-size: 15px; margin: 8px 4px; }
    .wf-input { display: block; width: 100%; padding: 10px; border: 1px solid #111; margin: 8px 0; background: #fff; font-family: inherit; font-size: 14px; }
    .wf-accent-chip { position: fixed; top: 10px; left: 10px; width: 18px; height: 18px; border: 1px solid #111; }
    h1 { font-size: 32px; margin: 0 0 12px; font-weight: 800; }
    h2 { font-size: 22px; margin: 24px 0 12px; font-weight: 700; }
    h3 { font-size: 17px; margin: 16px 0 8px; font-weight: 600; }
    p { font-size: 15px; line-height: 1.6; margin: 8px 0; }
    ul { font-size: 14px; padding-right: 20px; }
    .wf-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 8px; }
    .wf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  </style>
</head>
<body>
  <div class="wf-accent-chip" style="background: {{accentHex}};" title="Future accent color: {{accentHex}}"></div>
  <!-- sections here -->
</body>
</html>
```

## Section conventions

Every section starts with a `.wf-label` showing its purpose (e.g. `HERO`, `PRICING`, `FAQ`), then the content.

```html
<div class="wf-section">
  <div class="wf-label">HERO</div>
  <h1>{{hero headline}}</h1>
  <p>{{hero subtitle}}</p>
  <span class="wf-btn">{{primary CTA}}</span>
  <span class="wf-btn" style="background: #fff; color: #111; border: 1.5px solid #111;">{{secondary CTA}}</span>
  <div class="wf-img" style="margin-top: 16px;">[IMAGE: hero — {{imagePromptHint}}]</div>
</div>
```

## Required sections (in order, per niche)

The niche config provides `pages: string[]` listing required sections. Render each as a `.wf-section`, in the order given. Common section patterns:

- `home` / `hero` → headline + subtitle + 2 CTAs + hero image slot
- `menu` (restaurant) → 3 category groups, 4 items each, name + price + 1-line description
- `practice_areas` (lawyer) → 4-6 cards with title + 1-line description + "קרא עוד"
- `treatments` (clinic) → 4-6 cards with treatment name + duration + starting price
- `classes` (fitness) → schedule table (day, class name, time, trainer)
- `services` (tradesman) → emergency CTA banner + service list + service area note
- `gallery` (beauty) → 6-image grid placeholder labeled "Before / After"
- `pricing` → 1-3 price tiers with feature lists
- `faq` → 5 questions with answers (collapsed by default in real site; shown expanded in wireframe)
- `about` → photo slot + 2-paragraph bio
- `lead_form` → form with: name, phone, message field + submit button (label: "שלחו לי הצעת מחיר" or niche-appropriate)
- `footer` → business name + phone + WhatsApp + address + © year

## Input you'll receive

```json
{
  "businessName": "...",
  "slug": "...",
  "niche": "...",
  "mode": "client-site" | "lead-gen",
  "location": "...",
  "priceFrom": null | number,
  "nicheConfig": {
    "pages": [...],
    "accentHex": "#...",
    "painPointSeeds": [...],
    "trustSignals": [...],
    "imagePromptHints": [...]
  },
  "research": {
    "painPoints": [5 strings],
    "faq": [{"q": "...", "a": "..."}, ...8 items],
    "pricingBand": {"low": N, "high": N},
    "heroHeadline": "...",
    "heroSubtitle": "...",
    "primaryCta": "...",
    "secondaryCta": "..."
  }
}
```

If `research` is missing or partial (Phase 1 MVP — no Claude API yet), use sensible Hebrew placeholders derived from `painPointSeeds` and `niche`. Examples:

- `heroHeadline` fallback: `"${businessName} — ${nicheHeadlineSuffix[niche]}"`
- `primaryCta` fallback: niche-specific (`"להזמין שולחן"` for restaurant, `"לקבוע פגישה"` for lawyer, `"לקביעת תור"` for clinic, etc.)

## Output

Return ONLY the HTML document — no commentary, no markdown fences. The document must render standalone in a browser.
