import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke } from "../../mocks/handlers";
import { atsResume } from "./resumeAnalysisTestData";
import type { AtsAnalysisResult } from "./resumeAnalysisTestData";
import { setupResumeRuntimeMocks } from "./resumeRuntimeTestSupport";
describe("mock resume runtime commands", () => {
  beforeEach(setupResumeRuntimeMocks);
  it("matches Security Plus wording variants in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["Security Plus"],
      },
      jobDescription: "Required: Security+ certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "security+",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "security+",
        }),
      ]),
    );
  });

  it("matches CISSP full-name wording in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["CISSP"],
      },
      jobDescription: "Required: Certified Information Systems Security Professional",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "certified information systems security professional",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "certified information systems security professional",
        }),
      ]),
    );
  });

  it("recognizes First Aid Certified as first-aid certification evidence in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["First Aid Certified"],
      },
      jobDescription: "Required: first aid certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "first aid certification",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "first aid certification",
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "certification",
        }),
      ]),
    );
  });

  it("recognizes forklift operator certification as forklift certification evidence in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["Forklift Operator Certification"],
      },
      jobDescription: "Required: forklift certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "forklift certification",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "forklift certification",
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "certification",
        }),
      ]),
    );
  });

  it("recognizes OSHA 10-Hour as OSHA 10 certification evidence in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["OSHA 10-Hour Construction Safety"],
      },
      jobDescription: "Required: OSHA 10 certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "osha 10 certification",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "osha 10 certification",
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "certification",
        }),
      ]),
    );
  });

  it("recognizes OSHA 30-Hour as OSHA 30 certification evidence in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["OSHA 30-Hour Construction Safety"],
      },
      jobDescription: "Required: OSHA 30 certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "osha 30 certification",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "osha 30 certification",
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "certification",
        }),
      ]),
    );
  });

  it("recognizes Certified Public Accountant as CPA evidence in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["Certified Public Accountant"],
      },
      jobDescription: "Required: CPA certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "cpa",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "cpa",
        }),
      ]),
    );
  });

  it("does not treat CPA optimization as an accounting credential in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        experience: [
          {
            ...atsResume.experience[0],
            achievements: ["Reduced paid search CPA through conversion optimization."],
          },
        ],
      },
      jobDescription: "Required: CPA optimization and paid search reporting",
    });

    expect(result.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "cpa",
          hard_constraint: true,
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "cpa",
        }),
      ]),
    );
  });

  it("recognizes Six Sigma belt evidence for certification requirements in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["Lean Six Sigma Green Belt"],
      },
      jobDescription: "Required: Six Sigma certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "six sigma certification",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
  });

  it("recognizes AWS Certified credential wording in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["AWS Certified Cloud Practitioner"],
      },
      jobDescription: "Required: AWS certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "aws certification",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
  });

  it("recognizes SHRM-CP credential wording in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["SHRM Certified Professional"],
      },
      jobDescription: "Required: SHRM-CP certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "shrm-cp",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
  });

});
