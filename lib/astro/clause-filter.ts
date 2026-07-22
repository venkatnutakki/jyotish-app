// Mark which conditional clauses in a classical planet-in-house paragraph
// actually apply to a given chart — WITHOUT removing or rewriting anything.
//
// The Bhṛgu / Sārāvalī / Horā Sāra paragraphs interleave an unconditional base
// statement with many conditionals: "If the Sun is in Aries … name and fame.
// If the Sun is in Pisces … subservient to women." Only one of those sign
// clauses can be true for a native, yet the app showed (and lexically scored)
// the whole paragraph, so a Sun-in-Virgo reading still carried the Aries and
// Pisces outcomes.
//
// This module evaluates ONLY the conditions it can resolve with certainty — the
// sign and dignity of the PLACED PLANET, whose sign is known from the chart —
// and tags each sentence as applies / contradicts / neutral. It is deliberately
// conservative:
//
//   • It never removes text. Tagging is additive; the verbatim quote is intact.
//   • It only judges a sentence that contains EXACTLY ONE evaluable placed-planet
//     sign/dignity condition and no "but"/"unless"/cancellation. Compound
//     sentences ("good health if in own sign, but fever if with malefics") are
//     left neutral rather than resolved wrongly.
//   • Conditions on anything else — the lord of some house, conjunction with a
//     named planet, "aspected by benefics" — are left neutral. Retaining an
//     unevaluated clause is safe; wrongly dropping one is not.
//
// So the worst case of a bad sentence split is a clause tagged "neutral" instead
// of highlighted — never a false claim about the chart.

import type { Chart } from "./types";
import { SIGNS, SIGN_LORDS, type PlanetName } from "./constants";

const EXALT: Partial<Record<PlanetName, number>> = {
  Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6,
};
const DEBIL: Partial<Record<PlanetName, number>> = {
  Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0,
};
const OWN: Partial<Record<PlanetName, number[]>> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5],
  Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
};

export type ClauseStatus = "applies" | "contradicts" | "neutral";

export interface Clause {
  text: string;
  status: ClauseStatus;
}

