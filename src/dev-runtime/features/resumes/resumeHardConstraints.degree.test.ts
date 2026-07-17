import { beforeEach, describe, it } from "vitest";
import { resetMockData } from "../../mocks/handlers";
import {
  analyzeEducation,
  expectDirectEducationEvidence,
  expectNoGenericEducationConstraint,
} from "./resumeEducationTestSupport";

describe("mock resume degree hard constraints", () => {
  beforeEach(resetMockData);

  it.each([
    ["Bachelor degree", "bachelor's degree"],
    ["Bachelor of Science", "bachelor's degree"],
    ["Baccalaureate degree", "bachelor's degree"],
    ["Bachelor degree", "baccalaureate degree"],
    ["Bachelor of Applied Science", "bachelor's degree"],
    ["Bachelor of Business Administration", "bachelor's degree"],
    ["Master degree", "master's degree"],
  ])("matches %s as %s evidence", async (degree, requirement) => {
    const result = await analyzeEducation(degree, requirement);
    expectDirectEducationEvidence(
      result,
      requirement,
      requirement !== "master's degree",
    );
  });

  it("does not turn Bachelor of Applied Science job wording into a generic bachelor's degree constraint", async () => {
    const result = await analyzeEducation(null, "Bachelor of Applied Science");
    expectNoGenericEducationConstraint(result, "bachelor's degree");
  });
});
