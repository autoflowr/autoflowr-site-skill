#!/usr/bin/env node
import { Command } from "commander";
import kleur from "kleur";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import slugify from "slugify";
import { generateWireframe } from "../lib/wireframe.js";
import { scaffoldProject, printPostScaffoldHelp } from "../lib/scaffolder.js";
import { startDevWithTunnel, checkCloudflaredInstalled } from "../lib/tunnel.js";
import { deployVercel, pushGitHub, checkVercelInstalled, checkGhInstalled } from "../lib/deploy.js";
import { researchBusiness } from "../lib/research.js";
import { generateImages } from "../lib/image-gen.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(__dirname, "..");

// OWL palette reserved for --mode=lead-gen (Autoflowr's own funnel pages)
const OWL_LEAD_GEN_PALETTE = {
  name: "owl-lead-gen",
  label: "OWL Autoflowr (lead-gen mode)",
  bg: "#1A1A1C",
  surface: "#13131A",
  accent: "#A3E635",
  text: "#FAFAFA",
  mute: "#7A7A82",
};

const program = new Command();

program
  .name("build-business-site")
  .description("Generate a per-business Next.js 15 website for Autoflowr Studio clients")
  .version("0.2.0")
  .argument("[business-name]", "Business name (Hebrew or English, in quotes if multi-word)")
  .argument("[niche]", "One of: restaurant, lawyer, clinic, fitness, tradesman, beauty, _default")
  .option("--wireframe-only", "Generate wireframe.html and exit (skip scaffold)")
  .option("--no-wireframe-gate", "Skip wireframe approval, scaffold immediately")
  .option("--local-only", "Scaffold + print npm run dev instructions (no tunnel)")
  .option("--deploy", "Promote current project to Vercel production")
  .option("--push", "Create GitHub repo and push for client handoff")
  .option("--repo-owner <owner>", "GitHub username/org for --push")
  .option("--mode <mode>", "lead-gen or client-site", "client-site")
  .option("--location <location>", "Override location for local SEO copy")
  .option("--pixel-id <id>", "Override default Meta Pixel ID")
  .option("--ga4-id <id>", "Override default GA4 ID")
  .option("--clarity-id <id>", "Override default Clarity ID")
  .option("--price-from <number>", "Show pricing band starting from this number")
  .option("--out-dir <dir>", "Output directory (defaults to cwd)")
  .option("--design-file <path>", "JSON file with palette/typography/hierarchy from designer-skills")
  .option("--palette <name>", "Pick a niche-fallback palette by name (when no --design-file)")
  .option("--site-url <url>", "Production site URL (used in JSON-LD canonical, OG, sitemap)")
  .option("--no-images", "Skip /peleg image generation (faster runs for testing)")
  .action(async (businessName, niche, opts) => {
    try {
      await run(businessName, niche, opts);
    } catch (err) {
      console.error(kleur.red("✖ ") + (err?.message || String(err)));
      if (err?.stack && process.env.DEBUG) console.error(err.stack);
      process.exit(1);
    }
  });

program.parse();

