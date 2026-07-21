"use client";
import { useEffect, useState } from "react";
import { installApiShim } from "@/lib/api-shim";
import type { Chart } from "@/lib/astro/types";

// Offline build: route /api/* calls to the local compute layer (no-op elsewhere).
installApiShim();
import { SouthChart } from "./SouthChart";
import { NorthChart } from "./NorthChart";
import { PlanetTable } from "./PlanetTable";
import { type SerializedDasha } from "./DashaTree";
import { DashaPanel } from "./DashaPanel";
import { AshtakavargaPanel } from "./AshtakavargaPanel";
import { TransitsPanel } from "./TransitsPanel";
import { ShadbalaPanel } from "./ShadbalaPanel";
import { JaiminiPanel } from "./JaiminiPanel";
import { KpPanel } from "./KpPanel";
import { ForecastPanel } from "./ForecastPanel";
import { PanchangPanel } from "./PanchangPanel";
import { UpagrahaPanel } from "./UpagrahaPanel";
import { bhavaChalitChart } from "@/lib/astro/charts-extra";
import { FullReport } from "./FullReport";
import { PredictionCards, type LifePredictionView } from "./PredictionCards";
import { CompatibilityView } from "./CompatibilityView";
import { AskPanel } from "./AskPanel";
import { ChatPanel } from "./ChatPanel";
import { SpecialPanel } from "./SpecialPanel";
import { VarshaphalPanel } from "./VarshaphalPanel";
import { MuhurtaPanel } from "./MuhurtaPanel";
import { PrashnaPanel } from "./PrashnaPanel";
import { computeVarga, VARGAS } from "@/lib/astro/varga";
import { computeYogas } from "@/lib/astro/yogas";
import { PLANET_SANSKRIT, SIGNS } from "@/lib/astro/constants";
import { APP_VERSION, isDesktop } from "@/lib/desktop";
import { getAiConfig, setAiConfig } from "@/lib/ai/ai-config";
import { authEnabled, currentUser, onAuthChange, signOut, refreshIfNeeded, type AuthUser } from "@/lib/auth/auth";
import { cloudEnabled, pullCharts, pushCharts } from "@/lib/auth/charts-cloud";
import { AuthModal } from "./AuthModal";
import { CityAutocomplete, type CityHit } from "./CityAutocomplete";
import { zoneOffsetHours } from "@/lib/geo";

const field =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-amber-50 outline-none focus:border-amber-300/60";

// Decimal-hours timezone → "UTC+5:30" for display (5.5 = +5:30).
function fmtTzOffset(dec: string): string {
  const n = Number(dec);
  if (!isFinite(n) || dec.trim() === "") return "";
  const sign = n < 0 ? "−" : "+";
  const abs = Math.abs(n);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `UTC${sign}${h}:${String(m).padStart(2, "0")}`;
}

interface BirthPayload {
  name: string;
  place: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  tzOffsetHours: number;
  latitude: number;
  longitude: number;
  ayanamsa?: "lahiri" | "raman" | "kp";
  nodeType?: "mean" | "true";
}

/** Minimal Markdown renderer for headings, bullets and **bold**. */
function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  const bold = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i} className="text-amber-100">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  return (
    <div className="space-y-2 text-sm leading-relaxed text-amber-50/85">
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <div key={i} className="h-1" />;
        if (line.startsWith("### "))
          return (
            <h4 key={i} className="pt-1 text-sm font-semibold text-amber-200">
              {line.slice(4)}
            </h4>
          );
        if (line.startsWith("## "))
          return (
            <h3 key={i} className="pt-2 text-base font-semibold text-amber-200">
              {line.slice(3)}
            </h3>
          );
        if (line.startsWith("# "))
          return (
            <h2 key={i} className="pt-2 text-lg font-bold text-amber-100">
              {line.slice(2)}
            </h2>
          );
        if (/^[-•]\s/.test(line))
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-amber-400">•</span>
              <span>{bold(line.replace(/^[-•]\s/, ""))}</span>
            </div>
          );
        return <p key={i}>{bold(line)}</p>;
      })}
    </div>
  );
}

