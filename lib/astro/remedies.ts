// Rule-based Vedic remedies (upāya) — prioritized and type-differentiated per
// widely-taught general practice:
//   1. PRIORITY: the running daśā lord (if it needs help) first — remedies land
//      hardest while a planet is "live" in the timeline — then the Lagna lord
//      (structural, whole-chart importance), then remaining weak/afflicted
//      planets ranked by severity.
//   2. TYPE: a weak-but-structurally-supportive planet gets STRENGTHENING
//      remedies (gemstone, fuller mantra count); a planet that is debilitated,
//      combust, or rules a duṣṭhāna (6th/8th/12th) for this ascendant without
//      trikoṇa relief is treated as needing PACIFICATION instead — donation,
//      fasting, conduct — and a gemstone is deliberately NOT recommended for
//      it, since amplifying a structurally-challenging planet is the single
//      most repeated caution in general remedial teaching.

import { SIGN_LORDS, type PlanetName } from "./constants";
import type { Chart } from "./types";
import type { ShadbalaResult } from "./shadbala";
import type { DashaPeriod } from "./dasha";

interface PlanetRemedy {
  gemstone: string;
  mantra: string;
  deity: string;
  day: string;
  charity: string;
}

const REMEDY: Record<PlanetName, PlanetRemedy> = {
  Sun: { gemstone: "Ruby", mantra: "Oṃ Sūryāya Namaḥ", deity: "Sūrya / Śiva", day: "Sunday", charity: "wheat, jaggery or copper" },
  Moon: { gemstone: "Pearl", mantra: "Oṃ Chandrāya Namaḥ", deity: "Pārvatī", day: "Monday", charity: "rice, milk or silver" },
  Mars: { gemstone: "Red Coral", mantra: "Oṃ Maṅgalāya Namaḥ", deity: "Hanumān / Kārtikeya", day: "Tuesday", charity: "red lentils or red cloth" },
  Mercury: { gemstone: "Emerald", mantra: "Oṃ Budhāya Namaḥ", deity: "Viṣṇu", day: "Wednesday", charity: "green gram or green cloth" },
  Jupiter: { gemstone: "Yellow Sapphire", mantra: "Oṃ Gurave Namaḥ", deity: "Bṛhaspati / Viṣṇu", day: "Thursday", charity: "turmeric, gram dal or gold" },
  Venus: { gemstone: "Diamond / White Sapphire", mantra: "Oṃ Śukrāya Namaḥ", deity: "Lakṣmī", day: "Friday", charity: "white sweets, curd or perfume" },
  Saturn: { gemstone: "Blue Sapphire", mantra: "Oṃ Śanaye Namaḥ", deity: "Śani / Hanumān", day: "Saturday", charity: "black sesame, iron or oil" },
  Rahu: { gemstone: "Hessonite (Gomed)", mantra: "Oṃ Rāhave Namaḥ", deity: "Durgā", day: "Saturday", charity: "black gram or blankets" },
  Ketu: { gemstone: "Cat's Eye", mantra: "Oṃ Ketave Namaḥ", deity: "Gaṇeśa", day: "Tuesday", charity: "multi-coloured cloth or blankets" },
};

const DEBIL: Partial<Record<PlanetName, number>> = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
const DUSTHANA = [6, 8, 12];
const TRIKONA = [1, 5, 9];

export type RemedyType = "strengthen" | "pacify";

export interface Remedy {
  planet: PlanetName;
  reason: string;
  priority: number; // 1 = address first
  type: RemedyType;
  gemstone: string | null; // null when pacification is advised — no gemstone
  mantra: string;
  deity: string;
  day: string;
  charity: string;
  note: string | null; // e.g. explains why a gemstone was withheld
}

/** Houses (1-12) `planet` rules from this ascendant. */
function housesRuled(planet: PlanetName, ascSignIndex: number): number[] {
  const out: number[] = [];
  for (let h = 1; h <= 12; h++) {
    if (SIGN_LORDS[(ascSignIndex + h - 1) % 12] === planet) out.push(h);
  }
  return out;
}

