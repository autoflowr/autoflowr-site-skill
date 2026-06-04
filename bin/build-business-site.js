#!/usr/bin/env node
import { Command } from "commander";
import kleur from "kleur";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import slugify from "slugify";
import { generateWireframe } from "../lib/wireframe.js";

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
  if (opts.deploy || opts.push) {
    console.log(kleur.yellow("→ Deploy/push modes will be wired up in Phase 8."));
    console.log(kleur.gray("  For now, manually run: vercel deploy --prod  /  gh repo create <slug> --public --source . --push"));
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

  console.log(kleur.yellow("→ Phase B (scaffold) will be implemented in Phase 2."));
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
