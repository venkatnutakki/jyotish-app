// Classical affliction yogas, mapped to the specific life-areas they temper.
// The yoga engine already DETECTS these, but as category "Other" they were
// inert on the scored verdicts — so a Grahaṇa squarely on the Moon left the
// "mind" reading untouched. This maps each affliction to the area(s) it
// classically damages, as a BOUNDED negative modifier (never a hard denial —
// that stays with the promise gate). Each area's total affliction is capped, so
// a heavily-afflicted chart is tempered, not annihilated.
//
// Karaka logic: Moon = manas (mind), Sun = soul/vitality/father, Jupiter =
// vidyā/dharma/guru (wisdom, learning, fortune). The mappings follow those
// significations. Benefic relief (a benefic conjunct/aspecting the afflicted
// point) halves the modifier — an afflicted-but-aspected graha is classically
// softened.

import { naturalBenefics } from "./bhava";
import { type PlanetName } from "./constants";
import type { Chart, PlanetPosition } from "./types";

export interface AfflictionModifier {
  area: string;
  delta: number; // negative
  note: string;
}

const NODES = new Set(["Rahu", "Ketu"]);

// Graha dṛṣṭi offsets for benefic-relief checks (7th universal; Jupiter 5/9).
function benefICAspects(p: PlanetPosition, targetHouse: number): boolean {
  const offs = p.planet === "Jupiter" ? [6, 4, 8] : [6];
  return offs.some((o) => ((p.house - 1 + o) % 12) + 1 === targetHouse);
}

/** All affliction → area modifiers for a chart (bounded per area by the caller). */
export function afflictionModifiers(chart: Chart): AfflictionModifier[] {
  const P = (n: PlanetName) => chart.planets.find((p) => p.planet === n);
  const moon = P("Moon"), sun = P("Sun"), jup = P("Jupiter"), sat = P("Saturn");
  const rahu = P("Rahu"), ketu = P("Ketu");
  const benefics = new Set([...naturalBenefics(chart)].filter((b) => !NODES.has(b)));
  const out: AfflictionModifier[] = [];

  const conjNode = (p?: PlanetPosition) =>
    !!p && ((rahu && p.signIndex === rahu.signIndex) || (ketu && p.signIndex === ketu.signIndex));

  // Benefic relief on a house: a benefic (not the afflicted graha) tenants or
  // aspects it. Halves the modifier.
  const relieved = (house: number, exclude: PlanetName) =>
    chart.planets.some(
      (q) => q.planet !== exclude && benefics.has(q.planet as PlanetName) && (q.house === house || benefICAspects(q, house))
    );
  const push = (area: string, base: number, house: number, exclude: PlanetName, why: string) => {
    const soft = relieved(house, exclude);
    const delta = Math.round((soft ? base / 2 : base) * 100) / 100;
    out.push({ area, delta, note: `${why}${soft ? " (softened by benefic influence on the house)" : ""}.` });
  };

  // Grahaṇa on the Moon — the mind is eclipsed.
  if (conjNode(moon) && moon)
    push("mind", -0.5, moon.house, "Moon", "The Moon is conjunct a node (grahaṇa) — the mind is shadowed, prone to anxiety and unrest");
  // Grahaṇa on the Sun — vitality/soul and (2ndarily) the father.
  if (conjNode(sun) && sun) {
    push("personality", -0.35, sun.house, "Sun", "The Sun is conjunct a node (grahaṇa) — vitality and self-expression are shadowed");
    push("fortune", -0.25, sun.house, "Sun", "The Sun (kāraka of father/dharma) is eclipsed by a node — fortune through the paternal line is tested");
  }
  // Guru-Chāṇḍāla — Jupiter with a node: wisdom, learning, dharma tested.
  if (conjNode(jup) && jup) {
    push("education", -0.45, jup.house, "Jupiter", "Jupiter (vidyā-kāraka) is conjunct a node (guru-chāṇḍāla) — formal learning meets unorthodox turns and tests");
    push("fortune", -0.35, jup.house, "Jupiter", "Jupiter, lord of dharma/bhāgya, is nodal — fortune and faith are questioned before they steady");
    push("spirituality", -0.2, jup.house, "Jupiter", "The guru-kāraka is nodal (guru-chāṇḍāla) — the faith principle is intensified and tested: it deepens into either devout, sometimes unorthodox practice or questioned belief, and the path is hard-won either way");
  }
  // Viṣa (Punarphoo) — Moon conjunct Saturn: a heavy mind.
  if (moon && sat && moon.signIndex === sat.signIndex)
    push("mind", -0.4, moon.house, "Moon", "Moon conjunct Saturn (viṣa) — an earnest but heavy mind, prone to melancholy in youth");
  // Kemadruma — the Moon isolated (no planet in the 2nd/12th from it, none with it).
  if (moon) {
    const around = chart.planets.some((q) => {
      if (q.planet === "Moon" || NODES.has(q.planet)) return false;
      const rel = (q.signIndex - moon.signIndex + 12) % 12;
      return rel === 0 || rel === 1 || rel === 11;
    });
    if (!around) {
      push("mind", -0.4, moon.house, "Moon", "Kemadruma — the Moon stands unsupported (no graha beside it), which the classics read as an unsteady, isolated mind");
      push("personality", -0.2, moon.house, "Moon", "Kemadruma leaves the emotional nature unsupported, colouring the outer personality");
    }
  }
  // Pāpa-kartari on the Lagna — malefics in the 2nd and 12th from the 1st.
  const malefIn = (h: number) => chart.planets.some((q) => q.house === h && !benefics.has(q.planet as PlanetName));
  if (malefIn(2) && malefIn(12)) {
    push("personality", -0.35, 1, "Sun", "The Lagna is hemmed by malefics (pāpa-kartari in the 2nd and 12th) — the constitution and self-expression are pressured");
    push("health", -0.3, 1, "Sun", "Malefics hem the Lagna (pāpa-kartari) — vitality needs guarding");
  }

  return out;
}

/** Sum of affliction deltas for one area, capped so nothing is annihilated. */
export function afflictionForArea(mods: AfflictionModifier[], area: string, cap = -0.9): { delta: number; notes: string[] } {
  const rows = mods.filter((m) => m.area === area);
  const delta = Math.max(rows.reduce((s, r) => s + r.delta, 0), cap);
  return { delta: Math.round(delta * 100) / 100, notes: rows.map((r) => r.note) };
}
