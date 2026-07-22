import { describe, it, expect } from "vitest";
import { annotateClauses, textForSentiment } from "./clause-filter";
import { BHRIGU } from "./bhrigu";
import { computeChart } from "./chart";
import { SIGNS, SIGN_LORDS, type PlanetName } from "./constants";
import type { BirthData, Chart } from "./types";

const REF: BirthData = {
  name: "Reference",
  year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  latitude: 28.6139, longitude: 77.209, tzOffsetHours: 5.5,
  place: "New Delhi", ayanamsa: "lahiri", nodeType: "mean",
} as BirthData;

const SEVEN: PlanetName[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

function corpus(n: number): BirthData[] {
  const places: Array<[string, number, number, number]> = [
    ["Delhi", 28.6139, 77.209, 5.5], ["London", 51.5, -0.13, 0],
    ["Sydney", -33.87, 151.2, 10], ["Quito", -0.18, -78.47, -5],
    ["Tokyo", 35.68, 139.69, 9], ["NYC", 40.71, -74.0, -5],
  ];
  const out: BirthData[] = [];
  for (let i = 0; i < n; i++) {
    const [place, lat, lon, tz] = places[i % places.length];
    out.push({
      name: `S${i}`, year: 1940 + ((i * 7) % 80), month: 1 + ((i * 5) % 12),
      day: 1 + ((i * 11) % 28), hour: (i * 13) % 24, minute: (i * 17) % 60,
      latitude: lat, longitude: lon, tzOffsetHours: tz, place,
      ayanamsa: "lahiri", nodeType: "mean",
    } as BirthData);
  }
  return out;
}

const EXALT: Record<string, number> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const DEBIL: Record<string, number> = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
const OWN: Record<string, number[]> = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };

/** Independently re-derive whether a single explicit-sign clause should hold. */
function signInSentence(sentence: string): number | null {
  const lower = sentence.toLowerCase();
  for (let s = 0; s < 12; s++) {
    if (new RegExp(`\\bin ${SIGNS[s].toLowerCase()}\\b`).test(lower) &&
        !new RegExp(`\\bin ${SIGNS[s].toLowerCase()} navamsha`).test(lower)) {
      return s;
    }
  }
  return null;
}

describe("clause-filter — safety invariants", () => {
  it("never tags a sentence that has no 'if' as applies/contradicts", () => {
    for (const b of corpus(40)) {
      const chart = computeChart(b);
      for (const p of SEVEN) {
        for (let h = 1; h <= 12; h++) {
          const text = BHRIGU[p]?.[h];
          if (!text) continue;
          for (const c of annotateClauses(text, p, chart)) {
            if (!/\bif\b/i.test(c.text)) {
              expect(c.status, `base sentence tagged: "${c.text.slice(0, 50)}"`).toBe("neutral");
            }
          }
        }
      }
    }
  });

  it("leaves compound / cancellation sentences neutral", () => {
    const chart = computeChart(REF);
    for (const p of SEVEN) {
      for (let h = 1; h <= 12; h++) {
        const text = BHRIGU[p]?.[h];
        if (!text) continue;
        for (const c of annotateClauses(text, p, chart)) {
          const lower = c.text.toLowerCase();
          const compound =
            /\bbut\b|\bunless\b|will not be felt|will not happen|however/.test(lower) ||
            (lower.match(/\bif\b/g) || []).length > 1;
          if (compound) {
            expect(c.status, `compound resolved: "${c.text.slice(0, 60)}"`).toBe("neutral");
          }
        }
      }
    }
  });

  it("never changes, drops, or reorders the sentence text itself", () => {
    // annotateClauses only classifies; concatenating its output must reproduce
    // the original sentences (modulo the whitespace normalisation of the split).
    const chart = computeChart(REF);
    for (const p of SEVEN) {
      for (let h = 1; h <= 12; h++) {
        const text = BHRIGU[p]?.[h];
        if (!text) continue;
        const rejoined = annotateClauses(text, p, chart).map((c) => c.text).join(" ");
        // Same set of words, in the same order.
        expect(rejoined.replace(/\s+/g, " ").trim()).toBe(text.replace(/\s+/g, " ").trim());
      }
    }
  });
});