function VargaPlacements({ chart }: { chart: Chart }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <table className="w-full text-sm">
        <thead className="text-amber-200/70">
          <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
            <th>Graha</th>
            <th>Sign</th>
            <th className="text-center">House</th>
          </tr>
        </thead>
        <tbody className="text-amber-50/90">
          <tr className="border-t border-white/10 [&>td]:px-3 [&>td]:py-2">
            <td className="font-medium text-amber-300">Lagna</td>
            <td>{SIGNS[chart.ascendantSignIndex]}</td>
            <td className="text-center">1</td>
          </tr>
          {chart.planets.map((p) => (
            <tr
              key={p.planet}
              className="border-t border-white/10 [&>td]:px-3 [&>td]:py-2"
            >
              <td className="font-medium">
                {p.planet}
                <span className="ml-1 text-amber-50/40">
                  {PLANET_SANSKRIT[p.planet]}
                </span>
                {p.retrograde && (
                  <span className="ml-1 text-rose-300/80">℞</span>
                )}
              </td>
              <td>{SIGNS[p.signIndex]}</td>
              <td className="text-center tabular-nums">{p.house}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type SavedChart = { name: string; form: FormState };
type FormState = {
  name: string;
  date: string;
  time: string;
  city: string;
  lat: string;
  lon: string;
  tz: string;
  ianaTz?: string; // IANA zone from the city, for date-aware offset
  ayanamsa?: "lahiri" | "raman" | "kp";
  nodeType?: "mean" | "true";
};
type Tab = "chart" | "chat" | "ask" | "ashtakavarga" | "shadbala" | "jaimini" | "kp" | "panchang" | "upagraha" | "special" | "dasha" | "varsha" | "muhurta" | "prashna" | "transits" | "forecast" | "reading";

const SAVED_KEY = "jyotish.saved";

function AboutModal({
  onClose,
  user,
  onLogin,
  onLogout,
}: {
  onClose: () => void;
  user: AuthUser | null;
  onLogin: () => void;
  onLogout: () => void;
}) {
  const [version, setVersion] = useState(APP_VERSION);
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("deepseek");
  const [keyStatus, setKeyStatus] = useState<"none" | "set" | "saved" | "saving">("none");
  // Offline (mobile) build: no Electron bridge, so the key lives in localStorage.
  const offline = process.env.NEXT_PUBLIC_OFFLINE === "1";
  const showKeyBox = isDesktop() || offline;
  useEffect(() => {
    if (isDesktop() && window.jyotish) {
      window.jyotish.getVersion().then(setVersion).catch(() => {});
      window.jyotish.getAiKey().then((r) => {
        setKeyStatus(r.hasKey ? "set" : "none");
        if (r.provider) setProvider(r.provider);
      }).catch(() => {});
    } else if (offline) {
      const cfg = getAiConfig();
      if (cfg) { setKeyStatus("set"); setProvider(cfg.provider); }
    }
  }, [offline]);

  async function saveKey() {
    setKeyStatus("saving");
    if (isDesktop() && window.jyotish) {
      const r = await window.jyotish.setAiKey(provider, apiKey);
      setKeyStatus(r.ok ? "saved" : "none");
    } else {
      // Mobile / offline: persist on-device only.
      setAiConfig(provider, apiKey.trim());
      setKeyStatus("saved");
    }
    setApiKey("");
  }

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/15 bg-[#140f22] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="text-3xl">✷</span>
          <div>
            <h2 className="text-xl font-bold text-amber-50">
              Jyotish<span className="text-amber-400">·</span>
            </h2>
            <p className="text-xs text-amber-100/50">
              Vedic astrology · v{version}
              {isDesktop() ? " · Desktop" : " · Web"}
            </p>
          </div>
        </div>

        <p className="mb-4 text-sm text-amber-100/70">
          A complete Vedic astrology suite computing charts, divisions, dashas
          and strengths to the arc-second, with interpretations grounded in the
          classical texts.
        </p>

        {/* Account */}
        {authEnabled() && (
          <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
            {user ? (
              <>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-amber-200/60">Signed in</p>
                  <p className="truncate text-sm text-amber-50" title={user.email}>{user.email}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-amber-100/80 hover:bg-white/10"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-amber-100/70">Save your charts to your account.</p>
                <button
                  onClick={onLogin}
                  className="shrink-0 rounded-lg border border-amber-300/40 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-400/20"
                >
                  Log in
                </button>
              </>
            )}
          </div>
        )}

        <div className="space-y-3 text-sm">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-200/70">
              Systems
            </h3>
            <p className="text-amber-50/80">
              Parāśari · Jaimini · Krishnamurti Paddhati (KP)
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-200/70">
              Includes
            </h3>
            <p className="text-amber-50/80">
              16 divisional charts (D1–D60) · Ashtakavarga · Ṣaḍbala · Vimśottari
              daśā · Chara kārakas & arudha · KP sub-lords, Placidus cusps &
              significators · 35+ yogas · panchāṅga · compatibility · transits &
              Sade Sati · full printable report.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-200/70">
              Classical sources
            </h3>
            <p className="text-amber-50/80">
              BPHS · Bhrigu Sutras · Saravali · B.V. Raman (Graha & Bhava Balas,
              How to Judge a Horoscope, 300 Combinations) · Jaimini Sutras.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-200/70">
              Computation
            </h3>
            <p className="text-amber-50/80">
              Sidereal (Lahiri ayanāṃśa) · high-precision ephemeris · runs fully
              offline.
            </p>
          </div>
          {showKeyBox && (() => {
            const PROVIDERS: Record<string, { label: string; placeholder: string; url: string }> = {
              deepseek: { label: "DeepSeek (V3) — direct, cheap & strong", placeholder: "sk-…", url: "platform.deepseek.com/api_keys" },
              openrouter: { label: "DeepSeek-V3 via OpenRouter — free", placeholder: "sk-or-…", url: "openrouter.ai/keys" },
              cerebras: { label: "Cerebras (Qwen-3 / Llama-3.3) — free, fast", placeholder: "csk-…", url: "cloud.cerebras.ai" },
              gemini: { label: "Google Gemini 2.5 Flash — free", placeholder: "AIza…", url: "aistudio.google.com/app/apikey" },
              groq: { label: "Groq (Llama-3.3-70B) — free", placeholder: "gsk_…", url: "console.groq.com/keys" },
            };
            const info = PROVIDERS[provider] ?? PROVIDERS.deepseek;
            return (
              <div className="rounded-lg border border-amber-300/25 bg-amber-400/[0.06] p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-200/70">
                  AI Reading — choose a free provider
                </h3>
                <p className="mt-1 text-xs text-amber-100/50">
                  Pick a provider and paste its free API key to enable AI-written
                  readings. Stored only on {offline ? "this device" : "this PC"};
                  takes effect immediately.
                  {keyStatus === "set" && " A key is currently saved."}
                </p>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-amber-50 outline-none focus:border-amber-300/60"
                >
                  {Object.entries(PROVIDERS).map(([id, p]) => (
                    <option key={id} value={id} className="bg-[#1a1426]">{p.label}</option>
                  ))}
                </select>
                <div className="mt-2 flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={keyStatus === "set" ? "•••••• (key saved)" : info.placeholder}
                    className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-amber-50 outline-none focus:border-amber-300/60"
                  />
                  <button
                    onClick={saveKey}
                    disabled={keyStatus === "saving" || apiKey.trim().length < 8}
                    className="rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-40"
                  >
                    {keyStatus === "saving" ? "…" : "Save"}
                  </button>
                </div>
                {keyStatus === "saved" && (
                  <p className="mt-1 text-xs text-emerald-300">
                    Key saved ✓ — generate a reading to use it.
                  </p>
                )}
                <p className="mt-1 text-[11px] text-amber-100/30">
                  Get a free key at {info.url}. Without one, the classical readings
                  and all predictions still work fully offline.
                </p>
              </div>
            );
          })()}

          <p className="rounded-lg border border-amber-300/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-100/50">
            For guidance and self-reflection. Astrological readings are not a
            substitute for professional advice.
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export function ChartApp() {
  const [mode, setMode] = useState<"chart" | "compat">("chart");
  const [form, setForm] = useState<FormState>({
    name: "",
    date: "1990-08-15",
    time: "14:30",
    city: "New Delhi",
    lat: "28.6139",
    lon: "77.2090",
    tz: "5.5",
  });
  const [chart, setChart] = useState<Chart | null>(null);
  const [dasha, setDasha] = useState<SerializedDasha[]>([]);
  const [style, setStyle] = useState<"north" | "south">("north");
  const [varga, setVarga] = useState(1);
  const [tab, setTab] = useState<Tab>("chart");
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    if (!authEnabled()) return;
    refreshIfNeeded().then(() => setUser(currentUser()));
    return onAuthChange(setUser);
  }, []);
  // On the WEB (accounts enabled, not the offline desktop/Android builds), saved
  // charts are account-only: you must be logged in to save or see them. Offline
  // builds keep saving locally with no login.
  const requireLoginToSave =
    authEnabled() && !isDesktop() && process.env.NEXT_PUBLIC_OFFLINE !== "1";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [birthPayload, setBirthPayload] = useState<BirthPayload | null>(null);
  const [reading, setReading] = useState<{
    text: string;
    source: string;
    note?: string;
    provider?: string;
    predictions?: LifePredictionView[];
  } | null>(null);
  const [readingLoading, setReadingLoading] = useState(false);
  const [saved, setSaved] = useState<SavedChart[]>([]);
  // Hide the local list whenever gated + logged out (e.g. after logout).
  useEffect(() => {
    if (requireLoginToSave && !user) setSaved((s) => (s.length ? [] : s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, requireLoginToSave]);
  const [shareMsg, setShareMsg] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [report, setReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // A city was picked from the autocomplete → fill lat/lon and the timezone
  // offset computed for the birth date (handles historical daylight saving).
  function selectCity(c: CityHit) {
    const off = zoneOffsetHours(c.tz, form.date);
    setForm((f) => ({
      ...f,
      city: c.name,
      lat: c.lat.toFixed(4),
      lon: c.lng.toFixed(4),
      ianaTz: c.tz,
      tz: off !== null ? String(off) : f.tz,
    }));
  }

  // When the date changes, re-derive the offset for the stored zone (DST).
  function changeDate(date: string) {
    setForm((f) => {
      const off = f.ianaTz ? zoneOffsetHours(f.ianaTz, date) : null;
      return { ...f, date, tz: off !== null ? String(off) : f.tz };
    });
  }

  function formToPayload(f: FormState): BirthPayload {
    const [y, mo, d] = f.date.split("-").map(Number);
    const [h, mi] = f.time.split(":").map(Number);
    return {
      name: f.name,
      place: f.city,
      year: y,
      month: mo,
      day: d,
      hour: h,
      minute: mi,
      tzOffsetHours: Number(f.tz),
      latitude: Number(f.lat),
      longitude: Number(f.lon),
      ayanamsa: f.ayanamsa ?? "lahiri",
      nodeType: f.nodeType ?? "mean",
    };
  }

  async function runChart(f: FormState) {
    setLoading(true);
    setError(null);
    try {
      const payload = formToPayload(f);
      const res = await fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setChart(data.chart);
      setDasha(data.dasha);
      setBirthPayload(payload);
      setReading(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    runChart(form);
  }

  // Load saved charts on mount. On the gated web build, only load them if the
  // user is already logged in (otherwise the list stays hidden until login).
  useEffect(() => {
    if (requireLoginToSave && !currentUser()) return;
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist locally and, when logged in, sync the whole list to the cloud.
  function persistSaved(next: SavedChart[]) {
    setSaved(next);
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    } catch {}
    if (cloudEnabled()) pushCharts(next).catch(() => {});
  }

  // On login, merge cloud charts with local (union by name) so a user's saved
  // charts follow them across devices.
  useEffect(() => {
    if (!user || !cloudEnabled()) return;
    let cancelled = false;
    pullCharts<SavedChart>()
      .then((cloud) => {
        if (cancelled) return;
        setSaved((local) => {
          const byName = new Map<string, SavedChart>();
          for (const c of cloud) if (c?.name) byName.set(c.name, c);
          for (const l of local) byName.set(l.name, l); // local wins on conflict
          const merged = [...byName.values()].slice(0, 50);
          try { localStorage.setItem(SAVED_KEY, JSON.stringify(merged)); } catch {}
          pushCharts(merged).catch(() => {});
          return merged;
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  function saveChart() {
    // On the gated web build, saving requires an account — prompt login instead.
    if (requireLoginToSave && !user) {
      setShowAuth(true);
      setShareMsg("Log in to save charts");
      setTimeout(() => setShareMsg(""), 2000);
      return;
    }
    const name = form.name || form.city || "Chart";
    const next = [
      { name, form },
      ...saved.filter((s) => s.name !== name),
    ].slice(0, 50);
    persistSaved(next);
    setShareMsg(cloudEnabled() ? "Saved to your account ✓" : "Saved ✓");
    setTimeout(() => setShareMsg(""), 1500);
  }

  function deleteSaved(name: string) {
    persistSaved(saved.filter((s) => s.name !== name));
  }


  async function generateReading() {
    if (!birthPayload) return;
    setReadingLoading(true);
    try {
      const res = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...birthPayload, stream: true }),
      });
      const ct = res.headers.get("content-type") || "";
      if (res.ok && ct.includes("x-ndjson") && res.body) {
        // Streaming: line 1 is the metadata JSON (cards render immediately),
        // then the reading prose arrives incrementally.
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        let meta: { source: string; note?: string; provider?: string; predictions?: LifePredictionView[] } | null = null;
        let prose = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          if (!meta) {
            const nl = buf.indexOf("\n");
            if (nl < 0) continue;
            meta = JSON.parse(buf.slice(0, nl));
            buf = buf.slice(nl + 1);
            setReadingLoading(false);
          }
          if (meta && buf) {
            prose += buf;
            buf = "";
            const m = meta;
            setReading({ text: prose, source: m.source, note: m.note, provider: m.provider, predictions: m.predictions });
          }
        }
        if (!meta) throw new Error("Empty response");
        return;
      }
      // Non-streaming path (offline build / classical fallback): original JSON.
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setReading({
        text: data.reading,
        source: data.source,
        note: data.note,
        provider: data.provider,
        predictions: data.predictions,
      });
    } catch (err) {
      setReading({
        text: err instanceof Error ? err.message : "Failed to generate reading",
        source: "error",
      });
    } finally {
      setReadingLoading(false);
    }
  }

  async function generateReport() {
    if (!birthPayload) return;
    setReportLoading(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(birthPayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report failed");
    } finally {
      setReportLoading(false);
    }
  }

  async function exportReportPdf() {
    const name = `${report?.chart?.birth?.name || "horoscope"}-jyotish`;
    if (isDesktop() && window.jyotish) {
      const r = await window.jyotish.exportPdf(name);
      if (r.ok) {
        setShareMsg("PDF saved ✓");
        setTimeout(() => setShareMsg(""), 2500);
      } else if (r.error) {
        setShareMsg("Export failed");
      }
    } else {
      window.print(); // web fallback: browser print → Save as PDF
    }
  }

  const displayChart = !chart
    ? null
    : varga === -1
      ? bhavaChalitChart(chart, chart.birth)
      : varga === 1
        ? chart
        : computeVarga(chart, varga);
  const vargaDef =
    VARGAS.find((v) => v.n === varga) ??
    { code: "BC", name: "Bhāva Chalit", meaning: "planets by house cusp (Placidus)" };

  // Seventeen tabs in one flat row gave no indication of where to start or what
  // related to what. Grouping them by the QUESTION each answers — what does the
  // chart say, when do things happen, how strong is it — lets someone who isn't
  // a Jyotiṣa navigate without knowing the vocabulary first. Every tab carries a
  // plain-language hint for the same reason.
  const TAB_META: Record<Tab, { label: string; hint: string }> = {
    chart: { label: "Chart", hint: "The birth chart and its 16 divisional charts" },
    reading: { label: "Reading", hint: "Plain-language interpretation of the whole chart" },
    dasha: { label: "Daśā", hint: "Planetary periods — the timeline of life phases" },
    transits: { label: "Transits", hint: "Where the planets are now, relative to your birth chart" },
    forecast: { label: "Forecast", hint: "The next 12 months, period by period" },
    varsha: { label: "Varṣa", hint: "Annual chart for a chosen year (Tājika)" },
    shadbala: { label: "Strengths", hint: "Ṣaḍbala — the six-fold strength of each planet" },
    ashtakavarga: { label: "Aṣṭakavarga", hint: "Point-score system rating each sign and transit" },
    jaimini: { label: "Jaimini", hint: "A parallel system: chāra kārakas and ārūḍha padas" },
    kp: { label: "KP", hint: "Krishnamurti Paddhati — nakṣatra sub-lord method" },
    special: { label: "Special Pts", hint: "Special lagnas, Bhṛgu Bindu, Argala, Yogi" },
    upagraha: { label: "Upagraha", hint: "Shadow planets and calculated sub-points" },
    panchang: { label: "Panchāṅga", hint: "The five limbs of the day: tithi, vāra, nakṣatra, yoga, karaṇa" },
    muhurta: { label: "Muhūrta", hint: "Choosing an auspicious time for something" },
    chat: { label: "✦ Chat", hint: "Ask follow-up questions about this chart" },
    ask: { label: "Ask", hint: "One question, answered from the classical rules" },
    prashna: { label: "Praśna", hint: "Horary — cast a chart for the moment of a question" },
  };

  const TAB_GROUPS: { name: string; hint: string; tabs: Tab[] }[] = [
    { name: "Overview", hint: "The chart itself and what it says", tabs: ["chart", "reading"] },
    { name: "Timing", hint: "When things happen", tabs: ["dasha", "transits", "forecast", "varsha"] },
    { name: "Strength", hint: "How strong the chart is", tabs: ["shadbala", "ashtakavarga"] },
    { name: "Techniques", hint: "Other classical systems", tabs: ["jaimini", "kp", "special", "upagraha"] },
    { name: "Calendar", hint: "Daily and electional timing", tabs: ["panchang", "muhurta"] },
    { name: "Ask", hint: "Put a question to the chart", tabs: ["chat", "ask", "prashna"] },
  ];

  const activeGroup =
    TAB_GROUPS.find((g) => g.tabs.includes(tab)) ?? TAB_GROUPS[0];

  return (
    <div className="space-y-6">
      {/* --- Mode toggle + About --- */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="flex w-fit rounded-xl border border-white/15 p-1 text-sm">
          {(["chart", "compat"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-4 py-1.5 font-medium ${
                mode === m
                  ? "bg-amber-400/20 text-amber-100"
                  : "text-amber-100/50 hover:text-amber-100/80"
              }`}
            >
              {m === "chart" ? "Birth Chart" : "Compatibility"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {authEnabled() && (user ? (
            <div className="flex items-center gap-2">
              <span className="max-w-[140px] truncate text-xs text-amber-100/60" title={user.email}>
                {user.email}
              </span>
              <button
                onClick={() => { signOut(); }}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-amber-100/60 hover:bg-white/5"
              >
                Log out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="rounded-lg border border-amber-300/40 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-400/20"
            >
              Log in
            </button>
          ))}
          <button
            onClick={() => setShowAbout(true)}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-amber-100/60 hover:bg-white/5"
          >
            ⓘ About
          </button>
        </div>
      </div>

      {showAbout && (
        <AboutModal
          onClose={() => setShowAbout(false)}
          user={user}
          onLogin={() => { setShowAbout(false); setShowAuth(true); }}
          onLogout={() => { signOut(); }}
        />
      )}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {mode === "compat" ? (
        <CompatibilityView />
      ) : report ? (
        <div className="space-y-4">
          <div className="no-print flex flex-wrap items-center gap-2">
            <button
              onClick={() => setReport(null)}
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-amber-100/80 hover:bg-white/10"
            >
              ← Back
            </button>
            <button
              onClick={exportReportPdf}
              className="rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              {isDesktop() ? "📄 Export PDF" : "🖨 Print / Save as PDF"}
            </button>
            <span className="text-xs text-amber-100/40">
              Full horoscope — {report?.chart?.birth?.name || "chart"}
            </span>
            {shareMsg && <span className="text-xs text-emerald-300">{shareMsg}</span>}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 print:border-0 print:bg-white print:p-0">
            <FullReport data={report} />
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
          {/* --- Birth data form --- */}
          <div className="h-fit space-y-4">
            <form
              onSubmit={submit}
              className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-200/80">
                Birth Details
              </h2>
        <div className="space-y-1">
          <label className="text-xs text-amber-100/60">Name</label>
          <input
            className={field}
            value={form.name}
            placeholder="Optional"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-amber-100/60">Date</label>
            <input
              type="date"
              className={field}
              value={form.date}
              onChange={(e) => changeDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-amber-100/60">Time</label>
            <input
              type="time"
              className={field}
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-amber-100/60">
            City <span className="text-amber-100/30">(auto-fills lat/lon/TZ)</span>
          </label>
          <CityAutocomplete
            className={field}
            value={form.city}
            onType={(text) => setForm({ ...form, city: text, ianaTz: undefined })}
            onSelect={selectCity}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-amber-100/60">Lat</label>
            <input
              className={field}
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-amber-100/60">Lon</label>
            <input
              className={field}
              value={form.lon}
              onChange={(e) => setForm({ ...form, lon: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-amber-100/60">
              TZ{" "}
              {fmtTzOffset(form.tz) && (
                <span className="text-amber-100/35">{fmtTzOffset(form.tz)}</span>
              )}
            </label>
            <input
              className={field}
              value={form.tz}
              onChange={(e) => setForm({ ...form, tz: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-amber-100/60">Ayanāṁśa</label>
            <select
              className={field}
              value={form.ayanamsa ?? "lahiri"}
              onChange={(e) => setForm({ ...form, ayanamsa: e.target.value as FormState["ayanamsa"] })}
            >
              <option value="lahiri" className="bg-[#1a1426]">Lahiri — standard</option>
              <option value="raman" className="bg-[#1a1426]">B. V. Raman</option>
              <option value="kp" className="bg-[#1a1426]">KP · Krishnamurti</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-amber-100/60">Rāhu / Ketu</label>
            <select
              className={field}
              value={form.nodeType ?? "mean"}
              onChange={(e) => setForm({ ...form, nodeType: e.target.value as FormState["nodeType"] })}
            >
              <option value="mean" className="bg-[#1a1426]">Mean node — standard</option>
              <option value="true" className="bg-[#1a1426]">True (osculating) node</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Calculating…" : "Generate Chart"}
        </button>
              {error && <p className="text-xs text-rose-300">{error}</p>}
            </form>

            {/* Save / Full Report */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                onClick={saveChart}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-amber-100/80 hover:bg-white/10"
              >
                ★ Save
              </button>
              <button
                onClick={generateReport}
                disabled={reportLoading}
                className="rounded-lg border border-amber-300/40 bg-amber-400/10 px-3 py-1.5 font-medium text-amber-100 hover:bg-amber-400/20 disabled:opacity-50"
              >
                {reportLoading ? "Building…" : "📄 Full Report"}
              </button>
              {shareMsg && <span className="text-emerald-300">{shareMsg}</span>}
            </div>

            {saved.length > 0 && (!requireLoginToSave || user) && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-amber-200/70">
                  <span>Saved Charts</span>
                  <span className="font-normal text-amber-100/30">{saved.length}</span>
                </h3>
                <div className="space-y-1">
                  {saved.map((s) => (
                    <div
                      key={s.name}
                      className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 hover:border-amber-300/30 hover:bg-amber-400/[0.06]"
                    >
                      <button
                        onClick={() => {
                          setForm(s.form);
                          runChart(s.form);
                        }}
                        className="flex-1 text-left"
                      >
                        <div className="text-sm font-medium text-amber-50">
                          {s.name}
                        </div>
                        <div className="text-[11px] text-amber-100/40">
                          {s.form.date} · {s.form.time} · {s.form.city}
                        </div>
                      </button>
                      <button
                        onClick={() => deleteSaved(s.name)}
                        title="Delete"
                        className="rounded px-1.5 text-amber-100/30 opacity-0 transition hover:text-rose-300 group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* --- Results --- */}
          <div className="space-y-6">
            {!chart && (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-white/10 text-amber-100/40">
                Enter birth details to cast a chart
              </div>
            )}
            {chart && (
              <>
                <div>
                  <h2 className="text-lg font-semibold text-amber-50">
                    {chart.birth.name || "Birth Chart"}
                  </h2>
                  <p className="text-xs text-amber-100/50">
                    {chart.birth.place} · Ayanamsa (Lahiri){" "}
                    {chart.ayanamsa.toFixed(3)}°
                  </p>
                </div>

                {/* Tab bar — group row, then the tabs within the active group */}
                <div className="space-y-2">
                  <div
                    className="flex flex-wrap gap-1"
                    role="tablist"
                    aria-label="Section"
                  >
                    {TAB_GROUPS.map((g) => {
                      const active = g.name === activeGroup.name;
                      return (
                        <button
                          key={g.name}
                          role="tab"
                          aria-selected={active}
                          title={g.hint}
                          onClick={() => {
                            if (!g.tabs.includes(tab)) setTab(g.tabs[0]);
                          }}
                          className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                            active
                              ? "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/40"
                              : "text-amber-100/45 hover:bg-white/5 hover:text-amber-100/75"
                          }`}
                        >
                          {g.name}
                        </button>
                      );
                    })}
                  </div>

                  <div
                    className="flex flex-wrap items-center gap-1 border-b border-white/10 pb-px"
                    role="tablist"
                    aria-label={`${activeGroup.name} views`}
                  >
                    {activeGroup.tabs.map((id) => (
                      <button
                        key={id}
                        role="tab"
                        aria-selected={tab === id}
                        title={TAB_META[id].hint}
                        onClick={() => setTab(id)}
                        className={`rounded-t-lg px-3 py-2 text-sm font-medium transition-colors ${
                          tab === id
                            ? "bg-amber-400/15 text-amber-100"
                            : "text-amber-100/50 hover:text-amber-100/80"
                        }`}
                      >
                        {TAB_META[id].label}
                      </button>
                    ))}
                    <span className="ml-auto hidden pr-1 text-xs text-amber-100/35 sm:block">
                      {TAB_META[tab].hint}
                    </span>
                  </div>
                </div>

                {tab === "chart" && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-amber-100/50">
                        <span className="text-amber-200/80">
                          {vargaDef.code} {vargaDef.name}
                        </span>{" "}
                        — {vargaDef.meaning}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={varga}
                          onChange={(e) => setVarga(Number(e.target.value))}
                          className="rounded-lg border border-white/15 bg-[#140f22] px-2 py-1.5 text-xs text-amber-100 outline-none focus:border-amber-300/60"
                        >
                          {VARGAS.map((v) => (
                            <option key={v.code} value={v.n}>
                              {v.code} · {v.name}
                            </option>
                          ))}
                          <option value={-1}>BC · Bhāva Chalit</option>
                        </select>
                        <div className="flex rounded-lg border border-white/15 p-0.5 text-xs">
                          {(["north", "south"] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() => setStyle(s)}
                              className={`rounded-md px-3 py-1.5 capitalize ${
                                style === s
                                  ? "bg-amber-400/20 text-amber-100"
                                  : "text-amber-100/50"
                              }`}
                            >
                              {s} Indian
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-6 xl:grid-cols-2">
                      <div className="flex justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        {style === "north" ? (
                          <NorthChart chart={displayChart!} />
                        ) : (
                          <SouthChart chart={displayChart!} />
                        )}
                      </div>
                      {varga === 1 ? (
                        <PlanetTable chart={chart} />
                      ) : (
                        <VargaPlacements chart={displayChart!} />
                      )}
                    </div>
                    {varga === 1 &&
                      (() => {
                        const yogas = computeYogas(chart);
                        return yogas.length ? (
                          <div>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-200/70">
                              Yogas ({yogas.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {yogas.map((y) => (
                                <span
                                  key={y.name}
                                  title={y.description}
                                  className="rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-xs text-amber-100"
                                >
                                  {y.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null;
                      })()}
                  </div>
                )}

                {tab === "ashtakavarga" && <AshtakavargaPanel chart={chart} />}

                {tab === "shadbala" && birthPayload && (
                  <ShadbalaPanel birth={birthPayload} />
                )}

                {tab === "jaimini" && <JaiminiPanel chart={chart} />}

                {tab === "kp" && birthPayload && (
                  <KpPanel chart={chart} birth={birthPayload} />
                )}

                {tab === "panchang" && birthPayload && (
                  <PanchangPanel birth={birthPayload} />
                )}

                {tab === "upagraha" && birthPayload && (
                  <UpagrahaPanel birth={birthPayload} />
                )}

                {tab === "dasha" && (
                  <DashaPanel chart={chart} vimshottari={dasha} />
                )}

                {tab === "transits" && birthPayload && (
                  <TransitsPanel birth={birthPayload} />
                )}

                {tab === "chat" && birthPayload && (
                  <ChatPanel birth={birthPayload} />
                )}
                {tab === "ask" && birthPayload && (
                  <AskPanel birth={birthPayload} />
                )}

                {tab === "special" && birthPayload && (
                  <SpecialPanel birth={birthPayload} />
                )}

                {tab === "varsha" && birthPayload && (
                  <VarshaphalPanel birth={birthPayload} />
                )}

                {tab === "muhurta" && birthPayload && (
                  <MuhurtaPanel birth={birthPayload} />
                )}

                {tab === "prashna" && birthPayload && (
                  <PrashnaPanel birth={birthPayload} />
                )}

                {tab === "forecast" && birthPayload && (
                  <ForecastPanel birth={birthPayload} />
                )}

                {tab === "reading" && (
                  <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-amber-400/[0.06] to-transparent p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-200/80">
                        Reading
                      </h3>
                      <button
                        onClick={generateReading}
                        disabled={readingLoading}
                        className="rounded-lg border border-amber-300/40 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-100 transition hover:bg-amber-400/20 disabled:opacity-50"
                      >
                        {readingLoading
                          ? "Reading the stars…"
                          : reading
                            ? "Regenerate"
                            : "Generate Reading"}
                      </button>
                    </div>
                    {!reading && !readingLoading && (
                      <p className="text-sm text-amber-100/50">
                        Generate a personalized reading — classical Jyotish
                        analysis, phrased naturally by AI.
                      </p>
                    )}
                    {reading && (
                      <>
                        {reading.predictions && reading.predictions.length > 0 && (
                          <div className="mb-5">
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-200/70">
                              Life Predictions at a Glance
                            </h4>
                            <PredictionCards
                              predictions={reading.predictions}
                              showFactors={false}
                            />
                          </div>
                        )}
                        {reading.source === "classical" && reading.note && (
                          <p className="mb-3 rounded-lg border border-amber-300/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-200/70">
                            {reading.note}
                          </p>
                        )}
                        {reading.source === "ai" && (
                          <p className="mb-3 text-xs text-amber-200/50">
                            ✦ AI reading{reading.provider ? ` (${reading.provider})` : ""}{" "}
                            grounded in the classical analysis.
                          </p>
                        )}
                        <MarkdownLite text={reading.text} />
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