/** Split a classical paragraph into sentences, conservatively. */
function splitSentences(text: string): string[] {
  // Split on a period/'?'/'!' followed by whitespace and a capital or "(".
  // Imperfect on abbreviations, but a mis-split only ever yields a neutral tag.
  return text
    .split(/(?<=[.?!])\s+(?=[A-Z(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** A sentence has a single, cleanly-evaluable placed-planet condition? */
function singleCondition(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  // Reject compound / cancellation sentences outright.
  if (/\bbut\b|\bunless\b|will not be felt|will not happen|however/.test(lower)) return false;
  // More than one "if" → multiple conditions; don't try to resolve.
  const ifs = (lower.match(/\bif\b/g) || []).length;
  if (ifs !== 1) return false;
  return true;
}

/**
 * If the sentence's condition is a sign/dignity condition on `planet`, return
 * whether it holds; otherwise return null (not our kind of condition).
 */
function evaluatePlacedPlanetCondition(
  sentence: string,
  planet: PlanetName,
  chart: Chart
): boolean | null {
  const lower = sentence.toLowerCase();
  const pos = chart.planets.find((p) => p.planet === planet);
  if (!pos) return null;

  // The condition must be about the placed planet itself, not "the lord of …".
  // Require the planet's name to appear after the "if".
  const afterIf = lower.slice(lower.indexOf("if"));
  if (/lord of|lagna lord|ascendant lord/.test(afterIf)) return null;
  if (!new RegExp(`\\b${planet.toLowerCase()}\\b`).test(afterIf)) return null;

  // --- explicit sign(s): "if the Sun is/be in Aries" ---
  const signsMentioned: number[] = [];
  for (let s = 0; s < 12; s++) {
    if (new RegExp(`\\bin ${SIGNS[s].toLowerCase()}\\b`).test(afterIf)) {
      // Ignore navāṃśa references ("in Leo Navamsha") — different claim.
      if (new RegExp(`\\bin ${SIGNS[s].toLowerCase()} navamsha`).test(afterIf)) continue;
      signsMentioned.push(s);
    }
  }
  // Two different signs named ("in Aries or Leo") → ambiguous, don't resolve.
  if (signsMentioned.length >= 2) return null;
  if (signsMentioned.length === 1) return pos.signIndex === signsMentioned[0];

  // --- dignity words. A clause can name several joined by "or" ("own sign or
  //     exalted"), which is a DISJUNCTION: it holds if the planet satisfies any
  //     one. Evaluating them in a fixed order (the earlier bug) mis-judged a
  //     planet that met the second alternative but not the first. ---
  const isExaltWord = /exalt|sign of exaltation/.test(afterIf);
  const isDebilWord = /debilitat/.test(afterIf);
  // "own sign(s)" only — NOT bare "his own", which the classical prose uses for
  // "his own men/people/house/wife" (a false positive that struck through a
  // base statement). "own house" is house-lordship, a different claim.
  const isOwnWord = /\bown signs?\b/.test(afterIf);
  // Any OTHER "own" — "his own men", or the elided "in his own or exalted" —
  // is an own-reference this parser does not fully resolve. Evaluating only the
  // rest of such a clause gives wrong answers (an "own or exalted" disjunction
  // wrongly read as exalt-only). Bail to neutral instead: a safe miss.
  if (/\bown\b/.test(afterIf) && !isOwnWord) return null;
  const hasPositive = isExaltWord || isOwnWord;

  // A positive dignity and debilitation named together is contradictory — leave
  // it neutral rather than guess.
  if (hasPositive && isDebilWord) return null;

  // A DISJUNCTION with an unevaluable alternative ("full, or powerful, or in own
  // sign") cannot be judged FALSE from the evaluable parts alone — the
  // unevaluable disjunct ("powerful", "aspected by a benefic") might be the one
  // that holds. So a would-be "contradicts" here must downgrade to neutral. A
  // would-be "applies" stays valid: one proven-true disjunct suffices.
  const undecidableDisjunct =
    /\bor\b/.test(afterIf) &&
    /powerful|\bstrong\b|endowed with strength|aspect|associated|conjunct|yuti|receives a drishti|benefic|malefic/.test(afterIf);
  const guard = (r: boolean): boolean | null => (!r && undecidableDisjunct ? null : r);

  if (isDebilWord) return guard(DEBIL[planet] === pos.signIndex);

  if (hasPositive) {
    const own = (OWN[planet]?.includes(pos.signIndex) ?? false) || SIGN_LORDS[pos.signIndex] === planet;
    const exalted = EXALT[planet] === pos.signIndex;
    // OR across whichever alternatives the clause actually names.
    return guard((isExaltWord && exalted) || (isOwnWord && own));
  }

  // --- Moon phase: "if the Moon is full / waning" ---
  if (planet === "Moon") {
    const sun = chart.planets.find((p) => p.planet === "Sun");
    if (sun) {
      const elong = (pos.longitude - sun.longitude + 360) % 360;
      const waxing = elong > 0 && elong < 180;
      if (/\bfull moon\b|moon is full|moon be full/.test(lower)) return guard(waxing);
      if (/\bwaning moon\b|moon is waning|moon be waning/.test(lower)) return guard(!waxing);
    }
  }

  return null; // not an evaluable placed-planet sign/dignity condition
}

/**
 * Tag each sentence of a planet-in-house paragraph. `planet` is the planet the
 * paragraph is about (the one placed in the house), whose sign is known.
 */
export function annotateClauses(
  text: string,
  planet: PlanetName,
  chart: Chart
): Clause[] {
  return splitSentences(text).map((sentence) => {
    if (!/\bif\b/i.test(sentence) || !singleCondition(sentence)) {
      return { text: sentence, status: "neutral" as const };
    }
    const holds = evaluatePlacedPlanetCondition(sentence, planet, chart);
    if (holds === null) return { text: sentence, status: "neutral" as const };
    return { text: sentence, status: holds ? "applies" : "contradicts" };
  });
}

/**
 * The paragraph with confidently-contradicting sign clauses removed — for
 * LEXICAL SENTIMENT ONLY, never shown to the user. Dropping only clauses proven
 * not to apply to this chart makes the concordance signal reflect the native's
 * actual placement instead of every hypothetical.
 */
export function textForSentiment(text: string, planet: PlanetName, chart: Chart): string {
  return annotateClauses(text, planet, chart)
    .filter((c) => c.status !== "contradicts")
    .map((c) => c.text)
    .join(" ");
}
