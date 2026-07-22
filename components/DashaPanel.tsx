"use client";
import { useState } from "react";
import { DashaTree, type SerializedDasha } from "./DashaTree";
import { ashtottariDasha, charaDasha, narayanaDasha, kalachakraDasha, shoolaDasha, sudasaDasha, drigDasha } from "@/lib/astro/dashas-extra";
import { conditionalDashas } from "@/lib/astro/dashas-conditional";
import { yoginiDasha, type DashaPeriod } from "@/lib/astro/dasha";
import { DASHA_ANTAR } from "@/lib/astro/dasha-phala";
import { checkAntarConditions } from "@/lib/astro/dasha-condition";
import type { PlanetName } from "@/lib/astro/constants";
import type { Chart } from "@/lib/astro/types";

function serialize(periods: DashaPeriod[]): SerializedDasha[] {
  return periods.map((p) => ({
    lord: p.lord,
    start: new Date(p.start).toISOString(),
    end: new Date(p.end).toISOString(),
    sub: p.sub ? serialize(p.sub) : undefined,
  }));
}

const SYSTEMS = [
  { id: "vimshottari", label: "Vimśottari (120y)" },
  { id: "ashtottari", label: "Ashtottari (108y)" },
  { id: "yogini", label: "Yoginī (36y)" },
  { id: "chara", label: "Chara — Jaimini" },
  { id: "narayana", label: "Nārāyaṇa (144y)" },
  { id: "kalachakra", label: "Kālachakra" },
  { id: "shoola", label: "Shoola" },
  { id: "sudasa", label: "Sudāsā" },
  { id: "drig", label: "Dṛg" },
  { id: "conditional", label: "Conditional (BPHS 46)" },
] as const;
type Sys = (typeof SYSTEMS)[number]["id"];

const isNow = (s: string, e: string) => {
  const n = Date.now();
  return new Date(s).getTime() <= n && n < new Date(e).getTime();
};
const fmt = (s: string) => new Date(s).toLocaleDateString();

