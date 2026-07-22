// Sudarśana Chakra as a CONFIRMATION mechanism — the three-ring vote.
//
// BPHS devotes chapter 74 to reading a house simultaneously from the Lagna,
// from the Moon and from the Sun. Its value here is that it is genuinely
// INDEPENDENT of every other lens the engine uses: it consults no house-lord
// dignity, no Ṣaḍbala, no KP sub-lord, no divisional chart. Three rings
// agreeing is therefore real corroboration rather than the same evidence
// counted three times — which is exactly what a multi-layer confidence model
// needs.
//
// THE APPLICABILITY GATE (BPHS 74:19–20) is mandatory and easy to miss: the
// chakra may be used to declare results ONLY when the Sun and Moon occupy signs
// different from each other AND from the Lagna. If any two coincide, the text
// says to judge from the rāśi chart alone. Without this, a degenerate "two-ring"
// agreement masquerades as three-way confirmation — precisely the failure a
// voting scheme exists to prevent. It fires on roughly one chart in four.

import type { Chart } from "./types";
import type { PlanetName } from "./constants";

/** How one ring judges a house — BPHS 74:10–16, occupancy and aspect based. */
export type RingVerdict = 1 | 0 | -1;

export interface SudarshanaVote {
  /** null when the chakra is not applicable to this chart at all (74:19–20). */
  applicable: boolean;
  lagna: RingVerdict;
  chandra: RingVerdict;
  surya: RingVerdict;
  /** "unanimous" (3–0), "majority" (2–1), or "split". */
  agreement: "unanimous" | "majority" | "split";
  /** Net direction of the vote: +1 favourable, -1 unfavourable, 0 split. */
  direction: RingVerdict;
  note: string;
}

/** Whole-sign graha dṛṣṭi: everything aspects the 7th; the outer three add theirs. */
const SPECIAL_ASPECT: Partial<Record<PlanetName, number[]>> = {
  Mars: [4, 8], Jupiter: [5, 9], Saturn: [3, 10], Rahu: [5, 9], Ketu: [5, 9],
};

/**
 * Judge one house from one reference sign, per BPHS 74:10–16.
 *
 * Resolution order the text gives: occupants decide first; if the house is
 * empty, aspecting planets decide; the majority of benefics vs malefics wins;
 * on a tie the result is mixed. BPHS 74:7–9 adds a rule specific to this chakra
 * — the Sun is treated as auspicious in the 1st bhāva and malefic elsewhere.
 *
 * The 74:15–16 refinement (a natural benefic loses benevolence when it holds
 * more malefic vargas, and vice versa) is deliberately NOT implemented: it needs
 * a Saptavarga dignity pass per planet and carries perhaps a fifth of the value
 * for several times the cost. Occupancy + aspect + majority is the substance.
 */
function judgeRing(
  chart: Chart,
  referenceSign: number,
  house: number,
  benefics: Set<PlanetName>
): RingVerdict {
  const targetSign = (referenceSign + house - 1) % 12;

  let benefic = 0;
  let malefic = 0;
  const score = (p: PlanetName, isFirstHouse: boolean) => {
    // 74:7–9 — in this chakra the Sun helps only the 1st bhāva.
    if (p === "Sun") return isFirstHouse ? 1 : -1;
    return benefics.has(p) ? 1 : -1;
  };

  const occupants = chart.planets.filter((p) => p.signIndex === targetSign);
  if (occupants.length) {
    for (const o of occupants) {
      if (score(o.planet, house === 1) > 0) benefic++;
      else malefic++;
    }
  } else {
    // Empty house — aspecting planets decide.
    for (const p of chart.planets) {
      const dist = ((targetSign - p.signIndex + 12) % 12) + 1;
      const aspects = [7, ...(SPECIAL_ASPECT[p.planet] ?? [])];
      if (!aspects.includes(dist)) continue;
      if (score(p.planet, house === 1) > 0) benefic++;
      else malefic++;
    }
  }

  if (benefic > malefic) return 1;
  if (malefic > benefic) return -1;
  return 0;
}

/**
 * The three-ring vote for a house.
 *
 * Returns `applicable: false` when BPHS 74:19–20 bars the chakra, in which case
 * the caller must ignore it entirely rather than treat a partial reading as
 * evidence.
 */
export function sudarshanaVote(
  chart: Chart,
  house: number,
  benefics: Set<PlanetName>
): SudarshanaVote {
  const moon = chart.planets.find((p) => p.planet === "Moon");
  const sun = chart.planets.find((p) => p.planet === "Sun");
  const asc = chart.ascendantSignIndex;

  const distinct =
    !!moon && !!sun &&
    moon.signIndex !== sun.signIndex &&
    moon.signIndex !== asc &&
    sun.signIndex !== asc;

  if (!distinct) {
    return {
      applicable: false,
      lagna: 0, chandra: 0, surya: 0,
      agreement: "split", direction: 0,
      note: "The Sudarśana Chakra is not applicable here — BPHS restricts it to charts where the Sun, the Moon and the Lagna fall in three different signs; judge from the rāśi chart alone.",
    };
  }

  const lagna = judgeRing(chart, asc, house, benefics);
  const chandra = judgeRing(chart, moon!.signIndex, house, benefics);
  const surya = judgeRing(chart, sun!.signIndex, house, benefics);

  const votes = [lagna, chandra, surya];
  const pos = votes.filter((v) => v === 1).length;
  const neg = votes.filter((v) => v === -1).length;

  let agreement: SudarshanaVote["agreement"];
  let direction: RingVerdict;
  if (pos === 3 || neg === 3) {
    agreement = "unanimous";
    direction = pos === 3 ? 1 : -1;
  } else if (pos >= 2 || neg >= 2) {
    agreement = "majority";
    direction = pos >= 2 ? 1 : -1;
  } else {
    agreement = "split";
    direction = 0;
  }

  const ringWord = (v: RingVerdict) => (v === 1 ? "favourable" : v === -1 ? "afflicted" : "mixed");
  const note =
    agreement === "unanimous"
      ? `All three Sudarśana rings agree this house is ${ringWord(direction)} — read from the Lagna, the Moon and the Sun alike. Three independent vantage points converging is the strongest corroboration the chakra offers.`
      : agreement === "majority"
        ? `Two of the three Sudarśana rings read this house as ${ringWord(direction)} (Lagna ${ringWord(lagna)}, Moon ${ringWord(chandra)}, Sun ${ringWord(surya)}) — corroboration, but not unanimous.`
        : `The Sudarśana rings disagree (Lagna ${ringWord(lagna)}, Moon ${ringWord(chandra)}, Sun ${ringWord(surya)}) — the three vantage points give different answers, so this is genuinely unsettled.`;

  return { applicable: true, lagna, chandra, surya, agreement, direction, note };
}
