"use client";
import { useState } from "react";
import type { Compatibility } from "@/lib/astro/compatibility";
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

export function CompatibilityView() {
  const [groom, setGroom] = useState(blank("Partner 1"));
  const [bride, setBride] = useState(blank("Partner 2"));
  const [result, setResult] = useState<Compatibility | null>(null);
  const [mangal, setMangal] = useState<{
    groom: { isManglik: boolean; intensity: string; summary: string };
    bride: { isManglik: boolean; intensity: string; summary: string };
    match: { compatible: boolean; note: string };
  } | null>(null);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  const pct = result ? Math.round((result.total / 36) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <PersonForm label="Partner 1" p={groom} set={setGroom} />
        <PersonForm label="Partner 2" p={bride} set={setBride} />
      </div>
      <button
        onClick={check}
        disabled={loading}
        className="rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Matching…" : "Check Compatibility (Guṇa Milan)"}
      </button>
      {error && <p className="text-sm text-rose-300">{error}</p>}

      {result && (
        <div className="space-y-4">
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
    </div>
  );
}
