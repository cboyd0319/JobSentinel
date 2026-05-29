import { describe, expect, it } from "vitest";
import { defaultTourSteps } from "./tourSteps";

describe("defaultTourSteps", () => {
  it("uses practical onboarding copy instead of promise-heavy language", () => {
    const tourCopy = defaultTourSteps
      .flatMap((step) => [step.title, step.content])
      .join(" ");

    expect(tourCopy).toMatch(/saved search/i);
    expect(tourCopy).not.toMatch(/\b(best|great|profile|quality score)\b/i);
  });
});
