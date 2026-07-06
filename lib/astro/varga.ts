// Divisional charts (vargas / amshas) per Brihat Parashara Hora Shastra.
// Each function maps a planet's Rāśi (sign index 0-11) + degrees-in-sign to the
// sign it occupies in that divisional chart.

import { SIGN_ARC } from "./constants";
import type { Chart, PlanetPosition } from "./types";

export interface VargaDef {
  code: string; // "D9"
  n: number; // number of divisions
  name: string; // Sanskrit
  meaning: string;
}

export const VARGAS: VargaDef[] = [
  { code: "D1", n: 1, name: "Rāśi", meaning: "Body, overall life" },
  { code: "D2", n: 2, name: "Horā", meaning: "Wealth" },
  { code: "D3", n: 3, name: "Drekkāṇa", meaning: "Siblings, courage" },
  { code: "D4", n: 4, name: "Chaturthāṃśa", meaning: "Property, fortune" },
  { code: "D7", n: 7, name: "Saptāṃśa", meaning: "Children, progeny" },
  { code: "D9", n: 9, name: "Navāṃśa", meaning: "Spouse, dharma, strength" },
  { code: "D10", n: 10, name: "Daśāṃśa", meaning: "Career, achievement" },
  { code: "D12", n: 12, name: "Dvādaśāṃśa", meaning: "Parents, lineage" },
  { code: "D16", n: 16, name: "Ṣoḍaśāṃśa", meaning: "Vehicles, comforts" },
  { code: "D20", n: 20, name: "Viṃśāṃśa", meaning: "Spiritual pursuits" },
  { code: "D24", n: 24, name: "Chaturviṃśāṃśa", meaning: "Education, learning" },
  { code: "D27", n: 27, name: "Bhāṃśa", meaning: "Strengths & weaknesses" },
  { code: "D30", n: 30, name: "Triṃśāṃśa", meaning: "Misfortunes, character" },
  { code: "D40", n: 40, name: "Khavedāṃśa", meaning: "Auspicious effects" },
  { code: "D45", n: 45, name: "Akṣavedāṃśa", meaning: "General character" },
  { code: "D60", n: 60, name: "Ṣaṣṭyāṃśa", meaning: "Past karma, all matters" },
];

const mod12 = (x: number) => ((x % 12) + 12) % 12;

// Sign modality: 0 movable (chara), 1 fixed (sthira), 2 dual (dwiswabhava).
const modality = (s: number) => s % 3;
// Element: 0 fire, 1 earth, 2 air, 3 water (Aries..Pisces cycle of 4).
const element = (s: number) => s % 4;
const isOdd = (s: number) => s % 2 === 0; // Aries(0) is the 1st = odd sign

/**
 * Sign index in divisional chart Dn for a body at (sign, degInSign).
 * Implements the classical (BPHS) rule for each of the 16 vargas.
 */
export function vargaSign(sign: number, deg: number, n: number): number {
  // part index k = 0..n-1
  const part = Math.floor((deg / SIGN_ARC) * n);

  switch (n) {
    case 1:
      return sign;

    case 2: {
      // Horā: odd sign → 0-15° Leo, 15-30° Cancer; even sign reversed.
      const firstHalf = part === 0;
      if (isOdd(sign)) return firstHalf ? 4 : 3; // Leo / Cancer
      return firstHalf ? 3 : 4; // Cancer / Leo
    }

    case 3:
      // Drekkāṇa: 1st→same, 2nd→5th, 3rd→9th.
      return mod12(sign + [0, 4, 8][part]);

    case 4:
      // Chaturthāṃśa: same, 4th, 7th, 10th.
      return mod12(sign + 3 * part);

    case 7: {
      // Saptāṃśa: odd sign starts from itself, even from the 7th.
      const start = isOdd(sign) ? sign : mod12(sign + 6);
      return mod12(start + part);
    }

    case 9: {
      // Navāṃśa: fire→Aries, earth→Cap, air→Libra, water→Cancer.
      const start = [0, 9, 6, 3][element(sign)];
      return mod12(start + part);
    }

    case 10: {
      // Daśāṃśa: odd sign from itself, even from the 9th.
      const start = isOdd(sign) ? sign : mod12(sign + 8);
      return mod12(start + part);
    }

    case 12:
      // Dvādaśāṃśa: always from the sign itself.
      return mod12(sign + part);

    case 16: {
      // Ṣoḍaśāṃśa: movable→Aries, fixed→Leo, dual→Sagittarius.
      const start = [0, 4, 8][modality(sign)];
      return mod12(start + part);
    }

    case 20: {
      // Viṃśāṃśa: movable→Aries, fixed→Sagittarius, dual→Leo.
      const start = [0, 8, 4][modality(sign)];
      return mod12(start + part);
    }

    case 24: {
      // Chaturviṃśāṃśa: odd sign from Leo, even from Cancer.
      const start = isOdd(sign) ? 4 : 3;
      return mod12(start + part);
    }

    case 27: {
      // Bhāṃśa: fire→Aries, earth→Cancer, air→Libra, water→Capricorn.
      const start = [0, 3, 6, 9][element(sign)];
      return mod12(start + part);
    }

    case 30: {
      // Triṃśāṃśa: unequal 5/5/8/7/5 rulership scheme.
      const d = deg;
      if (isOdd(sign)) {
        if (d < 5) return 0; // Mars → Aries
        if (d < 10) return 10; // Saturn → Aquarius
        if (d < 18) return 8; // Jupiter → Sagittarius
        if (d < 25) return 2; // Mercury → Gemini
        return 6; // Venus → Libra
      } else {
        if (d < 5) return 1; // Venus → Taurus
        if (d < 12) return 5; // Mercury → Virgo
        if (d < 20) return 11; // Jupiter → Pisces
        if (d < 25) return 9; // Saturn → Capricorn
        return 7; // Mars → Scorpio
      }
    }

    case 40: {
      // Khavedāṃśa: odd sign from Aries, even from Libra.
      const start = isOdd(sign) ? 0 : 6;
      return mod12(start + part);
    }

    case 45: {
      // Akṣavedāṃśa: movable→Aries, fixed→Leo, dual→Sagittarius.
      const start = [0, 4, 8][modality(sign)];
      return mod12(start + part);
    }

    case 60:
      // Ṣaṣṭyāṃśa: count from the sign itself.
      return mod12(sign + part);

    default:
      return sign;
  }
}

/**
 * Derive a full chart for divisional chart Dn (for rendering). Planet houses
 * are recomputed as whole-sign houses from the divisional ascendant.
 */
export function computeVarga(chart: Chart, n: number): Chart {
  const ascSign = vargaSign(
    chart.ascendantSignIndex,
    chart.ascendant - chart.ascendantSignIndex * SIGN_ARC,
    n
  );

  const planets: PlanetPosition[] = chart.planets.map((p) => {
    const s = vargaSign(p.signIndex, p.degreeInSign, n);
    return {
      ...p,
      signIndex: s,
      house: mod12(s - ascSign) + 1,
    };
  });

  return {
    ...chart,
    ascendant: ascSign * SIGN_ARC,
    ascendantSignIndex: ascSign,
    planets,
  };
}