/**
 * Conservative structural-nature check: is this planet safe to STRENGTHEN for
 * this ascendant? A planet ruling a duṣṭhāna (6/8/12) with no trikoṇa (1/5/9)
 * relief, or ruling the 8th at all (near-universally treated as inauspicious
 * regardless of what else it rules), is flagged — matching the general-practice
 * caution against amplifying a structurally-challenging planet.
 */
function structurallySupportive(planet: PlanetName, ascSignIndex: number): boolean {
  const houses = housesRuled(planet, ascSignIndex);
  if (houses.includes(8)) return false;
  const rulesDusthana = houses.some((h) => DUSTHANA.includes(h));
  const rulesTrikona = houses.some((h) => TRIKONA.includes(h));
  return !rulesDusthana || rulesTrikona;
}

function isDebilitated(planet: PlanetName, signIndex: number): boolean {
  return DEBIL[planet] === signIndex;
}

export function computeRemedies(
  chart: Chart,
  shadbala: ShadbalaResult,
  dasha: DashaPeriod[]
): Remedy[] {
  const out: Remedy[] = [];
  const seen = new Set<PlanetName>();
  let priority = 0;

  const signOf = (p: PlanetName) => chart.planets.find((x) => x.planet === p)?.signIndex;

  const add = (planet: PlanetName, reason: string) => {
    if (seen.has(planet)) return;
    seen.add(planet);
    priority += 1;

    const sign = signOf(planet);
    const supportive = structurallySupportive(planet, chart.ascendantSignIndex);
    const debilitated = sign != null && isDebilitated(planet, sign);
    const type: RemedyType = supportive && !debilitated ? "strengthen" : "pacify";

    const base = REMEDY[planet];
    const gemstone = type === "strengthen" ? base.gemstone : null;
    const note =
      type === "pacify"
        ? `Pacifying remedies only — ${planet} ${debilitated ? "is debilitated" : "rules a duṣṭhāna (6th/8th/12th) for your ascendant without trikoṇa relief"} here, so a gemstone is deliberately not recommended (amplifying a structurally-challenging planet is discouraged in general practice); favour charity, mantra and conduct.`
        : null;

    out.push({ planet, reason, priority, type, gemstone, mantra: base.mantra, deity: base.deity, day: base.day, charity: base.charity, note });
  };

  // 1. Current Mahādaśā lord FIRST — remedies land hardest while a planet is
  //    "live" in the timeline (general-practice priority ordering).
  const now = Date.now();
  const maha = dasha.find(
    (d) => new Date(d.start).getTime() <= now && now < new Date(d.end).getTime()
  );
  if (maha && !["Rahu", "Ketu"].includes(maha.lord)) {
    add(maha.lord as PlanetName, "Lord of your current major period — remedies here land hardest while it is active, smoothing this phase of life.");
  }

  // 2. Lagna lord — structural, whole-chart importance.
  const lagnaLord = SIGN_LORDS[chart.ascendantSignIndex];
  add(lagnaLord, "Lord of your Ascendant — strengthening it supports overall vitality and direction.");

  // 3. Remaining planets ranked by severity (weakest Ṣaḍbala first).
  const ranked = shadbala.ranking.filter((r) => !["Rahu", "Ketu"].includes(r.planet));
  for (const r of [...ranked].sort((a, b) => a.rupas - b.rupas)) {
    if (seen.has(r.planet as PlanetName)) continue;
    // Only flag planets that are genuinely weak — below their required rūpas —
    // not every remaining planet in strength order.
    const bal = shadbala.planets[r.planet as keyof ShadbalaResult["planets"]];
    if (bal && r.rupas < bal.required) {
      add(r.planet as PlanetName, `Weaker than its required strength (${r.rupas.toFixed(1)} of ${bal.required.toFixed(1)} rūpas) — support here helps that area of life.`);
    }
  }

  return out;
}
