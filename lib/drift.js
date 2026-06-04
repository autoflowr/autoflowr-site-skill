/**
 * Drift detection on re-runs.
 *
 * When the skill is invoked on a slug that already exists, we want to preserve
 * any hand-edits Bar made (copy.ts tweaks, palette tuning, niche section
 * customizations). We do this by:
 *
 *   1. Comparing each soon-to-be-overwritten file against the snapshot stored
 *      in .skill-baseline/ when the project was last scaffolded.
 *   2. If a file has been touched since the baseline, default to preserving
 *      the current content (don't overwrite). If the same file would also
 *      have new content from this run, mark it as "drift" and report.
 *
 * The scaffolder calls `wrapWriteWithDrift` instead of writing files directly
 * when an existing baseline is present.
 */

import fs from "fs-extra";
import path from "node:path";
import crypto from "node:crypto";
import kleur from "kleur";

const BASELINE_DIR = ".skill-baseline";
const PROTECTED_PATHS = [
  "app/(content)/copy.ts",
  "app/globals.css",
  "tailwind.config.ts",
  "design.json",
  "components/sections", // any file inside (directory match)
];

/**
 * Check whether an outDir has a previous baseline.
 */
export async function hasBaseline(outDir) {
  return fs.pathExists(path.join(outDir, BASELINE_DIR, "files.json"));
}

/**
 * Decide whether a file should be overwritten this run.
 * Returns { write: boolean, reason: string }
 */
export async function shouldWrite(outDir, relPath) {
  const baselineIdx = path.join(outDir, BASELINE_DIR, "files.json");
  if (!(await fs.pathExists(baselineIdx))) {
    return { write: true, reason: "no-baseline" };
  }
  const baseline = await fs.readJson(baselineIdx);
  const baselineHash = baseline[relPath];
  if (!baselineHash) {
    return { write: true, reason: "new-file" };
  }
  const absPath = path.join(outDir, relPath);
  if (!(await fs.pathExists(absPath))) {
    return { write: true, reason: "deleted-by-user" };
  }
  const currentHash = await hashFile(absPath);
  if (currentHash === baselineHash) {
    return { write: true, reason: "unchanged-since-baseline" };
  }
  if (isProtected(relPath)) {
    return { write: false, reason: "user-edited" };
  }
  return { write: true, reason: "overwrite-non-protected" };
}

/**
 * Snapshot every file under outDir into .skill-baseline/files.json (relPath → sha256).
 * Called at the end of a successful scaffold.
 */
export async function writeBaseline(outDir, writtenFiles) {
  const idx = {};
  for (const rel of writtenFiles) {
    const abs = path.join(outDir, rel);
    if (await fs.pathExists(abs)) {
      idx[rel] = await hashFile(abs);
    }
  }
  const baselineDir = path.join(outDir, BASELINE_DIR);
  await fs.ensureDir(baselineDir);
  await fs.writeJson(path.join(baselineDir, "files.json"), idx, { spaces: 2 });
}

/**
 * Report drift between current state and baseline at the end of a re-run.
 * Returns list of paths that were preserved (not overwritten).
 */
export async function reportPreserved(outDir, preservedPaths) {
  if (preservedPaths.length === 0) return;
  console.log("");
  console.log(kleur.bold().yellow("⚠ Drift detection: preserved your hand-edits to these files:"));
  for (const p of preservedPaths) {
    console.log(kleur.gray("  · ") + kleur.cyan(p));
  }
  console.log(kleur.gray("  To overwrite anyway, delete .skill-baseline/ and re-run."));
}

function isProtected(relPath) {
  const norm = relPath.replace(/\\/g, "/");
  for (const pat of PROTECTED_PATHS) {
    if (norm === pat) return true;
    if (norm.startsWith(pat + "/")) return true;
  }
  return false;
}

async function hashFile(absPath) {
  const buf = await fs.readFile(absPath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}
