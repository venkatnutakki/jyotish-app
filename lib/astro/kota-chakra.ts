// Kōṭa Chakra — the "fort" chakra of the Muhūrta / Praśna tradition
// (Uttara Kalāmṛta, Sarvārtha Chintāmaṇi). Not part of BPHS and not in the
// bundled texts, so it is built from the standard published construction, with
// the convention documented here.
//
// Construction:
//   • 28 nakṣatras (the 27 + Abhijit, inserted after Uttarāṣāḍha) are counted
//     from the janma-nakṣatra (the Moon's star), which sits at the protected
//     core of the fort.
//   • They fill four concentric enclosures (vīthis), 7 stars each, from the
//     centre outward: Stambha (core) → Madhya → Prākāra (rampart) → Bāhya (field).
//   • A malefic in an inner enclosure threatens the native's core; a benefic
//     there protects it. Malefics in the outer enclosures are threats still at
//     a distance.
//   • Kōṭa Svāmī (the fort's commander) = lord of the janma-nakṣatra; he defends
//     the core. Kōṭa Pāla (the gate-keeper) = lord of the 22nd nakṣatra from
//     janma — the first star of the outer field, i.e. the main gate.

import { NAKSHATRAS, type PlanetName } from "./constants";
import type { Chart } from "./types";

// The 28-fold list: 27 nakṣatras with Abhijit inserted after Uttarāṣāḍha (idx 20).
const NAK28: string[] = [
  ...NAKSHATRAS.slice(0, 21).map((n) => n.name), // Aśvinī … Uttarāṣāḍha
  "Abhijit",
  ...NAKSHATRAS.slice(21).map((n) => n.name),     // Śravaṇa … Revatī
];
// Map a 27-scheme index to the 28-scheme (Śravaṇa onward shift by +1).
const to28 = (i: number) => (i <= 20 ? i : i + 1);
// Vimśottarī lord of a 28-cell; Abhijit has none → share Śravaṇa's lord.
const lord28 = (cell: number): PlanetName =>
  (cell === 21 ? NAKSHATRAS[21].lord : NAKSHATRAS[cell <= 20 ? cell : cell - 1].lord) as PlanetName;

const ENCLOSURES = ["Stambha (core)", "Madhya", "Prākāra (rampart)", "Bāhya (field)"] as const;
const MALEFIC = new Set<PlanetName>(["Sun", "Mars", "Saturn", "Rahu", "Ketu"]);
const BENEFIC = new Set<PlanetName>(["Jupiter", "Venus", "Mercury", "Moon"]);

export interface KotaCell {
  nakshatra: string;
  step: number;               // 1-28, counted from janma
  enclosure: (typeof ENCLOSURES)[number];
  planets: PlanetName[];
}

export interface KotaChakra {
  janmaNakshatra: string;
  cells: KotaCell[];
  kotaSwami: PlanetName;       // fort commander (defends the core)
  kotaPala: PlanetName;        // gate-keeper (guards the outer gate)
  byEnclosure: { enclosure: string; planets: PlanetName[] }[];
  afflictions: string[];
  protections: string[];
  summary: string;
}

export function computeKotaChakra(chart: Chart): KotaChakra {
  const moon = chart.planets.find((p) => p.planet === "Moon")!;
  const janma28 = to28(moon.nakshatraIndex);

  // Which planets sit in each 28-cell.
  const occupants: Record<number, PlanetName[]> = {};
  for (const p of chart.planets) {
    const cell = to28(p.nakshatraIndex);
    (occupants[cell] ??= []).push(p.planet);
  }

  const cells: KotaCell[] = [];
  for (let s = 0; s < 28; s++) {
    const cell = (janma28 + s) % 28;
    cells.push({
      nakshatra: NAK28[cell],
      step: s + 1,
      enclosure: ENCLOSURES[Math.floor(s / 7)],
      planets: occupants[cell] ?? [],
    });
  }

  const byEnclosure = ENCLOSURES.map((enc) => ({
    enclosure: enc,
    planets: cells.filter((c) => c.enclosure === enc).flatMap((c) => c.planets),
  }));

  // 22nd nakṣatra from janma = first cell of Bāhya = the gate.
  const gateCell = (janma28 + 21) % 28;
  const kotaSwami = lord28(janma28);
  const kotaPala = lord28(gateCell);

  const inner = new Set(["Stambha (core)", "Madhya"]);
  const afflictions: string[] = [];
  const protections: string[] = [];
  for (const c of cells) {
    for (const pl of c.planets) {
      if (inner.has(c.enclosure) && MALEFIC.has(pl))
        afflictions.push(`${pl} sits in the ${c.enclosure} (${c.nakshatra}) — a malefic near the fort's core.`);
      if (inner.has(c.enclosure) && BENEFIC.has(pl))
        protections.push(`${pl} guards the ${c.enclosure} (${c.nakshatra}).`);
    }
  }

  const swamiOk = BENEFIC.has(kotaSwami);
  const summary =
    `Kōṭa Svāmī (commander) is ${kotaSwami}${swamiOk ? " — a benefic, favouring the fort's defence" : ""}; ` +
    `Kōṭa Pāla (gate-keeper) is ${kotaPala}. ` +
    (afflictions.length
      ? `${afflictions.length} malefic(s) lie in the inner enclosures — classically read as vulnerability of the native's core; watch the daśā/transit of these grahas.`
      : `No malefic occupies the inner enclosures — the fort's core is well protected.`);

  return { janmaNakshatra: NAK28[janma28], cells, kotaSwami, kotaPala, byEnclosure, afflictions, protections, summary };
}
