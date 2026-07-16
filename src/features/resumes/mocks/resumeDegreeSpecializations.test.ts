import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../../test-support/mocks/handlers";
import { atsResume } from "./resumeAnalysisTestData";
import type { AtsAnalysisResult } from "./resumeAnalysisTestData";

describe("mock resume degree specialization hard constraints", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("matches Bachelor of Engineering as bachelor's degree evidence in mock hard constraints", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [
          {
            degree: "Bachelor of Engineering",
            institution: "State College",
            location: "Denver, CO",
            graduation_date: "2020",
            gpa: null,
            honors: [],
          },
        ],
      },
      jobDescription: "Required: bachelor's degree",
    });

    expect(degreeResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "bachelor's degree",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["education"]),
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "bachelor's degree",
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "degree",
        }),
      ]),
    );
  });

  it("does not turn Bachelor of Engineering job wording into a generic bachelor's degree mock hard constraint", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [],
      },
      jobDescription: "Required: Bachelor of Engineering",
    });

    expect(degreeResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "bachelor's degree",
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "bachelor's degree",
        }),
      ]),
    );
  });

  it("matches Bachelor of Education as bachelor's degree evidence in mock hard constraints", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [
          {
            degree: "Bachelor of Education",
            institution: "State College",
            location: "Denver, CO",
            graduation_date: "2020",
            gpa: null,
            honors: [],
          },
        ],
      },
      jobDescription: "Required: bachelor's degree",
    });

    expect(degreeResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "bachelor's degree",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["education"]),
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "bachelor's degree",
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "degree",
        }),
      ]),
    );
  });

  it("does not turn Bachelor of Education job wording into a generic bachelor's degree mock hard constraint", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [],
      },
      jobDescription: "Required: Bachelor of Education",
    });

    expect(degreeResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "bachelor's degree",
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "bachelor's degree",
        }),
      ]),
    );
  });

  it("matches Bachelor of Fine Arts as bachelor's degree evidence in mock hard constraints", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [
          {
            degree: "Bachelor of Fine Arts",
            institution: "State College",
            location: "Denver, CO",
            graduation_date: "2020",
            gpa: null,
            honors: [],
          },
        ],
      },
      jobDescription: "Required: bachelor's degree",
    });

    expect(degreeResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "bachelor's degree",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["education"]),
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "bachelor's degree",
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "degree",
        }),
      ]),
    );
  });

  it("does not turn Bachelor of Fine Arts job wording into a generic bachelor's degree mock hard constraint", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [],
      },
      jobDescription: "Required: Bachelor of Fine Arts",
    });

    expect(degreeResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "bachelor's degree",
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "bachelor's degree",
        }),
      ]),
    );
  });

  it("matches Bachelor of Social Work as bachelor's degree evidence in mock hard constraints", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [
          {
            degree: "Bachelor of Social Work",
            institution: "State College",
            location: "Denver, CO",
            graduation_date: "2020",
            gpa: null,
            honors: [],
          },
        ],
      },
      jobDescription: "Required: bachelor's degree",
    });

    expect(degreeResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "bachelor's degree",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["education"]),
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "bachelor's degree",
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "degree",
        }),
      ]),
    );
  });

  it("does not turn Bachelor of Social Work job wording into a generic bachelor's degree mock hard constraint", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [],
      },
      jobDescription: "Required: Bachelor of Social Work",
    });

    expect(degreeResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "bachelor's degree",
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "bachelor's degree",
        }),
      ]),
    );
  });

  it("matches Master of Science as master's degree evidence in mock hard constraints", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [
          {
            degree: "Master of Science",
            institution: "State College",
            location: "Denver, CO",
            graduation_date: "2020",
            gpa: null,
            honors: [],
          },
        ],
      },
      jobDescription: "Required: master's degree",
    });

    expect(degreeResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "master's degree",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["education"]),
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "master's degree",
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "degree",
        }),
      ]),
    );
  });
});
