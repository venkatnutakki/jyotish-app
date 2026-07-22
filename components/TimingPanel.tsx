// "When" — search a date range for windows in which a promised matter is most
// supported.
//
// Three things are always on screen, because without them a timing claim is not
// checkable: the fraction of the range flagged (a scorer that marks half the
// calendar says nothing), the factors that were CONSTANT and therefore excluded,
// and the precision the birth time actually supports. An empty result is a
// designed state, not an error.

"use client";
import { useState } from "react";
import {
  searchTimingWindows, EVENT_PROFILES, type TimingSearch,
} from "@/lib/astro/event-timing";
import { computeChart } from "@/lib/astro/chart";
import { vimshottariDasha } from "@/lib/astro/dasha";
import type { BirthData } from "@/lib/astro/types";

const FACTOR_LABEL: Record<string, string> = {
  dashaConcurrence: "daśā concurrence",
  jupiterTransit: "Jupiter transit to the house",
  saturnTransit: "Saturn transit to the house",
  exactContact: "exact contact by a period lord",
  fastTrigger: "fast trigger (Sun/Mars)",
};

export function TimingPanel({
  birth,
  promiseByKey,
}: {
  birth: BirthData;
  /** 0–1 promise ceiling per event key, from the natal reading. */
  promiseByKey?: Record<string, number>;
}) {
  const [eventKey, setEventKey] = useState(EVENT_PROFILES[0].key);
  const [years, setYears] = useState(5);
  const [result, setResult] = useState<TimingSearch | null>(null);
  const [busy, setBusy] = useState(false);

  const run = () => {
    setBusy(true);
    try {
      const chart = computeChart(birth);
      const dasha = vimshottariDasha(chart);
      const from = new Date();
      const to = new Date(from.getTime());
      to.setUTCFullYear(to.getUTCFullYear() + years);
      // Default ceiling 0.8 when the reading has not been generated — the search
      // still runs, but a promised-matter ceiling would be more honest.
      const ceiling = promiseByKey?.[eventKey] ?? 0.8;
      setResult(searchTimingWindows(chart, birth, dasha, eventKey, from, to, ceiling));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <h3 className="text-sm font-semibold text-amber-50">When is this most supported?</h3>
        <p className="mt-1 text-xs leading-relaxed text-amber-100/60">
          Daśā picks the years, Jupiter and Saturn pick the months, an exact
          contact picks the days — so this can only be as precise as those
          factors, and it says so rather than guessing. Anything constant across
          the range is excluded: a factor that is the same on every date cannot
          tell one date from another.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-xs text-amber-100/60">
            Matter
            <select
              value={eventKey}
              onChange={(e) => setEventKey(e.target.value)}
              className="mt-1 block rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-amber-50 outline-none focus:border-amber-300/60"
            >
              {EVENT_PROFILES.map((p) => (
                <option key={p.key} value={p.key} className="bg-[#1a1426]">
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-amber-100/60">
            Search ahead
            <select
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="mt-1 block rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-amber-50 outline-none focus:border-amber-300/60"
            >
              {[1, 3, 5, 10].map((y) => (
                <option key={y} value={y} className="bg-[#1a1426]">
                  {y} year{y > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={run}
            disabled={busy}
            className="rounded-lg bg-amber-400/90 px-3 py-1.5 text-sm font-semibold text-[#1a1426] hover:bg-amber-300 disabled:opacity-50"
          >
            {busy ? "Searching…" : "Search"}
          </button>
        </div>
      </div>

      {result && (
        <>
          {result.windows.length > 0 ? (
            <div className="space-y-2">
              {result.windows.map((w, i) => (
                <div
                  key={w.fromISO + i}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-amber-50">{w.label}</span>
                    <span className="text-[10px] uppercase tracking-wide text-amber-100/45">
                      relative strength {w.strength}/100
                    </span>
                  </div>
                  <ul className="mt-1.5 space-y-0.5">
                    {w.reasons.map((r, j) => (
                      <li key={j} className="flex gap-1.5 text-xs text-amber-100/60">
                        <span className="text-amber-400/60">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-white/15 bg-white/[0.03] p-3">
              <p className="text-sm font-medium text-amber-100/80">No window found</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-100/60">{result.summary}</p>
            </div>
          )}

          <div className="rounded-xl border border-amber-300/20 bg-amber-400/5 p-3 text-xs leading-relaxed text-amber-100/70">
            {result.windows.length > 0 && <p>{result.summary}</p>}
            <p className="mt-1.5">{result.resolutionNote}</p>
            {result.droppedConstant.length > 0 && (
              <p className="mt-1.5 text-amber-100/50">
                Excluded as constant across this range:{" "}
                {result.droppedConstant.map((k) => FACTOR_LABEL[k] ?? k).join(", ")}. These
                may well matter for <em>whether</em> the matter happens; they
                carry no information about <em>when</em>.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
