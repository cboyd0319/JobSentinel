import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../../mocks/handlers";
import { atsResume } from "./resumeAnalysisTestData";
import type { AtsAnalysisResult } from "./resumeAnalysisTestData";

describe("mock resume language hard constraints", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("caps missing required bilingual Spanish as a language hard constraint", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: atsResume,
      jobDescription: "Required: client intake, bilingual Spanish",
    });

    expect(result.overall_score).toBeLessThanOrEqual(65);
    expect(result.hard_constraint_risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "bilingual spanish",
          category: "Language",
          score_cap: 65,
          action: expect.stringContaining("Check language fluency before tailoring"),
        }),
      ]),
    );
    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "bilingual spanish",
          hard_constraint: true,
          match_state: "Missing",
        }),
      ]),
    );
  });

  it("accepts Spanish fluency evidence for bilingual Spanish", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Spanish support for client intake calls.",
        skills: [],
      },
      jobDescription: "Required: bilingual Spanish",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "bilingual spanish",
          hard_constraint: true,
          match_state: "Direct",
          evidence_sections: expect.arrayContaining(["summary"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "bilingual spanish",
        }),
      ]),
    );
  });

  it("accepts Mandarin fluency evidence for bilingual Mandarin", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Mandarin support for client intake calls.",
        skills: [],
      },
      jobDescription: "Required: bilingual Mandarin",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "bilingual mandarin",
          hard_constraint: true,
          match_state: "Direct",
          evidence_sections: expect.arrayContaining(["summary"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "bilingual mandarin",
        }),
      ]),
    );
  });
});
