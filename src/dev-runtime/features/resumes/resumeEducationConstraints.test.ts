import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../mocks/handlers";
import { atsResume } from "./resumeAnalysisTestData";
import type { AtsAnalysisResult } from "./resumeAnalysisTestData";
describe("mock resume education hard-constraint handlers", () => {
  beforeEach(() => {
    resetMockData();
  });
  it("matches Master of Business Administration as master's degree evidence in mock hard constraints", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [
          {
            degree: "Master of Business Administration",
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
  it("matches Master of Engineering as master's degree evidence in mock hard constraints", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [
          {
            degree: "Master of Engineering",
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
  it("does not turn Master of Engineering job wording into a generic master's degree mock hard constraint", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [],
      },
      jobDescription: "Required: Master of Engineering",
    });
    expect(degreeResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "master's degree",
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
  });
  it("matches Master of Education as master's degree evidence in mock hard constraints", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [
          {
            degree: "Master of Education",
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
  it("does not turn Master of Education job wording into a generic master's degree mock hard constraint", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [],
      },
      jobDescription: "Required: Master of Education",
    });
    expect(degreeResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "master's degree",
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
  });
  it("matches Master of Fine Arts as master's degree evidence in mock hard constraints", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [
          {
            degree: "Master of Fine Arts",
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
  it("does not turn Master of Fine Arts job wording into a generic master's degree mock hard constraint", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [],
      },
      jobDescription: "Required: Master of Fine Arts",
    });
    expect(degreeResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "master's degree",
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
  });

  it("matches Master of Social Work as master's degree evidence in mock hard constraints", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [
          {
            degree: "Master of Social Work",
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

  it("does not turn Master of Social Work job wording into a generic master's degree mock hard constraint", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [],
      },
      jobDescription: "Required: Master of Social Work",
    });

    expect(degreeResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "master's degree",
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
  });

  it("matches associate's degree punctuation variants in mock hard constraints", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [
          {
            degree: "Associate degree",
            institution: "Community College",
            location: "Denver, CO",
            graduation_date: "2020",
            gpa: null,
            honors: [],
          },
        ],
      },
      jobDescription: "Required: associate's degree",
    });

    expect(degreeResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "associate's degree",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["education"]),
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "associate's degree",
        }),
      ]),
    );
  });

  it("matches Associate of Arts as associate's degree evidence in mock hard constraints", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [
          {
            degree: "Associate of Arts",
            institution: "Community College",
            location: "Denver, CO",
            graduation_date: "2020",
            gpa: null,
            honors: [],
          },
        ],
      },
      jobDescription: "Required: associate's degree",
    });

    expect(degreeResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "associate's degree",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["education"]),
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "associate's degree",
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

  it("does not turn Associate of Arts job wording into a generic associate degree mock hard constraint", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [],
      },
      jobDescription: "Required: Associate of Arts",
    });

    expect(degreeResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "associate's degree",
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "associate's degree",
        }),
      ]),
    );
  });

  it("matches Associate of Science as associate's degree evidence in mock hard constraints", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [
          {
            degree: "Associate of Science",
            institution: "Community College",
            location: "Denver, CO",
            graduation_date: "2020",
            gpa: null,
            honors: [],
          },
        ],
      },
      jobDescription: "Required: associate's degree",
    });

    expect(degreeResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "associate's degree",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["education"]),
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "associate's degree",
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

  it("does not turn Associate of Science job wording into a generic associate degree mock hard constraint", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [],
      },
      jobDescription: "Required: Associate of Science",
    });

    expect(degreeResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "associate's degree",
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "associate's degree",
        }),
      ]),
    );
  });

  it("matches Associate of Applied Science as associate's degree evidence in mock hard constraints", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [
          {
            degree: "Associate of Applied Science",
            institution: "Community College",
            location: "Denver, CO",
            graduation_date: "2020",
            gpa: null,
            honors: [],
          },
        ],
      },
      jobDescription: "Required: associate's degree",
    });

    expect(degreeResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "associate's degree",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["education"]),
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "associate's degree",
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

  it("does not turn Associate of Applied Science job wording into a generic associate degree mock hard constraint", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [],
      },
      jobDescription: "Required: Associate of Applied Science",
    });

    expect(degreeResult.requirement_reviews).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "associate's degree",
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "associate's degree",
        }),
      ]),
    );
  });

  it("matches doctorate degree and PhD wording in mock hard constraints", async () => {
    const degreeResult = await mockInvoke<AtsAnalysisResult>("analyze_resume_for_job", {
      resume: {
        ...atsResume,
        summary: "",
        experience: [],
        skills: [],
        education: [
          {
            degree: "PhD in Biology",
            institution: "State University",
            location: "Denver, CO",
            graduation_date: "2020",
            gpa: null,
            honors: [],
          },
        ],
      },
      jobDescription: "Required: doctorate degree",
    });

    expect(degreeResult.requirement_reviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "doctorate degree",
          match_state: "Direct",
          hard_constraint: true,
          evidence_sections: expect.arrayContaining(["education"]),
        }),
      ]),
    );
    expect(degreeResult.hard_constraint_risks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requirement: "doctorate degree",
        }),
      ]),
    );
  });
});
