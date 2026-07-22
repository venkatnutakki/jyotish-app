// Tājika judgment — the verdict mechanism the annual chart was missing.
//
// varshaphal.ts computes the Muntha, the year lord, the Mudda daśā and the
// Sahams, but rendered no verdict: in Tājika the ASPECTS are the judgment. The
// central question of an annual reading — does this matter perfect this year? —
// is answered by Itthaśāla (an applying aspect: it completes) versus Īsarāpha
// (a separating one: the moment has passed).
//
// Two things distinguish Tājika from Parāśarī and must not be blended:
//   • Aspects are Perso-Arabic BY HOUSE DISTANCE with fixed quality (3/11 and
//     5/9 friendly, 4/10 and 7 inimical, 2/6/8/12 no aspect) — not graha dṛṣṭi.
//   • Whether an aspect counts depends on ORB (deeptāṃśa) and on which planet is
//     faster, since applying vs separating is what carries the verdict.
//
// STRUCTURAL NOTE: Tājika is gate-then-magnitude — Itthaśāla decides IF, then
// strength decides HOW MUCH — which is the same shape as the promise/verdict
// split already used for the natal reading. Itthaśāla is the annual analogue of
// the KP cuspal sub-lord.

import type { Chart } from "./types";
import type { PlanetName } from "./constants";

/**
 * Deeptāṃśa (orb) per planet, in degrees.
 *
 * DISPUTED — circulating tables disagree, several swapping Mercury and Venus or
 * giving Mars 7°. These follow the Hāyanaratna values. Verify against a print
 * edition before treating any single-degree case as decisive.
 */
export const DEEPTAMSA: Record<string, number> = {
  Sun: 15, Moon: 12, Mars: 8, Mercury: 7, Jupiter: 9, Venus: 7, Saturn: 9,
  Rahu: 12, Ketu: 12,
};

/**
 * How two planets' orbs combine — a genuine, unresolved lineage disagreement:
 *   "mean"   — the average of the two deeptāṃśas. Dominant Indian usage
 *              (Tājika-Nīlakaṇṭhī lineage); the default here since this is an
 *              Indian-lineage engine.
 *   "faster" — the faster planet's own orb (Hāyanaratna / Perso-Arabic).
 * The two differ materially (Sun–Mercury: 11° vs 15°), so this is exposed
 * rather than silently chosen.
 */
export type OrbRule = "mean" | "faster";

/** Mean daily motion, for deciding which planet is "faster". */
const DAILY_MOTION: Record<string, number> = {
  Moon: 13.18, Mercury: 1.38, Venus: 1.2, Sun: 0.986, Mars: 0.524,
  Jupiter: 0.083, Saturn: 0.034, Rahu: 0.053, Ketu: 0.053,
};

export type TajikaAspectKind = "conjunction" | "sextile" | "trine" | "square" | "opposition" | "none";

export interface TajikaAspect {
  kind: TajikaAspectKind;
  /** Friendly aspects promise cooperation; inimical ones obstruct. */
  friendly: boolean;
  /** Degrees short of (or past) exactitude. */
  separation: number;
  orb: number;
  inOrb: boolean;
}

/** The Tājika aspect between two signs, by house distance. */
function aspectKind(fromSign: number, toSign: number): { kind: TajikaAspectKind; friendly: boolean } {
  const d = ((toSign - fromSign + 12) % 12) + 1; // 1..12
  if (d === 1) return { kind: "conjunction", friendly: true };
  if (d === 3 || d === 11) return { kind: "sextile", friendly: true };
  if (d === 5 || d === 9) return { kind: "trine", friendly: true };
  if (d === 4 || d === 10) return { kind: "square", friendly: false };
  if (d === 7) return { kind: "opposition", friendly: false };
  return { kind: "none", friendly: false };
}

/** Angular separation from exactitude for a given aspect kind. */
function exactAngleFor(kind: TajikaAspectKind): number | null {
  switch (kind) {
    case "conjunction": return 0;
    case "sextile": return 60;
    case "trine": return 120;
    case "square": return 90;
    case "opposition": return 180;
    default: return null;
  }
}

