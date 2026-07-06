// Panchāṅga — the five limbs of the Vedic day, computed at birth.
// Tithi, Yoga and Karaṇa depend only on the Moon–Sun elongation (ayanamsa
// cancels), so sidereal longitudes from the chart are used directly.

import { NAKSHATRAS, NAKSHATRA_ARC } from "./constants";
import { norm360 } from "./time";
import type { Chart } from "./types";

const TITHI_NAMES = [
  "Pratipada", "Dvitīyā", "Tṛtīyā", "Chaturthī", "Panchamī", "Ṣaṣṭhī",
  "Saptamī", "Aṣṭamī", "Navamī", "Daśamī", "Ekādaśī", "Dvādaśī",
  "Trayodaśī", "Chaturdaśī", "Pūrṇimā/Amāvāsyā",
];

const YOGA_NAMES = [
  "Viṣkambha", "Prīti", "Āyuṣmān", "Saubhāgya", "Śobhana", "Atigaṇḍa",
  "Sukarma", "Dhṛti", "Śūla", "Gaṇḍa", "Vṛddhi", "Dhruva", "Vyāghāta",
  "Harṣaṇa", "Vajra", "Siddhi", "Vyatīpāta", "Varīyān", "Parigha", "Śiva",
  "Siddha", "Sādhya", "Śubha", "Śukla", "Brahma", "Indra", "Vaidhṛti",
];

const KARANA_MOVABLE = ["Bava", "Bālava", "Kaulava", "Taitila", "Gara", "Vaṇija", "Viṣṭi"];
const VARA = ["Ravivāra", "Somavāra", "Maṅgalavāra", "Budhavāra", "Guruvāra", "Śukravāra", "Śanivāra"];
const VARA_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface Panchang {
  vara: string;
  varaEn: string;
  tithi: string;
  paksha: "Śukla" | "Kṛṣṇa";
  tithiNumber: number; // 1-15 within the paksha
  nakshatra: string;
  nakshatraLord: string;
  pada: number;
  yoga: string;
  karana: string;
}

export function computePanchang(chart: Chart, weekdayIndex: number): Panchang {
  const sun = chart.planets.find((p) => p.planet === "Sun")!.longitude;
  const moon = chart.planets.find((p) => p.planet === "Moon")!.longitude;
  const moonP = chart.planets.find((p) => p.planet === "Moon")!;

  const elong = norm360(moon - sun); // 0..360

  // Tithi: 30 tithis of 12° each.
  const tithiIdx = Math.floor(elong / 12); // 0..29
  const paksha = tithiIdx < 15 ? "Śukla" : "Kṛṣṇa";
  const tithiInPaksha = tithiIdx % 15; // 0..14
  const tithi = TITHI_NAMES[tithiInPaksha];

  // Nitya Yoga: 27 yogas of 13°20' each from (Sun + Moon).
  const yoga = YOGA_NAMES[Math.floor(norm360(sun + moon) / NAKSHATRA_ARC) % 27];

  // Karana: 60 half-tithis; 1 fixed start, 7 movable ×8, 3 fixed end.
  const kIdx = Math.floor(elong / 6); // 0..59
  let karana: string;
  if (kIdx === 0) karana = "Kiṃstughna";
  else if (kIdx <= 56) karana = KARANA_MOVABLE[(kIdx - 1) % 7];
  else karana = ["Śakuni", "Chatuṣpāda", "Nāga"][kIdx - 57];

  const nak = NAKSHATRAS[moonP.nakshatraIndex];

  return {
    vara: VARA[weekdayIndex],
    varaEn: VARA_EN[weekdayIndex],
    tithi,
    paksha,
    tithiNumber: tithiInPaksha + 1,
    nakshatra: nak.name,
    nakshatraLord: nak.lord,
    pada: moonP.pada,
    yoga,
    karana,
  };
}
