"use client";
import { useEffect, useState } from "react";
import type { Forecast } from "@/lib/astro/forecast";
import type { BirthData } from "@/lib/astro/types";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ForecastPanel({ birth }: { birth: BirthData }) {
  const [data, setData] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState(12);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/forecast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...birth, months }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) throw new Error(d.error);
        setData(d.forecast);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [birth, months]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-amber-100/60">
          What the coming months hold — from your Vimśottari periods and the
          transits of the slow planets.
        </p>
        <select
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="rounded-lg border border-white/15 bg-[#140f22] px-2 py-1.5 text-xs text-amber-100 outline-none focus:border-amber-300/60"
        >
          {[6, 12, 24, 36].map((m) => (
            <option key={m} value={m}>
              Next {m} months
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-sm text-amber-100/50">Reading the timeline…</p>}
      {error && <p className="text-sm text-rose-300">{error}</p>}

      {data && !loading && (
        <>
          <div className="rounded-2xl border border-amber-300/30 bg-gradient-to-b from-amber-400/[0.08] to-transparent p-4">
            <div className="text-xs uppercase tracking-wider text-amber-200/60">
              {fmt(data.windowStart)} – {fmt(data.windowEnd)}
            </div>
            <div className="mt-1 text-lg font-semibold text-amber-100">
              {data.current.maha} → {data.current.antar}
              {data.current.pratyantar ? ` → ${data.current.pratyantar}` : ""}
            </div>
            <p className="mt-1 text-sm text-amber-50/80">{data.summary}</p>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            {data.timeline.map((p, i) => (
              <div
                key={i}
                className={`rounded-xl border p-3 ${
                  p.current
                    ? "border-amber-300/40 bg-amber-400/10"
                    : "border-white/10 bg-white/[0.03]"
                } ${p.level === "Pratyantardaśā" ? "ml-4" : ""}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-amber-50">
                    {p.maha} / {p.lord}
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-100/40">
                      {p.level}
                    </span>
                    {p.current && (
                      <span className="ml-2 rounded-full bg-amber-400/30 px-2 py-0.5 text-[10px] uppercase text-amber-100">
                        now
                      </span>
                    )}
                  </span>
                  <span className="text-xs tabular-nums text-amber-100/50">
                    {fmt(p.start)} → {fmt(p.end)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-amber-50/70">{p.theme}</p>
              </div>
            ))}
          </div>

          {/* Transit highlights */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-200/70">
              Transit Highlights
            </h4>
            <p className="mb-2 text-sm text-amber-50/80">{data.transits.sadeSati}</p>
            <ul className="space-y-1">
              {data.transits.highlights.map((h, i) => (
                <li key={i} className="flex gap-2 text-xs text-amber-100/60">
                  <span className="text-amber-400/60">•</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-amber-100/40">
            Timing uses proportional Vimśottari periods; transit dates are
            approximate to the month. Guidance, not a guarantee.
          </p>
        </>
      )}
    </div>
  );
}
