// Relationship (kalatra) yogas — the positive marriage combinations classical
// texts name, which generic 7th-house analysis does not capture. Marriage is
// judged more cautiously than career in the base engine (the 7th is a maraka,
// KP is strict on its cusp), so without these a genuinely well-supported
// marriage cannot rise above the caution. This is a deliberate choice to weight
// the 7th more generously WHEN specific classical yogas are present — not a
// blanket boost.
//
// Each yoga here is chosen to be INDEPENDENT of the factors that already score
// the marriage area (the 7th-house bhāva verdict, which already weighs the 7th
// lord's placement and benefics in the 7th; and Venus's Ṣaḍbala, the area's
// kāraka). So this credits combinations, not the same evidence twice:
//
//   1. Kalatra-harmony — Venus (kalatra-kāraka) and the 7th lord in union
//      (conjunction, opposition/mutual aspect, or parivartana). A specific
//      relationship-harmony yoga, not a house-strength statement.
//   2. Mālavya yoga — Venus in a kendra in its own or exalted sign (a Pañca-
//      mahāpuruṣa yoga classically conferring an attractive spouse and marital
//      happiness). Rare; a strong discriminator.
//   3. Guru-drishti — Jupiter aspects or occupies the 7th. Jupiter's aspect on
//      the 7th is the classic saubhāgya/"protector of marriage" testimony.
//
// The bonus is convergence-gated (≥2 must co-occur) and bounded, so an ordinary
// chart with 0–1 gains nothing and only a genuinely well-testified marriage is
// lifted.

import type { Chart } from "./types";
import { SIGN_LORDS, type PlanetName } from "./constants";

const EXALT: Partial<Record<PlanetName, number>> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const OWN: Partial<Record<PlanetName, number[]>> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
};
const KENDRA = new Set([1, 4, 7, 10]);

// Graha dṛṣṭi offsets (houses aspected, counted from the planet's own house):
// everyone the 7th; Jupiter also 5th & 9th.
function jupiterAspectsHouse(jupHouse: number, target: number): boolean {
  return [6, 4, 8].some((off) => ((jupHouse - 1 + off) % 12) + 1 === target);
}

export interface RelationshipYoga {
  name: string;
  description: string;
}

export interface RelationshipYogas {
  yogas: RelationshipYoga[];
  /** Bounded positive contribution for the marriage area (0 when < 2 yogas). */
  bonus: number;
  note: string | null;
}

export function detectRelationshipYogas(chart: Chart): RelationshipYogas {
  const asc = chart.ascendantSignIndex;
  const seventhSign = (asc + 6) % 12;
  const seventhLord = SIGN_LORDS[seventhSign];
  const P = (name: PlanetName) => chart.planets.find((p) => p.planet === name);
  const venus = P("Venus");
  const jup = P("Jupiter");
  const lord = P(seventhLord);

  const yogas: RelationshipYoga[] = [];

  // 1. Kalatra-harmony: Venus and the 7th lord in union.
  if (venus && lord) {
    if (seventhLord === "Venus") {
      // Venus IS the 7th lord (Aries/Scorpio lagna) — count only when dignified,
      // so it is a real testimony, not a trivial identity.
      const dignified = EXALT.Venus === venus.signIndex || OWN.Venus?.includes(venus.signIndex);
      if (dignified) {
        yogas.push({ name: "Kalatra-harmony", description: "Venus rules and signifies the 7th and is dignified — a unified, strong marriage significator." });
      }
    } else {
      const conjunct = venus.signIndex === lord.signIndex;
      const opposition = (venus.signIndex - lord.signIndex + 12) % 12 === 6; // mutual 7th aspect
      const parivartana =
        SIGN_LORDS[venus.signIndex] === seventhLord && SIGN_LORDS[lord.signIndex] === "Venus";
      if (conjunct || opposition || parivartana) {
        yogas.push({
          name: "Kalatra-harmony",
          description: `Venus and the 7th lord ${seventhLord} are in ${conjunct ? "conjunction" : opposition ? "mutual aspect" : "parivartana (exchange)"} — a classical relationship-harmony yoga.`,
        });
      }
    }
  }

  // 2. Mālavya yoga: Venus in a kendra in own/exalted sign.
  if (venus && KENDRA.has(venus.house) && (EXALT.Venus === venus.signIndex || OWN.Venus?.includes(venus.signIndex))) {
    yogas.push({ name: "Mālavya yoga", description: "Venus is angular in its own or exalted sign — a Pañca-mahāpuruṣa yoga conferring an attractive spouse and marital comfort." });
  }

  // 3. Guru-drishti: Jupiter aspects or occupies the 7th house.
  if (jup && (jup.house === 7 || jupiterAspectsHouse(jup.house, 7))) {
    yogas.push({ name: "Guru-drishti on the 7th", description: `Jupiter ${jup.house === 7 ? "occupies" : "aspects"} the 7th — the classical protector of marriage (saubhāgya).` });
  }

  // Convergence-gated, bounded bonus.
  let bonus = 0;
  if (yogas.length === 2) bonus = 0.6;
  else if (yogas.length >= 3) bonus = 1.0;
  const note =
    yogas.length >= 2
      ? `Relationship yogas converge (${yogas.map((y) => y.name).join("; ")}) — specific classical testimonies of a well-supported marriage, lifting a reading the cautious 7th-house base would otherwise hold down.`
      : null;

  return { yogas, bonus, note };
}
