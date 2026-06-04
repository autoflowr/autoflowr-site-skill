/**
 * Niche research module — calls Claude API to generate hero copy, FAQ, pain points,
 * trust signals, and pricing band for a specific business + niche + location.
 *
 * If `ANTHROPIC_API_KEY` is not in env, falls back to deterministic niche-based
 * Hebrew copy (the same fallbacks used in the wireframe).
 *
 * Output schema:
 *   {
 *     heroHeadline: string,
 *     heroSubtitle: string,
 *     primaryCta: string,
 *     secondaryCta: string,
 *     painPoints: string[5],
 *     trustSignals: string[3],
 *     faq: [{q, a}, ...8],
 *     pricingBand: {low, high} | null,
 *     metaDescription: string,
 *   }
 */

import fs from "fs-extra";
import path from "node:path";
import kleur from "kleur";

const MODEL = "claude-haiku-4-5-20251001";

export async function researchBusiness({ businessName, niche, nicheCfg, location, mode, competitiveIntel, skillRoot }) {
  const fallback = buildFallback({ businessName, niche, nicheCfg, location, mode });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.log(kleur.gray("  (ANTHROPIC_API_KEY not set — using niche fallback copy)"));
    return fallback;
  }

  try {
    const sdkModule = await import("@anthropic-ai/sdk").catch(() => null);
    if (!sdkModule) {
      console.log(kleur.gray("  (@anthropic-ai/sdk not installed in skill — using fallback)"));
      return fallback;
    }
    const Anthropic = sdkModule.default || sdkModule.Anthropic;
    const client = new Anthropic({ apiKey: key });

    const prompt = await loadPrompt(skillRoot);
    const userMessage = buildUserMessage({ businessName, niche, nicheCfg, location, mode, competitiveIntel });

    console.log(kleur.gray("  Calling Claude Haiku for Hebrew copy..."));
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: prompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = resp.content?.[0]?.text || "";
    const parsed = parseClaudeOutput(text);
    if (!parsed) {
      console.log(kleur.yellow("  ⚠ Claude returned unparseable output — falling back to niche defaults"));
      return fallback;
    }

    return { ...fallback, ...parsed };
  } catch (err) {
    console.log(kleur.yellow(`  ⚠ Claude research failed: ${err.message} — using fallback`));
    return fallback;
  }
}

async function loadPrompt(skillRoot) {
  const promptPath = path.join(skillRoot, "prompts", "research-niche.md");
  if (await fs.pathExists(promptPath)) {
    return await fs.readFile(promptPath, "utf8");
  }
  return DEFAULT_SYSTEM_PROMPT;
}

const DEFAULT_SYSTEM_PROMPT = `You are a senior Hebrew copywriter specializing in conversion-focused landing pages for Israeli local businesses. Your output must be:

1. **Hebrew (he-IL)** — natural, idiomatic, NOT translated English
2. **Concise** — every word earns its place
3. **Trust-first** — open with credibility, never sales-y
4. **Specific** — use real numbers, real locations, real timeframes (avoid "many", "various", "amazing")

Output STRICT JSON only — no commentary, no markdown fences. Schema:

{
  "heroHeadline": "string — up to 60 chars, includes business name + key promise",
  "heroSubtitle": "string — up to 140 chars, expands on the headline with concrete value",
  "primaryCta": "string — up to 20 chars, action verb (להזמין / לקבוע תור / וכו')",
  "secondaryCta": "string — up to 20 chars, lower-friction alt (וואטסאפ / לראות תפריט / וכו')",
  "metaDescription": "string — 140-160 chars, SERP-optimized, includes location if provided",
  "painPoints": ["5 Hebrew strings — specific scenarios the target customer faces"],
  "trustSignals": ["3 Hebrew strings — credibility markers this business should show"],
  "faq": [
    {"q": "Hebrew question", "a": "Hebrew answer (1-2 sentences)"}
  ]
}`;

function buildUserMessage({ businessName, niche, nicheCfg, location, mode, competitiveIntel }) {
  const lines = [
    `Business name: ${businessName}`,
    `Niche: ${niche}`,
    `Mode: ${mode}`,
  ];
  if (location) lines.push(`Location: ${location}`);
  if (nicheCfg.painPointSeeds?.length) lines.push(`Pain point seeds (for inspiration): ${nicheCfg.painPointSeeds.join(", ")}`);
  if (nicheCfg.trustSignals?.length) lines.push(`Trust signal seeds: ${nicheCfg.trustSignals.join(", ")}`);
  if (competitiveIntel?.patterns?.common?.length) {
    lines.push(`Common competitor patterns (build on these or differentiate): ${competitiveIntel.patterns.common.join("; ")}`);
  }
  if (competitiveIntel?.recommendations?.differentiate_via?.length) {
    lines.push(`Differentiation opportunities: ${competitiveIntel.recommendations.differentiate_via.join("; ")}`);
  }
  lines.push("");
  lines.push("Generate the JSON for this business. 8 FAQ items. Return JSON only.");
  return lines.join("\n");
}

