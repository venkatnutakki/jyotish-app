// "Ask" tab — type any question, get a chart-specific answer reasoned strictly
// from the classical rules, with the exact classical citations shown. No book
// text is bundled; only the sages' knowledge is applied to this chart.

"use client";
import { useState } from "react";
import type { BirthData } from "@/lib/astro/types";
import { SAMPLE_QUESTIONS } from "@/lib/astro/question";

interface Evidence {
  source: string;
  subject: string;
  role: string;
  text: string;
}
interface Answer {
  source: "ai" | "classical";
  provider?: string;
  model?: string;
  question: string;
  topics: string[];
  answer: string;
  evidence: Evidence[];
  note?: string;
}

const SOURCE_COLOR: Record<string, string> = {
  "Bhṛgu Sūtras": "text-sky-300",
  "Sārāvalī": "text-violet-300",
  "Significations of the Planets": "text-emerald-300",
  "Bṛhat Parāśara Horā Śāstra": "text-amber-300",
  "Horā Sāra": "text-cyan-300",
};

export function AskPanel({ birth }: { birth: BirthData }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [ans, setAns] = useState<Answer | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showCites, setShowCites] = useState(false);

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || loading) return;
    setLoading(true);
    setErr(null);
    setAns(null);
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birth, question: text }),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setAns(j);
      setShowCites(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to answer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-amber-50">Ask the Chart</h2>
        <p className="text-sm text-amber-100/50">
          Ask anything about this chart. The answer is reasoned strictly from the
          classical rules (Bhṛgu Sūtras, Sārāvalī, significations, yogas and the
          running daśā) — and every claim is cited.
        </p>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(q)}
          placeholder="e.g. When will I get married?"
          className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-amber-50 placeholder:text-amber-100/30 focus:border-amber-300/40 focus:outline-none"
        />
        <button
          onClick={() => ask(q)}
          disabled={loading || !q.trim()}
          className="rounded-xl bg-amber-400/20 px-5 py-2.5 text-sm font-medium text-amber-100 hover:bg-amber-400/30 disabled:opacity-40"
        >
          {loading ? "Reading…" : "Ask"}
        </button>
      </div>

      {/* Suggested questions */}
      <div className="flex flex-wrap gap-2">
        {SAMPLE_QUESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setQ(s);
              ask(s);
            }}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-amber-100/60 hover:border-amber-300/30 hover:text-amber-100"
          >
            {s}
          </button>
        ))}
      </div>

      {err && <p className="text-sm text-rose-300">{err}</p>}

      {/* Answer */}
      {ans && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {ans.topics.map((t) => (
              <span
                key={t}
                className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-100"
              >
                {t}
              </span>
            ))}
            <span className="ml-auto text-[10px] uppercase tracking-wider text-amber-100/40">
              {ans.source === "ai"
                ? `AI · grounded in classics`
                : "Classical rule-based"}
            </span>
          </div>

          <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-50/90">
            {ans.answer}
          </p>

          {ans.note && (
            <p className="mt-2 text-[11px] text-amber-100/40">{ans.note}</p>
          )}

          {ans.evidence?.length > 0 && (
            <div className="mt-3 border-t border-white/10 pt-2">
              <button
                onClick={() => setShowCites((s) => !s)}
                className="text-[11px] font-medium uppercase tracking-wider text-amber-200/70 hover:text-amber-100"
              >
                {showCites ? "▾" : "▸"} Classical basis · {ans.evidence.length}{" "}
                {ans.evidence.length === 1 ? "citation" : "citations"}
              </button>
              {showCites && (
                <ul className="mt-2 space-y-2">
                  {ans.evidence.map((e, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-white/10 bg-black/20 p-2"
                    >
                      <div className="mb-1 flex flex-wrap items-baseline gap-x-2">
                        <span
                          className={`text-[11px] font-semibold ${SOURCE_COLOR[e.source] ?? "text-amber-200"}`}
                        >
                          {e.source}
                        </span>
                        <span className="text-[11px] text-amber-50/80">
                          {e.subject}
                        </span>
                        <span className="text-[10px] italic text-amber-100/40">
                          {e.role}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-amber-50/70">
                        {e.text}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
