// Life-area prediction synthesis. For each area of life this combines every
// computed factor — the relevant house(s) and their verdict, the house-lord's
// dignity and placement, the significator's (kāraka) Ṣaḍbala strength, the
// yogas that touch the area, and whether the current daśā activates it — into
// a single weighted verdict, a plain-language reading, and a confidence level.
//
// This is deliberately transparent: every conclusion lists the factors behind
// it. Astrology is interpretive, so this reads as well-grounded guidance, not
// a guarantee.

import { SIGNS, type PlanetName } from "./constants";
import type { Chart } from "./types";
import type { BhavaResult } from "./bhava";
import type { ShadbalaResult } from "./shadbala";
import type { Yoga } from "./yogas";
import type { DashaPeriod } from "./dasha";
import { areaEvidence, concordance, type ClassicalEvidence } from "./classical-evidence";
import { confirmInVarga, type VargaConfirmation } from "./varga-confirm";

interface AreaDef {
  key: string;
  title: string;
  icon: string;
  houses: number[]; // primary houses (first = most important)
  karakas: PlanetName[];
  yogaCategories: Yoga["category"][];
  strong: string; // template when the area is strong
  weak: string; // template when the area is challenged
}

const AREAS: AreaDef[] = [
  {
    key: "personality", title: "Personality & Character", icon: "🧭",
    houses: [1], karakas: ["Sun", "Moon"], yogaCategories: ["Mahapurusha", "Lunar", "Solar"],
    strong: "a strong sense of self, vitality and a well-defined character",
    weak: "a need to consciously build confidence and physical vitality",
  },
  {
    key: "mind", title: "Mind & Emotions", icon: "🌙",
    houses: [4], karakas: ["Moon"], yogaCategories: ["Lunar"],
    strong: "emotional steadiness, contentment and inner peace",
    weak: "attention to emotional balance, rest and peace of mind",
  },
  {
    key: "career", title: "Career & Profession", icon: "💼",
    houses: [10, 6], karakas: ["Sun", "Saturn", "Mercury", "Jupiter"], yogaCategories: ["Raja", "Mahapurusha"],
    strong: "professional rise, recognition and capacity for leadership",
    weak: "steady effort to establish status; success comes through persistence",
  },
  {
    key: "wealth", title: "Wealth & Finances", icon: "💰",
    houses: [2, 11], karakas: ["Jupiter", "Venus"], yogaCategories: ["Dhana"],
    strong: "good earning capacity, savings and financial growth",
    weak: "careful money management; wealth builds gradually",
  },
  {
    key: "marriage", title: "Marriage & Relationships", icon: "❤️",
    houses: [7], karakas: ["Venus"], yogaCategories: [],
    strong: "a supportive partnership and harmony in relationships",
    weak: "patience and understanding in partnerships; choose carefully",
  },
  {
    key: "education", title: "Education & Knowledge", icon: "📚",
    houses: [5, 4], karakas: ["Mercury", "Jupiter"], yogaCategories: [],
    strong: "sharp intelligence and success in learning",
    weak: "focused study habits; learning rewards steady effort",
  },
  {
    key: "children", title: "Children & Creativity", icon: "🧒",
    houses: [5], karakas: ["Jupiter"], yogaCategories: [],
    strong: "happiness through children and creative expression",
    weak: "matters of progeny may need care; creativity still flows",
  },
  {
    key: "health", title: "Health & Vitality", icon: "🩺",
    houses: [1, 6], karakas: ["Sun", "Moon"], yogaCategories: [],
    strong: "robust health and good recuperative power",
    weak: "attention to lifestyle, diet and preventive care",
  },
  {
    key: "fortune", title: "Fortune & Dharma", icon: "🍀",
    houses: [9], karakas: ["Jupiter", "Sun"], yogaCategories: ["Raja"],
    strong: "good luck, higher wisdom and support from mentors/father",
    weak: "fortune grows through righteous effort and guidance",
  },
  {
    key: "gains", title: "Gains & Aspirations", icon: "🎯",
    houses: [11], karakas: ["Jupiter"], yogaCategories: ["Dhana"],
    strong: "fulfilment of desires and gains through networks",
    weak: "aspirations are met with sustained networking and effort",
  },
  {
    key: "spirituality", title: "Spirituality & Liberation", icon: "🕉️",
    houses: [12, 9], karakas: ["Jupiter", "Ketu"], yogaCategories: [],
    strong: "a natural inclination toward spirituality and inner growth",
    weak: "spiritual depth develops through practice and letting go",
  },
  {
    key: "siblings", title: "Siblings & Courage", icon: "🤝",
    houses: [3], karakas: ["Mars"], yogaCategories: [],
    strong: "courage, initiative and supportive siblings",
    weak: "courage is cultivated; sibling ties need nurturing",
  },
];

