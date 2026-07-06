"use client";
import { useEffect, useState } from "react";
import { SIGNS } from "@/lib/astro/constants";
import type { BirthData } from "@/lib/astro/types";

interface Details {
  upagraha: {
    points: { name: string; sign: string; degree: number }[];
  } | null;
  arudhaPadas: { house: number; sign: number }[];
}

const dms = (deg: number) => {
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  return `${d}°${String(m).padStart(2, "0")}'`;
};

export function UpagrahaPanel({ birth }: { birth: BirthData }) {
  const [d, setD] = useState<Details | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let off = false;
    fetch("/api/details", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(birth) })
      .then((r) => r.json())
      .then((j) => { if (!off) { if (j.error) throw new Error(j.error); setD(j); } })
      .catch((e) => !off && setErr(e.message));
    return () => { off = true; };
  }, [birth]);

  if (err) return <p className="text-sm text-rose-300">{err}</p>;
  if (!d) return <p className="text-sm text-amber-100/50">Computing…</p>;

  return (
    <div className="space-y-4">
      {/* Upagrahas */}
      <div>
        <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200/80">
          Upagrahas (Sub-planets)
        </h4>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-sm">
            <thead className="text-amber-200/70">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                <th>Upagraha</th>
                <th>Position</th>
              </tr>
            </thead>
            <tbody className="text-amber-50/90">
              {(d.upagraha?.points ?? []).map((u) => (
                <tr key={u.name} className="border-t border-white/10 [&>td]:px-3 [&>td]:py-1.5">
                  <td className="font-medium">{u.name}</td>
                  <td className="tabular-nums">{dms(u.degree)} {u.sign}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Arudha padas */}
      <div>
        <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200/80">
          Ārūḍha Padas
        </h4>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {d.arudhaPadas.map((a) => (
            <div
              key={a.house}
              className={`rounded-lg border border-white/10 px-2 py-1.5 text-center text-xs ${
                a.house === 1 ? "bg-amber-400/10" : "bg-white/[0.03]"
              }`}
            >
              <div className="text-amber-100/50">
                A{a.house}
                {a.house === 1 ? " (AL)" : a.house === 12 ? " (UL)" : ""}
              </div>
              <div className="font-medium text-amber-50/90">{SIGNS[a.sign]}</div>
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-amber-100/40">
          A1 = Ārūḍha Lagna (the self as perceived by the world); A12 = Upapada
          (marriage/spouse).
        </p>
      </div>
    </div>
  );
}
