import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../../mocks/handlers";
import { atsResume } from "./resumeAnalysisTestData";
import type { AtsAnalysisResult } from "./resumeAnalysisTestData";

describe("mock resume evidence recency", () => {
  beforeEach(() => {
    resetMockData();
  });

it("treats recently ended role evidence as stronger than older mock evidence", async () => {
    const recentYear = new Date().getFullYear() - 1;
    const olderYear = recentYear - 3;
    const recentResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: `Dec ${recentYear}`,
            achievements: ["Handled scheduling."],
          },
        ],
      },
      jobDescription: "Required: scheduling",
    });

    expect(recentResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "scheduling",
          match_state: "Strong",
          evidence_sections: ["recent experience"],
        }),
      ]),
    );

    const olderResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: `${olderYear}`,
            achievements: ["Handled scheduling."],
          },
        ],
      },
      jobDescription: "Required: scheduling",
    });

    expect(olderResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "scheduling",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
  });
});
