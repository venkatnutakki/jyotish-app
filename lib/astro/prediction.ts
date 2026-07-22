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
import type { Chart, BirthData } from "./types";
import { naturalBenefics, type BhavaResult } from "./bhava";
import type { ShadbalaResult } from "./shadbala";
import type { Yoga } from "./yogas";
import type { DashaPeriod } from "./dasha";
import { activation, concurrence } from "./dasha-depth";
import { areaEvidence, concordance, type ClassicalEvidence } from "./classical-evidence";
import { confirmInVarga, type VargaConfirmation } from "./varga-confirm";
import { computeGradedSignificators, classifyCusp, type CuspVerdict } from "./kp-prediction";
import { confirmInJaimini, type JaiminiConfirmation } from "./jaimini-confirm";
import { crossVargaVerify, type CrossVargaCheck } from "./varga-cross";
import { computePlanetStates, bhavaVitality } from "./avastha";
import { gradeYogas, computeYogaBhanga, yogaDelivery } from "./yoga-strength";

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

/**
 * Whether a matter is PROMISED at all — an axis the quality scale cannot express.
 *
 * The classical texts do not judge every topic on one good-to-bad continuum.
 * They ask first whether the matter is promised, and only then how well it goes.
 * KP puts this most sharply: the cusp's sub-lord decides promise or denial, and
 * timing is never attempted against a denying sub-lord. Being able to say "this
 * is not promised" — as distinct from "this goes badly" — is repeatedly
 * described as the clearest difference between a novice and an experienced
 * reader.
 *
 *   promised   — the matter is available; the quality scale then applies
 *   delayed    — promised, but obstructed; it arrives late or after effort
 *   spoiled    — it arrives but is damaged in the having
 *   notPromised— the chart does not support it; quality is beside the point
 *
 * This engine only ever returns `notPromised` on a genuine denial signal, never
 * as a synonym for a low score. A weak area is weak; it is not denied.
 */
export type PromiseStatus = "promised" | "delayed" | "spoiled" | "notPromised";

export interface LifePrediction {
  key: string;
  title: string;
  icon: string;
  verdict: AreaVerdict;
  /**
   * Whether the matter is promised, independent of how well it goes. Read this
   * BEFORE the verdict — a `notPromised` area's verdict describes the strength
   * of a matter the chart does not clearly grant.
   */
  promise: PromiseStatus;
  /** Why the promise was judged that way, in plain language. */
  promiseNote: string;
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
  /**
   * KP cuspal sub-lord confirmation — the topic's house cusp's sub-lord is
   * KP's decisive factor for whether the matter is promised or denied,
   * independent of the D1 house/lord/varga reading above.
   */
  kpConfirmation: CuspVerdict | null;
  /**
   * Jaimini confirmation — the Chara Kāraka (intrinsic karmic quality) and
   * Arudha Pada (worldly manifestation / how the matter is perceived) frames,
   * which reason quite differently from Parashari house-lords.
   */
  jaiminiConfirmation: JaiminiConfirmation | null;
  /**
   * Cross-varga verification — whether the native's OWN divisional charts (the
   * Ṣaḍvarga) confirm the D1 reading, with the Vaiśeṣikāṃśa dignity count and
   * vargottama. Answers "do the person's other charts agree", not "what is the
   * verdict"; it verifies, it never generates.
   */
  crossVarga: CrossVargaCheck | null;
}