export function tajikaAspect(
  a: { planet: PlanetName; longitude: number; signIndex: number },
  b: { planet: PlanetName; longitude: number; signIndex: number },
  orbRule: OrbRule = "mean"
): TajikaAspect {
  const { kind, friendly } = aspectKind(a.signIndex, b.signIndex);
  const exact = exactAngleFor(kind);
  if (exact === null) {
    return { kind: "none", friendly: false, separation: Infinity, orb: 0, inOrb: false };
  }
  let diff = Math.abs(a.longitude - b.longitude) % 360;
  if (diff > 180) diff = 360 - diff;
  const separation = Math.abs(diff - exact);

  const da = DEEPTAMSA[a.planet] ?? 9;
  const db = DEEPTAMSA[b.planet] ?? 9;
  const fasterIsA = (DAILY_MOTION[a.planet] ?? 0) >= (DAILY_MOTION[b.planet] ?? 0);
  const orb = orbRule === "faster" ? (fasterIsA ? da : db) : (da + db) / 2;

  return { kind, friendly, separation, orb, inOrb: separation <= orb };
}

export type TajikaYoga =
  | "Itthaśāla" | "Īsarāpha" | "Kambūla" | "Maṇaū" | "Raddā" | "none";

export interface TajikaJudgment {
  yoga: TajikaYoga;
  /** Sub-variety of Itthaśāla, when one applies. */
  variety: "Pūrṇa" | "Vartamāna" | "Bhaviṣyat" | null;
  aspect: TajikaAspect;
  /** 0–20, on the same scale as Pañcavargīya bala. */
  strength: number;
  /** Does the matter perfect this year? */
  perfects: boolean;
  note: string;
}

/**
 * Judge whether a matter perfects, from the aspect between the lagna lord
 * (the native's agency) and the kāryeśa (the lord of the house of the matter).
 *
 * Applying (the faster planet still behind the slower) → Itthaśāla, it
 * completes. Separating → Īsarāpha, the moment has passed. Maṇaū (Mars or
 * Saturn obstructing) destroys the Itthaśāla outright; Raddā (a participant
 * retrograde or combust) cancels it; Kambūla (the Moon joining the
 * configuration) fortifies it.
 */
