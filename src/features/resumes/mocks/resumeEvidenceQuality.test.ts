import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../../test-support/mocks/handlers";
import { atsResume } from "./resumeAnalysisTestData";
import type { AtsAnalysisResult } from "./resumeAnalysisTestData";
describe("mock resume evidence quality handlers", () => {
  beforeEach(() => {
    resetMockData();
  });
  it("treats metric-backed current experience as strong mock evidence", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: true,
            end_date: "Present",
            achievements: ["Reduced scheduling delays by 30%"],
          },
        ],
      },
      jobDescription: "Required: scheduling",
    });
    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "scheduling",
          match_state: "Strong",
          evidence_sections: ["current experience"],
        }),
      ]),
    );
  });
  it("treats scope-backed current experience as strong mock evidence", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: true,
            end_date: "Present",
            achievements: ["Coordinated scheduling across three service teams"],
          },
        ],
      },
      jobDescription: "Required: scheduling",
    });
    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "scheduling",
          match_state: "Strong",
          evidence_sections: ["current experience"],
        }),
      ]),
    );
  });
  it("treats responsibility-backed current experience as strong mock evidence", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: true,
            end_date: "Present",
            achievements: ["Owned scheduling workflows for client intake"],
          },
        ],
      },
      jobDescription: "Required: scheduling",
    });
    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "scheduling",
          match_state: "Strong",
          evidence_sections: ["current experience"],
        }),
      ]),
    );
  });
  it("treats duty-backed past experience as strong mock evidence", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
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
              "Coordinated scheduling requests for client appointments",
            ],
          },
        ],
      },
      jobDescription: "Required: scheduling",
    });
    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "scheduling",
          match_state: "Strong",
          evidence_sections: ["experience"],
        }),
      ]),
    );
  });
  it("treats calendar-management scheduling terms as equivalent mock evidence", async () => {
    const schedulingResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Used calendar management for client appointments."],
          },
        ],
      },
      jobDescription: "Required: scheduling",
    });
    expect(schedulingResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "scheduling",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    const calendarResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
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
      jobDescription: "Required: calendar management",
    });
    expect(calendarResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "calendar management",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
  });
  it("treats QA quality-assurance terms as equivalent mock evidence", async () => {
    const qualityResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Performed QA checks for intake records."],
          },
        ],
      },
      jobDescription: "Required: quality assurance",
    });
    expect(qualityResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "quality assurance",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    const qaResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Performed quality assurance checks for intake records."],
          },
        ],
      },
      jobDescription: "Required: QA",
    });
    expect(qaResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "qa",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
  });
  it("treats patient-care hyphen terms as equivalent mock evidence", async () => {
    const patientCareResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        skills: [],
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Provided patient-care support."],
          },
        ],
      },
      jobDescription: "Required: patient care",
    });
    expect(patientCareResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "patient care",
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
            achievements: ["Provided patient care support."],
          },
        ],
      },
      jobDescription: "Required: patient-care",
    });
    expect(hyphenResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "patient-care",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );
  });

  it("treats singular and plural medical-record terms as equivalent mock evidence", async () => {
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
            achievements: ["Updated medical record notes for patient visits."],
          },
        ],
      },
      jobDescription: "Required: medical records",
    });
    expect(pluralResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "medical records",
          match_state: "Strong",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(pluralResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "medical record",
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
            achievements: ["Updated medical records for patient visits."],
          },
        ],
      },
      jobDescription: "Required: medical record",
    });
    expect(singularResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "medical record",
          match_state: "Strong",
          evidence_sections: ["experience"],
        }),
      ]),
    );
    expect(singularResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "medical records",
        }),
      ]),
    );
  });

  it("treats hyphenated medical-record terms as equivalent mock evidence", async () => {
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
            achievements: ["Updated medical-record notes for patient visits."],
          },
        ],
      },
      jobDescription: "Required: medical records",
    });
    expect(normalResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "medical records",
          match_state: "Strong",
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
            achievements: ["Updated medical records for patient visits."],
          },
        ],
      },
      jobDescription: "Required: medical-record",
    });
    expect(hyphenResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "medical-record",
          match_state: "Strong",
          evidence_sections: ["experience"],
        }),
      ]),
    );
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
