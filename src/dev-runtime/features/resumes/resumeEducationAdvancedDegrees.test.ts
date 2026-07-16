import { beforeEach, describe, expect, it } from "vitest";
import { mockInvoke, resetMockData } from "../../mocks/handlers";
import { atsResume } from "./resumeAnalysisTestData";
import type { AtsAnalysisResult } from "./resumeAnalysisTestData";

describe("mock resume advanced education hard-constraint handlers", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("matches Associate of Science as associate's degree evidence", async () => {
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

  it("does not turn Associate of Science job wording into a generic constraint", async () => {
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

  it("matches Associate of Applied Science as associate's degree evidence", async () => {
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

  it("does not turn Associate of Applied Science wording into a generic constraint", async () => {
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

  it("matches doctorate degree and PhD wording", async () => {
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
