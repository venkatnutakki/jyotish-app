// Classical muhūrta doṣas — the REJECTION layer.
//
// A muhūrta engine is properly a constraint solver, not a scorer: the tradition
// first rejects unfit times, then ranks whatever survives. The previous scoring
// here was purely additive over three favourable factors, which is why it rated
// 54.6% of all days "Good or better" and 28.3% "Excellent" (measured over 365
// days × 27 birth stars × 3 Moon signs). An "Excellent" day that occurs on more
// than a quarter of the calendar carries no information — the same Barnum
// failure the life-area verdict scale had.
//
// This module supplies the classical bars. Each is a named, computable
// condition from the muhūrta corpus (Muhūrta Cintāmaṇi / Kālaprakāśikā
// tradition), described here in my own words.
//
// DELIBERATELY NOT IMPLEMENTED — Pañcaka. Its circulating formulations disagree
// on whether the nakṣatra is counted from Aśvinī or from Dhaniṣṭhā, and on
// whether the lagna is included in the sum. The two conventions give different
// answers on most days, so shipping either silently would be inventing a
// verdict. Needs a print edition to settle.

import { norm360 } from "./time";

/** The five-fold tithi classification; Riktā tithis are barred for beginnings. */
const RIKTA_IN_PAKSHA = [4, 9, 14]; // 1-based within the pakṣa

/**
 * Gaṇḍa Mūla — the nakṣatras sitting at a rāśi junction. Traditionally a bar on
 * auspicious beginnings (and, for a birth, a trigger for śānti rites).
 * Aśvinī 0, Āśleṣā 8, Maghā 9, Jyeṣṭhā 17, Mūla 18, Revatī 26.
 */
const GANDA_MULA = new Set([0, 8, 9, 17, 18, 26]);

/**
 * Nitya yogas commonly rejected for auspicious work. Sources differ on whether
 * some are wholly or only partly barred (Viṣkambha and Parigha are often held
 * to spoil only their opening portion), so this treats them as a caution-level
 * bar rather than an absolute one.
 * 0-indexed: Viṣkambha 0, Atigaṇḍa 5, Śūla 8, Gaṇḍa 9, Vyāghāta 12,
 * Vajra 14, Vyatīpāta 16, Parigha 18, Vaidhṛti 26.
 */
const REJECTED_YOGAS = new Set([0, 5, 8, 9, 12, 14, 16, 18, 26]);

export type DoshaSeverity = "bar" | "caution";

export interface Dosha {
  name: string;
  severity: DoshaSeverity;
  note: string;
}

export interface DoshaResult {
  doshas: Dosha[];
  /** Any hard bar present — the day is unfit for an auspicious beginning. */
  barred: boolean;
}

/**
 * Evaluate the classical bars for a day, from the Sun and Moon longitudes at
 * the reference moment and the Moon's nakṣatra index.
 *
 * `sunLon`/`moonLon` are sidereal; only their difference and sum matter, so the
 * ayanāṁśa cancels and this is ayanāṁśa-invariant.
 */
export function muhurtaDoshas(
  sunLon: number,
  moonLon: number,
  moonNakshatra: number
): DoshaResult {
  const doshas: Dosha[] = [];
  const elong = norm360(moonLon - sunLon);

  // --- Tithi -------------------------------------------------------------
  const tithiIdx = Math.floor(elong / 12); // 0..29
  const tithiInPaksha = (tithiIdx % 15) + 1; // 1..15
  const isKrishna = tithiIdx >= 15;

  if (RIKTA_IN_PAKSHA.includes(tithiInPaksha)) {
    doshas.push({
      name: "Riktā tithi",
      severity: "bar",
      note: `The ${tithiInPaksha}th tithi is Riktā ("empty") — classically barred for beginning anything one wants to endure.`,
    });
  }
  if (isKrishna && tithiInPaksha === 15) {
    doshas.push({
      name: "Amāvāsyā",
      severity: "bar",
      note: "New Moon — the Moon is dark and without strength; barred for auspicious beginnings.",
    });
  }
  if (tithiInPaksha === 8) {
    doshas.push({
      name: "Aṣṭamī",
      severity: "caution",
      note: "The 8th tithi is widely avoided for auspicious work, though sources differ on how absolute the bar is.",
    });
  }

  // --- Karaṇa: Viṣṭi (Bhadrā) is rejected outright -----------------------
  const kIdx = Math.floor(elong / 6); // 0..59
  let karanaName: string;
  if (kIdx === 0) karanaName = "Kiṃstughna";
  else if (kIdx <= 56) {
    karanaName = ["Bava", "Bālava", "Kaulava", "Taitila", "Gara", "Vaṇija", "Viṣṭi"][(kIdx - 1) % 7];
  } else karanaName = ["Śakuni", "Chatuṣpāda", "Nāga"][kIdx - 57];

  if (karanaName === "Viṣṭi") {
    doshas.push({
      name: "Viṣṭi (Bhadrā) karaṇa",
      severity: "bar",
      note: "Bhadrā is rejected outright for auspicious acts. (A traditional refinement holds only its earth-residing portion truly harms — lineage-dependent, not applied here.)",
    });
  }

  // --- Nitya yoga --------------------------------------------------------
  const yogaIdx = Math.floor(norm360(sunLon + moonLon) / (360 / 27)) % 27;
  if (REJECTED_YOGAS.has(yogaIdx)) {
    const names = [
      "Viṣkambha", "Prīti", "Āyuṣmān", "Saubhāgya", "Śobhana", "Atigaṇḍa", "Sukarmā",
      "Dhṛti", "Śūla", "Gaṇḍa", "Vṛddhi", "Dhruva", "Vyāghāta", "Harṣaṇa", "Vajra",
      "Siddhi", "Vyatīpāta", "Varīyān", "Parigha", "Śiva", "Siddha", "Sādhya",
      "Śubha", "Śukla", "Brahma", "Indra", "Vaidhṛti",
    ];
    doshas.push({
      name: `${names[yogaIdx]} yoga`,
      severity: "caution",
      note: `${names[yogaIdx]} is among the nitya yogas rejected for auspicious work; sources differ on whether the whole yoga or only its opening portion is barred.`,
    });
  }

  // --- Gaṇḍa Mūla nakṣatra ----------------------------------------------
  if (GANDA_MULA.has(moonNakshatra)) {
    doshas.push({
      name: "Gaṇḍa Mūla nakṣatra",
      severity: "caution",
      note: "The Moon sits in a rāśi-junction star — traditionally avoided for beginnings without propitiation.",
    });
  }

  return { doshas, barred: doshas.some((d) => d.severity === "bar") };
}
