// "Check the reading" — ask the native a falsifiable question, reveal what the
// engine committed to only AFTER they answer, and keep an honest scorecard.
//
// The commit-first ordering is enforced here in the UI, not just in the data:
// `expected` is never rendered while a question is unanswered, and the running
// tally always shows what chance alone would have scored beside the hit rate.
// A scorecard that only celebrates hits would be worse than no scorecard.

"use client";
import { useMemo, useState } from "react";
import {
  buildVerificationQuestions, scoreAnswer, tally,
  type VerificationQuestion, type VerificationAnswer, type DashaLike, type PredictionLike,
} from "@/lib/astro/verify-question";



const STORE_KEY = "jyotish.verify";

function loadAnswers(chartKey: string): VerificationAnswer[] {
  if (typeof window === "undefined") return [];
  try {
    const all = JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}");
    return Array.isArray(all[chartKey]) ? all[chartKey] : [];
  } catch {
    return [];
  }
}

function saveAnswers(chartKey: string, answers: VerificationAnswer[]) {
  if (typeof window === "undefined") return;
  try {
    const all = JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}");
    all[chartKey] = answers;
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
  } catch {
    /* storage full or blocked — the feature degrades to this session only */
  }
}

export function VerifyPanel({
  predictions,
  dasha,
  chartKey,
}: {
  predictions: PredictionLike[];
  dasha: DashaLike[];
  chartKey: string;
}) {
  const questions = useMemo(
    () => buildVerificationQuestions(predictions, dasha),
    [predictions, dasha]
  );
  const [answers, setAnswers] = useState<VerificationAnswer[]>(() => loadAnswers(chartKey));

  const answeredIds = new Set(answers.map((a) => a.questionId));
  const score = tally(answers);

  const record = (q: VerificationQuestion, choice: string) => {
    const next = [...answers.filter((a) => a.questionId !== q.id), scoreAnswer(q, choice)];
    setAnswers(next);
    saveAnswers(chartKey, next);
  };

  const reset = () => {
    setAnswers([]);
    saveAnswers(chartKey, []);
  };

  if (!questions.length) {
    return (
      <p className="text-xs text-amber-100/50">
        Generate a reading first — the checks are built from it.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <h3 className="text-sm font-semibold text-amber-50">Check the reading against your life</h3>
        <p className="mt-1 text-xs leading-relaxed text-amber-100/60">
          Each question below has an answer this engine already committed to
          before you see it — nothing is revealed until you answer, and nothing
          in your reading changes based on what you say. Every question also
          carries the odds of being right by pure guesswork, so a hit only counts
          for as much as it should.
        </p>
      </div>

      {questions.map((q) => {
        const given = answers.find((a) => a.questionId === q.id);
        return (
          <div key={q.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-sm text-amber-50/90">{q.prompt}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-amber-100/35">
              Chance of a lucky guess: {(q.baseRate * 100).toFixed(0)}% · tests {q.tests}
            </p>

            {!given ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(q.options ?? []).map((o) => (
                  <button
                    key={o}
                    onClick={() => record(q, o)}
                    className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-amber-100/80 hover:border-amber-300/40 hover:bg-amber-400/10 hover:text-amber-100"
                  >
                    {o}
                  </button>
                ))}
              </div>
            ) : (
              <div
                className={`mt-2 rounded-lg border px-2.5 py-2 text-xs ${
                  given.correct
                    ? "border-emerald-300/25 bg-emerald-400/5 text-emerald-100/85"
                    : "border-rose-300/25 bg-rose-400/5 text-rose-100/85"
                }`}
              >
                <p className="font-semibold">
                  {given.correct ? "The reading matched." : "The reading was wrong here."}
                </p>
                <p className="mt-0.5 text-amber-100/70">
                  You said <span className="text-amber-50">{given.answer}</span>; the chart pointed to{" "}
                  <span className="text-amber-50">{q.expected}</span>.
                  {given.correct
                    ? ` A guess would have got this right about ${(q.baseRate * 100).toFixed(0)}% of the time.`
                    : " That is a real miss, and it is recorded as one."}
                </p>
              </div>
            )}
          </div>
        );
      })}

      <div className="rounded-xl border border-amber-300/20 bg-amber-400/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/70">Scorecard</p>
        <p className="mt-1 text-xs leading-relaxed text-amber-100/75">{score.summary}</p>
        {answers.length > 0 && (
          <button
            onClick={reset}
            className="mt-2 text-[11px] text-amber-100/45 underline hover:text-amber-100/80"
          >
            Clear these answers
          </button>
        )}
      </div>

      <p className="text-[10px] leading-relaxed text-amber-100/35">
        A note on what this can and cannot show: a handful of answers cannot
        distinguish a real effect from a lucky run, which is why the scorecard
        says so rather than quoting a percentage. And if these answers are ever
        used to adjust your birth time, the chart has been fitted toward them —
        the scorecard is then no longer independent evidence, and will say that
        too.
      </p>
    </div>
  );
}
