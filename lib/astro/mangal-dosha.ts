// Mangal (Kuja / Maṅgala) Dōṣa — the "Manglik" analysis used in matchmaking.
// Mars in houses 1, 2, 4, 7, 8 or 12 (reckoned from the Lagna, the Moon and
// Venus) afflicts marriage; several classical cancellations (bhaṅga) soften it.

import { SIGNS, type PlanetName } from "./constants";
import type { Chart } from "./types";

const DOSHA_HOUSES = [1, 2, 4, 7, 8, 12];
const houseFrom = (sign: number, from: number) => ((sign - from + 12) % 12) + 1;

export interface MangalDosha {
  isManglik: boolean;
  fromLagna: number | null; // dosha house, or null
  fromMoon: number | null;
  fromVenus: number | null;
  intensity: "None" | "Low" | "Medium" | "High";
  cancellations: string[];
  summary: string;
}

export function computeMangalDosha(chart: Chart): MangalDosha {
  const mars = chart.planets.find((p) => p.planet === "Mars")!;
  const moon = chart.planets.find((p) => p.planet === "Moon")!;
  const venus = chart.planets.find((p) => p.planet === "Venus")!;
  const jup = chart.planets.find((p) => p.planet === "Jupiter")!;

  const hLagna = houseFrom(mars.signIndex, chart.ascendantSignIndex);
  const hMoon = houseFrom(mars.signIndex, moon.signIndex);
  const hVenus = houseFrom(mars.signIndex, venus.signIndex);

  const fromLagna = DOSHA_HOUSES.includes(hLagna) ? hLagna : null;
  const fromMoon = DOSHA_HOUSES.includes(hMoon) ? hMoon : null;
  const fromVenus = DOSHA_HOUSES.includes(hVenus) ? hVenus : null;
  const references = [fromLagna, fromMoon, fromVenus].filter((x) => x !== null).length;

  // --- Cancellations (bhaṅga) ---
  const cancellations: string[] = [];
  // Mars in its own or exaltation sign.
  if ([0, 7].includes(mars.signIndex))
    cancellations.push("Mars is in its own sign — the dōṣa is largely cancelled.");
  if (mars.signIndex === 9)
    cancellations.push("Mars is exalted in Capricorn — the dōṣa is cancelled.");
  // Mars conjunct or aspected by Jupiter (5/7/9 from Jupiter), or conjunct the Moon.
  if (mars.signIndex === jup.signIndex)
    cancellations.push("Mars is with Jupiter — a strong benefic softens the dōṣa.");
  else if ([5, 7, 9].includes(houseFrom(mars.signIndex, jup.signIndex)))
    cancellations.push("Jupiter aspects Mars — the affliction is much reduced.");
  if (mars.signIndex === moon.signIndex)
    cancellations.push("Mars is with the Moon — the dōṣa is mitigated.");
  // Mars in the 2nd in a Mercury sign, or in the 12th in a Venus sign, etc.
  if (fromLagna === 2 && [2, 5].includes(mars.signIndex))
    cancellations.push("Mars in the 2nd in a Mercury sign — no effective dōṣa.");
  if (fromLagna === 12 && [1, 6].includes(mars.signIndex))
    cancellations.push("Mars in the 12th in a Venus sign — no effective dōṣa.");

  const cancelled = cancellations.length > 0;
  const isManglik = references > 0 && !cancelled;

  let intensity: MangalDosha["intensity"] = "None";
  if (references > 0) {
    if (cancelled) intensity = "Low";
    else if (references >= 3) intensity = "High";
    else if (references === 2) intensity = "Medium";
    else intensity = "Low";
  }

  const refs: string[] = [];
  if (fromLagna) refs.push(`${fromLagna}th from Lagna`);
  if (fromMoon) refs.push(`${fromMoon}th from the Moon`);
  if (fromVenus) refs.push(`${fromVenus}th from Venus`);

  const summary =
    references === 0
      ? `Mars is in ${SIGNS[mars.signIndex]} (${hLagna}th house); no Mangal Dōṣa.`
      : cancelled
        ? `Mars sits in a dōṣa house (${refs.join(", ")}), but classical cancellations apply — effectively non-Manglik / mild.`
        : `Mangal Dōṣa present — Mars in the ${refs.join(", ")}. Intensity: ${intensity}.`;

  return { isManglik, fromLagna, fromMoon, fromVenus, intensity, cancellations, summary };
}

/** Compare two charts' Manglik status for matchmaking. */
export function matchMangal(a: MangalDosha, b: MangalDosha): {
  compatible: boolean;
  note: string;
} {
  if (a.isManglik && b.isManglik)
    return { compatible: true, note: "Both partners are Manglik — the dōṣa is mutually cancelled (a classical match)." };
  if (!a.isManglik && !b.isManglik)
    return { compatible: true, note: "Neither partner is Manglik — no Mangal Dōṣa concern." };
  return {
    compatible: false,
    note: "One partner is Manglik and the other is not — traditionally a caution; remedies or a dōṣa-mitigating match are advised.",
  };
}
