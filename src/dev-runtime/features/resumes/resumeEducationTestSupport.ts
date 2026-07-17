import { expect } from "vitest";
import { mockInvoke } from "../../mocks/handlers";
import { atsResume, type AtsAnalysisResult } from "./resumeAnalysisTestData";

export async function analyzeEducation(
  degree: string | null,
  jobRequirement: string,
  institution = "State College",
) {
  return mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
    resume: {
      ...atsResume,
      summary: "",
      experience: [],
      skills: [],
      education: degree
        ? [
            {
              degree,
              institution,
              location: "Denver, CO",
              graduation_date: "2020",
              gpa: null,
              honors: [],
            },
          ]
        : [],
    },
    jobDescription: `Required: ${jobRequirement}`,
  });
}

export function expectDirectEducationEvidence(
  result: AtsAnalysisResult,
  keyword: string,
  checkGenericDegreeRisk = true,
) {
  expect(result.requirement_reviews).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        keyword,
        match_state: "Direct",
        hard_constraint: true,
        evidence_sections: expect.arrayContaining(["education"]),
      }),
    ]),
  );
  expect(result.hard_constraint_risks).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        requirement: keyword,
      }),
    ]),
  );
  if (checkGenericDegreeRisk) {
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "degree",
        }),
      ]),
    );
  }
}

export function expectNoGenericEducationConstraint(
  result: AtsAnalysisResult,
  keyword: string,
) {
  expect(result.requirement_reviews).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        keyword,
      }),
    ]),
  );
  expect(result.hard_constraint_risks).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        requirement: keyword,
      }),
    ]),
  );
}
