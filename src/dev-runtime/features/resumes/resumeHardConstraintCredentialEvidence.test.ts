import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../mocks/handlers";
import { atsResume } from "./resumeAnalysisTestData";
import type { AtsAnalysisResult } from "./resumeAnalysisTestData";

describe("mock resume credential hard-constraint handlers", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("matches RN license wording variants in mock hard constraints", async () => {
    const rnResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Registered Nurse.",
        experience: [],
        skills: [],
      },
      jobDescription: "Required: RN license",
    });

    expect(rnResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "rn license",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["summary"]),
        }),
      ]),
    );
    expect(rnResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "rn license",
        }),
      ]),
    );
  });

  it("does not match short credentials inside longer words in mock hard constraints", async () => {
    const rnResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Retail intern with customer intake experience.",
        experience: [],
        skills: [],
      },
      jobDescription: "Required: RN license",
    });

    expect(rnResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "rn license",
          match_state: "Missing",
          hard_constraint: true,
        }),
      ]),
    );
    expect(rnResult.hard_constraint_risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "rn license",
        }),
      ]),
    );
  });

  it("matches Registered Nurse license and RN wording in mock hard constraints", async () => {
    const rnResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "RN.",
        experience: [],
        skills: [],
      },
      jobDescription: "Required: Registered Nurse license",
    });

    expect(rnResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "registered nurse license",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["summary"]),
        }),
      ]),
    );
    expect(rnResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "registered nurse license",
        }),
      ]),
    );
  });
});
