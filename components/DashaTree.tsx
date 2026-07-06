"use client";
import { useState } from "react";
import type { DashaPeriod } from "@/lib/astro/dasha";

interface SerializedDasha {
  lord: string;
  start: string;
  end: string;
  sub?: SerializedDasha[];
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isActive(start: string, end: string): boolean {
  const now = Date.now();
  return new Date(start).getTime() <= now && now < new Date(end).getTime();
}

function Period({ d }: { d: SerializedDasha }) {
  const active = isActive(d.start, d.end);
  const [open, setOpen] = useState(active);
  return (
    <div className="rounded-lg border border-white/10">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
          active ? "bg-amber-400/15 text-amber-100" : "text-amber-50/80"
        }`}
      >
        <span className="font-medium">
          {d.sub ? (open ? "▾ " : "▸ ") : ""}
          {d.lord} Daśā
          {active && (
            <span className="ml-2 rounded-full bg-amber-400/30 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-100">
              current
            </span>
          )}
        </span>
        <span className="tabular-nums text-amber-50/50">
          {fmtDate(d.start)} → {fmtDate(d.end)}
        </span>
      </button>
      {open && d.sub && (
        <div className="space-y-1 px-3 pb-2">
          {d.sub.map((s, i) => (
            <div
              key={i}
              className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                isActive(s.start, s.end)
                  ? "bg-amber-400/10 text-amber-100"
                  : "text-amber-50/60"
              }`}
            >
              <span>{s.lord}</span>
              <span className="tabular-nums text-amber-50/40">
                {fmtDate(s.start)} → {fmtDate(s.end)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DashaTree({ dasha }: { dasha: SerializedDasha[] }) {
  return (
    <div className="space-y-2">
      {dasha.map((d, i) => (
        <Period key={i} d={d} />
      ))}
    </div>
  );
}

export type { SerializedDasha };