export function DashaPanel({
  chart,
  vimshottari,
}: {
  chart: Chart;
  vimshottari: SerializedDasha[];
}) {
  const [sys, setSys] = useState<Sys>("vimshottari");
  const conditional = conditionalDashas(chart);
  const [cond, setCond] = useState<string>(conditional.find((d) => d.applicable)?.name ?? conditional[0]?.name ?? "");
  const activeCond = conditional.find((d) => d.name === cond) ?? conditional[0];

  // Current Vimśottari mahā / antar → BPHS antardaśā citation.
  const now = Date.now();
  const maha = vimshottari.find((d) => new Date(d.start).getTime() <= now && now < new Date(d.end).getTime());
  const antar = maha?.sub?.find((s) => new Date(s.start).getTime() <= now && now < new Date(s.end).getTime());
  const citation = maha && antar
    ? DASHA_ANTAR[maha.lord as PlanetName]?.[antar.lord as PlanetName]
    : undefined;
  // The BPHS antardaśā text is a CONDITION followed by an effect ("If the Moon
  // is in a kendra … there will be marriage"). Evaluate the antar lord's actual
  // placement so the "if" can be shown as met or unmet, instead of printing the
  // effect as though it were unconditional.
  const conditionCheck =
    maha && antar && citation
      ? checkAntarConditions(chart, antar.lord as PlanetName, citation)
      : undefined;

  return (
    <div className="space-y-4">
      {maha && antar && (
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-amber-400/[0.06] to-transparent p-4">
          <div className="text-xs uppercase tracking-wider text-amber-200/70">
            Current period · {maha.lord} mahādaśā / {antar.lord} antardaśā
          </div>
          {citation ? (
            <>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200/50">
                Conditional classical rule
              </p>
              <p className="mt-0.5 text-sm text-amber-50/85">
                {citation}{" "}
                <span className="text-[11px] italic text-amber-100/40">
                  — Bṛhat Parāśara Horā Śāstra
                </span>
              </p>
              {conditionCheck && conditionCheck.status !== "n/a" && (
                <p
                  className={`mt-2 rounded-md border px-2 py-1.5 text-[11px] ${
                    conditionCheck.status === "met"
                      ? "border-emerald-300/25 bg-emerald-400/5 text-emerald-200/80"
                      : conditionCheck.status === "adverse"
                        ? "border-rose-300/25 bg-rose-400/5 text-rose-200/80"
                        : "border-white/15 bg-white/5 text-amber-100/60"
                  }`}
                >
                  <span className="font-semibold">
                    {conditionCheck.status === "met"
                      ? "This condition applies to your chart: "
                      : conditionCheck.status === "adverse"
                        ? "The adverse condition holds: "
                        : "This condition does not apply to your chart: "}
                  </span>
                  {conditionCheck.placement}
                  {conditionCheck.status === "unmet" &&
                    " So the favourable result above is not activated by this placement — read it as the rule's promise, not a present fact."}
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-xs text-amber-100/45">
              Classical effect for this exact antardaśā not in the extracted text;
              read the mahā/antar significations above.
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-1 rounded-lg border border-white/15 p-1 text-xs">
        {SYSTEMS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSys(s.id)}
            className={`rounded-md px-3 py-1.5 ${
              sys === s.id ? "bg-amber-400/20 text-amber-100" : "text-amber-100/50 hover:text-amber-100/80"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {sys === "vimshottari" && <DashaTree dasha={vimshottari} />}
      {sys === "ashtottari" && <DashaTree dasha={serialize(ashtottariDasha(chart))} />}

      {sys === "yogini" && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-sm">
            <tbody className="text-amber-50/90">
              {serialize(yoginiDasha(chart)).slice(0, 10).map((y, i) => (
                <tr key={i} className={`border-t border-white/10 first:border-0 [&>td]:px-3 [&>td]:py-1.5 ${isNow(y.start, y.end) ? "bg-amber-400/10 text-amber-100" : ""}`}>
                  <td className="font-medium">{y.lord}{isNow(y.start, y.end) && <span className="ml-2 rounded-full bg-amber-400/30 px-2 py-0.5 text-[10px] uppercase">now</span>}</td>
                  <td className="text-right tabular-nums text-amber-50/50">{fmt(y.start)} → {fmt(y.end)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sys === "chara" && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-sm">
            <tbody className="text-amber-50/90">
              {charaDasha(chart).map((c, i) => (
                <tr key={i} className={`border-t border-white/10 first:border-0 [&>td]:px-3 [&>td]:py-1.5 ${isNow(c.start, c.end) ? "bg-amber-400/10 text-amber-100" : ""}`}>
                  <td className="font-medium">{c.signName}{" "}<span className="text-amber-50/40">{c.years}y</span>{isNow(c.start, c.end) && <span className="ml-2 rounded-full bg-amber-400/30 px-2 py-0.5 text-[10px] uppercase">now</span>}</td>
                  <td className="text-right tabular-nums text-amber-50/50">{fmt(c.start)} → {fmt(c.end)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {sys === "narayana" && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-sm">
            <tbody className="text-amber-50/90">
              {narayanaDasha(chart).map((c, i) => (
                <tr key={i} className={`border-t border-white/10 first:border-0 [&>td]:px-3 [&>td]:py-1.5 ${isNow(c.start, c.end) ? "bg-amber-400/10 text-amber-100" : ""}`}>
                  <td className="font-medium">
                    {c.signName}{" "}<span className="text-amber-50/40">{c.years}y</span>
                    <span className="ml-2 text-[10px] text-amber-100/30">cycle {c.cycle}</span>
                    {isNow(c.start, c.end) && <span className="ml-2 rounded-full bg-amber-400/30 px-2 py-0.5 text-[10px] uppercase">now</span>}
                  </td>
                  <td className="text-right tabular-nums text-amber-50/50">{fmt(c.start)} → {fmt(c.end)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sys === "kalachakra" && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-sm">
            <tbody className="text-amber-50/90">
              {kalachakraDasha(chart).map((c, i) => (
                <tr key={i} className={`border-t border-white/10 first:border-0 [&>td]:px-3 [&>td]:py-1.5 ${isNow(c.start, c.end) ? "bg-amber-400/10 text-amber-100" : ""}`}>
                  <td className="font-medium">
                    {c.signName}{" "}<span className="text-amber-50/40">{c.years}y</span>
                    {c.role && <span className="ml-2 text-[10px] uppercase text-amber-200/50">{c.role}</span>}
                    {isNow(c.start, c.end) && <span className="ml-2 rounded-full bg-amber-400/30 px-2 py-0.5 text-[10px] uppercase">now</span>}
                  </td>
                  <td className="text-right tabular-nums text-amber-50/50">{fmt(c.start)} → {fmt(c.end)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(sys === "shoola" || sys === "sudasa" || sys === "drig") && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-sm">
            <tbody className="text-amber-50/90">
              {(sys === "shoola" ? shoolaDasha(chart) : sys === "sudasa" ? sudasaDasha(chart) : drigDasha(chart)).map((c, i) => (
                <tr key={i} className={`border-t border-white/10 first:border-0 [&>td]:px-3 [&>td]:py-1.5 ${isNow(c.start, c.end) ? "bg-amber-400/10 text-amber-100" : ""}`}>
                  <td className="font-medium">{c.signName} <span className="text-amber-50/40">{c.years}y</span>{isNow(c.start, c.end) && <span className="ml-2 rounded-full bg-amber-400/30 px-2 py-0.5 text-[10px] uppercase">now</span>}</td>
                  <td className="text-right tabular-nums text-amber-50/50">{fmt(c.start)} → {fmt(c.end)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sys === "conditional" && activeCond && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1 text-[11px]">
            {conditional.map((d) => (
              <button
                key={d.name}
                onClick={() => setCond(d.name)}
                className={`rounded-md px-2 py-1 ${cond === d.name ? "bg-amber-400/20 text-amber-100" : "text-amber-100/50 hover:text-amber-100/80"} ${d.applicable ? "ring-1 ring-emerald-400/40" : ""}`}
                title={d.condition}
              >
                {d.name} <span className="text-amber-100/40">{d.total}y</span>{d.applicable ? " ✓" : ""}
              </button>
            ))}
          </div>
          <p className={`text-xs ${activeCond.applicable ? "text-emerald-200/80" : "text-amber-100/50"}`}>
            <b>{activeCond.name}</b> ({activeCond.total}y) — applies when: {activeCond.condition}
            {activeCond.applicable ? " — this chart qualifies." : " — not met by this chart (shown for reference)."}
          </p>
          <DashaTree dasha={serialize(activeCond.periods)} />
        </div>
      )}

      <p className="text-xs text-amber-100/40">
        Vimśottari is the primary timing system; the others corroborate. Chara,
        Nārāyaṇa, Shoola, Sudāsā &amp; Dṛg are Jaimini rāśi daśās (Shoola for
        longevity, Sudāsā for wealth, Dṛg for travel/dharma). Kālachakra is
        nakṣatra-pada based. The <b>Conditional</b> tab holds the eight
        nakṣatra daśās of BPHS ch. 46, each prescribed for a specific natal
        condition (qualifying ones marked ✓).
      </p>
    </div>
  );
}
