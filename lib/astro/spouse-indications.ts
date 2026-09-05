// Spouse indications — the Bhāvat-Bhāvam ("house from house") technique applied
// to the 7th: the house of the partner is read as a lagna in its own right, so
// the 7th lord, the planets tenanting the 7th, and the aspects on it describe
// the SPOUSE, not merely the quality of the marriage. Most engines give only a
// marriage verdict; this adds a portrait of the partner and the marital
// dynamic. Descriptive — it does not change any score.
//
// The planet-in-7th and 7th-lord-sign readings are concise original syntheses
// of the standard significations (Sun = authority, Moon = feeling, Mars = drive,
// Mercury = wit, Jupiter = principle, Venus = charm, Saturn = duty, nodes =
// the unconventional).

import { SIGNS, SIGN_LORDS, type PlanetName } from "./constants";
import { naturalBenefics } from "./bhava";
import type { Chart, PlanetPosition } from "./types";

const SPOUSE_BY_OCCUPANT: Record<string, string> = {
  Sun: "proud, dignified and independent, with a strong will",
  Moon: "caring, sensitive and emotionally attuned, with changeable moods",
  Mars: "energetic, assertive and passionate — spirited, and quick to friction if unchecked",
  Mercury: "youthful, clever and communicative, fond of wit and variety",
  Jupiter: "wise, principled and generous — a fortunate, steadying partner",
  Venus: "graceful, affectionate and refined, drawn to beauty and comfort",
  Saturn: "mature, serious and dutiful — often older or steadier, after some delay",
  Rahu: "unconventional, intense or from a different background, with sudden turns",
  Ketu: "detached, private and inward, ambivalent about convention",
};

// Element/quality flavour from the sign the 7th lord occupies.
const SIGN_TEMPER: string[] = [
  "fiery and forthright", "steady and sensual", "quick and versatile", "tender and home-loving",
  "proud and warm", "precise and discerning", "harmonious and fair", "intense and private",
  "candid and free-spirited", "disciplined and ambitious", "independent and unconventional", "gentle and imaginative",
];

// Graha dṛṣṭi for benefic/malefic aspect on the 7th (universal 7th; specials).
function aspectsHouse(p: PlanetPosition, target: number): boolean {
  const offs = p.planet === "Jupiter" ? [6, 4, 8]
    : p.planet === "Mars" ? [6, 3, 7]
      : p.planet === "Saturn" ? [6, 2, 9]
        : [6];
  return offs.some((o) => ((p.house - 1 + o) % 12) + 1 === target);
}

export interface SpouseIndications {
  seventhSign: string;
  seventhLord: PlanetName;
  occupants: PlanetName[];
  portrait: string;
  harmony: "supported" | "mixed" | "tested";
  harmonyNote: string;
}

export function spouseIndications(chart: Chart): SpouseIndications {
  const asc = chart.ascendantSignIndex;
  const seventhSign = (asc + 6) % 12;
  const seventhLord = SIGN_LORDS[seventhSign];
  const lordPos = chart.planets.find((p) => p.planet === seventhLord);
  const occupants = chart.planets
    .filter((p) => p.house === 7)
    .map((p) => p.planet as PlanetName);

  // Portrait: occupants speak first (a planet IN the 7th colours the spouse most
  // directly); with an empty 7th, the 7th lord's sign carries it.
  const bits: string[] = [];
  if (occupants.length) {
    bits.push(
      `the ${occupants.join(" and ")} in the 7th suggest${occupants.length > 1 ? "" : "s"} a partner ${occupants.map((o) => SPOUSE_BY_OCCUPANT[o]).join("; and ")}`
    );
  } else {
    bits.push(`with the 7th unoccupied, the partner is read from its lord ${seventhLord}`);
  }
  if (lordPos) {
    bits.push(`the 7th lord ${seventhLord} sits in ${SIGNS[lordPos.signIndex]} (${SIGN_TEMPER[lordPos.signIndex]}), colouring the spouse's nature`);
  }
  const portrait = `Reading the 7th as the partner's own ascendant (bhāvat-bhāvam): ${bits.join("; ")}.`;

  // Harmony: benefic vs malefic influence on the 7th (occupation + aspect).
  const benefics = new Set(naturalBenefics(chart));
  const influencers = chart.planets.filter((p) => p.house === 7 || aspectsHouse(p, 7));
  const ben = influencers.filter((p) => benefics.has(p.planet as PlanetName)).length;
  const mal = influencers.filter((p) => !benefics.has(p.planet as PlanetName)).length;
  const harmony: SpouseIndications["harmony"] = ben > mal ? "supported" : mal > ben ? "tested" : "mixed";
  const harmonyNote =
    harmony === "supported"
      ? "Benefic influence on the 7th favours warmth and accord in partnership."
      : harmony === "tested"
        ? "Malefic influence on the 7th asks for patience and conscious effort in partnership."
        : "The 7th carries mixed influence — partnership blends ease and friction.";

  return { seventhSign: SIGNS[seventhSign], seventhLord, occupants, portrait, harmony, harmonyNote };
}
