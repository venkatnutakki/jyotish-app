// Self-verification — ask the native a falsifiable question, then score the
// engine against the answer.
//
// WHY THIS IS BUILT THE WAY IT IS. Asking a user to confirm a prediction is the
// exact mechanism that manufactures false accuracy: the classic cold-reading
// result is that the client supplies the content and then credits the reader
// with it. Three rules keep this honest, and the whole module is shaped by them:
//
//   1. COMMIT FIRST. The engine's answer is computed and sealed BEFORE the
//      question is shown. `expected` is never revealed until the user has
//      answered. Nothing about the reading changes in response to the answer.
//   2. FALSIFIABLE, WITH A KNOWN BASE RATE. Every question carries the chance
//      of being right by luck. A question a random guess would pass is not
//      evidence, so anything above `MAX_BASE_RATE` is refused outright — this
//      is what stops "have you ever felt uncertain?" from counting.
//   3. SCORE THE MISSES. The tally records wrong answers as prominently as
//      right ones and always shows the expected-by-chance figure beside the
//      observed one. A hit rate is meaningless without it.
//
// A verified answer may be used to help RECTIFY a birth time. It must never be
// fed back into the accuracy tally afterwards — a chart fitted to the answers
// will "confirm" them by construction. That is why `provenance` exists below.

/**
 * Minimal prediction shape this needs — title, the engine's score (to find its
 * own extremes) and the factor list. Declared structurally so the panel can pass
 * its view model without a conversion.
 */
export interface PredictionLike { title: string; score: number; factors: string[] }
/**
 * Minimal daśā shape — accepts both the in-memory tree (Date) and the
 * serialized form the UI holds (ISO strings), so no conversion is needed at the
 * call site.
 */
export interface DashaLike { lord: string; start: string | Date; end: string | Date }

/** Questions whose chance-of-being-right exceeds this are not worth asking. */
export const MAX_BASE_RATE = 0.5;

export type QuestionKind = "forcedChoice" | "datedWindow";

export interface VerificationQuestion {
  id: string;
  kind: QuestionKind;
  /** Shown to the user. Must be answerable from their own life, about the PAST. */
  prompt: string;
  /** For a forced choice — the options, one of which the engine has picked. */
  options?: string[];
  /**
   * What the engine committed to before asking. The UI must not reveal this
   * until an answer is recorded.
   */
  expected: string;
  /**
   * Probability of being right by chance alone (1/N for a forced choice among
   * N, or the honest prior for a yes/no). Reported next to every result.
   */
  baseRate: number;
  /** Which part of the engine this tests — so a miss points somewhere. */
  tests: string;
}

export interface VerificationAnswer {
  questionId: string;
  answer: string;
  correct: boolean;
  baseRate: number;
  answeredAtISO: string;
}

export interface VerificationScore {
  asked: number;
  correct: number;
  /** Observed hit rate. */
  hitRate: number;
  /** Sum of base rates ÷ asked — what a coin-flip/random guess would score. */
  expectedByChance: number;
  /**
   * Plain-language verdict that does NOT overclaim. With small samples this
   * says so rather than reporting a percentage as if it meant something.
   */
  summary: string;
  /**
   * Whether these answers have been used to rectify the birth time. Once true,
   * the tally is no longer independent evidence and says so.
   */
  usedForRectification: boolean;
}

/**
 * Build falsifiable questions from a finished reading.
 *
 * Forced choices are preferred because their base rate is exactly 1/N and needs
 * no assumption. The engine's pick is derived from the scores it already
 * produced — this asks whether the reading is right, not whether the user likes
 * it.
 */
