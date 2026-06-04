import fs from "fs-extra";
import path from "node:path";
import crypto from "node:crypto";
import kleur from "kleur";
import { buildLocalBusinessJsonLd } from "./seo-geo.js";
import { generateNicheSections } from "./niche-router.js";
import { hasBaseline, shouldWrite, writeBaseline, reportPreserved } from "./drift.js";
import { TOPIC_SEEDS, generateSetupChecklist } from "./blog-automation.js";

/**
 * Scaffold a Next.js 15 project at <outDir> using templates/base/*.tmpl files.
 *
 * No external commands are invoked — we materialize the project files directly
 * from the templates. `npm install` happens later (Phase 3 / tunnel mode) so
 * --wireframe-only runs stay fast.
 */
export async function scaffoldProject({
  businessName,
  niche,
  nicheCfg,
  slug,
  outDir,
  mode,
  location,
  designTokens,
  research,
  pixelId,
  ga4Id,
  clarityId,
  skillRoot,
  siteUrl,
}) {
  const baseDir = path.join(skillRoot, "templates", "base");
  if (!(await fs.pathExists(baseDir))) {
    throw new Error(`Base templates directory not found: ${baseDir}`);
  }

  const ctx = buildContext({
    businessName, niche, nicheCfg, slug, outDir, mode, location,
    designTokens, research, pixelId, ga4Id, clarityId, siteUrl,
  });

  const written = [];
  const preserved = [];
  const hadBaseline = await hasBaseline(outDir);

  // Generate niche-specific section components first, so we can substitute
  // their imports + renders into the page.tsx template.
  const sections = await generateNicheSections({ outDir, nicheCfg, businessName, niche, research });
  ctx.sectionImports = sections.imports.join("\n");
  ctx.sectionRenders = sections.renders.join("\n");
  written.push(...sections.written);

  // Walk base/ and materialize each file. .tmpl files get variable substitution,
  // others are copied verbatim. Drift detection skips overwriting user-edited files.
  const entries = await walkDir(baseDir);
  for (const rel of entries) {
    const src = path.join(baseDir, rel);
    const isTemplate = rel.endsWith(".tmpl");
    const destRel = (isTemplate ? rel.replace(/\.tmpl$/, "") : rel).replace(/\\/g, "/");
    const dest = path.join(outDir, destRel);

    if (hadBaseline) {
      const decision = await shouldWrite(outDir, destRel);
      if (!decision.write) {
        preserved.push(destRel);
        continue;
      }
    }

    await fs.ensureDir(path.dirname(dest));
    if (isTemplate) {
      const raw = await fs.readFile(src, "utf8");
      const rendered = substitute(raw, ctx);
      await fs.writeFile(dest, rendered, "utf8");
    } else {
      await fs.copy(src, dest);
    }
    written.push(destRel);
  }

  // Write design.json + competitive-intel placeholder so future re-runs can pick up.
  await fs.writeJson(path.join(outDir, "design.json"), {
    palette: designTokens.palette,
    typography: designTokens.typography,
    hierarchy: designTokens.hierarchy,
  }, { spaces: 2 });

  // Write the IndexNow ownership file at public/<key>.txt
  const indexnowFile = path.join(outDir, "public", `${ctx.indexnowKey}.txt`);
  await fs.ensureDir(path.dirname(indexnowFile));
  await fs.writeFile(indexnowFile, ctx.indexnowKey + "\n", "utf8");
  written.push(`public/${ctx.indexnowKey}.txt`);

  // Snapshot baseline for drift detection on future re-runs.
  const baselineDir = path.join(outDir, ".skill-baseline");
  await fs.ensureDir(baselineDir);
  await fs.writeJson(path.join(baselineDir, "ctx.json"), ctx, { spaces: 2 });
  await writeBaseline(outDir, written);

  if (preserved.length > 0) {
    await reportPreserved(outDir, preserved);
  }

  return { written, preserved, ctx };
}

async function walkDir(root) {
  const out = [];
  async function rec(rel) {
    const abs = path.join(root, rel);
    const stat = await fs.stat(abs);
    if (stat.isDirectory()) {
      const items = await fs.readdir(abs);
      for (const item of items) await rec(path.join(rel, item));
    } else {
      out.push(rel);
    }
  }
  await rec("");
  return out;
}

