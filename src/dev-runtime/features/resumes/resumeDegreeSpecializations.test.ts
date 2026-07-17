import { beforeEach, describe, it } from "vitest";
import { resetMockData } from "../../mocks/handlers";
import {
  analyzeEducation,
  expectDirectEducationEvidence,
  expectNoGenericEducationConstraint,
} from "./resumeEducationTestSupport";

describe("mock resume degree specialization hard constraints", () => {
  beforeEach(resetMockData);

  it.each([
    ["Bachelor of Engineering", "bachelor's degree"],
    ["Bachelor of Education", "bachelor's degree"],
    ["Bachelor of Fine Arts", "bachelor's degree"],
    ["Bachelor of Social Work", "bachelor's degree"],
    ["Master of Science", "master's degree"],
  ])("matches %s as %s evidence", async (degree, requirement) => {
    const result = await analyzeEducation(degree, requirement);
    expectDirectEducationEvidence(result, requirement);
  });

  it.each([
    ["Bachelor of Engineering", "bachelor's degree"],
    ["Bachelor of Education", "bachelor's degree"],
    ["Bachelor of Fine Arts", "bachelor's degree"],
    ["Bachelor of Social Work", "bachelor's degree"],
  ])(
    "does not turn %s job wording into a generic %s constraint",
    async (jobWording, genericRequirement) => {
      const result = await analyzeEducation(null, jobWording);
      expectNoGenericEducationConstraint(result, genericRequirement);
    },
  );
});
