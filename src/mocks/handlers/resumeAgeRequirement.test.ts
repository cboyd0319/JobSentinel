import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../handlers";
import { atsResume } from "./resumeAnalysisTestData";
import type { AtsAnalysisResult } from "./resumeAnalysisTestData";

describe("mock resume age requirement handling", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("does not treat age wording as years-experience evidence", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: atsResume,
      jobDescription: "Required: must be 18 years of age, scheduling",
    });

    expect(result.overall_score).toBeLessThanOrEqual(70);
    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "18 years of age",
          hard_constraint: true,
          match_state: "Missing",
        }),
      ]),
    );
    expect(result.hard_constraint_risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "18 years of age",
          category: "Age",
          score_cap: 70,
          action: expect.stringMatching(/minimum-age|legal work-age/i),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "18 years of age",
          category: "Experience",
        }),
      ]),
    );
  });
});
