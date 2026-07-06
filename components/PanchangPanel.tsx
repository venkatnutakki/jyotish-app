"use client";
import { useEffect, useState } from "react";
import type { BirthData } from "@/lib/astro/types";

interface Details {
  panchang: Record<string, string | number>;
  upagraha: {
    sunrise: string;
    sunset: string;
    weekday: string;
    periods: { name: string; from: string; to: string; caution: boolean }[];
  } | null;
  panchangExtra: {
    horas: { index: number; lord: string; from: string; to: string; night: boolean }[];
    choghadiya: { name: string; good: boolean; from: string; to: string; night: boolean }[];
    endTimes: { name: string; endsInHours: number; endsAt: string }[];
  } | null;
}

export function PanchangPanel({ birth }: { birth: BirthData }) {
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
  if (!d) return <p className="text-sm text-amber-100/50">Computing panchāṅga…</p>;
  const p = d.panchang;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-200/80">
          Birth Panchāṅga
        </h4>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          {[
            ["Vāra (weekday)", `${p.vara} (${p.varaEn})`],
            ["Tithi", `${p.paksha} ${p.tithi}`],
            ["Nakṣatra", `${p.nakshatra} · pada ${p.pada}`],
            ["Nakṣatra lord", String(p.nakshatraLord)],
            ["Yoga", String(p.yoga)],
            ["Karaṇa", String(p.karana)],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-xs text-amber-100/50">{k}</div>
              <div className="text-amber-50">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {d.upagraha && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-200/80">
            Day Timings
          </h4>
          <div className="mb-3 text-sm text-amber-50/80">
            Sunrise <span className="text-amber-100">{d.upagraha.sunrise}</span> ·
            Sunset <span className="text-amber-100">{d.upagraha.sunset}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {d.upagraha.periods.map((pr) => (
              <div
                key={pr.name}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                  pr.caution ? "border-rose-300/25 bg-rose-400/[0.06]" : "border-emerald-300/20 bg-emerald-400/[0.06]"
                }`}
              >
                <span className="font-medium text-amber-50">{pr.name}</span>
                <span className="tabular-nums text-amber-100/70">{pr.from} – {pr.to}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-amber-100/40">
            Rāhu Kālam / Yamagaṇḍa / Gulika Kālam are best avoided for new
            beginnings; Abhijit is auspicious.
          </p>
        </div>
      )}

      {d.panchangExtra && (
        <>
          {/* End-times */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200/80">
              Ending Times (from birth)
            </h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
              {d.panchangExtra.endTimes.map((e) => (
                <div key={e.name}>
                  <div className="text-xs text-amber-100/50">{e.name} ends</div>
                  <div className="text-amber-50">{e.endsAt} <span className="text-amber-100/40">(+{e.endsInHours}h)</span></div>
                </div>
              ))}
            </div>
          </div>

          {/* Choghadiya */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200/80">Choghaḍiyā</h4>
            <div className="grid gap-1 sm:grid-cols-2">
              {["Day", "Night"].map((part, pi) => (
                <div key={part}>
                  <div className="mb-1 text-[11px] uppercase tracking-wider text-amber-100/40">{part}</div>
                  {d.panchangExtra!.choghadiya.filter((c) => c.night === (pi === 1)).map((c, i) => (
                    <div key={i} className={`flex items-center justify-between rounded px-2 py-0.5 text-xs ${c.good ? "text-emerald-200" : "text-rose-200/90"}`}>
                      <span>{c.name} <span className="text-amber-100/30">{c.good ? "✓" : "✗"}</span></span>
                      <span className="tabular-nums text-amber-100/50">{c.from}–{c.to}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Horas */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200/80">Horā (Planetary Hours)</h4>
            <div className="grid grid-cols-3 gap-1 text-xs sm:grid-cols-4 lg:grid-cols-6">
              {d.panchangExtra.horas.map((h) => (
                <div key={h.index} className={`rounded border border-white/10 px-1.5 py-1 ${h.night ? "bg-white/[0.02]" : "bg-white/[0.04]"}`}>
                  <span className="font-medium text-amber-50">{h.lord}</span>{" "}
                  <span className="text-amber-100/40">{h.from}</span>
                </div>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-amber-100/40">Each hour is ruled by a planet (Chaldean order from the weekday lord). Choose the hour of the planet ruling your activity.</p>
          </div>
        </>
      )}
    </div>
  );
}
