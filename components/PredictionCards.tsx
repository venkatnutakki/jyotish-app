// Plain-language life-area prediction cards, shared by the Reading tab and the
// Full Report. Each card can reveal the verbatim classical statements the
// prediction is drawn from, with citations.

"use client";
import { useState } from "react";

export interface EvidenceView {
  source: string;
  subject: string;
  role: string;
  text: string;
  /** Per-clause applicability for this chart, when the source resolves it. */
  clauses?: { text: string; status: "applies" | "contradicts" | "neutral" }[];
}

export interface LifePredictionView {
  key: string;
  title: string;
  icon: string;
  verdict: string;
  confidence: string;
  reading: string;
  factors: string[];
  /** The engine's numeric score — present at runtime; used by the Check tab. */
  score: number;
  houses?: number[];
  evidence?: EvidenceView[];
  sources?: string[];
  agreement?: string;
  /** Independent cross-checks — shown so the reader can see HOW settled a call is. */
  vargaConfirmation?: { note?: string; signal?: number } | null;
  kpConfirmation?: { note?: string } | null;
  jaiminiConfirmation?: { note?: string; components?: number } | null;
  sudarshana?: { note?: string; applicable?: boolean; agreement?: string } | null;
  crossVarga?: {
    note?: string;
    verification?: "confirmed" | "partly confirmed" | "contested" | "weak";
    dignifiedCount?: number;
    vargottama?: boolean;
  } | null;
  /**
   * Smallest birth-time error, in minutes, that would change this verdict.
   * null when the verdict holds across the whole tested window.
   */
  fragileAtMinutes?: number | null;
  /** Whether the matter is promised at all — a separate axis from quality. */
  promise?: "promised" | "delayed" | "spoiled" | "notPromised";
  promiseNote?: string;
}

// Promise is not a point on the quality scale — it answers a different question
// ("is this available?" vs "how well does it go?"), so it gets its own visual
// treatment rather than being folded into the verdict pill.
const PROMISE_STYLE: Record<string, { label: string; cls: string }> = {
  delayed: {
    label: "Delayed",
    cls: "border-amber-300/25 bg-amber-400/5 text-amber-200/80",
  },
  spoiled: {
    label: "Spoiled",
    cls: "border-orange-300/25 bg-orange-400/5 text-orange-200/80",
  },
  notPromised: {
    label: "Not promised",
    cls: "border-rose-300/30 bg-rose-400/10 text-rose-200/85",
  },
};

const VERDICT_COLOR: Record<string, string> = {
  Excellent: "bg-emerald-400/20 text-emerald-200 border-emerald-300/30",
  Strong: "bg-amber-400/20 text-amber-100 border-amber-300/30",
  Favourable: "bg-amber-400/10 text-amber-200 border-amber-300/20",
  Mixed: "bg-white/5 text-amber-100/60 border-white/15",
  Challenging: "bg-rose-400/15 text-rose-200 border-rose-300/30",
};

// Confidence was computed but never shown, which meant a well-corroborated call
// and a contested one looked identical. How settled a reading is matters as much
// as what it says — arguably more, since it tells the reader how much weight to
// put on it.
const CONFIDENCE_STYLE: Record<string, { cls: string; hint: string }> = {
  "Very High": {
    cls: "text-emerald-300/80",
    hint: "Several independent methods agree",
  },
  High: { cls: "text-amber-200/70", hint: "Most independent methods agree" },
  Moderate: {
    cls: "text-amber-100/50",
    hint: "Support is partial — treat as a leaning, not a conclusion",
  },
  Low: {
    cls: "text-rose-300/70",
    hint: "The methods disagree — this reading is genuinely unsettled",
  },
};

const SOURCE_COLOR: Record<string, string> = {
  "Bhṛgu Sūtras": "text-sky-300",
  "Sārāvalī": "text-violet-300",
  "Significations of the Planets": "text-emerald-300",
  "Bṛhat Parāśara Horā Śāstra": "text-amber-300",
  "Horā Sāra": "text-cyan-300",
};