function parseClaudeOutput(text) {
  // Extract JSON block, tolerant of code-fence wrappers
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1] : text;
  try {
    const obj = JSON.parse(jsonText.trim());
    if (typeof obj.heroHeadline === "string" && Array.isArray(obj.faq)) return obj;
    return null;
  } catch {
    return null;
  }
}

function buildFallback({ businessName, niche, nicheCfg, location, mode }) {
  const loc = location ? ` ב${location}` : "";
  const ctas = ctasForNiche(niche, mode);
  return {
    heroHeadline: heroHeadline(niche, businessName, location),
    heroSubtitle: heroSubtitle(niche, location),
    primaryCta: ctas.primary,
    secondaryCta: ctas.secondary,
    metaDescription: `${businessName}${loc} — ${heroSubtitle(niche, location).slice(0, 130)}`,
    painPoints: nicheCfg.painPointSeeds || [],
    trustSignals: nicheCfg.trustSignals || [],
    faq: defaultFaq(niche),
    pricingBand: null,
  };
}

function heroHeadline(niche, name, location) {
  const loc = location ? ` ב${location}` : "";
  switch (niche) {
    case "restaurant": return `${name}${loc} — חוויה קולינרית שלא תשכחו`;
    case "lawyer":     return `${name} — ייצוג משפטי שאפשר לסמוך עליו`;
    case "clinic":     return `${name}${loc} — טיפול מקצועי, יחס אישי`;
    case "fitness":    return `${name}${loc} — תוצאות, לא הבטחות`;
    case "tradesman":  return `${name}${loc} — שירות מהיר ואמין, 24/7`;
    case "beauty":     return `${name}${loc} — היופי שלך, בידיים הכי טובות`;
    default:           return `${name}${loc} — שירות מקצועי`;
  }
}

function heroSubtitle(niche, location) {
  switch (niche) {
    case "restaurant": return `מסעדה משפחתית${location ? " ב" + location : ""}. אוכל אמיתי, תפריט שמתחדש, חוויה שמתחילה ברגע שאתם נכנסים.`;
    case "lawyer":     return `ייעוץ ראשוני חינם, תמחור ברור מראש, ליווי אישי מהתיק הראשון עד פסק הדין.`;
    case "clinic":     return `קליניקה מאובזרת בציוד חדיש, צוות מנוסה, ותוצאות שמדברות בעד עצמן.`;
    case "fitness":    return `אימונים מותאמים אישית, מסלול ברור, ותוצאות שתראו תוך חודשיים.`;
    case "tradesman":  return `קוראים — מגיעים. עובדים נקי, מסיימים בזמן, אחריות מלאה על העבודה.`;
    case "beauty":     return `טיפולים פרימיום בידיים מנוסות, סביבה רגועה, ותוצאה שגורמת לך לחייך במראה.`;
    default:           return `שירות אישי, מחירים הוגנים, ועבודה שמדברת בעד עצמה.`;
  }
}

function ctasForNiche(niche, mode) {
  if (mode === "lead-gen") return { primary: "אבחון AI חינם ←", secondary: "וואטסאפ" };
  switch (niche) {
    case "restaurant": return { primary: "להזמין שולחן", secondary: "תפריט" };
    case "lawyer":     return { primary: "לקבוע פגישה", secondary: "וואטסאפ" };
    case "clinic":     return { primary: "לקביעת תור", secondary: "שאלה בוואטסאפ" };
    case "fitness":    return { primary: "שיעור ניסיון", secondary: "מסלולים" };
    case "tradesman":  return { primary: "להזמין עכשיו", secondary: "וואטסאפ" };
    case "beauty":     return { primary: "לקביעת תור", secondary: "גלריה" };
    default:           return { primary: "צרו קשר", secondary: "וואטסאפ" };
  }
}

function defaultFaq(niche) {
  const common = [
    { q: "איך אפשר ליצור איתכם קשר?", a: "טופס באתר, וואטסאפ, או טלפון. מענה תוך שעה בשעות הפעילות." },
    { q: "מה שעות הפעילות?", a: "ראשון-חמישי 09:00-19:00, שישי 09:00-13:00. שבת סגור." },
    { q: "האם יש חניה?", a: "כן, חניה חינמית בסמוך לעסק." },
  ];
  return common;
}