const VERDICT_SCORE: Record<BhavaResult["verdict"], number> = {
  Strong: 2, Favourable: 1, Mixed: 0, Weak: -1,
};

export type AreaVerdict = "Excellent" | "Strong" | "Favourable" | "Mixed" | "Challenging";

export interface LifePrediction {
  key: string;
  title: string;
  icon: string;
  verdict: AreaVerdict;
  confidence: "Very High" | "High" | "Moderate" | "Low";
  score: number;
  factors: string[]; // plain-language supporting points
  reading: string; // 2-3 sentence plain-English synthesis
  houses: number[];
  /** Verbatim classical statements this prediction is grounded in. */
  evidence: ClassicalEvidence[];
  /** Distinct classical sources cited, e.g. ["Bhṛgu Sūtras", "Sārāvalī"]. */
  sources: string[];
  /** How much the cited classics agree. */
  agreement: "strong" | "mixed" | "sparse";
  /**
   * Multi-factor confirmation check — the house lord's placement in this
   * topic's classical divisional chart (D9 for marriage, D10 for career, …).
   * Standard astrological practice: a D1 verdict should be cross-checked
   * against the topic's varga before it's treated as confirmed, not read alone.
   */
  vargaConfirmation: VargaConfirmation | null;
}

function verdictFromScore(s: number): AreaVerdict {
  if (s >= 3) return "Excellent";
  if (s >= 1.8) return "Strong";
  if (s >= 0.7) return "Favourable";
  if (s >= -0.4) return "Mixed";
  return "Challenging";
}