/**
 * Thresholds calibrated against the engine's own score distribution.
 *
 * The area score sums many largely-positive contributions — house verdicts,
 * yogas, daśā activation, varga/KP/Jaimini confirmations, classical
 * concordance — so it does not sit on a zero-centred scale. Measured across a
 * 200-chart grid spanning both hemispheres, polar to equatorial latitudes, all
 * months and all hours (2,400 area scores):
 *
 *     min -3.2   p10 0.4   p25 1.5   p50 2.8   p75 4.1   p90 5.3   max 10.2
 *
 * The previous thresholds (3 / 1.8 / 0.7 / -0.4) were set for a scale centred
 * near zero, so "Excellent" began essentially AT THE MEDIAN chart: 47% of all
 * areas came back Excellent and 72% were positive, while only 3.5% were ever
 * Challenging. A reading that calls almost everything excellent has the
 * structure of a Barnum statement — agreeable, and therefore uninformative,
 * because it fails to distinguish this chart from any other.
 *
 * These thresholds change only WHERE THE LABELS FALL, never the ordering of
 * charts by score — the ordering is the astrological content and is untouched.
 * Target spread is roughly 13 / 24 / 30 / 22 / 11 percent.
 *
 * Caveat worth keeping in mind: the calibration grid is synthetic and uniform
 * over time-of-day and date, whereas real births are not. Recalibrate against
 * real birth data if a representative corpus ever becomes available.
 */
function verdictFromScore(s: number): AreaVerdict {
  if (s >= 5.0) return "Excellent";
  if (s >= 3.5) return "Strong";
  if (s >= 2.0) return "Favourable";
  if (s >= 0.5) return "Mixed";
  return "Challenging";
}