function EvidenceBlock({ evidence }: { evidence: EvidenceView[] }) {
  const [open, setOpen] = useState(false);
  if (!evidence?.length) return null;
  return (
    <div className="mt-2 border-t border-white/10 pt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-[11px] font-medium uppercase tracking-wider text-amber-200/70 hover:text-amber-100"
      >
        <span>
          {open ? "▾" : "▸"} Classical basis · {evidence.length}{" "}
          {evidence.length === 1 ? "citation" : "citations"}
        </span>
      </button>
      {open && (
        <ul className="mt-2 space-y-2">
          {evidence.map((e, i) => (
            <li
              key={i}
              className="rounded-lg border border-white/10 bg-black/20 p-2"
            >
              <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span
                  className={`text-[11px] font-semibold ${
                    SOURCE_COLOR[e.source] ?? "text-amber-200"
                  }`}
                >
                  {e.source}
                </span>
                <span className="text-[11px] text-amber-50/80">{e.subject}</span>
                <span className="text-[10px] italic text-amber-100/40">
                  {e.role}
                </span>
              </div>
              {e.clauses && e.clauses.some((c) => c.status !== "neutral") ? (
                <>
                  <p className="text-xs leading-relaxed">
                    {e.clauses.map((c, j) => (
                      <span
                        key={j}
                        className={
                          c.status === "applies"
                            ? "rounded bg-emerald-400/15 px-0.5 text-emerald-100/90"
                            : c.status === "contradicts"
                              ? "text-amber-50/30 line-through decoration-amber-100/20"
                              : "text-amber-50/70"
                        }
                      >
                        {c.text}{" "}
                      </span>
                    ))}
                  </p>
                  <p className="mt-1 text-[10px] text-amber-100/40">
                    <span className="text-emerald-300/70">Highlighted</span> clauses
                    apply to this chart; <span className="line-through">struck-through</span>{" "}
                    ones name a placement the native does not have.
                  </p>
                </>
              ) : (
                <p className="text-xs leading-relaxed text-amber-50/70">{e.text}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The independent cross-checks behind a verdict, collapsed by default.
 *
 * Each of these reasons from a genuinely different basis — the topic's
 * divisional chart, the KP cuspal sub-lord, the Jaimini kāraka/ārūḍha frame —
 * so their agreement (or disagreement) is what the confidence rating is made
 * of. Showing them turns the rating from an assertion into something the reader
 * can inspect.
 */
function CrossChecks({ p }: { p: LifePredictionView }) {
  const [open, setOpen] = useState(false);
  const checks = [
    { name: "Divisional chart", note: p.vargaConfirmation?.note },
    { name: "KP sub-lord", note: p.kpConfirmation?.note },
    { name: "Jaimini", note: p.jaiminiConfirmation?.note },
    { name: "Across your charts", note: p.crossVarga?.note },
    { name: "Sudarśana (3 rings)", note: p.sudarshana?.applicable ? p.sudarshana?.note : undefined },
  ].filter((c) => !!c.note);
  if (!checks.length) return null;
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-[11px] font-medium uppercase tracking-wider text-amber-200/60 hover:text-amber-100"
      >
        {open ? "▾" : "▸"} Cross-checks · {checks.length} independent{" "}
        {checks.length === 1 ? "method" : "methods"}
      </button>
      {open && (
        <ul className="mt-1.5 space-y-1">
          {checks.map((c) => (
            <li
              key={c.name}
              className="rounded-md border border-white/10 bg-black/20 px-2 py-1"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-200/60">
                {c.name}
              </span>
              <p className="text-xs leading-relaxed text-amber-50/70">{c.note}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PredictionCards({
  predictions,
  showFactors = true,
  showEvidence = true,
}: {
  predictions: LifePredictionView[];
  showFactors?: boolean;
  showEvidence?: boolean;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {predictions.map((p) => (
        <div
          key={p.key}
          className="break-inside-avoid rounded-xl border border-white/10 bg-white/[0.03] p-3"
        >
          <div className="mb-1 flex items-start justify-between gap-2">
            <h3 className="font-semibold text-amber-50">
              <span className="mr-1">{p.icon}</span>
              {p.title}
            </h3>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                  VERDICT_COLOR[p.verdict] ?? VERDICT_COLOR.Mixed
                }`}
              >
                {p.verdict}
              </span>
              {p.confidence && (
                <span
                  title={CONFIDENCE_STYLE[p.confidence]?.hint}
                  className={`text-[9px] font-medium uppercase tracking-wide ${
                    CONFIDENCE_STYLE[p.confidence]?.cls ?? "text-amber-100/50"
                  }`}
                >
                  {p.confidence} confidence
                </span>
              )}
              {p.crossVarga?.verification && (
                <span
                  title={p.crossVarga.note}
                  className={`text-[9px] font-medium uppercase tracking-wide ${
                    p.crossVarga.verification === "confirmed"
                      ? "text-emerald-300/70"
                      : p.crossVarga.verification === "contested"
                        ? "text-rose-300/60"
                        : p.crossVarga.verification === "weak"
                          ? "text-amber-100/40"
                          : "text-amber-100/50"
                  }`}
                >
                  {p.crossVarga.verification === "confirmed"
                    ? `✓ verified across ${p.crossVarga.dignifiedCount}/6 charts`
                    : p.crossVarga.verification === "contested"
                      ? "⚠ charts contest this"
                      : p.crossVarga.verification === "weak"
                        ? "rests on D1 only"
                        : "partly cross-confirmed"}
                </span>
              )}
            </div>
          </div>
          {p.promise && p.promise !== "promised" && PROMISE_STYLE[p.promise] && (
            <div
              className={`mb-2 rounded-md border px-2 py-1.5 text-[11px] ${PROMISE_STYLE[p.promise].cls}`}
            >
              <span className="font-semibold uppercase tracking-wide">
                {PROMISE_STYLE[p.promise].label}
              </span>
              {p.promiseNote && <p className="mt-0.5 leading-relaxed">{p.promiseNote}</p>}
            </div>
          )}
          <p className="text-sm text-amber-50/85">{p.reading}</p>
          {p.confidence === "Low" && (
            <p className="mt-1.5 rounded-md border border-rose-300/20 bg-rose-400/5 px-2 py-1 text-[11px] text-rose-200/70">
              The independent checks disagree here, so treat this as an open
              question rather than a settled reading.
            </p>
          )}
          {p.fragileAtMinutes != null && (
            <p
              className="mt-1.5 rounded-md border border-amber-300/20 bg-amber-400/5 px-2 py-1 text-[11px] text-amber-200/70"
              title="Recomputed at offsets around your stated birth time — this area's verdict is not the same at all of them."
            >
              ⏱ Time-sensitive — this reading changes if the birth time is off by{" "}
              {p.fragileAtMinutes} minute{p.fragileAtMinutes === 1 ? "" : "s"}.
            </p>
          )}
          <CrossChecks p={p} />
          {p.sources && p.sources.length > 0 && (
            <p className="mt-1.5 text-[10px] text-amber-100/45">
              Based on {p.sources.join(" · ")}
              {p.agreement === "strong"
                ? " — sources agree"
                : p.agreement === "mixed"
                  ? " — sources mixed"
                  : ""}
            </p>
          )}
          {showFactors && (
            <ul className="mt-2 space-y-0.5">
              {p.factors.map((f, i) => (
                <li key={i} className="flex gap-1.5 text-xs text-amber-100/50">
                  <span className="text-amber-400/60">•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
          {showEvidence && p.evidence && (
            <EvidenceBlock evidence={p.evidence} />
          )}
        </div>
      ))}
    </div>
  );
}
