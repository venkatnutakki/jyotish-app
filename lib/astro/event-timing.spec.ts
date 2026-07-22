import { describe, it, expect } from "vitest";
import { searchTimingWindows, EVENT_PROFILES } from "./event-timing";
import { computeChart } from "./chart";
import { vimshottariDasha } from "./dasha";
import type { BirthData } from "./types";

const REF: BirthData = {
  name: "Reference",
  year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  latitude: 28.6139, longitude: 77.209, tzOffsetHours: 5.5,
  place: "New Delhi", ayanamsa: "lahiri", nodeType: "mean",
} as BirthData;

function corpus(n: number): BirthData[] {
  const places: Array<[string, number, number, number]> = [
    ["Delhi", 28.6139, 77.209, 5.5], ["London", 51.5, -0.13, 0],
    ["Sydney", -33.87, 151.2, 10], ["Quito", -0.18, -78.47, -5],
  ];
  const out: BirthData[] = [];
  for (let i = 0; i < n; i++) {
    const [place, lat, lon, tz] = places[i % places.length];
    out.push({
      name: `S${i}`, year: 1960 + (i % 45), month: 1 + ((i * 5) % 12),
      day: 1 + ((i * 11) % 28), hour: (i * 13) % 24, minute: (i * 17) % 60,
      latitude: lat, longitude: lon, tzOffsetHours: tz, place,
      ayanamsa: "lahiri", nodeType: "mean",
    } as BirthData);
  }
  return out;
}

const FROM = new Date(Date.UTC(2026, 0, 1));
const TO = new Date(Date.UTC(2027, 0, 1));

function search(b: BirthData, key = "marriage", ceiling = 0.8) {
  const chart = computeChart(b);
  return searchTimingWindows(chart, b, vimshottariDasha(chart), key, FROM, TO, ceiling);
}

describe("event timing — the flagged-fraction budget", () => {
  it("never flags more than a small share of the range", () => {
    // A naive additive scorer flags 30–50% of the calendar, which is worthless.
    // The budget is the whole point of the calibration step.
    let worst = 0;
    for (const b of corpus(60)) {
      for (const p of EVENT_PROFILES.slice(0, 3)) {
        const r = search(b, p.key);
        worst = Math.max(worst, r.flaggedFraction);
        expect(r.flaggedFraction, `${b.name}/${p.key}`).toBeLessThanOrEqual(0.15);
      }
    }
    console.log(`  worst flagged fraction across the corpus: ${(100 * worst).toFixed(1)}%`);
  });

  it("reports the fraction it flagged, so the claim can be judged", () => {
    const r = search(REF);
    if (r.windows.length) expect(r.summary).toMatch(/days searched/);
    expect(r.flaggedFraction).toBeGreaterThanOrEqual(0);
  });
});

describe("event timing — an empty answer must be reachable", () => {
  it("returns no windows for at least some charts", () => {
    // "No window" is a first-class result. An engine that always finds one is
    // not answering the question.
    let empty = 0;
    let total = 0;
    for (const b of corpus(60)) {
      for (const p of EVENT_PROFILES.slice(0, 3)) {
        total++;
        if (!search(b, p.key).windows.length) empty++;
      }
    }
    console.log(`  empty results: ${empty} of ${total} searches`);
    expect(empty, "an engine that always finds a window is not answering").toBeGreaterThan(0);
  });

  it("explains an empty result rather than failing silently", () => {
    for (const b of corpus(40)) {
      const r = search(b, "children");
      if (!r.windows.length) {
        expect(r.summary.length).toBeGreaterThan(60);
        expect(r.summary).toMatch(/legitimate answer|no window|does not promise|nothing is flagged|constant/i);
      }
    }
  });

  it("finds nothing at all when the chart does not promise the matter", () => {
    const r = search(REF, "marriage", 0);
    expect(r.windows).toHaveLength(0);
    expect(r.summary).toMatch(/does not promise/i);
  });
});

