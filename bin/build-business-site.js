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

const program = new Command();

program
  .name("build-business-site")
  .description("Generate a per-business Next.js 15 website for Autoflowr Studio clients")
  .version("0.1.0")
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
  // Handle the "ship" subcommands (--deploy / --push) which run inside an existing project dir
  if (opts.deploy || opts.push) {
    console.log(kleur.yellow("→ Deploy/push modes will be wired up in Phase 8."));
    console.log(kleur.gray("  For now, manually run: vercel deploy --prod  /  gh repo create <slug> --public --source . --push"));
    return;
  }

  // Validation
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

  console.log(kleur.bold().cyan(`\n  build-business-site\n`));
  console.log(kleur.gray(`  Business: ${kleur.white(businessName)}`));
  console.log(kleur.gray(`  Niche:    ${kleur.white(niche)}`));
  console.log(kleur.gray(`  Mode:     ${kleur.white(opts.mode)}`));
  console.log(kleur.gray(`  Slug:     ${kleur.white(slug)}`));
  console.log(kleur.gray(`  Out:      ${kleur.white(outDir)}\n`));

  await fs.ensureDir(outDir);

  // Load niche config
  const nicheCfg = await loadNicheConfig(niche);

  // Phase A — Wireframe (default unless --no-wireframe-gate)
  const skipWireframeGate = opts.wireframeGate === false; // commander sets to false when --no-wireframe-gate
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

  // Phase B–D will be wired in subsequent build phases.
  console.log(kleur.yellow("→ Phase B (scaffold) will be implemented in Phase 2."));
  console.log(kleur.gray("  For now, --no-wireframe-gate exits after the wireframe step."));
}

async function listNiches() {
  const nicheDir = path.join(SKILL_ROOT, "templates", "niches");
  const files = await fs.readdir(nicheDir);
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

async function loadNicheConfig(niche) {
  const cfgPath = path.join(SKILL_ROOT, "templates", "niches", `${niche}.json`);
  return await fs.readJson(cfgPath);
}

function makeSlug(name) {
  // Hebrew slugify fallback: strip non-ASCII, lowercase, kebab
  const ascii = slugify(name, { lower: true, strict: true, locale: "he" });
  if (ascii && ascii.length >= 2) return ascii;
  // If slugify returned empty (all Hebrew), fall back to transliteration map
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