async function run(businessName, niche, opts) {
  // --deploy / --push: ship modes that operate on an existing project dir.
  if (opts.deploy || opts.push) {
    const projectDir = path.resolve(opts.outDir || process.cwd());
    // If businessName looks like a slug (no spaces, lowercase), treat as existing project ref.
    let targetDir = projectDir;
    if (businessName && !niche) {
      const candidate = path.resolve(opts.outDir || process.cwd(), makeSlug(businessName));
      if (await fs.pathExists(path.join(candidate, "package.json"))) {
        targetDir = candidate;
      }
    }
    if (!(await fs.pathExists(path.join(targetDir, "package.json")))) {
      console.error(kleur.red(`✖ No Next.js project found at ${targetDir}.`));
      console.error(kleur.gray("  Run the generator first, then re-run with --deploy from inside the slug directory."));
      process.exit(1);
    }

    if (opts.push) {
      if (!(await checkGhInstalled())) {
        console.error(kleur.red("✖ gh CLI not found. Install: https://cli.github.com/"));
        process.exit(1);
      }
      const slug = path.basename(targetDir);
      const url = await pushGitHub({ projectDir: targetDir, repoOwner: opts.repoOwner, slug });
      console.log(kleur.green("✓ Pushed: ") + kleur.cyan(url));
    }

    if (opts.deploy) {
      if (!(await checkVercelInstalled())) {
        console.error(kleur.red("✖ vercel CLI not found. Install: npm i -g vercel && vercel login"));
        process.exit(1);
      }
      const url = await deployVercel(targetDir);
      console.log(kleur.green("✓ Deployed: ") + kleur.cyan(url));
    }
    return;
  }

  if (!businessName || !niche) {
    console.error(kleur.red("✖ Usage: build-business-site \"<business-name>\" <niche> [flags]"));
    console.error(kleur.gray("  Niches: restaurant, lawyer, clinic, fitness, tradesman, beauty, _default"));
    process.exit(1);
  }

  const supportedNiches = await listNiches();
  if (!supportedNiches.includes(niche)) {
    console.error(kleur.red(`✖ Unknown niche "${niche}". Supported: ${supportedNiches.join(", ")}`));
    process.exit(1);
  }

  const slug = makeSlug(businessName);
  const outDir = path.resolve(opts.outDir || process.cwd(), slug);
  await fs.ensureDir(outDir);

  // Load niche config
  const nicheCfg = await loadNicheConfig(niche);

  // Resolve design tokens — priority: --design-file > --mode=lead-gen forces OWL > --palette name > niche default (palettes[0])
  const designTokens = await resolveDesignTokens({ opts, nicheCfg, slug, outDir });

  console.log(kleur.bold().cyan(`\n  build-business-site\n`));
  console.log(kleur.gray(`  Business: ${kleur.white(businessName)}`));
  console.log(kleur.gray(`  Niche:    ${kleur.white(niche)}`));
  console.log(kleur.gray(`  Mode:     ${kleur.white(opts.mode)}`));
  console.log(kleur.gray(`  Slug:     ${kleur.white(slug)}`));
  console.log(kleur.gray(`  Palette:  ${kleur.white(designTokens.palette.name)} ${kleur.dim("(" + designTokens.palette.label + ")")}`));
  console.log(kleur.gray(`  Out:      ${kleur.white(outDir)}\n`));

  const skipWireframeGate = opts.wireframeGate === false;
  const wireframeOnly = !!opts.wireframeOnly;

  if (!skipWireframeGate || wireframeOnly) {
    console.log(kleur.bold("→ Phase A: Wireframe generation"));
    const wireframePath = await generateWireframe({
      businessName,
      niche,
      nicheCfg,
      slug,
      outDir,
      mode: opts.mode,
      location: opts.location,
      priceFrom: opts.priceFrom,
      designTokens,
      skillRoot: SKILL_ROOT,
    });
    console.log(kleur.green("✓ Wireframe ready: ") + kleur.cyan(wireframePath));
    console.log(kleur.gray("  Open it in a browser and review."));

    if (wireframeOnly) {
      console.log(kleur.yellow("\n→ Stopping after wireframe (--wireframe-only)."));
      console.log(kleur.gray("  To continue: re-run without --wireframe-only OR pass --no-wireframe-gate to scaffold immediately."));
      return;
    }

    console.log(kleur.yellow("\n→ Gate: review the wireframe, then re-run with --no-wireframe-gate to scaffold."));
    return;
  }

  // Phase B — scaffold
  console.log(kleur.bold("→ Phase B: Scaffolding Next.js project"));

  // Try Claude research; falls back to niche-based copy if no API key
  const competitiveIntelPath = path.join(outDir, "competitive-intel.json");
  const competitiveIntel = await fs.pathExists(competitiveIntelPath)
    ? await fs.readJson(competitiveIntelPath).catch(() => null)
    : null;
  const research = await researchBusiness({
    businessName,
    niche,
    nicheCfg,
    location: opts.location,
    mode: opts.mode,
    competitiveIntel,
    skillRoot: SKILL_ROOT,
  });
  const { written } = await scaffoldProject({
    businessName,
    niche,
    nicheCfg,
    slug,
    outDir,
    mode: opts.mode,
    location: opts.location,
    designTokens,
    research,
    pixelId: opts.pixelId,
    ga4Id: opts.ga4Id,
    clarityId: opts.clarityId,
    skillRoot: SKILL_ROOT,
    siteUrl: opts.siteUrl,
  });
  console.log(kleur.green(`✓ Wrote ${written.length} files`));

  // Phase 6 — images (commander turns --no-images into opts.images === false)
  if (opts.images !== false) {
    console.log(kleur.bold("→ Phase 6: Image generation"));
    await generateImages({
      outDir,
      businessName,
      niche,
      designTokens,
      imagePromptHints: nicheCfg.imagePromptHints || [],
    });
  }

  if (opts.localOnly) {
    printPostScaffoldHelp(outDir);
    return;
  }

  // Phase C — Cloudflare Tunnel
  console.log(kleur.bold("→ Phase C: Cloudflare Tunnel"));
  const hasCloudflared = await checkCloudflaredInstalled();
  if (!hasCloudflared) {
    console.log(kleur.yellow("⚠ `cloudflared` not found in PATH."));
    console.log(kleur.gray("  Install: winget install --id Cloudflare.cloudflared (Windows) or brew install cloudflared (macOS)"));
    console.log(kleur.gray("  Then re-run, or use --local-only to skip the tunnel."));
    printPostScaffoldHelp(outDir);
    return;
  }
  await startDevWithTunnel({ projectDir: outDir, port: 3000, install: true });
}

