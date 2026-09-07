"use client";
import { useState } from "react";
import type { Compatibility } from "@/lib/astro/compatibility";
import type { ChartComparison, ChartSummary } from "@/lib/astro/chart-comparison";
import { CityAutocomplete, type CityHit } from "./CityAutocomplete";
import { zoneOffsetHours } from "@/lib/geo";

const field =
  "w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-sm text-amber-50 outline-none focus:border-amber-300/60";

interface P {
  name: string;
  date: string;
  time: string;
  city: string;
  lat: string;
  lon: string;
  tz: string;
  ianaTz?: string;
}

const blank = (name: string): P => ({
  name,
  date: "1992-01-01",
  time: "12:00",
  city: "New Delhi",
  lat: "28.6139",
  lon: "77.2090",
  tz: "5.5",
});

function PersonForm({
  label,
  p,
  set,
}: {
  label: string;
  p: P;
  set: (p: P) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-200/80">
        {label}
      </h3>
      <input
        className={field}
        placeholder="Name"
        value={p.name}
        onChange={(e) => set({ ...p, name: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          className={field}
          value={p.date}
          onChange={(e) => {
            const off = p.ianaTz ? zoneOffsetHours(p.ianaTz, e.target.value) : null;
            set({ ...p, date: e.target.value, tz: off !== null ? String(off) : p.tz });
          }}
        />
        <input
          type="time"
          className={field}
          value={p.time}
          onChange={(e) => set({ ...p, time: e.target.value })}
        />
      </div>
      <CityAutocomplete
        className={field}
        value={p.city}
        onType={(text) => set({ ...p, city: text, ianaTz: undefined })}
        onSelect={(c: CityHit) => {
          const off = zoneOffsetHours(c.tz, p.date);
          set({
            ...p,
            city: c.name,
            lat: c.lat.toFixed(4),
            lon: c.lng.toFixed(4),
            ianaTz: c.tz,
            tz: off !== null ? String(off) : p.tz,
          });
        }}
      />
      <div className="grid grid-cols-3 gap-2">
        <input className={field} value={p.lat} onChange={(e) => set({ ...p, lat: e.target.value })} />
        <input className={field} value={p.lon} onChange={(e) => set({ ...p, lon: e.target.value })} />
        <input className={field} value={p.tz} onChange={(e) => set({ ...p, tz: e.target.value })} />
      </div>
    </div>
  );
}

function toBirth(p: P) {
  const [y, mo, d] = p.date.split("-").map(Number);
  const [h, mi] = p.time.split(":").map(Number);
  return {
    name: p.name,
    place: p.city,
    year: y,
    month: mo,
    day: d,
    hour: h,
    minute: mi,
    tzOffsetHours: Number(p.tz),
    latitude: Number(p.lat),
    longitude: Number(p.lon),
  };
}

const LEVEL_LABEL: Record<string, string> = {
  maha: "Mahādaśā", antar: "Antardaśā", pratyantar: "Pratyantar", sukshma: "Sūkṣma",
};
const ymd = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short" });

function DashaStack({ s }: { s: ChartSummary }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-1 text-sm font-semibold text-amber-100">{s.name}</div>
      <div className="mb-2 text-[11px] text-amber-100/50">
        {s.lagnaSign} lagna · Moon {s.moonSign} · strongest {s.strongest}
        {s.signatureYoga ? ` · ${s.signatureYoga}` : ""}
      </div>
      <div className="space-y-1">
        {s.currentDasha.map((d) => (
          <div key={d.level} className="flex items-baseline gap-2 text-xs">
            <span className="w-20 shrink-0 uppercase tracking-wide text-amber-200/60">{LEVEL_LABEL[d.level]}</span>
            <span className="font-medium text-amber-50">{d.lord}</span>
            <span className="ml-auto tabular-nums text-amber-100/40">{ymd(d.from)} → {ymd(d.to)}</span>
          </div>
        ))}
      </div>
      <div className={`mt-2 text-[11px] ${s.sadeSati.active ? "text-rose-200/80" : "text-emerald-200/70"}`}>
        {s.sadeSati.active ? `Sade Sati — ${s.sadeSati.phase} phase` : "Not in Sade Sati"}
      </div>
    </div>
  );
}

export function CompatibilityView() {
  const [groom, setGroom] = useState(blank("Partner 1"));
  const [bride, setBride] = useState(blank("Partner 2"));
  const [result, setResult] = useState<Compatibility | null>(null);
  const [mangal, setMangal] = useState<{
    groom: { isManglik: boolean; intensity: string; summary: string };
    bride: { isManglik: boolean; intensity: string; summary: string };
    match: { compatible: boolean; note: string };
  } | null>(null);
  const [comparison, setComparison] = useState<ChartComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/compat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groom: toBirth(groom), bride: toBirth(bride) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResult(data.compatibility);
      setMangal(data.mangal ?? null);
      setComparison(data.comparison ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  const pct = result ? Math.round((result.total / 36) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="no-print grid gap-4 md:grid-cols-2">
        <PersonForm label="Partner 1" p={groom} set={setGroom} />
        <PersonForm label="Partner 2" p={bride} set={setBride} />
      </div>
      <div className="no-print flex flex-wrap items-center gap-2">
        <button
          onClick={check}
          disabled={loading}
          className="rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Matching…" : "Check Compatibility (Guṇa Milan)"}
        </button>
        {(result || comparison) && (
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-amber-300/40 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/10"
          >
            🖨 Print / Save as PDF
          </button>
        )}
      </div>
      {error && <p className="no-print text-sm text-rose-300">{error}</p>}

      {(result || comparison) && (
        <div className="report space-y-6">
          <header className="report-section text-center">
            <h2 className="text-xl font-bold text-amber-100">
              {(groom.name || "Partner 1")} &amp; {(bride.name || "Partner 2")}
            </h2>
            <p className="text-xs text-amber-100/50">Compatibility &amp; Chart Comparison</p>
          </header>

      {result && (
        <div className="report-section space-y-4">
          <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-white/10 bg-gradient-to-b from-amber-400/[0.08] to-transparent p-5">
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-100">
                {result.total}
                <span className="text-xl text-amber-100/40">/36</span>
              </div>
              <div className="text-xs text-amber-100/50">{pct}% guṇas</div>
            </div>
            <div className="flex-1">
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-sm text-amber-50/90">{result.verdict}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
            <table className="w-full text-sm">
              <thead className="text-amber-200/70">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                  <th>Koota</th>
                  <th>Meaning</th>
                  <th className="text-center">Score</th>
                </tr>
              </thead>
              <tbody className="text-amber-50/90">
                {result.kootas.map((k) => (
                  <tr key={k.name} className="border-t border-white/10 [&>td]:px-3 [&>td]:py-2">
                    <td className="font-medium">{k.name}</td>
                    <td className="text-amber-50/60">{k.note}</td>
                    <td className="text-center tabular-nums">
                      <span className={k.score === 0 ? "text-rose-300" : "text-amber-100"}>
                        {k.score}
                      </span>
                      <span className="text-amber-50/40">/{k.max}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-amber-100/40">
            Guṇa Milan compares the Moon&apos;s rāśi and nakshatra of both people
            across 8 kootas. 18+ is traditionally acceptable; Nadi or Bhakoot
            dosha warrants closer review by an astrologer.
          </p>

          {/* Mangal (Kuja) Dosha */}
          {mangal && (
            <div className={`rounded-2xl border p-4 ${mangal.match.compatible ? "border-emerald-300/20 bg-emerald-400/[0.06]" : "border-rose-300/30 bg-rose-400/10"}`}>
              <h4 className="mb-2 font-semibold text-amber-50">
                Mangal (Kuja) Dōṣa — Manglik check
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs">
                  <div className="font-medium text-amber-100">{groom.name || "Partner 1"}</div>
                  <div className={mangal.groom.isManglik ? "text-rose-200" : "text-emerald-200"}>
                    {mangal.groom.isManglik ? `Manglik (${mangal.groom.intensity})` : "Not Manglik"}
                  </div>
                  <div className="text-amber-100/50">{mangal.groom.summary}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs">
                  <div className="font-medium text-amber-100">{bride.name || "Partner 2"}</div>
                  <div className={mangal.bride.isManglik ? "text-rose-200" : "text-emerald-200"}>
                    {mangal.bride.isManglik ? `Manglik (${mangal.bride.intensity})` : "Not Manglik"}
                  </div>
                  <div className="text-amber-100/50">{mangal.bride.summary}</div>
                </div>
              </div>
              <p className="mt-2 text-sm text-amber-50/85">{mangal.match.note}</p>
            </div>
          )}
        </div>
      )}

      {comparison && (
        <div className="report-section space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-200/80">
            Side-by-Side &amp; Current Periods
          </h3>
          {/* Key facts */}
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
            <table className="w-full text-sm">
              <thead className="text-amber-200/70">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                  <th></th>
                  <th>{comparison.a.name}</th>
                  <th>{comparison.b.name}</th>
                </tr>
              </thead>
              <tbody className="text-amber-50/90 [&_td]:px-3 [&_td]:py-2 [&_tr]:border-t [&_tr]:border-white/10">
                {([
                  ["Lagna", `${comparison.a.lagnaSign} (${comparison.a.lagnaLord})`, `${comparison.b.lagnaSign} (${comparison.b.lagnaLord})`],
                  ["Moon", `${comparison.a.moonSign} · ${comparison.a.moonNakshatra}`, `${comparison.b.moonSign} · ${comparison.b.moonNakshatra}`],
                  ["Strongest graha", comparison.a.strongest, comparison.b.strongest],
                  ["Signature yoga", comparison.a.signatureYoga ?? "—", comparison.b.signatureYoga ?? "—"],
                  ["Manglik", comparison.a.manglik ? "Yes" : "No", comparison.b.manglik ? "Yes" : "No"],
                ] as [string, string, string][]).map(([k, av, bv]) => (
                  <tr key={k}>
                    <td className="text-amber-100/50">{k}</td>
                    <td>{av}</td>
                    <td>{bv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Current daśā stacks to sūkṣma */}
          <div className="grid gap-3 sm:grid-cols-2">
            <DashaStack s={comparison.a} />
            <DashaStack s={comparison.b} />
          </div>
          {/* Synthesis */}
          {(comparison.shared.length > 0 || comparison.contrasts.length > 0) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {comparison.shared.length > 0 && (
                <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/[0.06] p-3">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-200/80">Shared right now</div>
                  <ul className="space-y-1 text-xs text-amber-50/85">
                    {comparison.shared.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}
              {comparison.contrasts.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-200/70">Where they differ</div>
                  <ul className="space-y-1 text-xs text-amber-50/85">
                    {comparison.contrasts.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-amber-100/40">
            Each stack shows the running mahādaśā → antardaśā → pratyantar → sūkṣma for today.
            The pratyantar and sūkṣma levels are only as precise as the birth time — confirm it
            from a record before reading fine sub-period dates.
          </p>
        </div>
      )}
        </div>
      )}
    </div>
  );
}
