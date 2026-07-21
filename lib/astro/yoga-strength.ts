// Yoga strength grading — a detected yoga's REAL delivery depends on how
// strong its constituent planets actually are, not merely whether the
// classical condition is technically met (widely-taught general practice).
// Grades via the ratio of each participant's Ṣaḍbala rūpas to its own
// required minimum: ratio ≥1.3 → strong, ≥1.0 → moderate, below → weak.
// Only yogas with `planets` populated (yogas.ts) can be graded; the rest are
// returned ungraded (strengthTier: null) rather than guessed at.

import type { PlanetName } from "./constants";
import type { ShadbalaResult } from "./shadbala";
import type { Yoga } from "./yogas";

export type YogaStrengthTier = "strong" | "moderate" | "weak";

export interface GradedYoga extends Yoga {
  strengthTier: YogaStrengthTier | null;
  strengthNote: string | null;
}

function strengthRatio(planet: PlanetName, shadbala: ShadbalaResult): number | null {
  const s = shadbala.planets[planet as keyof ShadbalaResult["planets"]];
  if (!s || !s.required) return null;
  return s.rupas / s.required;
}

/** Grade every yoga that has identified constituent planets. */
export function gradeYogas(yogas: Yoga[], shadbala: ShadbalaResult): GradedYoga[] {
  return yogas.map((y) => {
    if (!y.planets || !y.planets.length) return { ...y, strengthTier: null, strengthNote: null };

    const ratios = y.planets
      .map((p) => ({ p, r: strengthRatio(p, shadbala) }))
      .filter((x): x is { p: PlanetName; r: number } => x.r != null);
    if (!ratios.length) return { ...y, strengthTier: null, strengthNote: null };

    const minEntry = ratios.reduce((a, b) => (b.r < a.r ? b : a));
    const avgRatio = ratios.reduce((s, x) => s + x.r, 0) / ratios.length;
    const tier: YogaStrengthTier = avgRatio >= 1.3 && minEntry.r >= 1 ? "strong" : minEntry.r >= 1 ? "moderate" : "weak";

    const names = y.planets.join(" & ");
    const strengthNote =
      tier === "strong"
        ? `${names} comfortably exceed${y.planets.length === 1 ? "s" : ""} the Ṣaḍbala needed here, so this yoga delivers close to its full classical promise.`
        : tier === "moderate"
          ? `${names} meet${y.planets.length === 1 ? "s" : ""} the Ṣaḍbala threshold without strong margin (weakest: ${minEntry.p} at ${minEntry.r.toFixed(2)}× required) — real results, not maximal ones.`
          : `${names} fall${y.planets.length === 1 ? "s" : ""} short of the Ṣaḍbala needed (weakest: ${minEntry.p} at ${minEntry.r.toFixed(2)}× required) — the classical promise is present but needs this planet's own daśā and supporting factors to actually deliver.`;

    return { ...y, strengthTier: tier, strengthNote };
  });
}
