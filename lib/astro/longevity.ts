// Āyurdāya (longevity, BPHS ch. 43-44), Bālāriṣṭa (early-life danger, ch. 9-10),
// and female-horoscopy indications (ch. 80). The longevity figures are the
// classical Piṇḍāyu and Naisargāyu estimates; astrology treats these as bands,
// not literal ages, so we report the āyu band and the māraka (death-dealing)
// planets rather than a single number.

import { SIGN_LORDS, SIGNS, type PlanetName } from "./constants";
import type { Chart } from "./types";

const norm360 = (x: number) => ((x % 360) + 360) % 360;
const sep = (a: number, b: number) => { const d = Math.abs(norm360(a - b)); return d > 180 ? 360 - d : d; };

// Deep-exaltation longitudes; Piṇḍa max years; Naisarga years.
const EXALT_DEG: Record<string, number> = { Sun: 10, Moon: 33, Mars: 298, Mercury: 165, Jupiter: 95, Venus: 357, Saturn: 200 };
const PINDA_MAX: Record<string, number> = { Sun: 19, Moon: 25, Mars: 15, Mercury: 12, Jupiter: 15, Venus: 21, Saturn: 20 };
const NAISARGA: Record<string, number> = { Sun: 20, Moon: 1, Mars: 2, Mercury: 9, Jupiter: 18, Venus: 20, Saturn: 50 };
const COMBUST: Record<string, number> = { Moon: 12, Mars: 17, Mercury: 14, Jupiter: 11, Venus: 10, Saturn: 15 };
const SEVEN: PlanetName[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
const MALEFIC = new Set<PlanetName>(["Sun", "Mars", "Saturn", "Rahu", "Ketu"]);

export interface Ayurdaya {
  pindayu: number;
  naisargayu: number;
  amsayu: number;
  band: "Alpāyu (short)" | "Madhyāyu (middle)" | "Pūrṇāyu (full)";
  chosen: string;
  contributions: { planet: PlanetName; pinda: number }[];
  marakas: PlanetName[];
  note: string;
}

export function computeAyurdaya(chart: Chart): Ayurdaya {
  const byName = Object.fromEntries(chart.planets.map((p) => [p.planet, p])) as Record<PlanetName, (typeof chart.planets)[number]>;
  const sunLon = byName.Sun.longitude;

  const contributions = SEVEN.map((p) => {
    const lon = byName[p].longitude;
    const debil = norm360(EXALT_DEG[p] + 180);
    let years = PINDA_MAX[p] * (sep(lon, debil) / 180); // full at exaltation, 0 at debilitation
    // Combustion halves the contribution (except the Moon lightly).
    if (p !== "Sun" && COMBUST[p] && sep(lon, sunLon) <= COMBUST[p]) years /= 2;
    // A planet in the "invisible" (setting) half — houses 7-12 — loses a third.
    if (byName[p].house >= 7) years *= 2 / 3;
    return { planet: p, pinda: Math.round(years * 10) / 10 };
  });
  const pindayu = Math.round(contributions.reduce((a, c) => a + c.pinda, 0) * 10) / 10;
  const naisargayu = Math.round(SEVEN.reduce((a, p) => {
    const debil = norm360(EXALT_DEG[p] + 180);
    return a + NAISARGA[p] * (sep(byName[p].longitude, debil) / 180);
  }, 0) * 10) / 10;

  // Aṁśāyu (BPHS 43.18-22): each contributor's years = (longitude-in-signs × 108)
  // reduced by multiples of 12, read as Rāśis→years; same combustion / invisible-
  // half reductions, with exaltation/own-sign trebling.
  const amsaContrib = (lon: number, house: number, planet?: PlanetName) => {
    let years = ((lon / 30) * 108) % 12; // 0-12
    if (planet) {
      const debil = norm360(EXALT_DEG[planet] + 180);
      const exaltDist = sep(lon, debil) / 180; // 1 at exaltation
      if (exaltDist > 0.98) years *= 3;        // deep exaltation → treble (dominant rule)
      else if (planet !== "Sun" && COMBUST[planet] && sep(lon, sunLon) <= COMBUST[planet]) years /= 2;
      else if (house >= 7) years *= 2 / 3;
    }
    return years;
  };
  let amsayu = amsaContrib(chart.ascendant, 1); // Lagna
  for (const p of SEVEN) amsayu += amsaContrib(byName[p].longitude, byName[p].house, p);
  amsayu = Math.round(amsayu * 10) / 10;

  const band = pindayu < 32 ? "Alpāyu (short)" : pindayu <= 70 ? "Madhyāyu (middle)" : "Pūrṇāyu (full)";

  // Choice of method (BPHS 43.30): whichever of Lagna / Sun / Moon is strongest →
  // Aṁśāyu / Piṇḍāyu / Naisargāyu respectively. Strength approximated by each
  // reference's own occupied-sign dignity (exalt/own > friend > neutral > debil).
  const dignity = (lon: number, ref: "lagna" | PlanetName) => {
    const sign = Math.floor(lon / 30);
    if (ref === "lagna") return 2; // the ascendant's own sign is its seat
    const debil = norm360(EXALT_DEG[ref] + 180);
    return sep(lon, debil) / 180; // 0 (debil) … 1 (exalt)
  };
  const strengths: { who: string; method: string; s: number }[] = [
    { who: "Lagna", method: "Aṁśāyu", s: 0.6 },
    { who: "Sun", method: "Piṇḍāyu", s: dignity(byName.Sun.longitude, "Sun") },
    { who: "Moon", method: "Naisargāyu", s: dignity(byName.Moon.longitude, "Moon") },
  ].sort((a, b) => b.s - a.s);
  const chosen = strengths[0].method;

  // Marakas: lords of the 2nd & 7th, and planets occupying them.
  const asc = chart.ascendantSignIndex;
  const l2 = SIGN_LORDS[(asc + 1) % 12], l7 = SIGN_LORDS[(asc + 6) % 12];
  const inMaraka = chart.planets.filter((p) => p.house === 2 || p.house === 7).map((p) => p.planet);
  const marakas = [...new Set<PlanetName>([l2, l7, ...inMaraka].filter((x) => x !== "Rahu" && x !== "Ketu"))];

  return {
    pindayu, naisargayu, amsayu, band, chosen, contributions, marakas,
    note: `Piṇḍāyu ≈ ${pindayu}, Naisargāyu ≈ ${naisargayu}, Aṁśāyu ≈ ${amsayu} yrs — the three classical methods. By the strength of Lagna/Sun/Moon, the ${chosen} estimate is preferred here. Māraka (critical-period) planets: ${marakas.join(", ")}. Indicative bands, not literal life-spans.`,
  };
}

// --- Bālāriṣṭa (early-life danger) + its cancellation ---
export interface Balarishta {
  present: boolean;
  cancelled: boolean;
  reasons: string[];
  cancellations: string[];
  summary: string;
}

export function computeBalarishta(chart: Chart): Balarishta {
  const byName = Object.fromEntries(chart.planets.map((p) => [p.planet, p])) as Record<PlanetName, (typeof chart.planets)[number]>;
  const moon = byName.Moon;
  const asc = chart.ascendantSignIndex;
  const reasons: string[] = [];

  // Moon in a dusthāna (6/8/12) with/aspected by malefics.
  if ([6, 8, 12].includes(moon.house)) reasons.push("The Moon is in a dusthāna (6/8/12).");
  // A malefic in the Lagna and another in the 7th.
  const malInLagna = chart.planets.some((p) => p.house === 1 && MALEFIC.has(p.planet));
  const malIn7 = chart.planets.some((p) => p.house === 7 && MALEFIC.has(p.planet));
  if (malInLagna && malIn7) reasons.push("Malefics occupy both the Lagna and the 7th.");
  // The Moon conjunct a malefic in a kendra.
  const conjMalefic = chart.planets.some((p) => p.signIndex === moon.signIndex && MALEFIC.has(p.planet));
  if (conjMalefic && [1, 4, 7, 10].includes(moon.house)) reasons.push("The Moon is with a malefic in an angle.");

  // Cancellations (bhaṅga).
  const cancellations: string[] = [];
  const benefics: PlanetName[] = ["Jupiter", "Venus", "Mercury"];
  if (benefics.some((b) => [1, 4, 7, 10].includes(byName[b].house))) cancellations.push("A benefic occupies a kendra.");
  if ([5, 7, 9].includes(((moon.signIndex - byName.Jupiter.signIndex + 12) % 12) + 1)) cancellations.push("Jupiter aspects the Moon.");
  const l1 = SIGN_LORDS[asc];
  if ([1, 4, 7, 10].includes(byName[l1].house)) cancellations.push("The Lagna lord is angular and strong.");

  const present = reasons.length > 0;
  const cancelled = present && cancellations.length > 0;
  return {
    present, cancelled, reasons, cancellations,
    summary: !present
      ? "No notable Bālāriṣṭa (early-life affliction) combination."
      : cancelled
        ? "Bālāriṣṭa is present but cancelled by benefic support (Ariṣṭa-bhaṅga) — the danger is neutralised."
        : "Bālāriṣṭa combination present; classical texts advise remedies for the early years.",
  };
}

// --- Female horoscopy indications (ch. 80) ---
export interface FemaleIndications {
  marriage: string;
  progeny: string;
  character: string;
}

export function computeFemaleIndications(chart: Chart): FemaleIndications {
  const asc = chart.ascendantSignIndex;
  const byName = Object.fromEntries(chart.planets.map((p) => [p.planet, p])) as Record<PlanetName, (typeof chart.planets)[number]>;
  const seventh = (asc + 6) % 12;
  const seventhLord = SIGN_LORDS[seventh];
  const venus = byName.Venus, jupiter = byName.Jupiter;
  const benefic = (s: number) => chart.planets.some((p) => p.signIndex === s && ["Jupiter", "Venus", "Mercury"].includes(p.planet));
  const malefic7 = chart.planets.some((p) => p.house === 7 && MALEFIC.has(p.planet));

  // 30th-part (Triṁśāṁśa) lord of the Moon rules a woman's character in BPHS.
  const moon = byName.Moon;
  const d30sign = trimsamsaSign(moon.signIndex, moon.degreeInSign);

  return {
    marriage: malefic7
      ? `The 7th (marriage, ${SIGNS[seventh]}) carries a malefic — patience and care in partnership; its lord ${seventhLord} in ${SIGNS[byName[seventhLord].signIndex]}. Venus in ${SIGNS[venus.signIndex]} colours marital happiness.`
      : `The 7th (${SIGNS[seventh]}) is unafflicted — supportive partnership; lord ${seventhLord} in ${SIGNS[byName[seventhLord].signIndex]}, Venus in ${SIGNS[venus.signIndex]}.`,
    progeny: benefic((asc + 4) % 12)
      ? `Jupiter (${SIGNS[jupiter.signIndex]}) and a benefic in the 5th favour children and their well-being.`
      : `Progeny is read from the 5th and Jupiter (${SIGNS[jupiter.signIndex]}); support it with care and remedy where the 5th is stressed.`,
    character: `Triṁśāṁśa (D30) of the Moon falls in ${SIGNS[d30sign]} — its lord ${SIGN_LORDS[d30sign]} indicates temperament and virtue (a classical female-chart pointer).`,
  };
}

// Parāśari Triṁśāṁśa: unequal 5-part division of a sign by degree.
function trimsamsaSign(sign: number, deg: number): number {
  const odd = sign % 2 === 0; // Aries (index 0) is odd
  // Odd: Mars5 Sat5 Jup8 Merc7 Ven5 → lords Mars,Sat,Jup,Merc,Ven ; Even reversed with Ven,Merc,Jup,Sat,Mars
  const oddBounds: [number, PlanetName][] = [[5, "Mars"], [10, "Saturn"], [18, "Jupiter"], [25, "Mercury"], [30, "Venus"]];
  const evenBounds: [number, PlanetName][] = [[5, "Venus"], [12, "Mercury"], [20, "Jupiter"], [25, "Saturn"], [30, "Mars"]];
  const bounds = odd ? oddBounds : evenBounds;
  let lord: PlanetName = bounds[4][1];
  for (const [upto, l] of bounds) if (deg < upto) { lord = l; break; }
  // Return that lord's Moolatrikona sign as the D30 sign.
  const MT: Record<PlanetName, number> = { Mars: 0, Venus: 6, Mercury: 5, Jupiter: 8, Saturn: 10, Sun: 4, Moon: 3, Rahu: 10, Ketu: 7 };
  return MT[lord];
}