export function computeLifePredictions(
  chart: Chart,
  bhavas: BhavaResult[],
  shadbala: ShadbalaResult,
  yogas: Yoga[],
  dasha: DashaPeriod[],
  birth: BirthData
): LifePrediction[] {
  // KP graded significators, computed once and reused for every area's cuspal
  // sub-lord check. Defensive: an edge-case Placidus computation (e.g. extreme
  // latitude) should degrade this ONE signal, not break the whole report.
  let graded: ReturnType<typeof computeGradedSignificators> | null = null;
  try {
    graded = computeGradedSignificators(chart, birth);
  } catch {
    graded = null;
  }

  const now = Date.now();
  // The active daśā chain, read only as deep as the birth-time accuracy honestly
  // allows. With accuracy unstated (the common case) this reads to antardaśā —
  // exactly the mahā+antar set used before — so the default reading is
  // unchanged; a birth time known to the minute unlocks pratyantar/sūkṣma.
  const act = activation(dasha, birth.timeAccuracyMinutes, new Date(now));
  const activeLords = act.lords;

  // Yoga DELIVERY, computed once for the chart. BPHS 39:3–5 grades a yoga's
  // results "full, half or a quarter according to their strengths", and
  // Sāravalī cancels a yoga outright when its planets are combust or lose a
  // planetary war. Previously yogas were scored by raw COUNT, so a technically
  // present yoga formed by a combust planet weighed the same as a strong one.
  const planetStates = computePlanetStates(chart);
  const benefics = naturalBenefics(chart);
  const gradedYogas = gradeYogas(yogas, shadbala);
  const bhanga = computeYogaBhanga(chart, planetStates);
  const deliveryOf = new Map(
    gradedYogas.map((y) => [y.name, yogaDelivery(y, bhanga, planetStates)])
  );

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
      // Each yoga contributes 0.5 × the share of its promise that actually
      // delivers, rather than a flat 0.5 per yoga. The 1.5 cap is unchanged, so
      // no area can gain MORE yoga credit than before — only lose it, and only
      // where the classics say it should be lost.
      const delivered = relevant.map((y) => ({
        y,
        d: deliveryOf.get(y.name) ?? { multiplier: 1, note: null },
      }));
      score += Math.min(
        delivered.reduce((s, x) => s + 0.5 * x.d.multiplier, 0),
        1.5
      );
      const live = delivered.filter((x) => x.d.multiplier > 0);
      const dead = delivered.filter((x) => x.d.multiplier === 0);
      if (live.length) {
        factors.push(
          `Supporting yoga${live.length > 1 ? "s" : ""}: ${live.map((x) => x.y.name).join(", ")}.`
        );
      }
      if (dead.length) {
        // Naming a cancelled yoga is more informative than silently dropping it —
        // the reader may know they "have" it from elsewhere.
        factors.push(
          `${dead.map((x) => x.y.name).join(", ")} ${dead.length > 1 ? "are" : "is"} technically present but classically cancelled here — ${dead[0].d.note ?? "its planets lack the strength to deliver"}`
        );
      }
    }

    // 4. Daśā activation — is the current period run by this area's lord/kāraka?
    //    Daśā is the classical TIMING gate: a promise matures when a period
    //    ruled by its significators runs. Crucially it INTENSIFIES whatever the
    //    chart already promises rather than creating a promise — so its
    //    direction must follow the FINAL polarity of the reading, not the
    //    partial score at this point in the loop. The numeric nudge is therefore
    //    deferred to after every other factor is summed (see below); only the
    //    plain-language note is recorded here.
    const lordOfPrimary = bhavas[area.houses[0] - 1].lord;
    const activators = [lordOfPrimary, ...area.karakas].filter((p) => activeLords.has(p));
    const activated = activators.length > 0;

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

    // 7. KP cuspal sub-lord — a second, independent confirmation lens. KP holds
    //    the sub-lord as the decisive factor for whether a matter is promised
    //    or denied, reasoned entirely differently from the D1/varga approach
    //    above, so agreement between the two is a genuinely stronger signal
    //    than either alone.
    const kpConfirmation = graded ? classifyCusp(graded, area.key) : null;
    if (kpConfirmation) {
      // KP treats the sub-lord as DECIDING promise, not as one vote among many —
      // in that system timing is never even attempted against a denying
      // sub-lord. Averaging it into a score, as this previously did, discards
      // the only denial signal the engine has. It is therefore applied as a
      // gate below (see `promise`), and its score contribution reduced to a
      // nudge so the same evidence is not counted twice.
      score += kpConfirmation.signal * 0.2;
      factors.push(kpConfirmation.note);
    }

    // 8. Jaimini (kāraka + ārūḍha) — a fourth lens, reasoning from the soul's
    //    karmic burden and from worldly manifestation rather than house-lords.
    //    Weighted lowest of the confirmation layers: general practice treats
    //    Jaimini as corroboration for a Parashari judgement, never an override.
    const jaiminiConfirmation = confirmInJaimini(chart, area.key);
    // A single Jaimini component only NUDGES the score; general practice asks
    // for two independent Jaimini signals (kāraka + ārūḍha) before it carries
    // full weight, and below it never counts as a confirmation layer at all.
    const jaiminiCorroborates = (jaiminiConfirmation?.components ?? 0) >= 2;
    if (jaiminiConfirmation && jaiminiConfirmation.signal !== 0) {
      score += jaiminiConfirmation.signal * (jaiminiCorroborates ? 0.4 : 0.2);
      factors.push(jaiminiConfirmation.note);
    }

    // 9. Cross-varga verification — do the native's OWN divisional charts back
    //    the D1 reading? Reads the primary significator across the Ṣaḍvarga and
    //    reports confirmed / partly / contested / weak. It VERIFIES the reading
    //    rather than generating one, so its score effect is modest — a bounded
    //    ±0.3 that can shade a borderline verdict but never override the chart.
    const primaryBhava = bhavas[area.houses[0] - 1];
    const d1Positive = primaryBhava.verdict === "Strong" || primaryBhava.verdict === "Favourable";
    const crossVarga = crossVargaVerify(chart, area.key, lordOfPrimary as PlanetName, d1Positive);
    // BPHS 11:14–16 vitality of the primary house, for the promise gate below.
    const vitality = bhavaVitality(chart, planetStates, area.houses[0], benefics);
    if (crossVarga.verification === "confirmed") score += 0.3;
    else if (crossVarga.verification === "contested") score -= 0.3;
    else if (crossVarga.verification === "weak") score -= 0.15;
    factors.push(crossVarga.note);

    // 4 (deferred). Apply the daśā timing nudge now that every other factor is
    // in, so it follows the reading's FINAL polarity rather than a mid-loop
    // partial. An active period amplifies whatever the chart promises; it never
    // turns a poor area good or a good area poor.
    if (activated) {
      const positive = score >= 0;
      // Concurrence: how many levels of the trusted chain (mahā/antar/…) this
      // area's significators run. The classical rule is that a matter fires at
      // the INTERSECTION of the levels, not at any one — so a significator
      // recurring across levels is a markedly stronger timing signal than the
      // same lord at a single level. This only strengthens beyond the old
      // behaviour when the birth time is accurate enough to read past antardaśā;
      // otherwise the chain is just {mahā, antar} and this matches before.
      const areaSignificators = new Set<string>([lordOfPrimary, ...area.karakas]);
      const conc = concurrence(act.chain, areaSignificators);
      const base = Math.min(activators.length * 0.4, 0.8);
      const concBonus = conc >= 2 ? Math.min((conc - 1) * 0.3, 0.6) : 0;
      score += (positive ? 1 : -1) * (base + concBonus);
      factors.push(
        `The current ${act.chain.map((c) => c.lord).join("→")} daśā chain activates this area now` +
          (conc >= 2
            ? ` — its significator recurs across ${conc} levels, a strong ${positive ? "supportive" : "difficult"} timing convergence.`
            : positive
              ? " — the supporting factors are live rather than dormant."
              : " — the difficulties here are active rather than latent.")
      );
    } else {
      factors.push(
        "No current daśā period is run by this area's lord or kāraka, so it is comparatively dormant now."
      );
    }

    // --- Promise gate -----------------------------------------------------
    // Judged BEFORE and separately from quality. The classical sequence asks
    // whether a matter is promised at all, and only then how well it goes; a
    // weighted score cannot express "not promised" no matter how low it runs.
    //
    // Denial is deliberately hard to trigger. It requires KP's cuspal sub-lord
    // — the tradition's own decisive test — to deny, AND at least one other
    // independent lens to agree. One lens alone downgrades to "delayed" or
    // "spoiled" instead, because a single contested signal is not grounds for
    // telling somebody a matter is closed to them.
    let promise: PromiseStatus = "promised";
    let promiseNote = "";

    const kpDenies = kpConfirmation?.signal === -1;
    const vargaDenies = vargaConfirmation?.signal === -1;
    const jaiminiDenies = jaiminiConfirmation?.signal === -1 && jaiminiCorroborates;
    const corroboratingDenials = [vargaDenies, jaiminiDenies].filter(Boolean).length;

    if (kpDenies && corroboratingDenials >= 1) {
      promise = "notPromised";
      promiseNote =
        `The ${ordinal(kpConfirmation!.cuspHouse)} cusp's sub-lord ${kpConfirmation!.subLord} denies this in KP, ` +
        `and ${vargaDenies ? "the topic's divisional chart" : "the Jaimini reading"} independently agrees. ` +
        `Read this as a matter the chart does not clearly grant, rather than one that merely goes badly — ` +
        `the two are different, and effort spent here is better redirected.`;
    } else if (kpDenies) {
      promise = "delayed";
      promiseNote =
        `The ${ordinal(kpConfirmation!.cuspHouse)} cusp's sub-lord ${kpConfirmation!.subLord} withholds this in KP, ` +
        `but no other method agrees, so read it as obstructed rather than closed — ` +
        `it tends to arrive late, or only after real effort.`;
    } else if (vitality.annihilated) {
      // BPHS 11:14–16 — two or more annihilating conditions on the bhāva lord
      // with nothing relieving them. Capped at "spoiled", never "notPromised":
      // the verse's list includes commonplace situations, and outright denial
      // is reserved for the KP sub-lord test corroborated by a second lens.
      promise = "spoiled";
      promiseNote =
        `The ${ordinal(area.houses[0])} house is classically weakened — ${vitality.annihilators.slice(0, 2).join(", and ")}. ` +
        `BPHS treats a bhāva under two such conditions, with nothing relieving them, as unable to give its full fruit.`;
    } else if (corroboratingDenials >= 1 && score < 2.0) {
      promise = "spoiled";
      promiseNote =
        `${vargaDenies ? "The topic's divisional chart" : "The Jaimini reading"} undercuts this while the ` +
        `main chart supports it — the classical picture of a matter that arrives but is damaged in the having, ` +
        `rather than one that never comes.`;
    } else {
      promiseNote =
        "Nothing in the chart denies this matter; the reading below describes how well it goes, not whether it is available.";
    }

    // The promise gate CONSTRAINS the quality verdict — that is what makes it a
    // gate rather than a second opinion sitting beside it. Without this, a chart
    // with strong Parashari house/lord/yoga support but a KP-plus-varga denial
    // would read "Excellent / not promised", which is self-contradictory to
    // anyone reading it. A denied matter cannot be rated a strong outcome; its
    // Parashari strength is real but moot once the decisive test denies it, so
    // the score is pulled below the favourable line and the verdict follows.
    // `delayed` is deliberately NOT capped — it concerns timing, not quality, so
    // "Excellent but late" is a coherent and useful thing to say.
    if (promise === "notPromised") {
      score = Math.min(score, 0.4); // → Challenging: not granted, whatever its natal strength
    } else if (promise === "spoiled") {
      score = Math.min(score, 1.4); // → at most Mixed: it comes, but damaged
    }

    const verdict = verdictFromScore(score);

    // Confidence reflects how many INDEPENDENT layers agree — house/lord,
    // kāraka strength, yoga support, varga confirmation, KP cuspal sub-lord,
    // classical concordance — rather than any single strong signal. This
    // mirrors how a careful reading only commits fully once multiple layers
    // converge, and says so honestly when they don't (calibrated confidence
    // over a forced flat verdict).
    const confirmingLayers = [
      strongKarakas.length > 0,
      relevant.length > 0,
      vargaConfirmation?.signal === 1,
      kpConfirmation?.signal === 1,
      jaiminiCorroborates && jaiminiConfirmation?.signal === 1,
      conc.agreement === "strong",
      crossVarga.verification === "confirmed",
    ].filter(Boolean).length;
    const contradictingLayers = [
      vargaConfirmation?.signal === -1,
      kpConfirmation?.signal === -1,
      jaiminiCorroborates && jaiminiConfirmation?.signal === -1,
      conc.agreement === "mixed",
      crossVarga.verification === "contested",
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
    const kpNote = kpConfirmation?.signal === -1
      ? `In KP, the ${ordinal(kpConfirmation.cuspHouse)} cusp's sub-lord ${kpConfirmation.subLord} leans toward denying this, a genuine caveat worth naming rather than smoothing over. `
      : kpConfirmation?.signal === 1 && vargaConfirmation?.signal === 1
        ? `Both the divisional chart and the KP cuspal sub-lord independently confirm this. `
        : "";
    // A Jaimini/Parashari divergence is itself a classical reading — the Lagna
    // frame shows what IS, the Ārūḍha frame shows what APPEARS — so surface it
    // as that nuance rather than as a contradiction to be smoothed away.
    const jaiminiNote =
      jaiminiConfirmation?.signal === -1 && score >= 0.7
        ? `In the Jaimini frame this is weaker than it looks from the houses alone — substance here outruns recognition, so the outcome may be real but under-acknowledged. `
        : jaiminiConfirmation?.signal === 1 && score < 0.7
          ? `The Jaimini frame is kinder here than the houses alone — the ārūḍha suggests this manifests and is seen more favourably than the bare house verdict implies. `
          : "";
    const reading =
      `${basis}this chart shows ${tone}. ` +
      agree +
      vargaNote +
      kpNote +
      jaiminiNote +
      (activated
        ? `The current planetary period brings this area into focus. `
        : "") +
      `${verdict === "Excellent" || verdict === "Strong" ? "The supporting factors are well aligned." : verdict === "Challenging" ? "Conscious effort and remedial care are advised here." : "Outcomes depend on effort and timing."}`;

    return {
      key: area.key,
      title: area.title,
      icon: area.icon,
      verdict,
      promise,
      promiseNote,
      confidence,
      score: Math.round(score * 10) / 10,
      factors,
      reading,
      houses: area.houses,
      evidence,
      vargaConfirmation,
      kpConfirmation,
      jaiminiConfirmation,
      crossVarga,
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
