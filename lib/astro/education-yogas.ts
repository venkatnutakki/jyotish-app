// Learning (vidyā) yogas — the positive education combinations classical texts
// name. The engine already DETECTS the great learning yogas (Sarasvatī,
// Budha-Āditya, Kalānidhi) but the education area's yogaCategories is empty, so
// they never reach its verdict — which is why a genuinely scholarly chart
// (e.g. a highly-educated native) could still read "Challenging". This credits
// those already-detected yogas to education, plus two education-specific
// configurations, on the same convergence-gated, bounded template as the
// marriage and sibling detectors. Independent of the 4th/5th bhāva verdict and
// the Mercury/Jupiter kāraka strength already scored.
//
//   1. Sarasvatī yoga (BPHS/Phaladeepika) — Jupiter, Venus, Mercury all well
//      placed: brilliance in learning, arts and eloquence. THE learning yoga.
//   2. Budha-Āditya or Kalānidhi — Sun+Mercury sharp intellect / Jupiter with
//      Mercury+Venus refined learning.
//   3. Vidyā-drishti — Jupiter (vidyā-kāraka) aspects or occupies the 5th
//      (intelligence / pūrva-puṇya), the direct testimony of the learning mind.
//   4. Budha-Guru — Mercury and Jupiter in conjunction or mutual aspect:
//      intellect and wisdom joined.

import type { Chart } from "./types";
import type { PlanetName } from "./constants";

const JUP_OWN = new Set([8, 11]); // Sagittarius, Pisces
const JUP_EXALT = 3; // Cancer

export interface EducationYoga {
  name: string;
  description: string;
}

export interface EducationYogas {
  yogas: EducationYoga[];
  bonus: number;
  note: string | null;
}

// Jupiter dṛṣṭi: universal 7th plus its special 5th and 9th.
function jupiterAspectsHouse(jupHouse: number, target: number): boolean {
  return [6, 4, 8].some((off) => ((jupHouse - 1 + off) % 12) + 1 === target);
}

/**
 * `yogas` and `delivered` come from the already-computed yoga stack, so the
 * named learning yogas are credited only when they actually deliver (are not
 * cancelled by combustion / bhaṅga).
 */
export function detectEducationYogas(
  chart: Chart,
  yogas: { name: string }[],
  delivered: (name: string) => boolean
): EducationYogas {
  const has = (name: string) => yogas.some((y) => y.name === name) && delivered(name);
  const P = (name: PlanetName) => chart.planets.find((p) => p.planet === name);
  const merc = P("Mercury");
  const jup = P("Jupiter");

  const found: EducationYoga[] = [];

  // Sarasvatī and Kalānidhi are genuinely rare, strong learning yogas — keep
  // them. Budha-Āditya is DELIBERATELY excluded: Mercury is never more than
  // ~28° from the Sun, so Sun-Mercury conjunction is commonplace and does not
  // discriminate a scholar (it fired for ~40% of charts as a lens).
  if (has("Sarasvatī Yoga")) {
    found.push({ name: "Sarasvatī yoga", description: "Jupiter, Venus and Mercury are all well placed — brilliance in learning, arts and eloquence." });
  }
  if (has("Kalānidhi Yoga")) {
    found.push({ name: "Kalānidhi yoga", description: "Jupiter in the 2nd/5th with Mercury and Venus — refined learning and respect." });
  }

  // Vidyā-drishti: a DIGNIFIED Jupiter aspects or occupies the 5th. Requiring
  // dignity (own/exalted) makes this the mark of a strong vidyā-kāraka, not the
  // ~⅓ of charts where Jupiter merely reaches the 5th.
  if (jup && (jup.house === 5 || jupiterAspectsHouse(jup.house, 5)) && (JUP_OWN.has(jup.signIndex) || jup.signIndex === JUP_EXALT)) {
    found.push({ name: "Vidyā-drishti", description: `A dignified Jupiter ${jup.house === 5 ? "occupies" : "aspects"} the 5th — the vidyā-kāraka strong on the house of intelligence.` });
  }

  // Budha-Guru: Mercury and Jupiter in CONJUNCTION (intellect and wisdom in one
  // sign). Opposition is excluded — too loose for a discriminating lens.
  if (merc && jup && merc.signIndex === jup.signIndex) {
    found.push({ name: "Budha-Guru yoga", description: "Mercury and Jupiter are conjunct — intellect and wisdom joined in one sign." });
  }

  // De-duplicate (Budha-Āditya and a couple of others cannot both name the same
  // combination twice; guard anyway).
  const uniq = found.filter((y, i) => found.findIndex((z) => z.name === y.name) === i);

  let bonus = 0;
  if (uniq.length === 2) bonus = 0.6;
  else if (uniq.length >= 3) bonus = 1.0;
  const note =
    uniq.length >= 2
      ? `Learning yogas converge (${uniq.map((y) => y.name).join("; ")}) — specific classical testimonies of a scholarly mind, lifting a reading the base 5th/4th-house judgement would otherwise leave flat.`
      : null;

  return { yogas: uniq, bonus, note };
}
