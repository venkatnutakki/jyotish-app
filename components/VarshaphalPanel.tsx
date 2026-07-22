// Varṣaphala (annual horoscope) tab. Pick a year → the solar-return chart plus
// Muntha, Year Lord (Varṣeśa), Mudda daśā and the Sahams.

"use client";
import { useEffect, useState } from "react";
import { NorthChart } from "./NorthChart";
import type { BirthData, Chart } from "@/lib/astro/types";

interface Panch { planet: string; kshetra: number; uchcha: number; hadda: number; drekkana: number; navamsa: number; total: number; }
interface Varshaphal {
  year: number; ageAtYear: number; praveshISO: string; pravesh: Chart;
  muntha: { sign: string; house: number; lord: string };
  munthaVerdict?: { favourable: boolean; note: string };
  judgments?: { area: string; house: number; karyesha: string; judgment: { yoga: string; variety: string | null; strength: number; perfects: boolean; note: string } }[];
  yearLord: { planet: string; strength: number; candidates: Panch[] };
  muddaDasha: { lord: string; days: number; start: string; end: string }[];
  sahams: { name: string; sign: string; degree: number }[];
  error?: string;
}

const dms = (d: number) => { const a = Math.min(1799, Math.max(0, Math.round(d * 60))); return `${Math.floor(a / 60)}°${String(a % 60).padStart(2, "0")}'`; };
const fmt = (s: string) => new Date(s).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
const isNow = (s: string, e: string) => { const n = Date.now(); return new Date(s).getTime() <= n && n < new Date(e).getTime(); };