function buildResearchFromNiche(nicheCfg, businessName, location) {
  // Phase 5 will replace this with real Claude API research.
  const ctas = nicheCtas(nicheCfg.niche);
  const loc = location ? ` ב${location}` : "";
  return {
    heroHeadline: `${businessName}${loc}`,
    heroSubtitle: nicheSubtitle(nicheCfg.niche, location),
    primaryCta: ctas.primary,
    secondaryCta: ctas.secondary,
    faq: [],
  };
}

function nicheCtas(niche) {
  switch (niche) {
    case "restaurant": return { primary: "להזמין שולחן", secondary: "התפריט" };
    case "lawyer":     return { primary: "לקבוע פגישה", secondary: "וואטסאפ" };
    case "clinic":     return { primary: "לקביעת תור", secondary: "שאלה בוואטסאפ" };
    case "fitness":    return { primary: "שיעור ניסיון", secondary: "מסלולים" };
    case "tradesman":  return { primary: "להזמין עכשיו", secondary: "וואטסאפ" };
    case "beauty":     return { primary: "לקביעת תור", secondary: "גלריה" };
    default:           return { primary: "צרו קשר", secondary: "וואטסאפ" };
  }
}

function nicheSubtitle(niche, location) {
  switch (niche) {
    case "restaurant": return `מסעדה משפחתית${location ? " ב" + location : ""}. אוכל אמיתי, חוויה שמתחילה ברגע שאתם נכנסים.`;
    case "lawyer":     return `ייעוץ ראשוני חינם, תמחור ברור, ליווי אישי מהתיק הראשון עד פסק הדין.`;
    case "clinic":     return `קליניקה מאובזרת, צוות מנוסה, תוצאות שמדברות בעד עצמן.`;
    case "fitness":    return `אימונים מותאמים אישית, מסלול ברור, ותוצאות תוך חודשיים.`;
    case "tradesman":  return `קוראים — מגיעים. עובדים נקי, אחריות מלאה.`;
    case "beauty":     return `טיפולים פרימיום בידיים מנוסות, סביבה רגועה.`;
    default:           return `שירות אישי, מחירים הוגנים, ועבודה שמדברת בעד עצמה.`;
  }
}