describe("clause-filter — correctness of every judgement", () => {
  it("every 'applies'/'contradicts' explicit-sign clause matches the planet's real sign", () => {
    let checked = 0;
    for (const b of corpus(120)) {
      const chart: Chart = computeChart(b);
      for (const p of SEVEN) {
        const sign = chart.planets.find((x) => x.planet === p)!.signIndex;
        for (let h = 1; h <= 12; h++) {
          const text = BHRIGU[p]?.[h];
          if (!text) continue;
          for (const c of annotateClauses(text, p, chart)) {
            if (c.status === "neutral") continue;
            const s = signInSentence(c.text);
            if (s !== null) {
              checked++;
              // If the clause named an explicit sign, the tag must equal
              // (planet is in that sign).
              expect(c.status === "applies", `${p} h${h}: ${c.text.slice(0, 50)}`).toBe(sign === s);
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(10);
  });

  it("dignity clauses agree with an OR of the dignities they actually name", () => {
    // Computed independently: a clause naming several dignities joined by "or"
    // holds if the planet satisfies ANY. This must not mirror the module's
    // branch order (the earlier bug) — it evaluates the disjunction directly.
    for (const b of corpus(120)) {
      const chart = computeChart(b);
      for (const p of SEVEN) {
        const sign = chart.planets.find((x) => x.planet === p)!.signIndex;
        const exalted = EXALT[p] === sign;
        const debil = DEBIL[p] === sign;
        const own = (OWN[p]?.includes(sign) ?? false) || SIGN_LORDS[sign] === p;
        for (let h = 1; h <= 12; h++) {
          const text = BHRIGU[p]?.[h];
          if (!text) continue;
          for (const c of annotateClauses(text, p, chart)) {
            if (c.status === "neutral" || signInSentence(c.text) !== null) continue;
            const lower = c.text.toLowerCase();
            const wExalt = /exalt|sign of exaltation/.test(lower);
            const wDebil = /debilitat/.test(lower);
            const wOwn = /own sign|his own|her own/.test(lower);
            const hasPositive = wExalt || wOwn;
            if (hasPositive && wDebil) continue; // module leaves this neutral
            let expected: boolean;
            if (wDebil) expected = debil;
            else if (hasPositive) expected = (wExalt && exalted) || (wOwn && own);
            else continue; // moon-phase etc.
            expect(c.status === "applies", `${p} h${h}: ${c.text.slice(0, 60)}`).toBe(expected);
          }
        }
      }
    }
  });

  it("resolves 'own sign or exalted' as a disjunction (regression)", () => {
    // Direct check of the exact bug: a planet in its OWN sign but not exalted,
    // against "own sign or exalted", must apply — not contradict.
    for (const b of corpus(200)) {
      const chart = computeChart(b);
      for (const p of SEVEN) {
        const sign = chart.planets.find((x) => x.planet === p)!.signIndex;
        const own = (OWN[p]?.includes(sign) ?? false) || SIGN_LORDS[sign] === p;
        const exalted = EXALT[p] === sign;
        const debil = DEBIL[p] === sign;
        const clause = `If the ${p} is in his own sign or exalted, the native prospers.`;
        if (own && !exalted) {
          expect(annotateClauses(clause, p, chart)[0].status, `${p} own-not-exalted`).toBe("applies");
        } else if (!own && !exalted && !debil) {
          expect(annotateClauses(clause, p, chart)[0].status, `${p} neither`).toBe("contradicts");
        }
      }
    }
  });
});

describe("clause-filter — the payoff", () => {
  it("removes a contradicting sign clause from the sentiment text", () => {
    // Reference chart: find a planet+house whose paragraph names a sign the
    // planet is NOT in, and confirm that clause is dropped from the sentiment
    // text but retained in the annotation.
    const chart = computeChart(REF);
    let sawDrop = false;
    for (const p of SEVEN) {
      const sign = chart.planets.find((x) => x.planet === p)!.signIndex;
      for (let h = 1; h <= 12; h++) {
        const text = BHRIGU[p]?.[h];
        if (!text) continue;
        const contradicting = annotateClauses(text, p, chart).filter((c) => c.status === "contradicts");
        const sentiment = textForSentiment(text, p, chart);
        for (const c of contradicting) {
          sawDrop = true;
          expect(sentiment.includes(c.text), "contradicting clause must be dropped from sentiment").toBe(false);
          // and it names a sign the planet is genuinely not in
          const s = signInSentence(c.text);
          if (s !== null) expect(s).not.toBe(sign);
        }
      }
    }
    expect(sawDrop, "reference chart should exercise at least one drop").toBe(true);
  });

  it("keeps the full text when nothing contradicts", () => {
    const chart = computeChart(REF);
    // A paragraph with no evaluable sign clause is unchanged for sentiment.
    const text = BHRIGU.Sun?.[8] ?? ""; // the 8th-house Sun note is commentary, no sign clause
    expect(textForSentiment(text, "Sun", chart).replace(/\s+/g, " ").trim())
      .toBe(text.replace(/\s+/g, " ").trim());
  });
});
