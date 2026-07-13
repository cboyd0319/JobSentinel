import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockInvoke, resetMockData } from "../../../mocks/handlers";
import { atsResume } from "./resumeAnalysisTestData";
import type { AtsAnalysisResult } from "./resumeAnalysisTestData";

describe("mock resume runtime commands", () => {
  let localStore: Record<string, string>;

  beforeEach(() => {
    vi.useRealTimers();
    localStore = {};
    vi.mocked(window.localStorage.getItem).mockImplementation(
      (key) => localStore[key] ?? null,
    );
    vi.mocked(window.localStorage.setItem).mockImplementation((key, value) => {
      localStore[key] = value;
    });
    vi.mocked(window.localStorage.removeItem).mockImplementation((key) => {
      delete localStore[key];
    });
    vi.mocked(window.localStorage.clear).mockImplementation(() => {
      localStore = {};
    });
    resetMockData();
  });

  it("does not cap degree-or-equivalent experience requirements in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        education: [],
        experience: [
          {
            ...atsResume.experience[0],
            achievements: [
              "6 years of client operations experience and records management.",
            ],
          },
        ],
      },
      jobDescription: "Required: bachelor's degree or equivalent experience",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "degree or equivalent experience",
          match_state: "Strong",
          hard_constraint: false,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: expect.stringContaining("degree"),
        }),
      ]),
    );
  });

  it("does not cap degree-or-equivalent combination requirements in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        education: [],
        experience: [
          {
            ...atsResume.experience[0],
            achievements: [
              "6 years of client operations experience and records management.",
            ],
          },
        ],
      },
      jobDescription:
        "Required: bachelor's degree or equivalent combination of education and experience",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "degree or equivalent experience",
          match_state: "Strong",
          hard_constraint: false,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: expect.stringContaining("degree"),
        }),
      ]),
    );
  });

  it("does not cap associate-degree-or-equivalent experience requirements in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        education: [],
        experience: [
          {
            ...atsResume.experience[0],
            achievements: [
              "6 years of client operations experience and records management.",
            ],
          },
        ],
      },
      jobDescription: "Required: associate degree or equivalent experience",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "degree or equivalent experience",
          match_state: "Strong",
          hard_constraint: false,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: expect.stringContaining("degree"),
        }),
      ]),
    );
  });

  it("does not cap doctorate-degree-or-equivalent experience requirements in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        education: [],
        experience: [
          {
            ...atsResume.experience[0],
            achievements: [
              "6 years of client operations experience and records management.",
            ],
          },
        ],
      },
      jobDescription: "Required: doctorate degree or equivalent experience",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "degree or equivalent experience",
          match_state: "Strong",
          hard_constraint: false,
          evidence_sections: expect.arrayContaining(["current experience"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: expect.stringContaining("degree"),
        }),
      ]),
    );
  });

  it("recognizes GED as high-school diploma evidence in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        education: [
          {
            degree: "GED",
            institution: "Adult Learning Center",
            location: "Denver, CO",
            graduation_date: "2018",
            gpa: null,
            honors: [],
          },
        ],
      },
      jobDescription: "Required: high school diploma",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "high school diploma",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["education"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "high school diploma",
        }),
      ]),
    );
  });

  it("matches high-school hyphen variants in mock hard constraints", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        education: [
          {
            degree: "High school diploma",
            institution: "Adult Learning Center",
            location: "Denver, CO",
            graduation_date: "2018",
            gpa: null,
            honors: [],
          },
        ],
      },
      jobDescription: "Required: high-school diploma",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "high-school diploma",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["education"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "high-school diploma",
        }),
      ]),
    );
  });

  it("recognizes Certified Nursing Assistant as CNA evidence in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["Certified Nursing Assistant"],
      },
      jobDescription: "Required: CNA certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "cna",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "cna",
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

  it("recognizes Licensed Practical Nurse as LPN evidence in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["Licensed Practical Nurse"],
      },
      jobDescription: "Required: LPN license",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "lpn",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "lpn",
        }),
      ]),
    );
  });

  it("recognizes Project Management Professional as PMP evidence in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["Project Management Professional"],
      },
      jobDescription: "Required: PMP certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "pmp",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "pmp",
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

  it("recognizes ServSafe as food-safety certification evidence in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["ServSafe Food Handler"],
      },
      jobDescription: "Required: food safety certification",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "food safety certification",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "food safety certification",
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

  it("matches food-handler hyphen variants in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["Food handler card"],
      },
      jobDescription: "Required: food-handler card",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "food-handler card",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "food-handler card",
        }),
      ]),
    );
  });

  it("matches food handler's card wording in mock resume review", async () => {
    const result = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        certifications: ["Food handler card"],
      },
      jobDescription: "Required: food handler's card",
    });

    expect(result.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "food handler's card",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["certifications"]),
        }),
      ]),
    );
    expect(result.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "food handler's card",
        }),
      ]),
    );
  });

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
