import { describe, it, expect } from "vitest";
import type { BirthData } from "./types";
import { classifyQuestion, researchQuestion, formatQuestionResearch } from "./question-research";

// A well-documented AA chart (Obama) — behavioural invariants only, no private data.
const OBAMA: BirthData = {
  year: 1961, month: 8, day: 4, hour: 19, minute: 24,
  latitude: 21.3069, longitude: -157.8583, tzOffsetHours: -10,
  ayanamsa: "lahiri", nodeType: "mean", timeAccuracyMinutes: 5,
};

describe("question-research", () => {
  it("classifies mode, polarity, and matter", () => {
    const a = classifyQuestion("will I lose my job?");
    expect(a.mode).toBe("yes_no");
    expect(a.negativePolarity).toBe(true);
    expect(a.topics.some((t) => t.key === "career")).toBe(true);

    const b = classifyQuestion("when will I get married?");
    expect(b.mode).toBe("timing");
    expect(b.negativePolarity).toBe(false);

    // a time word promotes a yes/no to a timing question (both include timing)
    expect(classifyQuestion("will I lose my job soon?").mode).toBe("timing");
  });

  it("asks for clarification when no matter is identifiable", () => {
    const r = researchQuestion(OBAMA, "tell me something");
    expect(r.intent.needsClarification).toBe(true);
    expect(r.matter).toBeNull();
    expect(r.lenses.length).toBe(0);
    expect(formatQuestionResearch(r)).toContain("ASK THE USER");
  });

  it("runs a convergence with multiple lenses and a bounded outlook", () => {
    const r = researchQuestion(OBAMA, "how is my career?");
    expect(r.matter).toBe("career");
    expect(r.lenses.length).toBeGreaterThanOrEqual(4);
    expect(["supported", "mixed", "contested", "denied"]).toContain(r.outlook);
    expect(["low", "moderate", "high"]).toContain(r.confidence);
    // tally is internally consistent
    expect(r.supporting + r.denying + r.neutral).toBe(r.lenses.length);
    // the formatted block is faithful and instructs presentation, not re-derivation
    const f = formatQuestionResearch(r);
    expect(f).toContain("QUESTION RESEARCH");
    expect(f).toContain("RESEARCHED VERDICT");
  });

  it("names the feared-outcome reassurance only when supported + negative", () => {
    const r = researchQuestion(OBAMA, "am I going to lose my career?");
    if (r.outlook === "supported") {
      expect(r.verdict).toContain("does NOT corroborate");
    }
  });
});
