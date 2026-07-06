// Rule-based Vedic remedies (upāya). Conservative and safe: strengthen the
// Lagna lord, support the planet ruling the current period, and uplift the
// weakest planet by Ṣaḍbala — via mantra, day, deity and charity. Gemstones
// are noted with the standard caution to consult an astrologer first.

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

export interface Remedy {
  planet: PlanetName;
  reason: string;
  gemstone: string;
  mantra: string;
  deity: string;
  day: string;
  charity: string;
}

export function computeRemedies(
  chart: Chart,
  shadbala: ShadbalaResult,
  dasha: DashaPeriod[]
): Remedy[] {
  const out: Remedy[] = [];
  const seen = new Set<PlanetName>();

  const add = (planet: PlanetName, reason: string) => {
    if (seen.has(planet)) return;
    seen.add(planet);
    out.push({ planet, reason, ...REMEDY[planet] });
  };

  // 1. Lagna lord — strengthening it benefits the whole chart.
  const lagnaLord = SIGN_LORDS[chart.ascendantSignIndex];
  add(lagnaLord, "Lord of your Ascendant — strengthening it supports overall vitality and direction.");

  // 2. Current Mahādaśā lord — smooths the running period.
  const now = Date.now();
  const maha = dasha.find(
    (d) => new Date(d.start).getTime() <= now && now < new Date(d.end).getTime()
  );
  if (maha && !["Rahu", "Ketu"].includes(maha.lord) && !seen.has(maha.lord as PlanetName)) {
    add(maha.lord as PlanetName, `Lord of your current major period — supporting it helps this phase of life flow smoothly.`);
  }

  // 3. Weakest of the 7 planets by Ṣaḍbala — uplift the weakest area.
  const ranked = shadbala.ranking.filter((r) => !["Rahu", "Ketu"].includes(r.planet));
  const weakest = ranked[ranked.length - 1];
  if (weakest && !seen.has(weakest.planet as PlanetName)) {
    add(weakest.planet as PlanetName, `Weakest planet by strength (${weakest.rupas.toFixed(1)} rūpas) — its mantra and charity help shore up that area.`);
  }

  return out;
}
