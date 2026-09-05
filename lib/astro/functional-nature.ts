// Functional benefic / malefic classification, keyed to the ascendant (BPHS
// Ch.34, "Yoga Karakas"). This is orthogonal to a planet's NATURAL nature:
// Jupiter is a natural benefic, but for a Taurus lagna he owns the 8th and 11th
// and functions as a malefic; Saturn is a natural malefic, but for Taurus he
// owns the 9th (trikona) and 10th (kendra) and is the yogakāraka — the single
// best planet for that chart.
//
// The doctrine, verified verse-by-verse against BPHS Ch.34:
//   • Trikoṇa lords (1,5,9) are auspicious (functional benefics).
//   • Kendra lords (1,4,7,10): the kendrādhipati doṣa — a NATURAL benefic that
//     owns a kendra loses its benefic power; a NATURAL malefic that owns a
//     kendra sheds its malefic power. Ownership of a kendra alone does not make
//     a planet a benefic; it neutralises.
//   • Lords of 3, 6, 11 (the triṣaḍāya houses) are functional malefics.
//   • The Randhra (8th) lord is a malefic EXCEPT when he also owns a trikoṇa (or
//     the lagna) — then the auspicious lordship dominates.
//   • A single planet owning both a kendra {4,7,10} and a trikoṇa {5,9} becomes
//     a Yoga Kāraka. This test yields exactly the six classical yogakārakas
//     (Saturn for Taurus/Libra, Mars for Cancer/Leo, Venus for Capricorn/
//     Aquarius) — see the spec.
//
// A planet can own two signs, so its houses are combined and the strongest
// applicable rule wins (yogakāraka > benefic > malefic > neutral), never
// averaged — the same "stronger prevails" logic the yoga engine uses.

import { SIGN_LORDS, type PlanetName } from "./constants";
import type { Chart } from "./types";

export type FunctionalNature = "yogakaraka" | "benefic" | "malefic" | "neutral";

export interface FunctionalRuling {
  planet: PlanetName;
  nature: FunctionalNature;
  /** Houses (1-12, from lagna) this planet owns. */
  houses: number[];
  reason: string;
}

const KENDRA = new Set([1, 4, 7, 10]);
const TRIKONA = new Set([1, 5, 9]);
const NATURAL_BENEFIC = new Set<PlanetName>(["Jupiter", "Venus"]);
// Mercury and the waxing Moon are conditional natural benefics; for the
// kendrādhipati doṣa the classics apply the strong form to the unambiguous
// benefics (Jupiter, Venus) and treat Mercury/Moon as mild — so they are NOT
// stripped of function by kendra ownership here. Nodes own no sign.

const OWNER_PLANETS: PlanetName[] = [
  "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn",
];

/** Houses (1-12 from the lagna sign) owned by `planet`. */
function housesOwned(planet: PlanetName, ascSign: number): number[] {
  const out: number[] = [];
  for (let sign = 0; sign < 12; sign++) {
    if (SIGN_LORDS[sign] === planet) {
      out.push(((sign - ascSign + 12) % 12) + 1);
    }
  }
  return out.sort((a, b) => a - b);
}

/**
 * Classify one planet's functional nature for the given ascendant sign.
 * Exported for testing against the known per-lagna yogakāraka table.
 */
export function functionalNatureOf(planet: PlanetName, ascSign: number): FunctionalRuling {
  const houses = housesOwned(planet, ascSign);
  const ownsKendra = houses.some((h) => h !== 1 && KENDRA.has(h));
  const ownsTrikona = houses.some((h) => h !== 1 && TRIKONA.has(h));
  const ownsLagna = houses.includes(1);
  const ownsTrishadaya = houses.some((h) => h === 3 || h === 6 || h === 11);
  const ownsRandhra = houses.includes(8);
  const ownsVyaya = houses.includes(12);
  const auspiciousLordship = ownsLagna || ownsTrikona;

  // Yogakāraka: a single planet bridging a kendra and a trikoṇa. The strongest
  // functional status; it overrides every other consideration.
  if (ownsKendra && ownsTrikona) {
    return {
      planet, houses, nature: "yogakaraka",
      reason: `owns a kendra (${houses.filter((h) => h !== 1 && KENDRA.has(h)).map(ord).join(", ")}) and a trikoṇa (${houses.filter((h) => h !== 1 && TRIKONA.has(h)).map(ord).join(", ")}) — the yogakāraka for this lagna`,
    };
  }

  // Trikoṇa / lagna lordship is auspicious, and dominates a concurrent Randhra
  // lordship (the 8th-lord-is-malefic rule is waived when he also owns a kona).
  if (auspiciousLordship) {
    // Exception: a natural benefic whose ONLY angular/kona tie is the lagna and
    // which also carries a heavy dusthāna (8 or 12) is merely neutral.
    if (ownsLagna && !ownsTrikona && (ownsRandhra || ownsVyaya)) {
      return {
        planet, houses, nature: "neutral",
        reason: `owns the lagna but also the ${houses.filter((h) => h === 8 || h === 12).map(ord).join(" & ")} — the mixed lordship is functionally neutral`,
      };
    }
    return {
      planet, houses, nature: "benefic",
      reason: `owns ${houses.some((h) => h === 1 || TRIKONA.has(h)) ? "a trikoṇa/lagna" : "an auspicious house"} (${houses.map(ord).join(", ")}) — functionally benefic`,
    };
  }

  // Randhra (8th) lord without an auspicious lordship is a functional malefic.
  if (ownsRandhra) {
    return {
      planet, houses, nature: "malefic",
      reason: `owns the 8th without an offsetting trikoṇa/lagna — functionally malefic`,
    };
  }

  // Triṣaḍāya (3,6,11) lords are functional malefics.
  if (ownsTrishadaya) {
    return {
      planet, houses, nature: "malefic",
      reason: `owns the ${houses.filter((h) => h === 3 || h === 6 || h === 11).map(ord).join(", ")} (triṣaḍāya) — functionally malefic`,
    };
  }

  // Kendrādhipati doṣa: a natural benefic owning ONLY kendra(s) loses benefic
  // power; a natural malefic owning a kendra sheds malefic power (→ benefic).
  if (ownsKendra) {
    if (NATURAL_BENEFIC.has(planet)) {
      return {
        planet, houses, nature: "malefic",
        reason: `a natural benefic owning only kendra(s) (${houses.map(ord).join(", ")}) — kendrādhipati doṣa strips its benefic power`,
      };
    }
    const naturalMalefic = planet === "Sun" || planet === "Mars" || planet === "Saturn";
    if (naturalMalefic) {
      return {
        planet, houses, nature: "benefic",
        reason: `a natural malefic owning a kendra (${houses.map(ord).join(", ")}) — sheds its malefic power and turns favourable`,
      };
    }
    return {
      planet, houses, nature: "neutral",
      reason: `owns a kendra (${houses.map(ord).join(", ")}) — functionally neutral`,
    };
  }

  // Owning 2 and/or 12 (or the residual case) — neutral, judged by association.
  return {
    planet, houses, nature: "neutral",
    reason: houses.length
      ? `owns the ${houses.map(ord).join(", ")} — functionally neutral, judged by association`
      : `owns no sign for this lagna`,
  };
}

/** Functional nature of all seven sign-owning grahas for a chart. */
export function functionalNatures(chart: Chart): FunctionalRuling[] {
  return OWNER_PLANETS.map((p) => functionalNatureOf(p, chart.ascendantSignIndex));
}

function ord(h: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = h % 100;
  return h + (s[(v - 20) % 10] || s[v] || s[0]);
}
