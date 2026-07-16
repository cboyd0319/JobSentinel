import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../mocks/handlers";
import { atsResume } from "./resumeAnalysisTestData";
import type { AtsAnalysisResult } from "./resumeAnalysisTestData";

describe("mock resume analysis constraint command handlers", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("evaluates credentials, seniority, and active-resume constraints", async () => {
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