export function VarshaphalPanel({ birth }: { birth: BirthData }) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [vp, setVp] = useState<Varshaphal | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let off = false;
    setLoading(true);
    setErr(null);
    fetch("/api/varsha", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ birth, year }) })
      .then((r) => r.json())
      .then((j) => { if (!off) { if (j.error) throw new Error(j.error); setVp(j); } })
      .catch((e) => !off && setErr(e.message))
      .finally(() => !off && setLoading(false));
    return () => { off = true; };
  }, [birth, year]);

  const years: number[] = [];
  for (let y = birth.year; y <= thisYear + 5; y++) years.push(y);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-amber-50">Varṣaphala — Annual Horoscope</h2>
          <p className="text-sm text-amber-100/50">
            The solar-return (varṣa praveśa) chart for the chosen year, cast for
            the exact moment the Sun returns to its birth position.
          </p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-amber-50 focus:border-amber-300/40 focus:outline-none"
        >
          {years.map((y) => (
            <option key={y} value={y} className="bg-[#1a1426]">
              {y} · age {y - birth.year}
            </option>
          ))}
        </select>
      </div>

      {err && <p className="text-sm text-rose-300">{err}</p>}
      {loading && <p className="text-sm text-amber-100/50">Computing the solar return…</p>}

      {vp && !loading && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Pravesh chart */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-1 text-xs uppercase tracking-wider text-amber-200/70">
                Varṣa Praveśa Chart
              </div>
              <div className="mb-2 text-xs text-amber-100/45">
                Entry: {new Date(vp.praveshISO).toLocaleString()}
              </div>
              <NorthChart chart={vp.pravesh} />
            </div>

            {/* Key factors */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Fact label="Muntha" value={`${vp.muntha.sign} · H${vp.muntha.house}`} sub={`lord ${vp.muntha.lord}`} />
                <Fact label="Year Lord (Varṣeśa)" value={vp.yearLord.planet} sub={`strength ${vp.yearLord.strength}/20`} highlight />
              </div>

              {vp.munthaVerdict && (
                <p
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    vp.munthaVerdict.favourable
                      ? "border-emerald-300/25 bg-emerald-400/5 text-emerald-100/80"
                      : "border-amber-300/20 bg-amber-400/5 text-amber-200/75"
                  }`}
                >
                  {vp.munthaVerdict.note}
                </p>
              )}

              {/* Tājika judgment — does each matter perfect this year? */}
              {vp.judgments && vp.judgments.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-200/70">
                    Does it perfect this year? · Tājika
                  </p>
                  {vp.judgments.map((j) => (
                    <div
                      key={j.area}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                        j.judgment.perfects
                          ? "border-emerald-300/25 bg-emerald-400/5"
                          : j.judgment.yoga === "Maṇaū" || j.judgment.yoga === "Raddā"
                            ? "border-rose-300/20 bg-rose-400/5"
                            : "border-white/10 bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                        <span className="font-medium text-amber-50/90">{j.area}</span>
                        <span
                          className={`text-[10px] uppercase tracking-wide ${
                            j.judgment.perfects ? "text-emerald-300/80" : "text-amber-100/45"
                          }`}
                        >
                          {j.judgment.yoga === "none" ? "no mechanism" : j.judgment.yoga}
                          {j.judgment.variety ? ` · ${j.judgment.variety}` : ""}
                          {j.judgment.strength > 0 ? ` · ${j.judgment.strength.toFixed(1)}/20` : ""}
                        </span>
                      </div>
                      <p className="mt-0.5 leading-relaxed text-amber-100/55">{j.judgment.note}</p>
                    </div>
                  ))}
                  <p className="text-[10px] text-amber-100/35">
                    In Tājika the aspects are the judgment: an applying aspect
                    (Itthaśāla) between the lagna lord and the lord of the matter
                    means it completes; a separating one (Īsarāpha) means the
                    moment has passed.
                  </p>
                </div>
              )}

              {/* Panchavargeeya candidates */}
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-amber-200/70">
                  Office-bearers · Pañcavargīya strength
                </div>
                <table className="w-full text-xs">
                  <thead className="text-amber-200/60">
                    <tr className="[&>th]:px-2 [&>th]:py-1 [&>th]:text-right [&>th:first-child]:text-left">
                      <th>Planet</th><th>Kṣetra</th><th>Uccha</th><th>Hadda</th><th>Dre</th><th>Nav</th><th>Total</th>
                    </tr>
                  </thead>
                  <tbody className="text-amber-50/85">
                    {vp.yearLord.candidates.map((c) => (
                      <tr key={c.planet} className={`border-t border-white/10 [&>td]:px-2 [&>td]:py-1 [&>td]:text-right [&>td:first-child]:text-left tabular-nums ${c.planet === vp.yearLord.planet ? "bg-amber-400/10 text-amber-100" : ""}`}>
                        <td className="font-medium">{c.planet}</td>
                        <td>{c.kshetra}</td><td>{c.uchcha}</td><td>{c.hadda}</td><td>{c.drekkana}</td><td>{c.navamsa}</td>
                        <td className="font-semibold">{c.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Sahams */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-1.5 text-[11px] uppercase tracking-wider text-amber-200/70">Sahams</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {vp.sahams.map((s) => (
                    <div key={s.name}>
                      <div className="text-amber-100/50">{s.name.split(" ")[0]}</div>
                      <div className="text-amber-50/90">{dms(s.degree)} {s.sign}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mudda dasha */}
          <div>
            <div className="mb-1 text-xs uppercase tracking-wider text-amber-200/70">
              Mudda Daśā (annual Vimśottari · 365 days)
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
              <table className="w-full text-sm">
                <tbody className="text-amber-50/90">
                  {vp.muddaDasha.map((m, i) => (
                    <tr key={i} className={`border-t border-white/10 first:border-0 [&>td]:px-3 [&>td]:py-1.5 ${isNow(m.start, m.end) ? "bg-amber-400/10 text-amber-100" : ""}`}>
                      <td className="font-medium">
                        {m.lord} <span className="text-amber-50/40">{m.days}d</span>
                        {isNow(m.start, m.end) && <span className="ml-2 rounded-full bg-amber-400/30 px-2 py-0.5 text-[10px] uppercase">now</span>}
                      </td>
                      <td className="text-right tabular-nums text-amber-50/50">{fmt(m.start)} → {fmt(m.end)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-amber-100/40">
            Muntha advances one sign per year from the natal lagna. The Year Lord
            is the strongest office-bearer by Pañcavargīya bala and colours the
            whole year. Mudda daśā times events within the year.
          </p>
        </div>
      )}
    </div>
  );
}

function Fact({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? "border-amber-300/25 bg-amber-400/[0.08]" : "border-white/10 bg-white/[0.03]"}`}>
      <div className="text-[11px] uppercase tracking-wider text-amber-200/70">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-amber-50">{value}</div>
      {sub && <div className="text-xs text-amber-100/50">{sub}</div>}
    </div>
  );
}
