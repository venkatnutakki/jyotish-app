// Tāra Bala (nakṣatra transit strength) — the substance of what the
// Sarvatobhadra Chakra is read for. Counting from the birth (Janma) nakṣatra to
// a transiting planet's nakṣatra gives one of nine tārās; three of them (Vipat,
// Pratyak, Vadha) are inauspicious. This judges whether a planet's current
// transit over a star helps or harms the native. Fully deterministic.

import { NAKSHATRAS, type PlanetName } from "./constants";

// The nine tārās in order from the Janma nakṣatra.
const TARAS = [
  "Janma", "Sampat", "Vipat", "Kṣema", "Pratyak", "Sādhaka", "Vadha", "Mitra", "Ati-Mitra",
] as const;
// Auspicious? Vipat (3rd), Pratyak (5th) and Vadha (7th) are the malefic tārās.
const AUSPICIOUS = [true, true, false, true, false, true, false, true, true];

export interface TaraInfo {
  count: number; // 1-27, count from Janma to target nakshatra
  tara: string; // one of the nine
  auspicious: boolean;
  meaning: string;
}

const MEANING: Record<string, string> = {
  Janma: "the body — mixed; care with health",
  Sampat: "wealth & prosperity — excellent",
  Vipat: "danger & loss — avoid new starts",
  "Kṣema": "well-being — favourable",
  Pratyak: "obstacles & opposition — difficult",
  "Sādhaka": "accomplishment — good for effort",
  Vadha: "harm & obstruction — inauspicious",
  Mitra: "friendly support — good",
  "Ati-Mitra": "great friend — very good",
};

/** The tārā of a target nakṣatra reckoned from the Janma nakṣatra. */
export function taraOf(janmaNak: number, targetNak: number): TaraInfo {
  const count = ((targetNak - janmaNak + 27) % 27) + 1; // 1-27
  const idx = (count - 1) % 9;
  const tara = TARAS[idx];
  return { count, tara, auspicious: AUSPICIOUS[idx], meaning: MEANING[tara] };
}

export interface PlanetTara {
  planet: PlanetName;
  nakshatra: string;
  tara: string;
  auspicious: boolean;
  meaning: string;
}

export interface TaraBala {
  janmaNakshatra: string;
  planets: PlanetTara[];
  auspiciousCount: number;
  summary: string;
}

/**
 * Tāra bala for the current transits: each transiting planet's tārā from the
 * native's Janma (Moon) nakṣatra.
 */
export function computeTaraBala(
  janmaNak: number,
  transitNaks: { planet: PlanetName; nakshatraIndex: number }[]
): TaraBala {
  const planets: PlanetTara[] = transitNaks.map((t) => {
    const info = taraOf(janmaNak, t.nakshatraIndex);
    return {
      planet: t.planet,
      nakshatra: NAKSHATRAS[t.nakshatraIndex].name,
      tara: info.tara,
      auspicious: info.auspicious,
      meaning: info.meaning,
    };
  });
  // Benefic planets weigh positive; the Moon's tārā matters most day-to-day.
  const auspiciousCount = planets.filter((p) => p.auspicious).length;
  const moon = planets.find((p) => p.planet === "Moon");
  const summary =
    (moon
      ? `The Moon transits a ${moon.tara} tārā (${moon.auspicious ? "favourable" : "take care"}). `
      : "") +
    `${auspiciousCount} of ${planets.length} planets are in auspicious tārās right now.`;
  return { janmaNakshatra: NAKSHATRAS[janmaNak].name, planets, auspiciousCount, summary };
}