async function resolveDesignTokens({ opts, nicheCfg, slug, outDir }) {
  // Priority 1: explicit --design-file (from Claude orchestrating designer-skills)
  if (opts.designFile) {
    const cfg = await fs.readJson(opts.designFile);
    return {
      palette: cfg.palette,
      alternativePalettes: cfg.alternativePalettes || [],
      typography: cfg.typography || defaultTypography(),
      hierarchy: cfg.hierarchy || nicheCfg.pages,
      source: "designer-skills",
    };
  }
  // Priority 2: try <outDir>/design.json (Claude may write it there before invoking CLI)
  const conventionalPath = path.join(outDir, "design.json");
  if (await fs.pathExists(conventionalPath)) {
    const cfg = await fs.readJson(conventionalPath);
    return {
      palette: cfg.palette,
      alternativePalettes: cfg.alternativePalettes || [],
      typography: cfg.typography || defaultTypography(),
      hierarchy: cfg.hierarchy || nicheCfg.pages,
      source: "designer-skills",
    };
  }
  // Priority 3: --mode=lead-gen forces Autoflowr OWL
  if (opts.mode === "lead-gen") {
    return {
      palette: OWL_LEAD_GEN_PALETTE,
      alternativePalettes: [],
      typography: defaultTypography(),
      hierarchy: nicheCfg.pages,
      source: "owl-lead-gen",
    };
  }
  // Priority 4: --palette <name> picks from niche fallbacks
  const palettes = nicheCfg.palettes || [];
  if (palettes.length === 0) {
    throw new Error(`Niche "${nicheCfg.niche}" has no palettes defined and no --design-file was provided.`);
  }
  let chosen = palettes[0];
  if (opts.palette) {
    const found = palettes.find((p) => p.name === opts.palette);
    if (!found) {
      throw new Error(`Palette "${opts.palette}" not found in niche "${nicheCfg.niche}". Available: ${palettes.map((p) => p.name).join(", ")}`);
    }
    chosen = found;
  }
  return {
    palette: chosen,
    alternativePalettes: palettes.filter((p) => p.name !== chosen.name),
    typography: defaultTypography(),
    hierarchy: nicheCfg.pages,
    source: "niche-fallback",
  };
}

function defaultTypography() {
  return {
    headingFont: "Heebo",
    bodyFont: "Heebo",
    monoFont: "JetBrains Mono",
    scale: "1.250",
  };
}

async function listNiches() {
  const nicheDir = path.join(SKILL_ROOT, "templates", "niches");
  const files = await fs.readdir(nicheDir);
  return files.filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
}

async function loadNicheConfig(niche) {
  const cfgPath = path.join(SKILL_ROOT, "templates", "niches", `${niche}.json`);
  return await fs.readJson(cfgPath);
}

function makeSlug(name) {
  const ascii = slugify(name, { lower: true, strict: true, locale: "he" });
  if (ascii && ascii.length >= 2) return ascii;
  return transliterateHebrew(name);
}

function transliterateHebrew(s) {
  const map = {
    "א": "a", "ב": "b", "ג": "g", "ד": "d", "ה": "h", "ו": "v", "ז": "z",
    "ח": "ch", "ט": "t", "י": "y", "כ": "k", "ך": "k", "ל": "l", "מ": "m",
    "ם": "m", "נ": "n", "ן": "n", "ס": "s", "ע": "a", "פ": "p", "ף": "f",
    "צ": "tz", "ץ": "tz", "ק": "k", "ר": "r", "ש": "sh", "ת": "t",
  };
  let out = "";
  for (const ch of s) {
    if (map[ch]) out += map[ch];
    else if (/[a-zA-Z0-9]/.test(ch)) out += ch.toLowerCase();
    else if (/\s/.test(ch)) out += "-";
  }
  out = out.replace(/-+/g, "-").replace(/^-|-$/g, "");
  return out || "business";
}
