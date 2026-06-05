import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../handlers";
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

    const nightShiftResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Available for overnight shift coverage."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: night shift",
    });
    expect(nightShiftResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "night shift",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(nightShiftResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "night shift",
        }),
      ]),
    );

    const thirdShiftResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Available for third shift coverage."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: night shift",
    });
    expect(thirdShiftResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "night shift",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(thirdShiftResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "night shift",
        }),
      ]),
    );

    const weekendResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Available for weekend shifts."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: weekend availability",
    });
    expect(weekendResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "weekend availability",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(weekendResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "weekend availability",
        }),
      ]),
    );

    const eveningShiftResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Available for second shift coverage."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: evening shift",
    });
    expect(eveningShiftResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "evening shift",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(eveningShiftResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "evening shift",
        }),
      ]),
    );

    const dayShiftResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Available for first shift coverage."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: day shift",
    });
    expect(dayShiftResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "day shift",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(dayShiftResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "day shift",
        }),
      ]),
    );

    const availabilityResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Available for full-time coverage."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: availability",
    });
    expect(availabilityResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "availability",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(availabilityResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "availability",
        }),
      ]),
    );

    const overtimeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Available for overtime shifts during peak weeks."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: overtime availability",
    });
    expect(overtimeResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "overtime availability",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(overtimeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "overtime availability",
        }),
      ]),
    );

    const holidayResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Available for holiday shifts during peak weeks."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: holiday availability",
    });
    expect(holidayResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "holiday availability",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(holidayResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "holiday availability",
        }),
      ]),
    );

    const fullTimeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Available for full-time coverage."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: full-time availability",
    });
    expect(fullTimeResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "full-time availability",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(fullTimeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "full-time availability",
        }),
      ]),
    );

    const partTimeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Available for part time coverage."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: part-time availability",
    });
    expect(partTimeResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "part-time availability",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(partTimeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "part-time availability",
        }),
      ]),
    );

    const onsiteResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Available for onsite client-facing shifts."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: on-site role",
    });
    expect(onsiteResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "on-site",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(onsiteResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "on-site",
        }),
      ]),
    );

    const spacedOnsiteResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Available for on-site client-facing shifts."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: on site role",
    });
    expect(spacedOnsiteResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "on site",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(spacedOnsiteResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "on site",
        }),
      ]),
    );

    const remoteResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Available for remote work with a secure workspace."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: remote work",
    });
    expect(remoteResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "remote work",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(remoteResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "remote work",
        }),
      ]),
    );

    const hybridResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Available for a hybrid schedule in Denver."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: hybrid work",
    });
    expect(hybridResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "hybrid work",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(hybridResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "hybrid work",
        }),
      ]),
    );

    const relocationResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Willing to relocate for client site coverage."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: relocation",
    });
    expect(relocationResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "relocation",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(relocationResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "relocation",
        }),
      ]),
    );

    const transportationResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Own transportation for client site visits."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: reliable transportation",
    });
    expect(transportationResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "reliable transportation",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(transportationResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "reliable transportation",
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
          category: "WorkAuthorization",
          score_cap: 50,
          action: expect.stringContaining("Check work authorization before tailoring"),
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

    const improved = await mockInvoke<string>("improve_bullet_point", {
      bullet: "helped with client scheduling",
      jobContext: "Required: scheduling, case management",
    });
    expect(improved).toContain("Contributed to client scheduling");
    expect(improved).toContain("add a true number, outcome, or concrete detail if you have one");
    expect(improved).toContain("review if these are true and worth making visible");
    expect(improved).toContain("problem, your role, action, result, and evidence");
    expect(improved).not.toContain("consider adding");

    const healthcareImproved = await mockInvoke<string>("improve_bullet_point", {
      bullet: "supported patient care documentation",
      jobContext: "Required: patient care, medication administration, RN license",
    });
    expect(healthcareImproved).toContain("healthcare evidence to check");
    expect(healthcareImproved).toContain("scope of practice");
    expect(healthcareImproved).toContain("patient safety");
    expect(healthcareImproved).toContain("required credentials");

    const tradesImproved = await mockInvoke<string>("improve_bullet_point", {
      bullet: "completed maintenance work orders",
      jobContext: "Required: maintenance technician, equipment repair, OSHA 10, forklift operation",
    });
    expect(tradesImproved).toContain("trades-field evidence to check");
    expect(tradesImproved).toContain("equipment or tools used");
    expect(tradesImproved).toContain("safety rules");
    expect(tradesImproved).toContain("work orders");
    expect(tradesImproved).toContain("required licenses");

    const careerChangeImproved = await mockInvoke<string>("improve_bullet_point", {
      bullet: "supported customer onboarding during a career change",
      jobContext: "Career change welcome. Required: transferable customer support skills and training program",
    });
    expect(careerChangeImproved).toContain("career-change evidence to check");
    expect(careerChangeImproved).toContain("transferable work");
    expect(careerChangeImproved).toContain("training");
    expect(careerChangeImproved).toContain("adjacent experience");
    expect(careerChangeImproved).toContain("truthful gaps or transitions");

    const earlyCareerImproved = await mockInvoke<string>("improve_bullet_point", {
      bullet: "completed capstone project and trainee rotations",
      jobContext: "Entry-level trainee role for new graduate applicants",
    });
    expect(earlyCareerImproved).toContain("early-career evidence to check");
    expect(earlyCareerImproved).toContain("training or coursework");
    expect(earlyCareerImproved).toContain("projects or volunteer work");
    expect(earlyCareerImproved).toContain("supervised responsibilities");
    expect(earlyCareerImproved).toContain("readiness to learn");

    const regulatedImproved = await mockInvoke<string>("improve_bullet_point", {
      bullet: "supported case files and reconciliation",
      jobContext: "Required: legal research, case files, financial reconciliation",
    });
    expect(regulatedImproved).toContain("regulated-work evidence to check");
    expect(regulatedImproved).toContain("records accuracy");
    expect(regulatedImproved).toContain("deadlines");
    expect(regulatedImproved).toContain("confidentiality");
    expect(regulatedImproved).toContain("audit trail");

    const serviceImproved = await mockInvoke<string>("improve_bullet_point", {
      bullet: "handled client intake scheduling",
      jobContext: "Required: customer service, case management, appointment setting",
    });
    expect(serviceImproved).toContain("service-operations evidence to check");
    expect(serviceImproved).toContain("customer impact");
    expect(serviceImproved).toContain("volume");
    expect(serviceImproved).toContain("escalation path");
    expect(serviceImproved).toContain("response quality");

    const technicalImproved = await mockInvoke<string>("improve_bullet_point", {
      bullet: "built reporting dashboard",
      jobContext: "Required: data analysis, SQL, machine learning model monitoring",
    });
    expect(technicalImproved).toContain("technical-data evidence to check");
    expect(technicalImproved).toContain("shipped work");
    expect(technicalImproved).toContain("users or decisions supported");
    expect(technicalImproved).toContain("data sources");
    expect(technicalImproved).toContain("measurable outcomes");

    const salesMarketingImproved = await mockInvoke<string>("improve_bullet_point", {
      bullet: "supported campaign and account follow-up",
      jobContext: "Required: sales pipeline, account retention, marketing campaign",
    });
    expect(salesMarketingImproved).toContain("sales-marketing evidence to check");
    expect(salesMarketingImproved).toContain("quota or pipeline");
    expect(salesMarketingImproved).toContain("audience or account scope");
    expect(salesMarketingImproved).toContain("conversion or revenue impact");
    expect(salesMarketingImproved).toContain("retention");

    const designCreativeImproved = await mockInvoke<string>("improve_bullet_point", {
      bullet: "created prototypes for onboarding flow",
      jobContext: "Required: product design, Figma, accessibility, design portfolio",
    });
    expect(designCreativeImproved).toContain("design-creative evidence to check");
    expect(designCreativeImproved).toContain("user problem");
    expect(designCreativeImproved).toContain("audience");
    expect(designCreativeImproved).toContain("accessibility");
    expect(designCreativeImproved).toContain("shipped outcome");

    const educationAcademicImproved = await mockInvoke<string>("improve_bullet_point", {
      bullet: "developed curriculum for student workshops",
      jobContext: "Required: teaching, curriculum design, student assessment",
    });
    expect(educationAcademicImproved).toContain("education-academic evidence to check");
    expect(educationAcademicImproved).toContain("learner or research audience");
    expect(educationAcademicImproved).toContain("standards or methods");
    expect(educationAcademicImproved).toContain("outcomes");
    expect(educationAcademicImproved).toContain("ethics");

    const executiveLeadershipImproved = await mockInvoke<string>("improve_bullet_point", {
      bullet: "led department change program",
      jobContext: "Required: director-level people management, budget ownership, change management",
    });
    expect(executiveLeadershipImproved).toContain("executive-leadership evidence to check");
    expect(executiveLeadershipImproved).toContain("scope of ownership");
    expect(executiveLeadershipImproved).toContain("team or budget size");
    expect(executiveLeadershipImproved).toContain("decision authority");
    expect(executiveLeadershipImproved).toContain("business impact");

    const securityImproved = await mockInvoke<string>("improve_bullet_point", {
      bullet: "supported incident response reviews",
      jobContext: "Required: cybersecurity, incident response, vulnerability management",
    });
    expect(securityImproved).toContain("security evidence to check");
    expect(securityImproved).toContain("authorized scope");
    expect(securityImproved).toContain("risk reduced");
    expect(securityImproved).toContain("controls or incidents handled");
    expect(securityImproved).toContain("sensitive-data handling");

    const federalImproved = await mockInvoke<string>("improve_bullet_point", {
      bullet: "reviewed program case files",
      jobContext: "Required: federal specialized experience, GS-09 grade level, public trust",
    });
    expect(federalImproved).toContain("federal evidence to check");
    expect(federalImproved).toContain("specialized experience");
    expect(federalImproved).toContain("grade level");
    expect(federalImproved).toContain("announcement duties");
    expect(federalImproved).toContain("required documents");
  }, 20_000);
});
