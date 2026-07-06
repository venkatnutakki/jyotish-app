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
}

export interface LifePredictionView {
  key: string;
  title: string;
  icon: string;
  verdict: string;
  confidence: string;
  reading: string;
  factors: string[];
  evidence?: EvidenceView[];
  sources?: string[];
  agreement?: string;
}

const VERDICT_COLOR: Record<string, string> = {
  Excellent: "bg-emerald-400/20 text-emerald-200 border-emerald-300/30",
  Strong: "bg-amber-400/20 text-amber-100 border-amber-300/30",
  Favourable: "bg-amber-400/10 text-amber-200 border-amber-300/20",
  Mixed: "bg-white/5 text-amber-100/60 border-white/15",
  Challenging: "bg-rose-400/15 text-rose-200 border-rose-300/30",
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
              <p className="text-xs leading-relaxed text-amber-50/70">{e.text}</p>
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
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="font-semibold text-amber-50">
              <span className="mr-1">{p.icon}</span>
              {p.title}
            </h3>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                VERDICT_COLOR[p.verdict] ?? VERDICT_COLOR.Mixed
              }`}
            >
              {p.verdict}
            </span>
          </div>
          <p className="text-sm text-amber-50/85">{p.reading}</p>
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
