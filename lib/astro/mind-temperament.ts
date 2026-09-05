// Mind & temperament, read from the Moon — Phaladeepika XV-15 ("It is the Moon
// that determines one's ... character of one's heart") combined with Sāravalī
// Ch.4, which fixes each graha's guṇa (sattva/rajas/tamas) and states that
// whichever planet DOMINATES the mind-significators imparts its nature.
//
// Both anchors were verified 3-0 in the Sept-2026 research pass. What was NOT
// verified — and is therefore deliberately excluded here — is the specific
// personality-trait mapping per planet (Sāravalī Ch.38, refuted 1-2; Phala-
// deepika Ch.II attributes, refuted 0-3) and the Moon-affliction → named-
// disorder rules (Papakartari/Kemadruma → anxiety), whose verification errored
// out and never confirmed. So this module reports:
//   • the guṇa LEANING of the mind, from the Moon plus the planets that
//     actually dominate it (its dispositor and any co-tenant), weighted by
//     Ṣaḍbala — "dominance" being strength, which Phaladeepika Ch.4 (also
//     verified) says to judge before declaring anything; and
//   • the Moon's own condition — its brightness (pakṣa) and the company it
//     keeps — FACTUALLY, because that is the thing the classics say to read the
//     steadiness of mind FROM, without asserting a specific affliction the
//     research could not confirm.
//
// The guṇas are described at the level the guṇas themselves are defined, never
// via the refuted per-planet trait lists.

import { naturalBenefics } from "./bhava";
import type { ShadbalaResult } from "./shadbala";
import { SIGNS, SIGN_LORDS, type PlanetName } from "./constants";
import type { Chart } from "./types";

export type Guna = "Sāttvika" | "Rājasika" | "Tāmasika";

// Fixed guṇa of each graha (Sāravalī Ch.4 / Phaladeepika Ch.2.24, both verified
// and mutually consistent). Nodes are left unclassified — they were not in the
// verified seven-planet table, so they contribute no guṇa here.
const GUNA_OF: Partial<Record<PlanetName, Guna>> = {
  Sun: "Sāttvika", Moon: "Sāttvika", Jupiter: "Sāttvika",
  Mercury: "Rājasika", Venus: "Rājasika",
  Mars: "Tāmasika", Saturn: "Tāmasika",
};

const GUNA_ORIENTATION: Record<Guna, string> = {
  "Sāttvika": "toward clarity, steadiness and harmony — a mind that seeks to understand and to keep the peace",
  "Rājasika": "toward activity, drive and passion — a mind that seeks to act, achieve and be seen",
  "Tāmasika": "toward depth, persistence and the concrete — a mind that holds its ground and works through inertia, best served by discipline",
};

export interface MindTemperament {
  moonSign: string;
  dispositor: PlanetName;
  /** Waxing (bright) or waning (dark) — the Moon's pakṣa. */
  brightening: boolean;
  /** 0–1, angular separation of Moon from Sun as a fraction of half the zodiac. */
  brightness: number;
  company: "benefic" | "malefic" | "mixed" | "unaccompanied";
  companyPlanets: PlanetName[];
  gunaLeaning: Guna;
  contributors: { planet: PlanetName; guna: Guna; weight: number }[];
  note: string;
}

/**
 * Read mind & temperament from the Moon. Deterministic; keys on the Moon's
 * sign, its dispositor, its co-tenants and its brightness, weighting each
 * contributor by Ṣaḍbala so the strongest influence dominates (Sāravalī Ch.4).
 */
export function mindTemperament(
  chart: Chart,
  shadbala: ShadbalaResult
): MindTemperament {
  const moon = chart.planets.find((p) => p.planet === "Moon")!;
  const sun = chart.planets.find((p) => p.planet === "Sun")!;
  const dispositor = SIGN_LORDS[moon.signIndex];

  // Pakṣa: the Moon brightens while ahead of the Sun by 0–180° of elongation.
  const elong = ((moon.longitude - sun.longitude + 360) % 360);
  const brightening = elong < 180;
  const brightness = Math.round((1 - Math.abs(elong - 180) / 180) * 100) / 100;

  // Co-tenants of the Moon (excluding the Moon itself, and the nodes for the
  // guṇa leaning) — the planets that most directly "dominate" the mind.
  const coTenants = chart.planets.filter(
    (p) => p.planet !== "Moon" && p.signIndex === moon.signIndex
  );
  const benefics = new Set(naturalBenefics(chart));
  const companyPlanets = coTenants.map((p) => p.planet as PlanetName);
  const anyBenefic = companyPlanets.some((p) => benefics.has(p));
  const anyMalefic = companyPlanets.some((p) => !benefics.has(p));
  const company: MindTemperament["company"] =
    companyPlanets.length === 0
      ? "unaccompanied"
      : anyBenefic && anyMalefic
        ? "mixed"
        : anyBenefic
          ? "benefic"
          : "malefic";

  // Guṇa leaning: the Moon (mind kāraka) plus its dispositor plus co-tenants,
  // each weighted by Ṣaḍbala rūpas (dominance = strength). The Moon carries a
  // base weight of its own as the seat of the mind.
  const rupasOf = (p: PlanetName) =>
    shadbala.planets[p as keyof ShadbalaResult["planets"]]?.rupas ?? 0;
  const contribList: { planet: PlanetName; guna: Guna; weight: number }[] = [];
  const add = (planet: PlanetName, base: number) => {
    const g = GUNA_OF[planet];
    if (!g) return; // skip nodes / unclassified
    contribList.push({ planet, guna: g, weight: Math.round((base + rupasOf(planet)) * 100) / 100 });
  };
  add("Moon", 2); // the seat of the mind gets a standing weight
  if (dispositor !== "Moon") add(dispositor, 1);
  for (const p of companyPlanets) if (p !== dispositor) add(p, 0.5);

  const gunaScore: Record<Guna, number> = { "Sāttvika": 0, "Rājasika": 0, "Tāmasika": 0 };
  for (const c of contribList) gunaScore[c.guna] += c.weight;
  const gunaLeaning = (Object.keys(gunaScore) as Guna[]).sort(
    (a, b) => gunaScore[b] - gunaScore[a]
  )[0];

  const companyPhrase =
    company === "unaccompanied"
      ? "the Moon sits alone, so the mind takes its colour chiefly from its sign and dispositor"
      : company === "benefic"
        ? "the Moon keeps benefic company, which the classics read as steadying"
        : company === "malefic"
          ? "the Moon keeps malefic company, which the classics read as unsettling — read the mind's steadiness accordingly"
          : "the Moon keeps mixed company, a pull in both directions";

  const note =
    `Read from the Moon (Phaladeepika XV-15): the Moon is in ${SIGNS[moon.signIndex]}, ` +
    `${brightening ? "waxing/bright" : "waning/dark"} (pakṣa strength ${brightness.toFixed(2)}), ` +
    `dispositor ${dispositor}. The dominant grahas over the mind lean ${gunaLeaning} — ` +
    `${GUNA_ORIENTATION[gunaLeaning]}. Here ${companyPhrase}.`;

  return {
    moonSign: SIGNS[moon.signIndex], dispositor, brightening, brightness,
    company, companyPlanets, gunaLeaning, contributors: contribList, note,
  };
}
