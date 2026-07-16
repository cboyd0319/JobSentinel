import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../mocks/handlers";
import { atsResume } from "./resumeAnalysisTestData";
import type { AtsAnalysisResult } from "./resumeAnalysisTestData";

type HyphenEvidenceCase = {
  plainKeyword: string;
  hyphenKeyword: string;
  plainJobAchievement: string;
  hyphenJobAchievement: string;
};

const hyphenEvidenceCases: HyphenEvidenceCase[] = [
  {
    plainKeyword: "document review",
    hyphenKeyword: "document-review",
    plainJobAchievement: "Supported document-review checks for client files.",
    hyphenJobAchievement: "Supported document review checks for client files.",
  },
  {
    plainKeyword: "records management",
    hyphenKeyword: "records-management",
    plainJobAchievement: "Supported records-management checks for client files.",
    hyphenJobAchievement: "Supported records management checks for client files.",
  },
  {
    plainKeyword: "case files",
    hyphenKeyword: "case-files",
    plainJobAchievement: "Supported case-files checks for client intake.",
    hyphenJobAchievement: "Supported case files checks for client intake.",
  },
  {
    plainKeyword: "legal research",
    hyphenKeyword: "legal-research",
    plainJobAchievement: "Supported legal-research checks for client files.",
    hyphenJobAchievement: "Supported legal research checks for client files.",
  },
  {
    plainKeyword: "policy analysis",
    hyphenKeyword: "policy-analysis",
    plainJobAchievement: "Supported policy-analysis checks for client programs.",
    hyphenJobAchievement: "Supported policy analysis checks for client programs.",
  },
  {
    plainKeyword: "grant administration",
    hyphenKeyword: "grant-administration",
    plainJobAchievement: "Supported grant-administration checks for client programs.",
    hyphenJobAchievement: "Supported grant administration checks for client programs.",
  },
  {
    plainKeyword: "financial reconciliation",
    hyphenKeyword: "financial-reconciliation",
    plainJobAchievement: "Supported financial-reconciliation checks for client accounts.",
    hyphenJobAchievement: "Supported financial reconciliation checks for client accounts.",
  },
  {
    plainKeyword: "loan processing",
    hyphenKeyword: "loan-processing",
    plainJobAchievement: "Supported loan-processing checks for client accounts.",
    hyphenJobAchievement: "Supported loan processing checks for client accounts.",
  },
];

describe("mock resume business hyphen evidence handlers", () => {
  beforeEach(() => {
    resetMockData();
  });

  it.each(hyphenEvidenceCases)(
    "treats $hyphenKeyword and $plainKeyword as equivalent mock evidence",
    async (testCase) => {
      const plainResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
        resume: {
          ...atsResume,
          summary: "",
          skills: [],
          experience: [
            {
              ...atsResume.experience[0],
              current: false,
              end_date: "2022",
              achievements: [testCase.plainJobAchievement],
            },
          ],
        },
        jobDescription: `Required: ${testCase.plainKeyword}`,
      });
      expect(plainResult.requirement_reviews).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            keyword: testCase.plainKeyword,
            match_state: "Direct",
            evidence_sections: ["experience"],
          }),
        ]),
      );
      expect(plainResult.requirement_reviews).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            keyword: testCase.hyphenKeyword,
          }),
        ]),
      );

      const hyphenResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
        resume: {
          ...atsResume,
          summary: "",
          skills: [],
          experience: [
            {
              ...atsResume.experience[0],
              current: false,
              end_date: "2022",
              achievements: [testCase.hyphenJobAchievement],
            },
          ],
        },
        jobDescription: `Required: ${testCase.hyphenKeyword}`,
      });
      expect(hyphenResult.requirement_reviews).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            keyword: testCase.hyphenKeyword,
            match_state: "Direct",
            evidence_sections: ["experience"],
          }),
        ]),
      );
      expect(hyphenResult.requirement_reviews).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            keyword: testCase.plainKeyword,
          }),
        ]),
      );
    },
  );
});
