"use client";
import { useEffect, useState } from "react";
import { SIGNS, NAKSHATRAS, PLANET_SANSKRIT } from "@/lib/astro/constants";
import type { Transits } from "@/lib/astro/transits";
import type { TaraBala } from "@/lib/astro/tarabala";
import type { BirthData } from "@/lib/astro/types";

interface Gochara { planet: string; houseFromMoon: number; benefic: boolean; vedhaBy: string | null; verdict: string }
interface Sbc {
  cells: { nakshatra: number; name: string; occupants: string[]; vedhaName: string | null; piercedBy: string[] }[];
  janmaNakshatra: number; janmaAfflicted: boolean; summary: string;
}
const MALEFIC = new Set(["Sun", "Mars", "Saturn", "Rahu", "Ketu"]);

export function TransitsPanel({ birth }: { birth: BirthData }) {
  const [data, setData] = useState<Transits | null>(null);
  const [tara, setTara] = useState<TaraBala | null>(null);
  const [gochara, setGochara] = useState<Gochara[] | null>(null);
  const [sbc, setSbc] = useState<Sbc | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/transits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(birth),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) throw new Error(d.error);
        setData(d.transits);
        setTara(d.taraBala ?? null);
        setGochara(d.gochara ?? null);
        setSbc(d.sarvatobhadra ?? null);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [birth]);

  if (loading)
    return <p className="text-sm text-amber-100/50">Reading the current sky…</p>;
  if (error) return <p className="text-sm text-rose-300">{error}</p>;
  if (!data) return null;

  const ss = data.sadeSati;
  return (
    <div className="space-y-4">
      <p className="text-xs text-amber-100/40">
        Transits for {new Date(data.date).toLocaleString()}
      </p>

      <div
        className={`rounded-xl border p-4 ${
          ss.active
            ? "border-rose-300/30 bg-rose-400/10"
            : ss.smallPanoti
              ? "border-amber-300/30 bg-amber-400/10"
              : "border-emerald-300/20 bg-emerald-400/[0.06]"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{ss.active ? "♄" : "✓"}</span>
          <h4 className="font-semibold text-amber-50">
            Sade Sati:{" "}
            {ss.active ? `${ss.phase} phase` : ss.smallPanoti ? "Lesser Śani" : "Not active"}
          </h4>
        </div>
        <p className="mt-1 text-sm text-amber-100/70">{ss.description}</p>
        <p className="mt-1 text-xs text-amber-100/40">
          Saturn in {SIGNS[ss.saturnSign]}; natal Moon in {SIGNS[ss.moonSign]}.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
        <table className="w-full text-sm">
          <thead className="text-amber-200/70">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
              <th>Graha</th>
              <th>Transiting</th>
              <th>Nakṣatra</th>
              <th className="text-center">From Moon</th>
              <th className="text-center">From Lagna</th>
            </tr>
          </thead>
          <tbody className="text-amber-50/90">
            {data.positions.map((p) => (
              <tr
                key={p.planet}
                className="border-t border-white/10 [&>td]:px-3 [&>td]:py-2"
              >
                <td className="font-medium">
                  {p.planet}
                  <span className="ml-1 text-amber-50/40">
                    {PLANET_SANSKRIT[p.planet]}
                  </span>
                  {p.retrograde && <span className="ml-1 text-rose-300/80">℞</span>}
                </td>
                <td>
                  {SIGNS[p.signIndex]}{" "}
                  <span className="text-amber-50/40">
                    {p.degreeInSign.toFixed(1)}°
                  </span>
                </td>
                <td className="text-amber-50/70">{NAKSHATRAS[p.nakshatraIndex].name}</td>
                <td className="text-center tabular-nums">{p.houseFromMoon}</td>
                <td className="text-center tabular-nums">{p.houseFromLagna}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tāra Bala — nakṣatra transit strength from the birth star */}
      {tara && (
        <div>
          <h4 className="mb-1 text-sm font-semibold uppercase tracking-wider text-amber-200/80">
            Tāra Bala · from Janma nakṣatra ({tara.janmaNakshatra})
          </h4>
          <p className="mb-2 text-xs text-amber-100/50">{tara.summary}</p>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {tara.planets.map((p) => (
              <div
                key={p.planet}
                className={`flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm ${
                  p.auspicious
                    ? "border-emerald-300/20 bg-emerald-400/[0.06]"
                    : "border-rose-300/25 bg-rose-400/[0.06]"
                }`}
              >
                <span className="font-medium text-amber-50">{p.planet}</span>
                <span className="text-xs">
                  <span className={p.auspicious ? "text-emerald-200" : "text-rose-200"}>
                    {p.tara}
                  </span>
                  <span className="ml-1 text-amber-100/40">{p.nakshatra}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-amber-100/40">
            Counting from your birth star to each transiting planet's star gives
            its tārā. Vipat, Pratyak &amp; Vadha (red) are inauspicious; the rest
            support. This is the nakṣatra-transit judgement read from the
            Sarvatobhadra / Tārā chakra.
          </p>
        </div>
      )}

      {/* Gochara — Parāśari transit results from the Moon, with Vedha */}
      {gochara && (
        <div>
          <h4 className="mb-1 text-sm font-semibold uppercase tracking-wider text-amber-200/80">
            Gochara · transit results from the Moon
          </h4>
          <p className="mb-2 text-xs text-amber-100/45">
            Each planet gives good results transiting certain houses from your
            natal Moon; a Vedha (another planet in the paired house) obstructs it.
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {gochara.map((g) => (
              <div
                key={g.planet}
                className={`rounded-lg border px-3 py-1.5 text-xs ${
                  g.benefic && !g.vedhaBy
                    ? "border-emerald-300/20 bg-emerald-400/[0.06]"
                    : g.vedhaBy
                      ? "border-amber-300/20 bg-amber-400/[0.05]"
                      : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <span className="font-medium text-amber-50">{g.planet}</span>{" "}
                <span className="text-amber-100/60">{g.houseFromMoon}th from Moon</span>{" "}
                {g.benefic ? (
                  <span className={g.vedhaBy ? "text-amber-200" : "text-emerald-200"}>
                    {g.vedhaBy ? `✓ but Vedha by ${g.vedhaBy}` : "✓ favourable"}
                  </span>
                ) : (
                  <span className="text-amber-100/45">testing</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sarvatobhadra — nakṣatra vedha chakra */}
      {sbc && (
        <div>
          <h4 className="mb-1 text-sm font-semibold uppercase tracking-wider text-amber-200/80">
            Sarvatobhadra · Nakṣatra Vedha Chakra
          </h4>
          <p className={`mb-2 text-xs ${sbc.janmaAfflicted ? "text-rose-200" : "text-emerald-200/80"}`}>
            {sbc.summary}
          </p>
          <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-7">
            {sbc.cells.map((c) => {
              const isJanma = c.nakshatra === sbc.janmaNakshatra;
              const pierced = c.piercedBy.some((p) => MALEFIC.has(p));
              return (
                <div
                  key={c.nakshatra}
                  className={`rounded border px-1.5 py-1 text-center text-[10px] ${
                    isJanma
                      ? "border-amber-300/50 bg-amber-400/15"
                      : pierced
                        ? "border-rose-300/30 bg-rose-400/10"
                        : c.occupants.length
                          ? "border-white/15 bg-white/[0.05]"
                          : "border-white/10 bg-white/[0.02]"
                  }`}
                  title={c.vedhaName ? `Vedha pair: ${c.vedhaName}` : "no vedha (Chitrā)"}
                >
                  <div className="truncate text-amber-100/70">{c.name}</div>
                  <div className="h-3 font-medium text-amber-50">
                    {c.occupants.map((p) => p.slice(0, 2)).join(" ")}
                  </div>
                  {isJanma && <div className="text-[8px] uppercase text-amber-300">Janma</div>}
                  {pierced && !isJanma && <div className="text-[8px] text-rose-300">vedha</div>}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-amber-100/40">
            Each nakṣatra pierces (vedha) its classical pair. A malefic transiting
            the pair of a star afflicts it — watch your Janma star (amber).
          </p>
        </div>
      )}
    </div>
  );
}
