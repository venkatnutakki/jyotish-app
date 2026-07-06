// Muhūrta tab — a 30-day electional calendar scored for the native (Tārā Bala,
// Chandra Bala, weekday). Pick a start month; green days are auspicious.

"use client";
import { useEffect, useState } from "react";
import type { BirthData } from "@/lib/astro/types";

interface Day {
  date: string; weekday: string; moonNakshatra: string; moonSign: string;
  tara: string; taraAuspicious: boolean; chandraHouse: number; chandraGood: boolean;
  score: number; verdict: string; notes: string[];
}

const VERDICT_COLOR: Record<string, string> = {
  Excellent: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  Good: "border-amber-300/25 bg-amber-400/[0.08] text-amber-100",
  Average: "border-white/10 bg-white/[0.03] text-amber-50/80",
  Avoid: "border-rose-300/25 bg-rose-400/[0.06] text-rose-100",
};

export function MuhurtaPanel({ birth }: { birth: BirthData }) {
  const [start, setStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState<Day[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let off = false;
    setLoading(true);
    fetch("/api/muhurta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ birth, start }) })
      .then((r) => r.json())
      .then((j) => { if (!off) { if (j.error) throw new Error(j.error); setDays(j.days); } })
      .catch((e) => !off && setErr(e.message))
      .finally(() => !off && setLoading(false));
    return () => { off = true; };
  }, [birth, start]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-amber-50">Muhūrta — Electional Calendar</h2>
          <p className="text-sm text-amber-100/50">
            The next 30 days scored for you (Tārā Bala from your birth star, Chandra
            Bala, and weekday). Green days are best for new beginnings.
          </p>
        </div>
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-amber-50 focus:border-amber-300/40 focus:outline-none"
        />
      </div>

      {err && <p className="text-sm text-rose-300">{err}</p>}
      {loading && <p className="text-sm text-amber-100/50">Scoring the days…</p>}

      {days && (
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {days.map((d) => (
            <div key={d.date} className={`rounded-lg border px-3 py-2 text-xs ${VERDICT_COLOR[d.verdict] ?? VERDICT_COLOR.Average}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" })}
                </span>
                <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px]">{d.verdict} · {d.score}/10</span>
              </div>
              <div className="mt-0.5 text-[11px] opacity-80">
                {d.moonNakshatra} · {d.tara} tārā · Moon {d.chandraHouse}th
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-amber-100/40">
        For an exact muhūrta, also avoid Rāhu Kālam / Yamagaṇḍa (see the Panchāṅga
        tab) and pick an auspicious lagna within the chosen day.
      </p>
    </div>
  );
}