describe("event timing — no constant may score", () => {
  it("drops every factor that did not vary across the range", () => {
    for (const b of corpus(40)) {
      const r = search(b, "career");
      for (const a of r.audit) {
        if (!a.varies) {
          expect(r.droppedConstant, `${a.key} constant but not dropped`).toContain(a.key);
          expect(a.share, `${a.key} constant but scored`).toBe(0);
        }
      }
    }
  });

  it("gives every scoring factor a real standard deviation", () => {
    for (const b of corpus(30)) {
      const r = search(b, "wealth");
      for (const a of r.audit) {
        if (a.varies) expect(a.sd, `${a.key}`).toBeGreaterThan(0);
      }
    }
  });

  it("shares sum to about 1 across the varying factors", () => {
    for (const b of corpus(30)) {
      const r = search(b, "property");
      const varying = r.audit.filter((a) => a.varies);
      if (!varying.length || !r.windows.length) continue;
      const sum = varying.reduce((s, a) => s + a.share, 0);
      expect(sum).toBeGreaterThan(0.95);
      expect(sum).toBeLessThan(1.05);
    }
  });
});

describe("event timing — honest output", () => {
  it("caps strength by the promise ceiling", () => {
    const strong = search(REF, "career", 1.0);
    const weak = search(REF, "career", 0.3);
    const maxOf = (r: ReturnType<typeof search>) =>
      r.windows.length ? Math.max(...r.windows.map((w) => w.strength)) : 0;
    expect(maxOf(weak)).toBeLessThanOrEqual(maxOf(strong));
    for (const w of strong.windows) expect(w.strength).toBeLessThanOrEqual(100);
  });

  it("always states the displacement band from birth-time uncertainty", () => {
    const unstated = search(REF);
    expect(unstated.resolutionNote).toMatch(/unstated|shift/i);
    const precise = search({ ...REF, timeAccuracyMinutes: 1 } as BirthData);
    expect(precise.resolutionNote).toMatch(/±1 min/);
    for (const w of precise.windows) expect(w.displacementDays).toBeLessThan(unstated.windows[0]?.displacementDays ?? 1e9);
  });

  it("coarsens its own precision to match the birth-time uncertainty", () => {
    // The self-policing property: a daśā date floats ~30 days per minute of
    // birth-time error, so a three-day window under a ±903-day band would be
    // absurd. The label must never claim more than the input supports.
    const cases: Array<[number | undefined, string[]]> = [
      [1, ["day", "month"]],
      [5, ["month", "season"]],
      [30, ["orderOnly"]],
      [undefined, ["orderOnly"]],
    ];
    for (const [acc, allowed] of cases) {
      const b = acc == null ? REF : ({ ...REF, timeAccuracyMinutes: acc } as BirthData);
      const chart = computeChart(b);
      const r = searchTimingWindows(
        chart, b, vimshottariDasha(chart), "career",
        new Date(Date.UTC(2026, 0, 1)), new Date(Date.UTC(2031, 0, 1)), 0.85
      );
      for (const w of r.windows) {
        expect(allowed, `±${acc ?? "unstated"} min → ${w.granularity}`).toContain(w.granularity);
        expect(w.label.length).toBeGreaterThan(3);
      }
    }
  });

  it("refuses to print a date at all when the timeline floats by years", () => {
    const r = search(REF, "career"); // accuracy unstated → ±903 days
    for (const w of r.windows) {
      expect(w.granularity).toBe("orderOnly");
      expect(w.label).toMatch(/not reliable/i);
      // Must not present a day-precise date in the label.
      expect(w.label).not.toMatch(/\b\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/);
    }
  });

  it("never presents strength as a probability", () => {
    const r = search(REF);
    if (r.windows.length) {
      expect(r.summary).toMatch(/not a probability/i);
    }
  });

  it("orders windows by strength and keeps each interval coherent", () => {
    for (const b of corpus(30)) {
      const r = search(b, "marriage");
      for (let i = 1; i < r.windows.length; i++) {
        expect(r.windows[i - 1].strength).toBeGreaterThanOrEqual(r.windows[i].strength);
      }
      for (const w of r.windows) {
        expect(new Date(w.toISO).getTime()).toBeGreaterThanOrEqual(new Date(w.fromISO).getTime());
        expect(w.reasons.length).toBeGreaterThan(0);
      }
    }
  });
});
