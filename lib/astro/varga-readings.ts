// Per-varga readings — most engines display the sixteen divisional charts but
// never interpret them. This reads each key varga from its OWN ascendant (the
// classical way to read a divisional chart): the varga lagna, its lord's
// dignity, and where that lord sits, giving a "strong / mixed / weak foundation
// for <domain>" line per division. Descriptive; it does not change any score.

import { SIGNS, SIGN_LORDS, type PlanetName } from "./constants";
import { computeVarga } from "./varga";
import type { Chart } from "./types";

const EXALT: Partial<Record<PlanetName, number>> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const DEBIL: Partial<Record<PlanetName, number>> = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
const OWN: Partial<Record<PlanetName, number[]>> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
};

// The key divisionals with a clear, single readable domain (D1 excluded — the
// Rāśi is the whole chart; the obscure D27/D40/D45/D60 are omitted).
const KEY_VARGAS: Array<{ n: number; code: string; name: string; domain: string }> = [
  { n: 9, code: "D9", name: "Navāṃśa", domain: "marriage, dharma and inner strength" },
  { n: 10, code: "D10", name: "Daśāṃśa", domain: "career and worldly achievement" },
  { n: 7, code: "D7", name: "Saptāṃśa", domain: "children and progeny" },
  { n: 12, code: "D12", name: "Dvādaśāṃśa", domain: "parents and lineage" },
  { n: 4, code: "D4", name: "Chaturthāṃśa", domain: "property, home and fixed assets" },
  { n: 24, code: "D24", name: "Chaturviṃśāṃśa", domain: "education and learning" },
  { n: 3, code: "D3", name: "Drekkāṇa", domain: "siblings and courage" },
  { n: 16, code: "D16", name: "Ṣoḍaśāṃśa", domain: "vehicles and comforts" },
  { n: 20, code: "D20", name: "Viṃśāṃśa", domain: "spiritual pursuits" },
  { n: 30, code: "D30", name: "Triṃśāṃśa", domain: "difficulties and resilience" },
];

export interface VargaReading {
  code: string;
  name: string;
  domain: string;
  lagnaSign: string;
  lord: PlanetName;
  strength: "strong" | "mixed" | "weak";
  reading: string;
}

export function vargaReadings(chart: Chart): VargaReading[] {
  return KEY_VARGAS.map(({ n, code, name, domain }) => {
    const v = computeVarga(chart, n);
    const lagna = v.ascendantSignIndex;
    const lord = SIGN_LORDS[lagna];
    const lp = v.planets.find((p) => p.planet === lord)!;
    const house = ((lp.signIndex - lagna + 12) % 12) + 1;

    const exalted = EXALT[lord] === lp.signIndex;
    const debilitated = DEBIL[lord] === lp.signIndex;
    const own = OWN[lord]?.includes(lp.signIndex) ?? false;
    const kendraTrikona = [1, 4, 5, 7, 9, 10].includes(house);
    const dusthana = [6, 8, 12].includes(house);

    let pts = 0;
    if (exalted) pts += 2; else if (own) pts += 1; else if (debilitated) pts -= 2;
    if (kendraTrikona) pts += 1; else if (dusthana) pts -= 1;
    const strength: VargaReading["strength"] = pts >= 2 ? "strong" : pts <= -1 ? "weak" : "mixed";

    const dignityWord = exalted ? "exalted" : debilitated ? "debilitated" : own ? "in its own sign" : "neutrally placed";
    const houseWord = kendraTrikona ? `angular/trinal (the ${ord(house)})` : dusthana ? `in a dusthāna (the ${ord(house)})` : `in the ${ord(house)}`;
    const verdictWord = strength === "strong" ? "a strong foundation" : strength === "weak" ? "a weak foundation that asks for effort" : "a mixed foundation";

    const reading = `${code} (${name}) — ${domain}: ${SIGNS[lagna]} rises in the division; its lord ${lord} is ${dignityWord}, ${houseWord} — ${verdictWord}.`;
    return { code, name, domain, lagnaSign: SIGNS[lagna], lord, strength, reading };
  });
}

function ord(h: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = h % 100;
  return h + (s[(v - 20) % 10] || s[v] || s[0]);
}
