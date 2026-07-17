import { beforeEach, describe, it } from "vitest";
import { resetMockData } from "../../mocks/handlers";
import {
  analyzeEducation,
  expectDirectEducationEvidence,
  expectNoGenericEducationConstraint,
} from "./resumeEducationTestSupport";

describe("mock resume advanced education hard-constraint handlers", () => {
  beforeEach(resetMockData);

  it.each(["Associate of Science", "Associate of Applied Science"])(
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

  it.each(["Associate of Science", "Associate of Applied Science"])(
    "does not turn %s job wording into a generic constraint",
    async (jobWording) => {
      const result = await analyzeEducation(null, jobWording);
      expectNoGenericEducationConstraint(result, "associate's degree");
    },
  );

  it("matches doctorate degree and PhD wording", async () => {
    const result = await analyzeEducation(
      "PhD in Biology",
      "doctorate degree",
      "State University",
    );
    expectDirectEducationEvidence(result, "doctorate degree", false);
  });
});
