// Sarvatobhadra / nakṣatra-vedha — the transit "piercing" between nakṣatras.
// A planet transiting one nakṣatra afflicts (does vedha to) its paired nakṣatra.
// The pairs are the classical Vedha table (from Raman's Muhūrta, Vedhakūṭa):
// Aśvinī↔Jyeṣṭhā, Bharaṇī↔Anurādhā, Kṛttikā↔Viśākhā, Rohiṇī↔Svātī,
// Mṛgaśira↔Dhaniṣṭhā, Ārdrā↔Śravaṇa, Punarvasu↔U.Aṣāḍhā, Puṣya↔P.Aṣāḍhā,
// Āśleṣā↔Mūla, Maghā↔Revatī, P.Phalgunī↔U.Bhādra, U.Phalgunī↔P.Bhādra,
// Hasta↔Śatabhiṣā. Chitrā has no vedha.

import { NAKSHATRAS, type PlanetName } from "./constants";

// vedhaOf[nak] = its paired nakṣatra (−1 = Chitrā, no vedha).
const VEDHA_OF = new Array(27).fill(-1);
const PAIRS: [number, number][] = [
  [0, 17], [1, 16], [2, 15], [3, 14], [4, 22], [5, 21], [6, 20], [7, 19],
  [8, 18], [9, 26], [10, 25], [11, 24], [12, 23],
];
for (const [a, b] of PAIRS) { VEDHA_OF[a] = b; VEDHA_OF[b] = a; }

const MALEFIC = new Set<PlanetName>(["Sun", "Mars", "Saturn", "Rahu", "Ketu"]);

export interface NakVedha {
  nakshatra: number;
  name: string;
  occupants: PlanetName[]; // planets transiting this nakṣatra now
  vedhaOf: number; // paired nakṣatra index, or -1
  vedhaName: string | null;
  piercedBy: PlanetName[]; // planets in the paired nakṣatra afflicting this one
}

export interface SarvatobhadraResult {
  cells: NakVedha[];
  janmaNakshatra: number;
  janmaAfflicted: boolean;
  janmaAfflictedBy: PlanetName[];
  summary: string;
}

export function computeNakshatraVedha(
  janmaNak: number,
  transits: { planet: PlanetName; nakshatraIndex: number }[]
): SarvatobhadraResult {
  const occ: PlanetName[][] = Array.from({ length: 27 }, () => []);
  for (const t of transits) occ[t.nakshatraIndex].push(t.planet);

  const cells: NakVedha[] = NAKSHATRAS.map((n, i) => {
    const v = VEDHA_OF[i];
    const piercedBy = v >= 0 ? occ[v] : [];
    return {
      nakshatra: i,
      name: n.name,
      occupants: occ[i],
      vedhaOf: v,
      vedhaName: v >= 0 ? NAKSHATRAS[v].name : null,
      piercedBy,
    };
  });

  const v = VEDHA_OF[janmaNak];
  const janmaAfflictedBy = v >= 0 ? occ[v].filter((p) => MALEFIC.has(p)) : [];
  const janmaAfflicted = janmaAfflictedBy.length > 0;
  const summary = janmaAfflicted
    ? `Your birth star ${NAKSHATRAS[janmaNak].name} is under vedha from ${janmaAfflictedBy.join(", ")} transiting ${NAKSHATRAS[v].name} — a sensitive transit period.`
    : `Your birth star ${NAKSHATRAS[janmaNak].name} is free of vedha right now.`;

  return { cells, janmaNakshatra: janmaNak, janmaAfflicted, janmaAfflictedBy, summary };
}
