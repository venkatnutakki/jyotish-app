// Praśna (horary) — cast a chart for the exact moment a question is asked, at
// the querent's location, and answer it from the classical rules. This is the
// time-based (Tājika/Parāśari) praśna method; it reuses the cited-Ask engine on
// the query-moment chart.

"use client";
import { useState } from "react";
import type { BirthData } from "@/lib/astro/types";

interface Evidence { source: string; subject: string; role: string; text: string }
interface Answer {
  source: "ai" | "classical"; question: string; topics: string[];
  answer: string; evidence: Evidence[]; note?: string;
  lagna?: string; moon?: string; moment?: string;
}

const SOURCE_COLOR: Record<string, string> = {
  "Bhṛgu Sūtras": "text-sky-300", "Sārāvalī": "text-violet-300",
  "Significations of the Planets": "text-emerald-300",
  "Bṛhat Parāśara Horā Śāstra": "text-amber-300", "Horā Sāra": "text-cyan-300",
};

interface KpLagna { number: number; sign: string; degreeInSign: number; nakshatra: string; starLord: string; subLord: string }
interface KpResult { lagna: KpLagna; moment: string; cusps: { house: number; subLord: string }[]; significators: { planet: string; significates: number[] }[] }

export function PrashnaPanel({ birth }: { birth: BirthData }) {
  const [mode, setMode] = useState<"time" | "kp">("time");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [ans, setAns] = useState<Answer | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showCites, setShowCites] = useState(false);
  const [kpNum, setKpNum] = useState("");
  const [kp, setKp] = useState<KpResult | null>(null);

  const askKp = async () => {
    const n = Number(kpNum);
    if (!(n >= 1 && n <= 249) || loading) return;
    setLoading(true); setErr(null); setKp(null);
    try {
      const r = await fetch("/api/kp-horary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: n, latitude: birth.latitude, longitude: birth.longitude, tzOffsetHours: birth.tzOffsetHours }),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setKp(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const ask = async () => {
    const question = q.trim();
    if (!question || loading) return;
    setLoading(true); setErr(null); setAns(null);
    // Cast for the exact instant the question is asked, at the querent's place.
    const now = new Date();
    const local = new Date(now.getTime() + birth.tzOffsetHours * 3600000);
    const prashnaBirth: BirthData = {
      year: local.getUTCFullYear(), month: local.getUTCMonth() + 1, day: local.getUTCDate(),
      hour: local.getUTCHours(), minute: local.getUTCMinutes(), second: local.getUTCSeconds(),
      tzOffsetHours: birth.tzOffsetHours, latitude: birth.latitude, longitude: birth.longitude,
      place: birth.place, ayanamsa: birth.ayanamsa, nodeType: birth.nodeType,
    };
    try {
      const r = await fetch("/api/ask", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birth: prashnaBirth, question }),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setAns({ ...j, moment: now.toLocaleString() });
      setShowCites(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-amber-50">Praśna — Horary</h2>
        <p className="text-sm text-amber-100/50">
          Cast a chart for the moment of the question. Choose the classical
          time-based method, or KP&apos;s number method (1-249).
        </p>
      </div>

      <div className="flex w-fit gap-1 rounded-lg border border-white/15 p-1 text-xs">
        {(["time", "kp"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-md px-3 py-1.5 ${mode === m ? "bg-amber-400/20 text-amber-100" : "text-amber-100/50 hover:text-amber-100/80"}`}
          >
            {m === "time" ? "Time-based" : "KP number (1-249)"}
          </button>
        ))}
      </div>

      {mode === "kp" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="number" min={1} max={249}
              value={kpNum}
              onChange={(e) => setKpNum(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askKp()}
              placeholder="Number 1-249"
              className="w-40 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-amber-50 placeholder:text-amber-100/30 focus:border-amber-300/40 focus:outline-none"
            />
            <button onClick={askKp} disabled={loading} className="rounded-xl bg-amber-400/20 px-5 py-2.5 text-sm font-medium text-amber-100 hover:bg-amber-400/30 disabled:opacity-40">
              {loading ? "Casting…" : "Cast horary"}
            </button>
          </div>
          {err && <p className="text-sm text-rose-300">{err}</p>}
          {kp && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-wider text-amber-200/70">Horary Lagna · No. {kp.lagna.number}</div>
              <p className="mt-1 text-sm text-amber-50/90">
                Ascendant {Math.floor(kp.lagna.degreeInSign)}° {kp.lagna.sign} · {kp.lagna.nakshatra}
              </p>
              <p className="mt-1 text-sm">
                Star lord <b className="text-amber-100">{kp.lagna.starLord}</b> · Sub lord{" "}
                <b className="text-amber-300">{kp.lagna.subLord}</b>
                <span className="text-[11px] italic text-amber-100/40"> — the sub-lord of the ascendant decides the matter in KP</span>
              </p>
              <div className="mt-2 text-[11px] text-amber-100/45">Cast {new Date(kp.moment).toLocaleString()}</div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] sm:grid-cols-3">
                {kp.cusps.slice(0, 12).map((c) => (
                  <div key={c.house} className="rounded bg-black/20 px-2 py-1 text-amber-50/70">
                    Cusp {c.house}: sub <span className="text-amber-100">{c.subLord}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-amber-100/40">
                In KP, judge the question from the significators of the relevant
                cuspal sub-lords (e.g. 11th for success/&ldquo;yes&rdquo;, 6/8/12 for denial).
              </p>
            </div>
          )}
        </div>
      )}

      {mode === "time" && <>

      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="e.g. Will this venture succeed?"
          className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-amber-50 placeholder:text-amber-100/30 focus:border-amber-300/40 focus:outline-none"
        />
        <button
          onClick={ask}
          disabled={loading || !q.trim()}
          className="rounded-xl bg-amber-400/20 px-5 py-2.5 text-sm font-medium text-amber-100 hover:bg-amber-400/30 disabled:opacity-40"
        >
          {loading ? "Casting…" : "Ask now"}
        </button>
      </div>

      {err && <p className="text-sm text-rose-300">{err}</p>}

      {ans && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {ans.topics.map((t) => (
              <span key={t} className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-100">{t}</span>
            ))}
            <span className="ml-auto text-[10px] uppercase tracking-wider text-amber-100/40">
              Praśna cast {ans.moment}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-50/90">{ans.answer}</p>
          {ans.note && <p className="mt-2 text-[11px] text-amber-100/40">{ans.note}</p>}
          {ans.evidence?.length > 0 && (
            <div className="mt-3 border-t border-white/10 pt-2">
              <button onClick={() => setShowCites((s) => !s)} className="text-[11px] font-medium uppercase tracking-wider text-amber-200/70 hover:text-amber-100">
                {showCites ? "▾" : "▸"} Classical basis · {ans.evidence.length} citations
              </button>
              {showCites && (
                <ul className="mt-2 space-y-2">
                  {ans.evidence.map((e, i) => (
                    <li key={i} className="rounded-lg border border-white/10 bg-black/20 p-2">
                      <div className="mb-1 flex flex-wrap items-baseline gap-x-2">
                        <span className={`text-[11px] font-semibold ${SOURCE_COLOR[e.source] ?? "text-amber-200"}`}>{e.source}</span>
                        <span className="text-[11px] text-amber-50/80">{e.subject}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-amber-50/70">{e.text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
      </>}
    </div>
  );
}