function buildContext(args) {
  const {
    businessName, niche, nicheCfg, slug, mode, location, designTokens,
    research, pixelId, ga4Id, clarityId, siteUrl,
  } = args;
  const palette = designTokens.palette;
  const accentGlow = rgbaFromHex(palette.accent, 0.3);
  const border = rgbaFromHex(palette.text, 0.1);

  const siteHost = siteUrl ? new URL(siteUrl).host : `${slug}.vercel.app`;
  const effectiveUrl = siteUrl || `https://${siteHost}`;

  // Build a starter JSON-LD: LocalBusiness with placeholder geo (Phase 7 enriches).
  const ld = buildLocalBusinessJsonLd({
    businessName,
    niche,
    address: location || "",
    geo: null,
    phone: "{{phone}}",
    url: effectiveUrl,
    openingHours: [],
    priceRange: "$$",
  });

  return {
    businessName,
    slug,
    shortName: businessName.slice(0, 12),
    niche,
    mode,
    siteUrl: effectiveUrl,
    siteHost,
    tagline: research.heroSubtitle?.slice(0, 60) || "",
    metaDescription: research.heroSubtitle || `${businessName} — שירות מקצועי`,
    headingFont: designTokens.typography?.headingFont || "Heebo",
    bodyFont: designTokens.typography?.bodyFont || "Heebo",
    palette: {
      bg: palette.bg,
      surface: palette.surface,
      accent: palette.accent,
      text: palette.text,
      mute: palette.mute,
      accentGlow,
      border,
    },
    heroHeadline: research.heroHeadline,
    heroSubtitle: research.heroSubtitle,
    primaryCta: research.primaryCta,
    secondaryCta: research.secondaryCta,
    whatsappMessage: `היי, ראיתי את האתר של ${businessName} ואשמח לפרטים`,
    heroImageAlt: `${businessName} — תמונת hero`,
    leadFormHeading: "השאירו פרטים — נחזור אליכם",
    leadFormSubheading: "מענה תוך שעה בשעות הפעילות.",
    leadFormSubmitLabel: research.primaryCta,
    leadFormSuccessMessage: "תודה! קיבלנו את הפרטים. נחזור אליך בוואטסאפ.",
    leadFormDisclaimer: "הטופס נשלח ישירות לוואטסאפ של העסק. לא ישותף עם צדדים שלישיים.",
    pixelId: pixelId || "",
    ga4Id: ga4Id || "",
    clarityId: clarityId || "",
    address: location || "",
    phoneDisplay: "054-XXX-XXXX",
    phoneE164: "+972XXXXXXXXX",
    whatsappNumber: "972XXXXXXXXX",
    openingHoursDisplay: "ראשון-חמישי 09:00-19:00 · שישי 09:00-13:00",
    leadEndpoint: "https://www.autoflowr.co.il/api/whatsapp/send-lead",
    sectionImports: "",
    sectionRenders: "",
    jsonLdJson: JSON.stringify(ld, null, 2),
    faqJson: JSON.stringify(research.faq || [], null, 2),
    indexnowKey: crypto.randomBytes(16).toString("hex"),
    llmsPages: "",
    generatedAt: new Date().toISOString().slice(0, 10),
    topicQueueJson: JSON.stringify(TOPIC_SEEDS[niche] || TOPIC_SEEDS._default, null, 2),
    setupBlogMd: generateSetupChecklist({ businessName, slug, deployUrl: effectiveUrl }),
  };
}

function substitute(raw, ctx) {
  return raw.replace(/\{\{([\w.]+)\}\}/g, (_, expr) => {
    const value = expr.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), ctx);
    if (value == null) return "";
    return String(value);
  });
}

function rgbaFromHex(hex, alpha) {
  const h = String(hex).replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function printPostScaffoldHelp(outDir) {
  console.log("");
  console.log(kleur.green("✓ Next.js project scaffolded."));
  console.log("");
  console.log(kleur.bold("Next steps:"));
  console.log(`  ${kleur.cyan("cd " + outDir)}`);
  console.log(`  ${kleur.cyan("npm install")}`);
  console.log(`  ${kleur.cyan("npm run dev")}`);
  console.log("");
  console.log(kleur.gray("Then open http://localhost:3000"));
}
