/**
 * Image generation via /peleg (Gemini NanoBanana Pro).
 *
 * Shells out to the existing skill at C:\Users\peleg\.claude\skills\peleg\generate.py
 * to produce hero, OG, and logo images for the generated site.
 *
 * Silently skips if Python or the peleg skill is unavailable (the site still
 * renders with placeholder image slots).
 */

import { spawn } from "node:child_process";
import path from "node:path";
import fs from "fs-extra";
import kleur from "kleur";

const PELEG_SCRIPT = "C:\\Users\\peleg\\.claude\\skills\\peleg\\generate.py";

/**
 * Generate the standard set of images for a new business site.
 *
 * @param {Object} args
 * @param {string} args.outDir - The <slug> directory
 * @param {string} args.businessName
 * @param {string} args.niche
 * @param {Object} args.designTokens - { palette, typography }
 * @param {string[]} args.imagePromptHints - From the niche config
 */
export async function generateImages({ outDir, businessName, niche, designTokens, imagePromptHints }) {
  const pythonAvailable = await checkPython();
  const scriptExists = await fs.pathExists(PELEG_SCRIPT);

  if (!pythonAvailable || !scriptExists) {
    console.log(kleur.gray("  (Image generation skipped — Python/peleg not available)"));
    return { generated: [], skipped: true };
  }

  const publicDir = path.join(outDir, "public");
  const imagesDir = path.join(publicDir, "images");
  const ogDir = path.join(publicDir, "og");
  await fs.ensureDir(imagesDir);
  await fs.ensureDir(ogDir);

  const palette = designTokens.palette;
  const hints = (imagePromptHints || []).join(", ");

  const jobs = [
    {
      label: "hero",
      prompt: buildHeroPrompt({ businessName, niche, palette, hints }),
      out: path.join(imagesDir, "hero.png"),
      ratio: "16:9",
      resolution: "2K",
    },
    {
      label: "OG",
      prompt: buildOgPrompt({ businessName, niche, palette, hints }),
      out: path.join(ogDir, "og.png"),
      ratio: "16:9",
      resolution: "2K",
    },
    {
      label: "logo",
      prompt: buildLogoPrompt({ businessName, niche, palette }),
      out: path.join(publicDir, "icon-512.png"),
      ratio: "1:1",
      resolution: "1K",
    },
  ];

  const generated = [];
  for (const job of jobs) {
    console.log(kleur.gray(`  generating ${job.label} (${job.ratio} ${job.resolution})...`));
    try {
      await runPeleg(job);
      generated.push(job.out);
      console.log(kleur.green(`  ✓ ${job.label}`));
    } catch (err) {
      console.log(kleur.yellow(`  ⚠ ${job.label} failed: ${err.message}`));
    }
  }

  return { generated, skipped: false };
}

function buildHeroPrompt({ businessName, niche, palette, hints }) {
  return [
    `Hero image for "${businessName}" — a ${niche} business.`,
    `Style: ${hints}`,
    `Color palette anchored in: ${palette.bg} (background), ${palette.accent} (highlights), ${palette.text} (text on overlays).`,
    `Composition: 16:9 horizontal, focal subject right-of-center (RTL-friendly).`,
    `Lighting: soft, warm, professional. Real, not stock-photo feel. No text in image.`,
  ].join(" ");
}

function buildOgPrompt({ businessName, niche, palette, hints }) {
  return [
    `Social-share preview image (Open Graph 1200×630) for "${businessName}" — ${niche} business.`,
    `Background gradient anchored on ${palette.bg} → ${palette.surface}.`,
    `Accent: ${palette.accent}.`,
    `Style hints: ${hints}`,
    `Composition: clean, recognizable at thumbnail size, no text (we overlay text separately).`,
  ].join(" ");
}

function buildLogoPrompt({ businessName, niche, palette }) {
  return [
    `Square (1:1) logo mark for "${businessName}" — a ${niche} business.`,
    `Minimalist geometric symbol, NO text/letters, single accent color ${palette.accent} on transparent or ${palette.bg} background.`,
    `Recognizable at 64×64, no fine details.`,
  ].join(" ");
}

async function runPeleg({ prompt, out, ratio, resolution }) {
  return new Promise((resolve, reject) => {
    const proc = spawn(pythonCmd(), [
      PELEG_SCRIPT,
      "--prompt", prompt,
      "--out", out,
      "--aspect-ratio", ratio,
      "--resolution", resolution,
    ], { shell: false, stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    proc.stderr.on("data", (b) => { stderr += String(b); });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`peleg exit ${code}: ${stderr.slice(0, 200)}`));
    });
  });
}

function pythonCmd() {
  return process.platform === "win32" ? "python" : "python3";
}

async function checkPython() {
  return new Promise((resolve) => {
    const p = spawn(pythonCmd(), ["--version"], { stdio: "ignore" });
    p.on("error", () => resolve(false));
    p.on("close", (code) => resolve(code === 0));
  });
}
