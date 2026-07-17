import { beforeEach, describe, it } from "vitest";
import { resetMockData } from "../../mocks/handlers";
import {
  analyzeEducation,
  expectDirectEducationEvidence,
  expectNoGenericEducationConstraint,
} from "./resumeEducationTestSupport";

describe("mock resume education hard-constraint handlers", () => {
  beforeEach(resetMockData);

  it.each([
    "Master of Business Administration",
    "Master of Engineering",
    "Master of Education",
    "Master of Fine Arts",
    "Master of Social Work",
  ])("matches %s as master's degree evidence", async (degree) => {
    const result = await analyzeEducation(degree, "master's degree");
    expectDirectEducationEvidence(result, "master's degree");
  });

  it.each([
    "Master of Engineering",
    "Master of Education",
    "Master of Fine Arts",
    "Master of Social Work",
  ])(
    "does not turn %s job wording into a generic master's degree constraint",
    async (jobWording) => {
      const result = await analyzeEducation(null, jobWording);
      expectNoGenericEducationConstraint(result, "master's degree");
    },
  );

  it.each(["Associate degree", "Associate of Arts"])(
    "matches %s as associate's degree evidence",
    async (degree) => {
      const result = await analyzeEducation(
        degree,
        "associate's degree",
        "Community College",
      );
      expectDirectEducationEvidence(result, "associate's degree");
    },
  );

  it("does not turn Associate of Arts job wording into a generic associate degree constraint", async () => {
    const result = await analyzeEducation(null, "Associate of Arts");
    expectNoGenericEducationConstraint(result, "associate's degree");
  });
});
