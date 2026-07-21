// Ashtakavarga bindu-strength grading for transits (Gochara) — combines the
// classical Vedha-based good/obstructed verdict (gochara.ts) with how many
// Ashtakavarga bindus support the transited sign. Standard practice: Vedha
// sets the DIRECTION of the result, bindu strength MODULATES its intensity —
// a "favourable" transit through a low-bindu sign delivers little, and an
// "obstructed" transit through a high-bindu sign is cushioned, not negated.
//
// Raw (pre-Shodhana) bindu counts are used here, matching general transit-
// grading practice; Shodhana-reduced counts are reserved for longer-range
// dasha-phala judgments elsewhere in the app (ashtakavarga-reduce.ts).

import { computeAshtakavarga } from "./ashtakavarga";
import type { Chart } from "./types";
import type { GocharaResult } from "./gochara";
import type { PlanetName } from "./constants";

export type BinduTier = "weak" | "mildlyWeak" | "neutral" | "strong" | "exceptional";

function savTier(sav: number): BinduTier {
  if (sav < 25) return "weak";
  if (sav < 28) return "mildlyWeak";
  if (sav < 30) return "neutral";
  if (sav < 32) return "strong";
  return "exceptional";
}

export interface GocharaStrength extends GocharaResult {
  /** This planet's own Bhinnashtakavarga bindus (0-8) in the sign it transits. */
  bavBindus: number;
  /** Sarvashtakavarga bindus (0-56, avg ~28) in the transited sign. */
  savBindus: number;
  savTier: BinduTier;
  /** Combined verdict folding Vedha direction with bindu intensity. */
  combinedVerdict: string;
  /** -2..+2, for sorting/display: how strong the net (Vedha × bindus) result is. */
  netStrength: number;
}

/**
 * Grade every transit result by Ashtakavarga bindu strength and fold it
 * together with the existing Vedha verdict. `positions` must carry the sign
 * index each planet is currently transiting (see TransitPosition in transits.ts).
 */
export function computeGocharaStrength(
  natal: Chart,
  gochara: GocharaResult[],
  positions: { planet: PlanetName; signIndex: number }[]
): GocharaStrength[] {
  const { bav, sav } = computeAshtakavarga(natal);
  const signOf = new Map(positions.map((p) => [p.planet, p.signIndex]));

  return gochara.map((g) => {
    const sign = signOf.get(g.planet);
    const bavBindus = sign != null ? (bav[g.planet]?.[sign] ?? 0) : 0;
    const savBindus = sign != null ? (sav[sign] ?? 0) : 0;
    const tier = savTier(savBindus);

    // Own-planet BAV strength: <=3 strained, 4 balance, >=5 constructive.
    const bavStrong = bavBindus >= 5;
    const bavWeak = bavBindus <= 3;
    const savStrong = tier === "strong" || tier === "exceptional";
    const savWeak = tier === "weak" || tier === "mildlyWeak";
    const highBindu = bavStrong && savStrong;
    const lowBindu = bavWeak || savWeak;

    // net: Vedha direction (+1 favourable / -1 unfavourable, obstruction flips
    // its own sign already inside g.benefic+g.vedhaBy) modulated by bindus.
    const direction = g.benefic && !g.vedhaBy ? 1 : g.benefic && g.vedhaBy ? 0.3 : !g.benefic && g.vedhaBy ? -0.3 : -1;
    const multiplier = highBindu ? 1.7 : lowBindu ? 0.4 : 1;
    const netStrength = Math.max(-2, Math.min(2, Math.round(direction * multiplier * 10) / 10 * 2) / 2);

    // Describe BAV/SAV independently — they can diverge (e.g. modest own
    // bindus in an otherwise well-supported sign), and the verdict should say
    // so accurately rather than collapsing a mixed case into "average".
    const bavWord = bavStrong ? "well-supported" : bavWeak ? "weakly placed" : "moderately placed";
    const savWord = tier === "exceptional" ? "an exceptionally strong" : tier === "strong" ? "a strong" : tier === "neutral" ? "an average" : tier === "mildlyWeak" ? "a mildly weak" : "a weak";
    const binduClause = `${g.planet} is ${bavWord} (${bavBindus}/8 own bindus) in ${savWord} sign (${savBindus} Sarvāṣṭakavarga bindus)`;

    let combinedVerdict: string;
    if (direction >= 1) {
      combinedVerdict = highBindu
        ? `Strongly favourable — ${binduClause}, so this transit delivers fully.`
        : lowBindu
          ? `Favourable by Vedha, but muted — ${binduClause}, so results stay modest despite the good house from Moon.`
          : `Favourable — ${binduClause}.`;
    } else if (direction <= -1) {
      combinedVerdict = highBindu
        ? `Testing by Vedha, but cushioned — ${binduClause}, so the difficulty stays manageable.`
        : lowBindu
          ? `Most challenging phase for ${g.planet} — an ordinary/testing house from the Moon, and ${binduClause}.`
          : `Testing transit — ${binduClause}.`;
    } else {
      // Vedha-obstructed either direction — bindus still colour the residual effect.
      combinedVerdict = `${g.verdict} ${binduClause}.`;
    }

    return { ...g, bavBindus, savBindus, savTier: tier, combinedVerdict, netStrength };
  });
}
