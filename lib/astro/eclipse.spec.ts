import { describe, it, expect } from "vitest";
import { findEclipses } from "./transit-events";

describe("eclipse finder", () => {
  const eclipses = findEclipses(new Date("2024-01-01T00:00:00Z"), new Date("2024-12-31T23:59:59Z"));

  it("finds both solar and lunar eclipses across 2024", () => {
    expect(eclipses.filter((e) => e.kind === "solar").length).toBeGreaterThanOrEqual(1);
    expect(eclipses.filter((e) => e.kind === "lunar").length).toBeGreaterThanOrEqual(1);
  });

  it("includes the 8 April 2024 solar eclipse", () => {
    const apr = eclipses.find((e) => e.kind === "solar" && e.date.toISOString().startsWith("2024-04"));
    expect(apr, "April 2024 solar eclipse not found").toBeTruthy();
    const day = apr!.date.getUTCDate();
    expect(day).toBeGreaterThanOrEqual(6);
    expect(day).toBeLessThanOrEqual(10);
  });

  it("every event respects its node-proximity limit", () => {
    for (const e of eclipses) {
      expect(e.moonNodeDistance).toBeLessThanOrEqual(e.kind === "solar" ? 15.5 : 12);
    }
  });
});
