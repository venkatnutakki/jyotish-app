"use client";
import { useEffect, useState } from "react";
import type { ShadbalaResult } from "@/lib/astro/shadbala";
import type { BirthData } from "@/lib/astro/types";

const BALAS = [
  ["sthana", "Sthāna"],
  ["dig", "Dig"],
  ["kala", "Kāla"],
  ["cheshta", "Cheṣṭā"],
  ["naisargika", "Naisargika"],
  ["drik", "Dṛk"],
] as const;

interface IshtaKashta { planet: string; ishta: number; kashta: number; net: number }
interface Vimsopaka { planet: string; shadvarga: number; shodashavarga: number; grade: string }
interface BhavaBala { house: number; sign: string; lord: string; lordRupas: number; occupants: string[]; total: number; rank: number }

export function ShadbalaPanel({ birth }: { birth: BirthData }) {
  const [data, setData] = useState<ShadbalaResult | null>(null);
  const [ishta, setIshta] = useState<IshtaKashta[] | null>(null);
  const [vimsopaka, setVimsopaka] = useState<Vimsopaka[] | null>(null);
  const [bhavaBala, setBhavaBala] = useState<BhavaBala[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/shadbala", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(birth),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) throw new Error(d.error);
        setData(d.shadbala);
        setIshta(d.ishtaKashta ?? null);
        setVimsopaka(d.vimsopaka ?? null);
        setBhavaBala(d.bhavaBala ?? null);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [birth]);

  if (loading)
    return <p className="text-sm text-amber-100/50">Weighing the planets…</p>;
  if (error) return <p className="text-sm text-rose-300">{error}</p>;
  if (!data) return null;

  const maxRupas = Math.max(...data.ranking.map((r) => r.rupas), 8);

  return (
    <div className="space-y-5">
      <p className="text-sm text-amber-100/60">
        Ṣaḍbala — six-fold planetary strength in <em>rūpas</em> (Parāśari
        method, after B.V. Raman). A planet clearing its required strength is
        able to give its results fully.
      </p>

      {/* Strength bars */}
      <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        {data.ranking.map(({ planet, rupas }) => {
          const b = data.planets[planet];
          const strong = rupas >= b.required;
          return (
            <div key={planet} className="flex items-center gap-3">
              <span className="w-16 text-sm text-amber-50/90">{planet}</span>
              <div className="relative h-5 flex-1 overflow-hidden rounded bg-white/5">
                <div
                  className={`h-full rounded ${
                    strong
                      ? "bg-gradient-to-r from-amber-400 to-orange-400"
                      : "bg-gradient-to-r from-rose-400/70 to-rose-500/70"
                  }`}
                  style={{ width: `${(rupas / maxRupas) * 100}%` }}
                />
                {/* required threshold marker */}
                <div
                  className="absolute top-0 h-full w-px bg-amber-100/70"
                  style={{ left: `${(b.required / maxRupas) * 100}%` }}
                  title={`required ${b.required}`}
                />
              </div>
              <span
                className={`w-24 text-right text-xs tabular-nums ${
                  strong ? "text-amber-100" : "text-rose-300"
                }`}
              >
                {rupas.toFixed(2)} / {b.required}
              </span>
            </div>
          );
        })}
        <p className="pt-1 text-[11px] text-amber-100/40">
          The thin vertical line marks each planet&apos;s required strength.
        </p>
      </div>

      {/* Breakdown table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]">
        <table className="w-full text-right text-xs">
          <thead className="text-amber-200/70">
            <tr className="[&>th]:px-2.5 [&>th]:py-2">
              <th className="text-left">Graha</th>
              {BALAS.map(([, label]) => (
                <th key={label}>{label}</th>
              ))}
              <th>Total</th>
              <th>Rūpas</th>
            </tr>
          </thead>
          <tbody className="text-amber-50/85">
            {data.ranking.map(({ planet }) => {
              const b = data.planets[planet];
              return (
                <tr key={planet} className="border-t border-white/10 [&>td]:px-2.5 [&>td]:py-1.5">
                  <td className="text-left font-medium">{planet}</td>
                  {BALAS.map(([key]) => (
                    <td key={key} className="tabular-nums">
                      {Math.round(b[key as keyof typeof b] as number)}
                    </td>
                  ))}
                  <td className="tabular-nums text-amber-100">{Math.round(b.total)}</td>
                  <td className="tabular-nums font-medium text-amber-100">
                    {b.rupas.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-amber-100/40">
        Values in virūpas (60 virūpas = 1 rūpa). Sthāna, Dig, Naisargika and Dṛk
        balas are exact; Cheṣṭā uses a standard longitude-based approximation for
        the inner planets.
      </p>

      {/* Ishta / Kashta + Vimsopaka */}
      {(ishta || vimsopaka) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {ishta && (
            <div>
              <h4 className="mb-1 text-sm font-semibold uppercase tracking-wider text-amber-200/80">Iṣṭa / Kaṣṭa Phala</h4>
              <p className="mb-2 text-xs text-amber-100/45">Capacity for benefic (iṣṭa) vs harmful (kaṣṭa) results, from Uccha × Cheṣṭā bala (BPHS ch. 28). 0–60.</p>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                <table className="w-full text-sm">
                  <thead className="text-amber-200/70"><tr className="[&>th]:px-3 [&>th]:py-1.5 [&>th]:text-right [&>th:first-child]:text-left"><th>Graha</th><th>Iṣṭa</th><th>Kaṣṭa</th><th>Net</th></tr></thead>
                  <tbody className="text-amber-50/90">
                    {ishta.map((r) => (
                      <tr key={r.planet} className="border-t border-white/10 [&>td]:px-3 [&>td]:py-1 [&>td]:text-right [&>td:first-child]:text-left tabular-nums">
                        <td className="font-medium">{r.planet}</td>
                        <td className="text-emerald-200">{r.ishta}</td>
                        <td className="text-rose-200">{r.kashta}</td>
                        <td className={r.net >= 0 ? "text-emerald-200" : "text-rose-200"}>{r.net > 0 ? "+" : ""}{r.net}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {vimsopaka && (
            <div>
              <h4 className="mb-1 text-sm font-semibold uppercase tracking-wider text-amber-200/80">Vimśopaka Bala</h4>
              <p className="mb-2 text-xs text-amber-100/45">Dignity across the divisional charts, weighted (out of 20). Ṣaḍvarga (6) &amp; Ṣoḍaśavarga (16).</p>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                <table className="w-full text-sm">
                  <thead className="text-amber-200/70"><tr className="[&>th]:px-3 [&>th]:py-1.5 [&>th]:text-right [&>th:first-child]:text-left"><th>Graha</th><th>Ṣaḍ.</th><th>Ṣoḍaśa</th><th className="text-left">Grade</th></tr></thead>
                  <tbody className="text-amber-50/90">
                    {vimsopaka.map((r) => (
                      <tr key={r.planet} className="border-t border-white/10 [&>td]:px-3 [&>td]:py-1 [&>td]:text-right [&>td:first-child]:text-left tabular-nums">
                        <td className="font-medium">{r.planet}</td>
                        <td>{r.shadvarga}</td>
                        <td className="text-amber-100">{r.shodashavarga}</td>
                        <td className="text-left text-xs text-amber-100/70">{r.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bhava Bala */}
      {bhavaBala && (
        <div>
          <h4 className="mb-1 text-sm font-semibold uppercase tracking-wider text-amber-200/80">Bhāva Bala (House Strength)</h4>
          <p className="mb-2 text-xs text-amber-100/45">Composite of the house-lord&apos;s Ṣaḍbala and its occupants — a relative ranking of the twelve houses.</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
            {bhavaBala.map((b) => (
              <div key={b.house} className={`rounded-lg border px-2.5 py-1.5 text-xs ${b.rank <= 3 ? "border-emerald-300/25 bg-emerald-400/[0.06]" : b.rank >= 10 ? "border-rose-300/20 bg-rose-400/[0.05]" : "border-white/10 bg-white/[0.03]"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-amber-50">H{b.house} · {b.sign.slice(0, 3)}</span>
                  <span className="text-amber-100/50">#{b.rank}</span>
                </div>
                <div className="tabular-nums text-amber-100/70">{b.total.toFixed(1)} <span className="text-amber-100/35">(lord {b.lord})</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
