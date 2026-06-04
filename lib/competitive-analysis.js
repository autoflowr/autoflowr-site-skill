/**
 * Competitive analysis — fetches top Google results for the niche+location and
 * extracts conversion patterns that inform the wireframe and copy.
 *
 * STATUS: stub. The actual WebSearch + WebFetch happens via Claude in the
 * conversational layer (since this skill orchestrates Claude rather than running
 * fetches directly from Node). This module's role is to:
 *
 *   1. Define the schema of `competitive-intel.json` (so Claude knows what to write)
 *   2. Provide validators + helpers to consume an existing intel file
 *   3. Surface the recommendations to the wireframe + copy generators
 *
 * Phase 4 (niche routing) reads from intel.recommendations.must_include to
 * extend or reorder the pages list.
 *
 * Phase 5 (copy generation) reads from intel.patterns.common to inform what
 * Hebrew copy patterns are expected (e.g., "phone number above the fold").
 */

import fs from "fs-extra";
import path from "node:path";

/**
 * Schema written by Claude during Step 2 of the workflow (see SKILL.md).
 *
 * @typedef {Object} CompetitiveIntel
 * @property {string} query - Search query used (e.g., "מסעדת דגים תל אביב")
 * @property {Competitor[]} competitors - Top results analyzed
 * @property {Patterns} patterns - Extracted patterns
 * @property {Recommendations} recommendations - Actionable next steps
 *
 * @typedef {Object} Competitor
 * @property {string} url
 * @property {string} hero - Hero headline + subtitle
 * @property {string[]} ctas - Visible CTAs above and below the fold
 * @property {string|null} priceDisplay - How pricing is shown (or null if hidden)
 * @property {string[]} trustSignals - Reviews count, certifications, awards, photos
 * @property {string[]} structure - Section order (top to bottom)
 * @property {string} aboveFoldDensity - "image-first" | "text-first" | "form-first"
 *
 * @typedef {Object} Patterns
 * @property {string[]} common - What 3+ of 5 do
 * @property {string[]} gaps - What only 1 (or none) do — differentiation opportunities
 *
 * @typedef {Object} Recommendations
 * @property {string} hero_pattern - Suggested hero layout
 * @property {string[]} must_include - Sections that 3+ competitors have
 * @property {string[]} differentiate_via - Where to stand out
 */

/**
 * Load competitive intel from a project directory.
 *
 * @param {string} outDir - The <slug> directory
 * @returns {Promise<CompetitiveIntel | null>}
 */
export async function loadIntel(outDir) {
  const p = path.join(outDir, "competitive-intel.json");
  if (!(await fs.pathExists(p))) return null;
  return await fs.readJson(p);
}

/**
 * Validate a competitive intel object (best-effort).
 *
 * @param {any} intel
 * @returns {string[]} list of warnings (empty = valid)
 */
export function validate(intel) {
  const warns = [];
  if (!intel?.query) warns.push("missing query");
  if (!Array.isArray(intel?.competitors) || intel.competitors.length < 3) {
    warns.push("expected at least 3 competitors analyzed");
  }
  if (!intel?.recommendations?.must_include) {
    warns.push("missing recommendations.must_include");
  }
  return warns;
}

/**
 * Merge competitive recommendations into the niche page list.
 *
 * @param {string[]} basePages - Pages from the niche config
 * @param {CompetitiveIntel | null} intel
 * @returns {string[]} extended page list
 */
export function applyToPages(basePages, intel) {
  if (!intel?.recommendations?.must_include) return basePages;
  const must = intel.recommendations.must_include;
  const out = [...basePages];
  for (const section of must) {
    const slug = sectionNameToSlug(section);
    if (slug && !out.includes(slug)) out.push(slug);
  }
  return out;
}

function sectionNameToSlug(name) {
  const lower = name.toLowerCase();
  if (lower.includes("reserv")) return "reservations";
  if (lower.includes("gallery")) return "gallery";
  if (lower.includes("location") || lower.includes("map") || lower.includes("waze")) return "location";
  if (lower.includes("menu")) return "menu";
  if (lower.includes("faq")) return "faq";
  if (lower.includes("contact") || lower.includes("lead") || lower.includes("צור קשר")) return "lead_form";
  if (lower.includes("review")) return "reviews";
  if (lower.includes("about") || lower.includes("מי אנחנו")) return "about";
  if (lower.includes("price") || lower.includes("מחיר")) return "pricing";
  return null;
}
