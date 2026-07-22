// Yoga strength grading — a detected yoga's REAL delivery depends on how
// strong its constituent planets actually are, not merely whether the
// classical condition is technically met (widely-taught general practice).
// Grades via the ratio of each participant's Ṣaḍbala rūpas to its own
// required minimum: ratio ≥1.3 → strong, ≥1.0 → moderate, below → weak.
// Only yogas with `planets` populated (yogas.ts) can be graded; the rest are
// returned ungraded (strengthTier: null) rather than guessed at.

import { SIGN_LORDS, type PlanetName } from "./constants";
import type { ShadbalaResult } from "./shadbala";
import type { Yoga } from "./yogas";
import type { Chart } from "./types";
import type { PlanetState } from "./avastha";

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

// --- Yoga-bhaṅga: cancellation and grading of DELIVERY -----------------------
//
// BPHS 39:3–5, stated inside the Rāja-yoga chapter itself, is explicit that a
// yoga's results come "full, or a half, or a quarter, according to their
// strengths" — so grading rather than a boolean is the classical position, not
// a modern softening. Sāravalī ch.39 ("Obstructions to Rāja Yogas") then gives
// chart-level cancellation conditions, and states directly that when the
// yoga-forming planets themselves enter war or become "splendourless"
// (combust), the Rāja yogas stand cancelled.
//
// Note the exception that must be honoured: Sāravalī twice exempts Venus and
// Saturn from combustion penalties, so a combust Venus or Saturn does NOT
// cancel a yoga it forms.

const EXALT: Partial<Record<PlanetName, number>> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const DEBIL: Partial<Record<PlanetName, number>> = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
const OWN: Partial<Record<PlanetName, number[]>> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
};
const NAT_FRIEND: Partial<Record<PlanetName, PlanetName[]>> = {
  Sun: ["Moon", "Mars", "Jupiter"], Moon: ["Sun", "Mercury"], Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"], Jupiter: ["Sun", "Moon", "Mars"], Venus: ["Mercury", "Saturn"],
  Saturn: ["Mercury", "Venus"],
};
// Sāravalī's affliction count names ENEMY signs specifically. A neutral sign is
// not an affliction, so "not a friend" must not be read as "an enemy" — doing so
// counts most ordinary placements as afflicted and fires the cancellation on a
// third of all charts.
const NAT_ENEMY: Partial<Record<PlanetName, PlanetName[]>> = {
  Sun: ["Venus", "Saturn"], Moon: [], Mars: ["Mercury"], Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"], Venus: ["Sun", "Moon"], Saturn: ["Sun", "Moon", "Mars"],
};
const BENEFICS_FOR_KENDRA: PlanetName[] = ["Jupiter", "Venus", "Mercury", "Moon"];
const SEVEN_GRAHA: PlanetName[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

export type BhangaLevel = "none" | "marred" | "cancelled";

export interface YogaBhanga {
  level: BhangaLevel;
  /** Why, in plain language — null when nothing applies. */
  reason: string | null;
  fallen: number;
  afflicted: number;
}

/** Combustion is exempted for Venus and Saturn (Sāravalī, stated twice). */
function combustionCounts(planet: PlanetName): boolean {
  return planet !== "Venus" && planet !== "Saturn";
}

/**
 * Chart-level yoga cancellation, from Sāravalī ch.39's countable conditions.
 * Computed ONCE per chart, not per yoga.
 */
export function computeYogaBhanga(chart: Chart, states: PlanetState[]): YogaBhanga {
  const stateOf = new Map(states.map((s) => [s.planet, s]));
  let fallen = 0;
  let afflicted = 0;
  for (const p of SEVEN_GRAHA) {
    const pos = chart.planets.find((x) => x.planet === p);
    if (!pos) continue;
    const isFallen = DEBIL[p] === pos.signIndex;
    if (isFallen) fallen++;
    const st = stateOf.get(p);
    const isCombust = !!st?.combust && combustionCounts(p);
    const lord = SIGN_LORDS[pos.signIndex];
    const own = (OWN[p]?.includes(pos.signIndex) ?? false) || lord === p;
    const enemySign =
      !own && EXALT[p] !== pos.signIndex && (NAT_ENEMY[p]?.includes(lord) ?? false);
    if (isFallen || isCombust || enemySign) afflicted++;
  }

  const moon = chart.planets.find((x) => x.planet === "Moon");
  const beneficInKendraOrWithMoon = chart.planets.some((x) => {
    if (!BENEFICS_FOR_KENDRA.includes(x.planet)) return false;
    if ([1, 4, 7, 10].includes(x.house)) return true;
    return !!moon && x.planet !== "Moon" && x.signIndex === moon.signIndex;
  });
  const sun = chart.planets.find((x) => x.planet === "Sun");
  const luminaryExalted =
    (!!sun && EXALT.Sun === sun.signIndex) || (!!moon && EXALT.Moon === moon.signIndex);

  if (fallen >= 5) {
    return { level: "cancelled", reason: `${fallen} planets are debilitated — Sāravalī holds that Rāja yogas will not come to pass.`, fallen, afflicted };
  }
  if (afflicted >= 5 && !luminaryExalted) {
    return { level: "cancelled", reason: `${afflicted} planets are debilitated, combust or in enemy signs while neither luminary is exalted — the kingly yogas become ineffective.`, fallen, afflicted };
  }
  if (afflicted >= 4 && !beneficInKendraOrWithMoon) {
    return { level: "marred", reason: `${afflicted} planets are afflicted with no benefic in a kendra or with the Moon — the yogas are marred.`, fallen, afflicted };
  }
  if (fallen >= 3) {
    return { level: "marred", reason: `${fallen} planets are debilitated — a severe drag on any yoga's delivery.`, fallen, afflicted };
  }
  return { level: "none", reason: null, fallen, afflicted };
}

/**
 * The share of a yoga's classical promise that actually delivers, on BPHS
 * 39:3–5's own ladder (full / half / quarter), after cancellation.
 *
 * An UNGRADED yoga returns 1.0 — never penalise a yoga because this engine
 * lacks the metadata to grade it (13 yogas plus the Nābhasa set carry no
 * `planets` array). Missing information is not evidence of weakness.
 */
export function yogaDelivery(
  y: GradedYoga,
  bhanga: YogaBhanga,
  states: PlanetState[]
): { multiplier: number; note: string | null } {
  if (bhanga.level === "cancelled") {
    return { multiplier: 0, note: bhanga.reason };
  }
  // Per-yoga cancellation: a constituent combust (Venus/Saturn exempt) or one
  // that lost a graha-yuddha — Sāravalī's "becoming splendourless" clause.
  if (y.planets?.length) {
    const stateOf = new Map(states.map((s) => [s.planet, s]));
    for (const p of y.planets) {
      const st = stateOf.get(p);
      if (st?.combust && combustionCounts(p)) {
        return { multiplier: 0, note: `${p} is combust, so this yoga is classically cancelled rather than merely weakened.` };
      }
      if (st?.war && !st.war.won) {
        return { multiplier: 0, note: `${p} lost a planetary war to ${st.war.with}, cancelling this yoga.` };
      }
    }
  }

  const tier = y.strengthTier;
  let mult = tier === "strong" ? 1 : tier === "moderate" ? 0.5 : tier === "weak" ? 0.25 : 1;
  if (bhanga.level === "marred") mult = Math.min(mult, 0.5);
  return { multiplier: mult, note: bhanga.level === "marred" ? bhanga.reason : null };
}
