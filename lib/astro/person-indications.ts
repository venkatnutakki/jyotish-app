// Family-member portraits by Bhāvat-Bhāvam — each person's significator house
// is read as an ascendant in its own right, so its lord, its occupants and the
// aspects on it describe that PERSON and their wellbeing: mother from the 4th,
// father from the 9th, children from the 5th, co-borns from the 3rd. The
// companion of spouse-indications.ts (the 7th); together they let the chart
// speak about the whole family, not only the native. Descriptive — no score.
//
// Generic person-trait syntheses per graha (a planet tenanting the person's
// house colours that person); the house-lord's sign adds flavour; benefic vs
// malefic influence gives a wellbeing read.

import { SIGNS, SIGN_LORDS, type PlanetName } from "./constants";
import { naturalBenefics } from "./bhava";
import type { Chart, PlanetPosition } from "./types";

const PERSON_BY_OCCUPANT: Record<string, string> = {
  Sun: "proud, principled and self-assured",
  Moon: "caring, emotional and nurturing",
  Mars: "energetic, courageous and assertive",
  Mercury: "clever, communicative and adaptable",
  Jupiter: "wise, benevolent and fortunate",
  Venus: "refined, pleasant and drawn to comfort and art",
  Saturn: "serious, hardworking and reserved",
  Rahu: "unconventional, ambitious or foreign-influenced",
  Ketu: "detached, private and spiritually inclined",
};

const SIGN_TEMPER: string[] = [
  "fiery and forthright", "steady and sensual", "quick and versatile", "tender and home-loving",
  "proud and warm", "precise and discerning", "harmonious and fair", "intense and private",
  "candid and free-spirited", "disciplined and ambitious", "independent and unconventional", "gentle and imaginative",
];

function aspectsHouse(p: PlanetPosition, target: number): boolean {
  const offs = p.planet === "Jupiter" ? [6, 4, 8]
    : p.planet === "Mars" ? [6, 3, 7]
      : p.planet === "Saturn" ? [6, 2, 9]
        : [6];
  return offs.some((o) => ((p.house - 1 + o) % 12) + 1 === target);
}

export interface PersonIndication {
  role: string;
  house: number;
  lord: PlanetName;
  occupants: PlanetName[];
  portrait: string;
  wellbeing: "well-supported" | "mixed" | "under strain";
  wellbeingNote: string;
}

/** Portrait of the person signified by `house` (1–12 from the lagna). */
export function personFromHouse(chart: Chart, house: number, role: string): PersonIndication {
  const asc = chart.ascendantSignIndex;
  const houseSign = (asc + house - 1) % 12;
  const lord = SIGN_LORDS[houseSign];
  const lordPos = chart.planets.find((p) => p.planet === lord);
  const occupants = chart.planets.filter((p) => p.house === house).map((p) => p.planet as PlanetName);

  const bits: string[] = [];
  if (occupants.length) {
    bits.push(`${occupants.join(" and ")} in the ${ord(house)} point${occupants.length > 1 ? "" : "s"} to a ${role} who is ${occupants.map((o) => PERSON_BY_OCCUPANT[o]).join("; and ")}`);
  } else {
    bits.push(`the ${ord(house)} is unoccupied, so the ${role} is read from its lord ${lord}`);
  }
  if (lordPos) bits.push(`its lord ${lord} in ${SIGNS[lordPos.signIndex]} (${SIGN_TEMPER[lordPos.signIndex]})`);
  const portrait = `Reading the ${ord(house)} as the ${role}'s own ascendant: ${bits.join("; ")}.`;

  const benefics = new Set(naturalBenefics(chart));
  const influencers = chart.planets.filter((p) => p.house === house || aspectsHouse(p, house));
  const ben = influencers.filter((p) => benefics.has(p.planet as PlanetName)).length;
  const mal = influencers.filter((p) => !benefics.has(p.planet as PlanetName)).length;
  const wellbeing: PersonIndication["wellbeing"] = ben > mal ? "well-supported" : mal > ben ? "under strain" : "mixed";
  const wellbeingNote =
    wellbeing === "well-supported"
      ? `Benefic influence on the ${ord(house)} favours the ${role}'s wellbeing and a warm bond.`
      : wellbeing === "under strain"
        ? `Malefic influence on the ${ord(house)} suggests the ${role}'s matters carry strain, asking for care.`
        : `The ${ord(house)} carries mixed influence — the bond with the ${role} blends ease and difficulty.`;

  return { role, house, lord, occupants, portrait, wellbeing, wellbeingNote };
}

function ord(h: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = h % 100;
  return h + (s[(v - 20) % 10] || s[v] || s[0]);
}
