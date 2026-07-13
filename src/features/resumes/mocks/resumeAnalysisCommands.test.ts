import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../../mocks/handlers";
import { atsResume } from "./resumeAnalysisTestData";
import type { AtsAnalysisResult } from "./resumeAnalysisTestData";

describe("mock resume analysis command handlers", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("analyzes resumes with the real ATS backend command names", async () => {
    const powerWords = await mockInvoke<string[]>("get_ats_power_words");

    expect(powerWords).toEqual(
      expect.arrayContaining(["led", "coordinated", "improved", "supported"]),
    );

    const formatResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_format", {
      resume: atsResume,
    });
    expect(formatResult).toMatchObject({
      keyword_score: 0,
      format_score: expect.any(Number),
      completeness_score: expect.any(Number),
      keyword_matches: [],
      missing_keywords: [],
      requirement_reviews: [],
      hard_constraint_risks: [],
      format_issues: expect.any(Array),
      suggestions: expect.any(Array),
    });

    const keywordListFormatResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_format", {
      resume: {
        ...atsResume,
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["AWS, Docker, Kubernetes, Terraform, SQL, Python"],
          },
        ],
      },
    });
    expect(keywordListFormatResult.format_issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue: expect.stringContaining("keyword list"),
        }),
      ]),
    );

    const jobResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: atsResume,
      jobDescription: "Required: scheduling, case management, bilingual. Preferred: client intake.",
    });
    expect(jobResult.keyword_matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "scheduling",
          found_in: expect.arrayContaining(["summary", "current experience", "skills"]),
          frequency: expect.any(Number),
          importance: "Required",
        }),
        expect.objectContaining({
          keyword: "case management",
          found_in: expect.arrayContaining(["summary", "skills"]),
          frequency: expect.any(Number),
          importance: "Required",
        }),
      ]),
    );
    expect(jobResult.missing_keywords).toContain("bilingual");
    expect(jobResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "scheduling",
          match_state: "Strong",
          evidence_sections: expect.arrayContaining(["summary", "current experience", "skills"]),
          hard_constraint: false,
        }),
        expect.objectContaining({
          keyword: "bilingual",
          match_state: "Missing",
          evidence_sections: [],
          hard_constraint: true,
          recommendation: expect.stringContaining("Only add it if true"),
        }),
      ]),
    );
    expect(jobResult.hard_constraint_risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "bilingual",
          category: "Language",
          score_cap: 65,
          action: expect.stringContaining("Check language fluency before tailoring"),
        }),
      ]),
    );
    expect(jobResult.missing_keyword_details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "bilingual",
          importance: "Required",
        }),
      ]),
    );
    expect(jobResult.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "AddKeyword",
          suggestion: expect.stringContaining("Review whether 'bilingual'"),
          impact: expect.stringContaining("real evidence is visible"),
        }),
      ]),
    );

    const crmResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Client services lead.",
        experience: [
          {
            ...atsResume.experience[0],
            current: true,
            end_date: "Present",
            achievements: ["Maintained customer relationship management records."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: CRM",
    });
    expect(crmResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "crm",
          match_state: "Strong",
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );

    const customerServiceResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Delivered customer support for billing questions."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: customer service",
    });
    expect(customerServiceResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "customer service",
          match_state: "Strong",
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );

    const guestServiceResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Handled guest service issues at the front desk."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: customer service",
    });
    expect(guestServiceResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "customer service",
          match_state: "Strong",
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );

    const frontDeskResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Managed reception check-in and appointment calls."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: front desk",
    });
    expect(frontDeskResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "front desk",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );

    const caseManagementResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Provided case coordination for client services."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: case management",
    });
    expect(caseManagementResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "case management",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );

    const caseCoordinationResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Provided case management for client services."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: case coordination",
    });
    expect(caseCoordinationResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "case coordination",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );

    const dataEntryResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Completed data-entry updates for intake records."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: data entry",
    });
    expect(dataEntryResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "data entry",
          match_state: "Strong",
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );

    const dataAnalysisResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Built analytics dashboards for service trends."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: data analysis",
    });
    expect(dataAnalysisResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "data analysis",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );

    const onboardingResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Led new hire orientation for front desk staff."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: onboarding",
    });
    expect(onboardingResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "onboarding",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );

    const trainingResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            current: false,
            end_date: "2022",
            achievements: ["Trained new employees on intake steps."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: training",
    });
    expect(trainingResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "training",
          match_state: "Direct",
          evidence_sections: ["experience"],
        }),
      ]),
    );

    const blsResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["Basic Life Support"],
      },
      jobDescription: "Required: BLS",
    });
    expect(blsResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "bls",
          match_state: "Direct",
          evidence_sections: expect.arrayContaining(["certifications"]),
          hard_constraint: true,
        }),
      ]),
    );
    expect(blsResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "bls",
        }),
      ]),
    );

    const seniorResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Program operations lead with 5 years of intake scheduling.",
        experience: [
          {
            ...atsResume.experience[0],
            title: "Program Operations Lead",
            achievements: ["Led intake scheduling across three service teams."],
          },
        ],
      },
      jobDescription: "Required: senior-level experience, CRM",
    });
    expect(seniorResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "senior-level experience",
          match_state: "Strong",
          evidence_sections: expect.arrayContaining(["summary", "current experience"]),
          hard_constraint: true,
        }),
      ]),
    );
    expect(seniorResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "senior-level experience",
        }),
      ]),
    );

    const missingSeniorResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Client service coordinator with intake scheduling.",
        experience: [
          {
            ...atsResume.experience[0],
            title: "Client Service Coordinator",
            achievements: ["Handled intake scheduling and case documentation."],
          },
        ],
      },
      jobDescription: "Required: senior-level experience, CRM",
    });
    expect(missingSeniorResult.hard_constraint_risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "senior-level experience",
          category: "Experience",
          score_cap: 65,
          action: expect.stringContaining("Do not round up"),
        }),
      ]),
    );

    const underLevelResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Senior service coordinator with 7 years of intake scheduling.",
        experience: [
          {
            ...atsResume.experience[0],
            title: "Senior Service Coordinator",
            achievements: ["Handled intake scheduling and case documentation."],
          },
        ],
      },
      jobDescription: "Required: staff-level experience, CRM",
    });
    expect(underLevelResult.hard_constraint_risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "staff/principal-level experience",
          category: "Experience",
          score_cap: 65,
          action: expect.stringContaining("lower-title or fewer-years"),
        }),
      ]),
    );

    await mockInvoke<number>("select_and_upload_resume");
    const activeJobResult = await mockInvoke<AtsAnalysisResult>("analyze_active_resume_for_job", {
      jobDescription:
        "Required: scheduling, case management, security clearance, weekend availability, reliable transportation, lift 50 pounds, background check, 8+ years of payroll management, US citizenship.",
    });
    expect(activeJobResult.keyword_matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "scheduling",
          found_in: expect.arrayContaining(["summary"]),
          frequency: expect.any(Number),
          importance: "Required",
        }),
      ]),
    );
    expect(activeJobResult.hard_constraint_risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "security clearance",
          category: "SecurityClearance",
          score_cap: 60,
          action: expect.stringContaining("Check clearance before tailoring"),
        }),
      ]),
    );
    expect(activeJobResult.hard_constraint_risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "weekend availability",
          category: "Location",
          score_cap: 70,
          action: expect.stringContaining("Check location, schedule, availability, or travel"),
        }),
        expect.objectContaining({
          requirement: "8+ years of payroll management",
          category: "Experience",
          score_cap: 65,
          action: expect.stringContaining("Do not round up"),
        }),
        expect.objectContaining({
          requirement: "us citizenship",
          category: "Citizenship",
          score_cap: 50,
          action: expect.stringContaining("Check citizenship before tailoring"),
        }),
        expect.objectContaining({
          requirement: "reliable transportation",
          category: "Location",
          score_cap: 70,
          action: expect.stringContaining("Check location, schedule, availability, or travel"),
        }),
        expect.objectContaining({
          requirement: "lift 50 pounds",
          category: "PhysicalRequirement",
          score_cap: 70,
          action: expect.stringContaining("not workable or safe"),
        }),
        expect.objectContaining({
          requirement: "background check",
          category: "BackgroundScreening",
          score_cap: 70,
          action: expect.stringContaining("Check background, drug"),
        }),
      ]),
    );

  }, 20_000);
});
