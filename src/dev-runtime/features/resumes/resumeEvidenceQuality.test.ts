import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../mocks/handlers";
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

});
