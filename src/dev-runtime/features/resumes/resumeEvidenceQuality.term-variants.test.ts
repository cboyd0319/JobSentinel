import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../mocks/handlers";
import { atsResume } from "./resumeAnalysisTestData";
import type { AtsAnalysisResult } from "./resumeAnalysisTestData";
describe("mock resume evidence quality handlers", () => {
  beforeEach(() => {
    resetMockData();
  });
  it("treats hyphenated medication-administration terms as equivalent mock evidence", async () => {
    const normalResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: [
              "Supported medication-administration checks for patient visits.",
            ],
          },
        ],
      },
      jobDescription: "Required: medication administration",
    });
    expect(normalResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "medication administration",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(normalResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "medication-administration",
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
            achievements: [
              "Supported medication administration checks for patient visits.",
            ],
          },
        ],
      },
      jobDescription: "Required: medication-administration",
    });
    expect(hyphenResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "medication-administration",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(hyphenResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "medication administration",
        }),
      ]),
    );
  });

  it("treats singular and plural care-plan terms as equivalent mock evidence", async () => {
    const pluralResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Used care plan notes for patient visits."],
          },
        ],
      },
      jobDescription: "Required: care plans",
    });
    expect(pluralResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "care plans",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(pluralResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "care plan",
        }),
      ]),
    );

    const singularResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Used care plans for patient visits."],
          },
        ],
      },
      jobDescription: "Required: care plan",
    });
    expect(singularResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "care plan",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(singularResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "care plans",
        }),
      ]),
    );
  });

  it("treats hyphenated care-plan terms as equivalent mock evidence", async () => {
    const normalResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Used care-plan notes for patient visits."],
          },
        ],
      },
      jobDescription: "Required: care plans",
    });
    expect(normalResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "care plans",
          match_state: "Direct",
          evidence_sections: ["experience"],
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
            achievements: ["Used care plans for patient visits."],
          },
        ],
      },
      jobDescription: "Required: care-plan",
    });
    expect(hyphenResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "care-plan",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
  });

  it("treats singular and plural vital-sign terms as equivalent mock evidence", async () => {
    const pluralResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Recorded vital sign readings for patient visits."],
          },
        ],
      },
      jobDescription: "Required: vital signs",
    });
    expect(pluralResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "vital signs",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(pluralResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "vital sign",
        }),
      ]),
    );

    const singularResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Recorded vital signs for patient visits."],
          },
        ],
      },
      jobDescription: "Required: vital sign",
    });
    expect(singularResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "vital sign",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(singularResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "vital signs",
        }),
      ]),
    );
  });

  it("treats hyphenated vital-sign terms as equivalent mock evidence", async () => {
    const normalResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Recorded vital-sign readings for patient visits."],
          },
        ],
      },
      jobDescription: "Required: vital signs",
    });
    expect(normalResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "vital signs",
          match_state: "Direct",
          evidence_sections: ["experience"],
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
            achievements: ["Recorded vital signs for patient visits."],
          },
        ],
      },
      jobDescription: "Required: vital-sign",
    });
    expect(hyphenResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "vital-sign",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
  });

  it("treats single current-role evidence as stronger than the same past-role mock evidence", async () => {
    const currentResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: true,
            end_date: "Present",
            achievements: ["Handled scheduling."],
          },
        ],
      },
      jobDescription: "Required: scheduling",
    });

    expect(currentResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "scheduling",
          match_state: "Strong",
          evidence_sections: ["current experience"],
        }),
      ]),
    );

    const pastResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Handled scheduling."],
          },
        ],
      },
      jobDescription: "Required: scheduling",
    });

    expect(pastResult.requirement_reviews).toEqual(
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
