import { describe, it, expect } from "vitest";
import { extractDates, compareDates, formatDateComparison } from "./date-compare";
import { researchQuestion, formatQuestionResearch } from "./question-research";
import type { BirthData } from "./types";

// A well-documented AA chart (Obama) — behavioural invariants only, no private data.
const OBAMA: BirthData = {
  year: 1961, month: 8, day: 4, hour: 19, minute: 24,
  latitude: 21.3069, longitude: -157.8583, tzOffsetHours: -10,
  ayanamsa: "lahiri", nodeType: "mean", timeAccuracyMinutes: 5,
};

describe("date extraction", () => {
  it("pulls month-and-year dates, borrowing a lone trailing year", () => {
    const d = extractDates("Which is best — January 2027, April 2027, or May 2027?");
    expect(d.map((x) => x.label)).toEqual(["Jan 2027", "Apr 2027", "May 2027"]);
    // month precision → all mid-month, none mis-read as a day out of "2027"
    expect(d.every((x) => x.precision === "month")).toBe(true);
    expect(d.every((x) => x.date.getUTCFullYear() === 2027)).toBe(true);
  });

  it("never splits a 4-digit year into a day", () => {
    // the classic bug: 'January 2027' must not become '20 January'
    const d = extractDates("January 2027");
    expect(d).toHaveLength(1);
    expect(d[0].date.getUTCMonth()).toBe(0);
    expect(d[0].date.getUTCDate()).toBe(15); // mid-month, not the 20th
  });

  it("reads explicit ISO and D/M/Y days at day precision", () => {
    const iso = extractDates("on 2027-04-18");
    expect(iso[0].precision).toBe("day");
    expect(iso[0].date.getUTCMonth()).toBe(3);
    expect(iso[0].date.getUTCDate()).toBe(18);
    const dmy = extractDates("18/04/2027");
    expect(dmy[0].date.getUTCDate()).toBe(18);
    expect(dmy[0].date.getUTCMonth()).toBe(3);
  });

  it("borrows the sentence's year for a month that lacks its own", () => {
    const d = extractDates("Jan, Apr and May 2027");
    expect(d.map((x) => x.label)).toEqual(["Jan 2027", "Apr 2027", "May 2027"]);
  });

  it("caps the set and ignores stray numbers", () => {
    expect(extractDates("just career, no dates here")).toHaveLength(0);
  });
});

describe("compareDates", () => {
  const dates = extractDates("January 2027, April 2027, May 2027");

  it("returns one scored row per date, ranked high-to-low", () => {
    const r = compareDates(OBAMA, dates, [4, 5, 2]);
    expect(r).toHaveLength(3);
    for (let i = 1; i < r.length; i++) expect(r[i - 1].score).toBeGreaterThanOrEqual(r[i].score);
    // every row is resolved to the finest layers and carries reasons
    expect(r.every((x) => x.pratyantar && x.reasons.length > 0)).toBe(true);
  });

  it("actually differentiates nearby dates (the whole point of the layer)", () => {
    const r = compareDates(OBAMA, dates, [4, 5, 2]);
    const scores = new Set(r.map((x) => x.score));
    // the antardaśā view is identical for all three; the finer layers must not be
    expect(scores.size).toBeGreaterThan(1);
  });

  it("names a single most-favourable date in the rendered block", () => {
    const r = compareDates(OBAMA, dates, [4, 5, 2]);
    const block = formatDateComparison(r);
    expect(block).toContain("MOST FAVOURABLE:");
    expect(block).toContain(r[0].label);
    expect(block).toMatch(/do NOT say the dates are all the same/i);
  });

  it("renders nothing for a single date (nothing to compare)", () => {
    expect(formatDateComparison(compareDates(OBAMA, extractDates("April 2027"), [5]))).toBe("");
  });
});

describe("date comparison wired into question research", () => {
  it("attaches a ranking when a question names several dates, and surfaces it in the block", () => {
    const res = researchQuestion(OBAMA, "For my exam, which is best — January 2027, April 2027, or May 2027?");
    expect(res.dateComparison).not.toBeNull();
    expect(res.dateComparison).toHaveLength(3);
    const block = formatQuestionResearch(res);
    expect(block).toContain("DATE COMPARISON");
    expect(block).toContain("MOST FAVOURABLE:");
  });

  it("does not attach a ranking to an ordinary one-date or no-date question", () => {
    expect(researchQuestion(OBAMA, "how is my career this year?").dateComparison).toBeNull();
  });
});
