import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../mocks/handlers";
import { atsResume } from "./resumeAnalysisTestData";
import type { AtsAnalysisResult } from "./resumeAnalysisTestData";

describe("mock resume budget evidence handlers", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("treats budgeting and budget tracking as equivalent mock evidence", async () => {
    const budgetingResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported budget tracking for clinic supplies."],
          },
        ],
      },
      jobDescription: "Required: budgeting",
    });
    expect(budgetingResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "budgeting",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );

    const trackingResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Supported budgeting for clinic supplies."],
          },
        ],
      },
      jobDescription: "Required: budget tracking",
    });
    expect(trackingResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "budget tracking",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
  });
});
