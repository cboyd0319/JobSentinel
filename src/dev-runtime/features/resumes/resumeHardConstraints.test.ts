import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../mocks/handlers";
import { atsResume } from "./resumeAnalysisTestData";
import type { AtsAnalysisResult } from "./resumeAnalysisTestData";
describe("mock resume hard-constraint handlers", () => {
  beforeEach(() => {
    resetMockData();
  });
  it("matches lift-weight pounds and lbs in mock hard constraints", async () => {
    const liftResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Able to lift 50 pounds safely."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: lift 50 lbs",
    });
    expect(liftResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "lift 50 lbs",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(liftResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "lift 50 lbs",
        }),
      ]),
    );
  });
  it("matches lift-and-carry weighted mock hard constraints", async () => {
    const liftCarryResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Lifted and carried 50 pounds safely during warehouse shifts."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: lift and carry 50 lbs",
    });
    expect(liftCarryResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "lift and carry 50 lbs",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(liftCarryResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "lift and carry 50 lbs",
        }),
      ]),
    );
  });
  it("matches stand and standing long-period mock hard constraints", async () => {
    const standingResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Standing for long periods during service shifts."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: stand for long periods",
    });
    expect(standingResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "stand for long periods",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(standingResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "stand for long periods",
        }),
      ]),
    );
  });
  it("matches climb and climbing ladder mock hard constraints", async () => {
    const climbingResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Climbing ladders safely during inventory work."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: climb ladders",
    });
    expect(climbingResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "climb ladders",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(climbingResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "climb ladders",
        }),
      ]),
    );
  });
  it("matches background screening wording in mock hard constraints", async () => {
    const backgroundResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Completed background screening for client-site work.",
        skills: [],
      },
      jobDescription: "Required: background check",
    });
    expect(backgroundResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "background check",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["summary"]),
        }),
      ]),
    );
    expect(backgroundResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "background check",
        }),
      ]),
    );
  });
  it("matches drug test wording in mock hard constraints", async () => {
    const drugScreenResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Completed drug testing for safety-sensitive site work.",
        skills: [],
      },
      jobDescription: "Required: drug screen",
    });
    expect(drugScreenResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "drug screen",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["summary"]),
        }),
      ]),
    );
    expect(drugScreenResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "drug screen",
        }),
      ]),
    );
  });
  it("matches driver's license wording variants in mock hard constraints", async () => {
    const licenseResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Valid driver license for client visits."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: driver's license",
    });
    expect(licenseResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "driver's license",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(licenseResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "driver's license",
        }),
      ]),
    );
  });

  it("matches CDL and commercial drivers license wording in mock hard constraints", async () => {
    const cdlResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Commercial drivers license.",
        experience: [],
        skills: [],
      },
      jobDescription: "Required: CDL",
    });

    expect(cdlResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "cdl",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["summary"]),
        }),
      ]),
    );
    expect(cdlResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "cdl",
        }),
      ]),
    );
  });

  it("matches commercial driver license and CDL wording in mock hard constraints", async () => {
    const cdlResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "CDL.",
        experience: [],
        skills: [],
      },
      jobDescription: "Required: commercial driver license",
    });

    expect(cdlResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "commercial driver license",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["summary"]),
        }),
      ]),
    );
    expect(cdlResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "commercial driver license",
        }),
      ]),
    );
    expect(cdlResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: expect.stringMatching(/^driver'?s? license$/),
        }),
      ]),
    );
  });

  it("matches US citizen and citizenship wording in mock hard constraints", async () => {
    const citizenshipResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "U.S. citizen.",
        experience: [],
        skills: [],
      },
      jobDescription: "Required: US citizenship",
    });

    expect(citizenshipResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "us citizenship",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["summary"]),
        }),
      ]),
    );
    expect(citizenshipResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "us citizenship",
        }),
      ]),
    );
  });

  it("matches commute and commuting wording in mock hard constraints", async () => {
    const commuteResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Commuting to client appointments weekly."],
          },
        ],
        skills: [],
      },
      jobDescription: "Required: commute",
    });

    expect(commuteResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "commute",
          match_state: "Strong",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(commuteResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "commute",
        }),
      ]),
    );
  });

  it("matches work authorization wording in mock hard constraints", async () => {
    const authorizationResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Authorized to work in the United States.",
        experience: [],
        skills: [],
      },
      jobDescription: "Required: work authorization",
    });

    expect(authorizationResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "work authorization",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["summary"]),
        }),
      ]),
    );
    expect(authorizationResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "work authorization",
        }),
      ]),
    );
  });

  it("matches security clearance wording variants in mock hard constraints", async () => {
    const clearanceResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Active clearance.",
        experience: [],
        skills: [],
      },
      jobDescription: "Required: security clearance",
    });

    expect(clearanceResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "security clearance",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["summary"]),
        }),
      ]),
    );
    expect(clearanceResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "security clearance",
        }),
      ]),
    );
  });

  it("matches RN license wording variants in mock hard constraints", async () => {
    const rnResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Registered Nurse.",
        experience: [],
        skills: [],
      },
      jobDescription: "Required: RN license",
    });

    expect(rnResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "rn license",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["summary"]),
        }),
      ]),
    );
    expect(rnResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "rn license",
        }),
      ]),
    );
  });

  it("does not match short credentials inside longer words in mock hard constraints", async () => {
    const rnResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Retail intern with customer intake experience.",
        experience: [],
        skills: [],
      },
      jobDescription: "Required: RN license",
    });

    expect(rnResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "rn license",
          match_state: "Missing",
          hard_constraint: true,
        }),
      ]),
    );
    expect(rnResult.hard_constraint_risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "rn license",
        }),
      ]),
    );
  });

  it("matches Registered Nurse license and RN wording in mock hard constraints", async () => {
    const rnResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "RN.",
        experience: [],
        skills: [],
      },
      jobDescription: "Required: Registered Nurse license",
    });

    expect(rnResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "registered nurse license",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["summary"]),
        }),
      ]),
    );
    expect(rnResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "registered nurse license",
        }),
      ]),
    );
  });

  it("keeps skills-only required hard constraints as risk until evidence is visible", async () => {
    const skillOnlyResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: ["Security clearance"],
      },
      jobDescription: "Required: security clearance",
    });

    expect(skillOnlyResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "security clearance",
          match_state: "Partial",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["skills"]),
        }),
      ]),
    );
    expect(skillOnlyResult.hard_constraint_risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "security clearance",
          category: "SecurityClearance",
          score_cap: 60,
        }),
      ]),
    );
  });

  it("caps clean driving record requirements when only license evidence exists", async () => {
    const drivingRecordResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Driver license.",
        experience: [],
        skills: [],
      },
      jobDescription: "Required: clean driving record",
    });

    expect(drivingRecordResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "clean driving record",
          match_state: "Missing",
          hard_constraint: true,
        }),
      ]),
    );
    expect(drivingRecordResult.hard_constraint_risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "clean driving record",
          category: "BackgroundScreening",
          score_cap: 70,
          action: expect.stringContaining("driving record"),
        }),
      ]),
    );
  });

  it("accepts motor vehicle record evidence for MVR requirements", async () => {
    const mvrResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Motor vehicle record reviewed for field work.",
        experience: [],
        skills: [],
      },
      jobDescription: "Required: MVR",
    });

    expect(mvrResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "mvr",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["summary"]),
        }),
      ]),
    );
    expect(mvrResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "mvr",
        }),
      ]),
    );
  });

  it("caps auto-insurance requirements when only driver-license evidence exists", async () => {
    const insuranceResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Driver license.",
        experience: [],
        skills: [],
      },
      jobDescription: "Required: proof of auto insurance",
    });

    expect(insuranceResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "proof of auto insurance",
          match_state: "Missing",
          hard_constraint: true,
        }),
      ]),
    );
    expect(insuranceResult.hard_constraint_risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "proof of auto insurance",
          category: "Location",
          score_cap: 70,
          action: expect.stringContaining("auto insurance"),
        }),
      ]),
    );
  });

  it("accepts insured-vehicle evidence for auto-insurance requirements", async () => {
    const insuranceResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "Reliable insured vehicle for client visits.",
        experience: [],
        skills: [],
      },
      jobDescription: "Required: proof of auto insurance",
    });

    expect(insuranceResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "proof of auto insurance",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["summary"]),
        }),
      ]),
    );
    expect(insuranceResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "proof of auto insurance",
        }),
      ]),
    );
  });
});
