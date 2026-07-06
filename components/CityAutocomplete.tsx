"use client";
import { useEffect, useRef, useState } from "react";

export interface CityHit {
  name: string;
  province: string;
  country: string;
  lat: number;
  lng: number;
  tz: string;
}

export function CityAutocomplete({
  value,
  onType,
  onSelect,
  className,
}: {
  value: string;
  onType: (text: string) => void;
  onSelect: (city: CityHit) => void;
  className?: string;
}) {
  const [hits, setHits] = useState<CityHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef(false); // skip search right after a selection

  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 2) {
      setHits([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/cities?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => {
          setHits(d.cities ?? []);
          setOpen((d.cities ?? []).length > 0);
          setActive(0);
        })
        .catch(() => {});
    }, 180);
    return () => clearTimeout(t);
  }, [value]);

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function choose(c: CityHit) {
    skipRef.current = true;
    onSelect(c);
    setOpen(false);
    setHits([]);
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        className={className}
        value={value}
        onChange={(e) => onType(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter" && hits[active]) { e.preventDefault(); choose(hits[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Start typing a city…"
        autoComplete="off"
      />
      {open && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-white/15 bg-[#140f22] py-1 shadow-2xl">
          {hits.map((c, i) => (
            <li key={`${c.name}-${c.province}-${i}`}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(c)}
                className={`flex w-full items-baseline justify-between gap-2 px-3 py-1.5 text-left text-sm ${
                  i === active ? "bg-amber-400/15 text-amber-100" : "text-amber-50/80"
                }`}
              >
                <span className="font-medium">{c.name}</span>
                <span className="truncate text-xs text-amber-100/40">
                  {[c.province, c.country].filter(Boolean).join(", ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