export function judgeTajika(
  pravesh: Chart,
  lagnesha: PlanetName,
  karyesha: PlanetName,
  orbRule: OrbRule = "mean"
): TajikaJudgment {
  const find = (p: PlanetName) => pravesh.planets.find((x) => x.planet === p);
  const A = find(lagnesha);
  const B = find(karyesha);

  const none: TajikaJudgment = {
    yoga: "none", variety: null,
    aspect: { kind: "none", friendly: false, separation: Infinity, orb: 0, inOrb: false },
    strength: 0, perfects: false,
    note: "No Tājika aspect links the lagna lord to the lord of this matter, so the year offers no mechanism by which it completes — possibility at best.",
  };
  if (!A || !B || lagnesha === karyesha) return none;

  const aspect = tajikaAspect(A, B, orbRule);
  if (aspect.kind === "none" || !aspect.inOrb) return { ...none, aspect };

  // Applying vs separating: the FASTER planet must still be behind the slower.
  const aFaster = (DAILY_MOTION[lagnesha] ?? 0) >= (DAILY_MOTION[karyesha] ?? 0);
  const faster = aFaster ? A : B;
  const slower = aFaster ? B : A;
  let delta = (slower.longitude - faster.longitude + 360) % 360;
  if (delta > 180) delta -= 360;
  const applying = delta > 0;

  const strength = Math.max(0, Math.min(20, ((aspect.orb - aspect.separation) / aspect.orb) * 20));

  // --- Maṇaū: Mars or Saturn obstructing destroys the Itthaśāla -------------
  for (const spoiler of ["Mars", "Saturn"] as PlanetName[]) {
    if (spoiler === lagnesha || spoiler === karyesha) continue;
    const S = find(spoiler);
    if (!S) continue;
    const toFaster = tajikaAspect(S, faster, orbRule);
    if (toFaster.inOrb && !toFaster.friendly) {
      return {
        yoga: "Maṇaū", variety: null, aspect, strength: 0, perfects: false,
        note: `${spoiler} obstructs the link between ${lagnesha} and ${karyesha} by an inimical Tājika aspect (Maṇaū) — the configuration is destroyed, and success cannot be read from it however favourable the rest looks.`,
      };
    }
  }

  // --- Raddā: a participant retrograde or combust cancels -------------------
  const sun = find("Sun");
  const combustOf = (p: typeof A) => {
    if (!p || !sun || p.planet === "Sun") return false;
    let d = Math.abs(p.longitude - sun.longitude) % 360;
    if (d > 180) d = 360 - d;
    return d <= 8; // Tājika works with a tighter, uniform combustion band
  };
  if (A.retrograde || B.retrograde) {
    return {
      yoga: "Raddā", variety: null, aspect, strength: strength * 0.25, perfects: false,
      note: `${A.retrograde ? lagnesha : karyesha} is retrograde in the annual chart (Raddā), which cancels the Itthaśāla — the matter turns back on itself rather than completing.`,
    };
  }
  if (combustOf(A) || combustOf(B)) {
    return {
      yoga: "Raddā", variety: null, aspect, strength: strength * 0.5, perfects: false,
      note: `${combustOf(A) ? lagnesha : karyesha} is combust in the annual chart (Raddā), badly weakening the link — the promise is present but lacks the strength to complete.`,
    };
  }

  if (!applying) {
    return {
      yoga: "Īsarāpha", variety: null, aspect,
      strength: Math.max(0, Math.min(20, (aspect.separation / aspect.orb) * 20)),
      perfects: false,
      note: `${lagnesha} and ${karyesha} are separating (Īsarāpha) — the aspect has already perfected and is dissolving, so the opportunity for this matter belongs to the past rather than the year ahead.`,
    };
  }

  // --- Itthaśāla, and its sub-varieties ------------------------------------
  const variety: TajikaJudgment["variety"] =
    aspect.separation <= 1 ? "Pūrṇa" : aspect.separation <= aspect.orb ? "Vartamāna" : "Bhaviṣyat";

  // --- Kambūla: the Moon joining fortifies ---------------------------------
  const moon = find("Moon");
  let kambula = false;
  if (moon && lagnesha !== "Moon" && karyesha !== "Moon") {
    const m1 = tajikaAspect(moon, A, orbRule);
    const m2 = tajikaAspect(moon, B, orbRule);
    kambula = (m1.inOrb && m1.friendly) || (m2.inOrb && m2.friendly);
  }

  const timing =
    variety === "Pūrṇa"
      ? "and the aspect is within a degree of exact, so it completes early and fully"
      : variety === "Vartamāna"
        ? "and it completes during the year"
        : "though it completes late, or only after a delay";

  return {
    yoga: kambula ? "Kambūla" : "Itthaśāla",
    variety,
    aspect,
    strength: kambula ? Math.min(20, strength * 1.2) : strength,
    perfects: true,
    note:
      `${lagnesha} is applying to ${karyesha} by a ${aspect.friendly ? "friendly" : "difficult"} Tājika aspect (Itthaśāla${kambula ? ", fortified by the Moon — Kambūla" : ""}) — the matter perfects this year, ${timing}.` +
      (aspect.friendly ? "" : " The aspect is an inimical one, so it completes through friction rather than ease."),
  };
}

/**
 * Muntha judgment — favourable in 1, 2, 3, 5, 9, 10, 11; adverse in 4, 6, 7, 8
 * and 12, with 6/8/12 the most damaging.
 */
export function judgeMuntha(house: number, lordAfflicted: boolean): { favourable: boolean; note: string } {
  const good = [1, 2, 3, 5, 9, 10, 11].includes(house);
  const severe = [6, 8, 12].includes(house);
  const note = good
    ? `The Muntha occupies the ${house}th of the annual chart — a supportive position, bringing the year's attention to that area${lordAfflicted ? ", though its lord is afflicted, which blunts the benefit" : ""}.`
    : severe
      ? `The Muntha occupies the ${house}th — among the most difficult placements for a year, indicating strain in that department${lordAfflicted ? ", worsened by an afflicted Muntha lord" : ""}.`
      : `The Muntha occupies the ${house}th, a mixed placement for the year${lordAfflicted ? ", with its lord afflicted" : ""}.`;
  return { favourable: good && !lordAfflicted, note };
}
