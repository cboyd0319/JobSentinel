import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../mocks/handlers";
import { atsResume } from "./resumeAnalysisTestData";
import type { AtsAnalysisResult } from "./resumeAnalysisTestData";

describe("mock resume vehicle hard-constraint handlers", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("accepts motor vehicle record evidence for MVR requirements", async () => {
    const mvrResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Motor vehicle record reviewed for field work.",
        experience: [],
        skills: [],
      },
      jobDescription: "Required: MVR",
    });

    expect(mvrResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "mvr",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["summary"]),
        }),
      ]),
    );
    expect(mvrResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "mvr",
        }),
      ]),
    );
  });

  it("caps auto-insurance requirements when only driver-license evidence exists", async () => {
    const insuranceResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Driver license.",
        experience: [],
        skills: [],
      },
      jobDescription: "Required: proof of auto insurance",
    });

    expect(insuranceResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "proof of auto insurance",
          match_state: "Missing",
          hard_constraint: true,
        }),
      ]),
    );
    expect(insuranceResult.hard_constraint_risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "proof of auto insurance",
          category: "Location",
          score_cap: 70,
          action: expect.stringContaining("auto insurance"),
        }),
      ]),
    );
  });

  it("accepts insured-vehicle evidence for auto-insurance requirements", async () => {
    const insuranceResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Reliable insured vehicle for client visits.",
        experience: [],
        skills: [],
      },
      jobDescription: "Required: proof of auto insurance",
    });

    expect(insuranceResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "proof of auto insurance",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["summary"]),
        }),
      ]),
    );
    expect(insuranceResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "proof of auto insurance",
        }),
      ]),
    );
  });
});