export function computeLifePredictions(
  chart: Chart,
  bhavas: BhavaResult[],
  shadbala: ShadbalaResult,
  yogas: Yoga[],
  dasha: DashaPeriod[]
): LifePrediction[] {
  const now = Date.now();
  const maha = dasha.find(
    (d) => new Date(d.start).getTime() <= now && now < new Date(d.end).getTime()
  );
  const antar = maha?.sub?.find(
    (s) => new Date(s.start).getTime() <= now && now < new Date(s.end).getTime()
  );
  const activeLords = new Set([maha?.lord, antar?.lord].filter(Boolean) as string[]);

  return AREAS.map((area) => {
    const factors: string[] = [];
    let score = 0;

    // 1. House verdict(s) + lord placement.
    area.houses.forEach((h, idx) => {
      const b = bhavas[h - 1];
      const weight = idx === 0 ? 1 : 0.5;
      score += VERDICT_SCORE[b.verdict] * weight;
      if (idx === 0) {
        factors.push(
          `The ${ordinal(h)} house (${b.significations.split(",")[0]}) is ${b.verdict.toLowerCase()}; its lord ${b.lord} is ${b.lordDignity} in ${SIGNS[b.lordSign]}.`
        );
      }
    });

    // 2. Kāraka (significator) strength via Ṣaḍbala.
    const karakaStrengths = area.karakas
      .map((k) => ({ k, s: shadbala.planets[k as keyof ShadbalaResult["planets"]] }))
      .filter((x) => x.s);
    const strongKarakas = karakaStrengths.filter((x) => x.s!.rupas >= x.s!.required);
    if (karakaStrengths.length) {
      if (strongKarakas.length) {
        score += 0.8;
        factors.push(
          `Significator${strongKarakas.length > 1 ? "s" : ""} ${strongKarakas.map((x) => x.k).join(", ")} ${strongKarakas.length > 1 ? "are" : "is"} strong (${strongKarakas.map((x) => x.s!.rupas.toFixed(1)).join(", ")} rūpas).`
        );
      } else {
        score -= 0.5;
        factors.push(
          `Significator ${karakaStrengths[0].k} is not strong (${karakaStrengths[0].s!.rupas.toFixed(1)} rūpas), so results need effort.`
        );
      }
    }

    // 3. Yogas that touch this area.
    const relevant = yogas.filter((y) => area.yogaCategories.includes(y.category));
    if (relevant.length) {
      score += Math.min(relevant.length * 0.5, 1.5);
      factors.push(
        `Supporting yoga${relevant.length > 1 ? "s" : ""}: ${relevant.map((y) => y.name).join(", ")}.`
      );
    }

    // 4. Daśā activation — is the current period run by this area's lord/kāraka?
    const lordOfPrimary = bhavas[area.houses[0] - 1].lord;
    const activators = [lordOfPrimary, ...area.karakas].filter((p) => activeLords.has(p));
    const activated = activators.length > 0;
    if (activated) {
      factors.push(
        `The current ${[...activeLords].join("/")} daśā period activates this area now.`
      );
    }

    // 5. Classical evidence — the verbatim rules this area rests on. The verdict
    //    is nudged by how much the cited classics agree, so the conclusion tracks
    //    the sources rather than the templates alone.
    const evidence = areaEvidence(chart, area.houses, area.karakas);
    const conc = concordance(evidence);
    score += conc.net * 0.4; // each net agreeing/disagreeing classic shifts the verdict
    const sources = [...new Set(evidence.map((e) => e.source))];

    // 6. Divisional-chart (varga) cross-check — standard multi-factor-confirmation
    //    practice: don't call this from D1 alone, verify the topic's dedicated
    //    varga agrees (or note honestly when it doesn't).
    const vargaConfirmation = confirmInVarga(chart, area.key, lordOfPrimary);
    if (vargaConfirmation) {
      score += vargaConfirmation.signal * 0.6;
      factors.push(vargaConfirmation.note);
    }

    const verdict = verdictFromScore(score);
    // Confidence reflects how many INDEPENDENT layers agree — house/lord,
    // kāraka strength, yoga support, varga confirmation, classical concordance —
    // rather than any single strong signal. This mirrors how a careful reading
    // only commits fully once multiple layers converge, and says so honestly
    // when they don't (calibrated confidence over a forced flat verdict).
    const confirmingLayers = [
      strongKarakas.length > 0,
      relevant.length > 0,
      vargaConfirmation?.signal === 1,
      conc.agreement === "strong",
    ].filter(Boolean).length;
    const contradictingLayers = [
      vargaConfirmation?.signal === -1,
      conc.agreement === "mixed",
    ].filter(Boolean).length;
    const confidence: LifePrediction["confidence"] =
      contradictingLayers >= 2
        ? "Low"
        : confirmingLayers >= 3
          ? "Very High"
          : confirmingLayers >= 2
            ? "High"
            : confirmingLayers >= 1
              ? "Moderate"
              : "Low";

    // Plain-language reading, explicitly anchored to the classical sources.
    const tone =
      score >= 1.8
        ? area.strong
        : score >= 0.7
          ? `generally favourable prospects for ${area.title.toLowerCase()}`
          : score >= -0.4
            ? `a mixed picture — some support and some ${area.weak}`
            : area.weak;
    const basis = sources.length
      ? `Read strictly from ${joinList(sources)}: `
      : "";
    const agree =
      evidence.length >= 2
        ? conc.agreement === "strong"
          ? `The classical sources here ${conc.net >= 0 ? "consistently affirm" : "consistently caution on"} this area. `
          : conc.agreement === "mixed"
            ? `The classical sources are mixed on this area, so the outcome is conditional. `
            : ""
        : "";
    const vargaNote = vargaConfirmation?.signal === -1
      ? `${vargaConfirmation.varga.code} tempers this promise, so treat it as conditional rather than assured. `
      : "";
    const reading =
      `${basis}this chart shows ${tone}. ` +
      agree +
      vargaNote +
      (activated
        ? `The current planetary period brings this area into focus. `
        : "") +
      `${verdict === "Excellent" || verdict === "Strong" ? "The supporting factors are well aligned." : verdict === "Challenging" ? "Conscious effort and remedial care are advised here." : "Outcomes depend on effort and timing."}`;

    return {
      key: area.key,
      title: area.title,
      icon: area.icon,
      verdict,
      confidence,
      score: Math.round(score * 10) / 10,
      factors,
      reading,
      houses: area.houses,
      evidence,
      vargaConfirmation,
      sources,
      agreement: conc.agreement,
    };
  });
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
