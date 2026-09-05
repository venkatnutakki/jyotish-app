// Where inside a daśā its promised events tend to fall, and how the period
// opens — BPHS Ch.47 ("Effects of the Daśās"), verified verse-by-verse.
//
// Two classical rules, both computed purely from the natal chart:
//
//  1. DREKKĀṆA SEQUENCING (BPHS 47, the drekkāṇa rule). The third of its own
//     sign a daśā lord occupies fixes WHEN inside the daśā its results ripen:
//     1st drekkāṇa (0–10°) → the early part, 2nd (10–20°) → the middle, 3rd
//     (20–30°) → the later part. The order REVERSES if the lord is retrograde,
//     and always for Rāhu/Ketu (who move retrograde by nature). This gives
//     coarse thirds, NOT dates — a sequencing heuristic, honestly labelled.
//
//  2. ONSET QUALITY (BPHS 47.3–6). The daśā lord's dignity and house at the
//     moment the period opens gate its overall tenor: favourable in the lagna,
//     exaltation, own or a friendly ("śānta") sign; unfavourable in the 6th/8th/
//     12th, in debilitation, or in an inimical sign. This colours the whole
//     period and is separate from the promise the lord carries.
//
// Both are descriptive, not numeric — they enrich the timeline narrative
// without touching a life-area verdict score.

import type { Chart, PlanetPosition } from "./types";
import type { PlanetName } from "./constants";

export type DashaThird = "early" | "middle" | "late";
export type OnsetTenor = "favourable" | "mixed" | "difficult";

export interface DashaOnset {
  lord: PlanetName;
  /** Which third of the daśā its results tend to ripen in. */
  emphasis: DashaThird;
  reversed: boolean;
  tenor: OnsetTenor;
  note: string;
}

const OWN: Record<string, number[]> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5],
  Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
};
const EXALT: Record<string, number> = {
  Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6,
};
// Naisargika friendships (BPHS), used for the "friendly/inimical sign" test.
const FRIENDS: Record<string, PlanetName[]> = {
  Sun: ["Moon", "Mars", "Jupiter"],
  Moon: ["Sun", "Mercury"],
  Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"],
  Jupiter: ["Sun", "Moon", "Mars"],
  Venus: ["Mercury", "Saturn"],
  Saturn: ["Mercury", "Venus"],
};
const ENEMIES: Record<string, PlanetName[]> = {
  Sun: ["Venus", "Saturn"],
  Moon: [],
  Mars: ["Mercury"],
  Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"],
  Venus: ["Sun", "Moon"],
  Saturn: ["Sun", "Moon", "Mars"],
};
const SIGN_LORDS: PlanetName[] = [
  "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
  "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter",
];
const NODES = new Set(["Rahu", "Ketu"]);

const emphasisOrder: DashaThird[] = ["early", "middle", "late"];

/**
 * Onset/sequencing reading for one daśā lord, from its natal position.
 * Returns null for lords with no natal position (should not happen for the
 * nine grahas, but keeps callers total).
 */
export function dashaOnset(chart: Chart, lord: string): DashaOnset | null {
  if (NODES.has(lord)) {
    const pos = chart.planets.find((p) => p.planet === lord);
    if (!pos) return null;
    return readOnset(chart, pos, true);
  }
  const pos = chart.planets.find((p) => p.planet === lord);
  if (!pos) return null;
  return readOnset(chart, pos, pos.retrograde);
}

function readOnset(chart: Chart, pos: PlanetPosition, reversed: boolean): DashaOnset {
  const lord = pos.planet as PlanetName;
  // Natal drekkāṇa: 0–10° → 0, 10–20° → 1, 20–30° → 2.
  const drekkana = Math.min(2, Math.floor(pos.degreeInSign / 10));
  const idx = reversed ? 2 - drekkana : drekkana;
  const emphasis = emphasisOrder[idx];

  // Onset tenor from dignity + house.
  const dusthana = pos.house === 6 || pos.house === 8 || pos.house === 12;
  const exalted = !NODES.has(lord) && EXALT[lord] === pos.signIndex;
  const debilitated = !NODES.has(lord) && (EXALT[lord] + 6) % 12 === pos.signIndex;
  const own = !NODES.has(lord) && (OWN[lord]?.includes(pos.signIndex) ?? false);
  const inLagna = pos.house === 1;
  const dispositor = SIGN_LORDS[pos.signIndex];
  const friendlySign =
    !NODES.has(lord) && !own && (FRIENDS[lord]?.includes(dispositor) ?? false);
  const inimicalSign =
    !NODES.has(lord) && (ENEMIES[lord]?.includes(dispositor) ?? false);

  let tenor: OnsetTenor;
  const good = exalted || own || inLagna || friendlySign;
  const bad = debilitated || inimicalSign || dusthana;
  if (good && !bad) tenor = "favourable";
  else if (bad && !good) tenor = "difficult";
  else tenor = "mixed";

  const dignityWord = exalted
    ? "exalted"
    : debilitated
      ? "debilitated"
      : own
        ? "in its own sign"
        : friendlySign
          ? "in a friendly sign"
          : inimicalSign
            ? "in an inimical sign"
            : "neutral";
  const houseWord = inLagna
    ? "in the lagna"
    : dusthana
      ? `in the ${pos.house}th (a dusthāna)`
      : `in the ${pos.house}th`;

  const note =
    `${lord}'s results tend to ripen in the ${emphasis} part of its period ` +
    `(${drekkana === 0 ? "1st" : drekkana === 1 ? "2nd" : "3rd"} drekkāṇa${reversed ? ", reversed for retrograde/node motion" : ""}). ` +
    `It opens ${tenor}: ${dignityWord}, ${houseWord}.`;

  return { lord, emphasis, reversed, tenor, note };
}
