import { describe, it, expect } from "vitest";
import {
  trustedDepth, activeDashaChain, activation, concurrence, DASHA_LEVELS,
} from "./dasha-depth";
import { computeChart } from "./chart";
import { vimshottariDasha } from "./dasha";
import type { BirthData } from "./types";

const REF: BirthData = {
  name: "Reference",
  year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  latitude: 28.6139, longitude: 77.209, tzOffsetHours: 5.5,
  place: "New Delhi", ayanamsa: "lahiri", nodeType: "mean",
} as BirthData;

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe("trustedDepth — the honesty gate", () => {
  it("maps birth-time accuracy to the classical level thresholds", () => {
    // mahā/antar ±30, pratyantar ±5, sūkṣma ±1.
    expect(trustedDepth(0.5)).toBe(4); // sūkṣma
    expect(trustedDepth(1)).toBe(4);
    expect(trustedDepth(2)).toBe(3); // pratyantar
    expect(trustedDepth(5)).toBe(3);
    expect(trustedDepth(10)).toBe(2); // antar
    expect(trustedDepth(30)).toBe(2);
    expect(trustedDepth(60)).toBe(1); // mahā only
  });

  it("is conservative when accuracy is unknown (antar, not deeper)", () => {
    expect(trustedDepth(undefined)).toBe(2);
  });

  it("never lets a rougher time read a deeper level", () => {
    // Monotonic: worse accuracy → shallower or equal depth.
    let prev = 4;
    for (const m of [0.5, 1, 2, 5, 10, 30, 45, 90, 240]) {
      const d = trustedDepth(m);
      expect(d, `${m} min`).toBeLessThanOrEqual(prev);
      prev = d;
    }
  });
});

describe("activeDashaChain — structure", () => {
  const chart = computeChart(REF);
  const dasha = vimshottariDasha(chart);
  const at = utc(2026, 7, 22);

  it("returns levels in mahā→antar→pratyantar→sūkṣma order", () => {
    const chain = activeDashaChain(dasha, at, 4);
    expect(chain.length).toBeGreaterThanOrEqual(2);
    chain.forEach((link, i) => expect(link.level).toBe(DASHA_LEVELS[i]));
  });

  it("makes every level's period actually contain the instant", () => {
    for (const link of activeDashaChain(dasha, at, 4)) {
      expect(link.start.getTime(), link.level).toBeLessThanOrEqual(at.getTime());
      expect(link.end.getTime(), link.level).toBeGreaterThan(at.getTime());
    }
  });

  it("nests each level strictly inside its parent", () => {
    const chain = activeDashaChain(dasha, at, 4);
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].start.getTime(), `${chain[i].level} start`).toBeGreaterThanOrEqual(chain[i - 1].start.getTime());
      expect(chain[i].end.getTime(), `${chain[i].level} end`).toBeLessThanOrEqual(chain[i - 1].end.getTime());
      // and be strictly shorter than the parent
      const child = chain[i].end.getTime() - chain[i].start.getTime();
      const parent = chain[i - 1].end.getTime() - chain[i - 1].start.getTime();
      expect(child, `${chain[i].level} shorter than parent`).toBeLessThan(parent);
    }
  });

  it("respects maxDepth", () => {
    expect(activeDashaChain(dasha, at, 1)).toHaveLength(1);
    expect(activeDashaChain(dasha, at, 2).length).toBeLessThanOrEqual(2);
    expect(activeDashaChain(dasha, at, 3).length).toBeLessThanOrEqual(3);
  });

  it("is deterministic", () => {
    const a = activeDashaChain(dasha, at, 4).map((c) => `${c.level}:${c.lord}`);
    const b = activeDashaChain(dasha, at, 4).map((c) => `${c.level}:${c.lord}`);
    expect(a).toEqual(b);
  });

  it("holds the classical sub-period proportion at every level", () => {
    // Each level's length must equal parentYears × lordYears / 120 — the same
    // proportional rule that defines antardaśā, applied all the way down.
    const YEARS: Record<string, number> = {
      Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
    };
    const YEAR_MS = 365.25 * 24 * 3600 * 1000;
    const chain = activeDashaChain(dasha, at, 4);
    for (let i = 1; i < chain.length; i++) {
      const parentYears = (chain[i - 1].end.getTime() - chain[i - 1].start.getTime()) / YEAR_MS;
      const childYears = (chain[i].end.getTime() - chain[i].start.getTime()) / YEAR_MS;
      const expected = (parentYears * YEARS[chain[i].lord]) / 120;
      expect(childYears, `${chain[i].level} ${chain[i].lord}`).toBeCloseTo(expected, 4);
    }
  });
});

describe("activation — gated by accuracy", () => {
  const chart = computeChart(REF);
  const dasha = vimshottariDasha(chart);
  const at = utc(2026, 7, 22);

  it("reads only to antar when accuracy is unknown", () => {
    const a = activation(dasha, undefined, at);
    expect(a.depth).toBe(2);
    expect(a.chain.length).toBeLessThanOrEqual(2);
  });

  it("reads deeper only as accuracy tightens", () => {
    expect(activation(dasha, 60, at).chain.length).toBeLessThanOrEqual(1);
    expect(activation(dasha, 20, at).chain.length).toBeLessThanOrEqual(2);
    expect(activation(dasha, 3, at).chain.length).toBeLessThanOrEqual(3);
    expect(activation(dasha, 0.5, at).chain.length).toBeLessThanOrEqual(4);
    // deeper accuracy never yields a SHORTER chain
    expect(activation(dasha, 0.5, at).chain.length)
      .toBeGreaterThanOrEqual(activation(dasha, 60, at).chain.length);
  });

  it("collects the chain's lords into the active set", () => {
    const a = activation(dasha, 0.5, at);
    for (const link of a.chain) expect(a.lords.has(link.lord)).toBe(true);
  });

  it("explains the depth limit in the note", () => {
    expect(activation(dasha, undefined, at).note).toMatch(/unstated|antardaśā/);
    expect(activation(dasha, 0.5, at).note).toMatch(/±0.5 min|sūkṣma/);
  });
});

describe("concurrence — the intersection measure", () => {
  const chart = computeChart(REF);
  const dasha = vimshottariDasha(chart);
  const chain = activeDashaChain(dasha, utc(2026, 7, 22), 4);

  it("counts how many chain levels a significator set touches", () => {
    // The whole chain's own lords must all count.
    const allLords = new Set(chain.map((c) => c.lord));
    expect(concurrence(chain, allLords)).toBe(chain.length);
    // An empty set touches nothing.
    expect(concurrence(chain, new Set())).toBe(0);
    // A single lord counts once per level it appears at.
    const first = chain[0].lord;
    const appearances = chain.filter((c) => c.lord === first).length;
    expect(concurrence(chain, new Set([first]))).toBe(appearances);
  });
});