export function buildVerificationQuestions(
  predictions: PredictionLike[],
  dasha: DashaLike[],
  now: Date = new Date()
): VerificationQuestion[] {
  const out: VerificationQuestion[] = [];
  if (predictions.length < 4) return out;

  const byScore = [...predictions].sort((a, b) => b.score - a.score);
  const titles = predictions.map((p) => p.title);

  // --- 1. Which area is strongest? Forced choice, base rate 1/N. -----------
  out.push({
    id: "strongest-area",
    kind: "forcedChoice",
    prompt:
      "Looking back over your life so far, which of these has genuinely been the STRONGEST area — where things have come most easily or turned out best?",
    options: titles,
    expected: byScore[0].title,
    baseRate: 1 / titles.length,
    tests: "the overall life-area scoring (house strength, lords, yogas, cross-checks)",
  });

  // --- 2. Which area has been hardest? -------------------------------------
  out.push({
    id: "weakest-area",
    kind: "forcedChoice",
    prompt:
      "And which has been the most DIFFICULT — where you have met the most resistance or disappointment?",
    options: titles,
    expected: byScore[byScore.length - 1].title,
    baseRate: 1 / titles.length,
    tests: "the same scoring, at the opposite end — a different failure mode from the strongest question",
  });

  // --- 3. A dated daśā window, if one has already passed -------------------
  // Only PAST periods are asked about: a future claim cannot be checked now, and
  // asking about the present invites the user to reinterpret today's mood.
  const past = dasha.filter((d) => new Date(d.end).getTime() < now.getTime());
  if (past.length >= 2) {
    const target = past[past.length - 1]; // the most recently completed mahādaśā
    const startY = new Date(target.start).getFullYear();
    const endY = new Date(target.end).getFullYear();
    // Which area does this lord most strongly signify, per the engine?
    const lordArea = predictions.find((p) =>
      p.factors.some((f) => f.includes(target.lord))
    );
    if (lordArea && endY > startY) {
      out.push({
        id: `dasha-${target.lord}-${startY}`,
        kind: "datedWindow",
        prompt:
          `Between ${startY} and ${endY} you were running the ${target.lord} major period. ` +
          `Was that stretch notably eventful for ${lordArea.title.toLowerCase()} — more so than the years either side?`,
        options: ["Yes", "No"],
        expected: "Yes",
        // A yes/no with a genuinely uncertain prior. Stated at 0.5 rather than
        // flattered downward; if that makes the question weak evidence, so be it.
        baseRate: 0.5,
        tests: "whether the daśā lord's significations match what actually happened",
      });
    }
  }

  // Refuse anything a guess would pass. Better to ask three sharp questions
  // than ten agreeable ones.
  return out.filter((q) => q.baseRate <= MAX_BASE_RATE);
}

/** Record an answer against a question the engine already committed to. */
export function scoreAnswer(
  question: VerificationQuestion,
  answer: string,
  at: Date = new Date()
): VerificationAnswer {
  return {
    questionId: question.id,
    answer,
    correct: answer === question.expected,
    baseRate: question.baseRate,
    answeredAtISO: at.toISOString(),
  };
}

/**
 * Tally the record so far — deliberately unflattering.
 *
 * Reports the observed hit rate beside what chance alone would have produced,
 * and refuses to characterise a handful of answers as evidence of anything.
 */
export function tally(
  answers: VerificationAnswer[],
  usedForRectification = false
): VerificationScore {
  const asked = answers.length;
  const correct = answers.filter((a) => a.correct).length;
  const hitRate = asked ? correct / asked : 0;
  const expectedByChance = asked
    ? answers.reduce((s, a) => s + a.baseRate, 0) / asked
    : 0;

  let summary: string;
  if (asked === 0) {
    summary = "No checks answered yet.";
  } else if (usedForRectification) {
    summary =
      `${correct} of ${asked} correct — but these answers were used to fit the birth time, ` +
      `so the chart has been adjusted toward them. This tally is no longer independent evidence of accuracy.`;
  } else if (asked < 5) {
    summary =
      `${correct} of ${asked} correct so far (chance alone would give about ${(expectedByChance * 100).toFixed(0)}%). ` +
      `That is too few answers to mean anything either way — a run of luck looks identical to skill at this size.`;
  } else {
    const delta = hitRate - expectedByChance;
    summary =
      `${correct} of ${asked} correct — ${(hitRate * 100).toFixed(0)}%, against ${(expectedByChance * 100).toFixed(0)}% expected by chance. ` +
      (delta > 0.2
        ? "Better than chance on this sample, though a sample this size still cannot separate a real effect from a lucky run."
        : delta < -0.1
          ? "Below what guessing would have achieved — on these questions the reading is not tracking your life."
          : "Close to what guessing would achieve, so these answers give no evidence the reading is tracking your life.");
  }

  return { asked, correct, hitRate, expectedByChance, summary, usedForRectification };
}
