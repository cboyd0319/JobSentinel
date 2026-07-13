import { describe, expect, it } from "vitest";
import { mockConfig } from "../../../mocks/data";
import { handleMockOnboardingCommand } from "./commands";

describe("Onboarding mock commands", () => {
  it("applies reviewed setup values to mock configuration", () => {
    const state = { config: { ...mockConfig } };
    const result = handleMockOnboardingCommand(
      "complete_setup",
      { config: { salary_floor_usd: 65000 } },
      state,
    );

    expect(result).toMatchObject({ handled: true, shouldSave: true });
    expect(result.state.config.salary_floor_usd).toBe(65000);
  });

  it("rejects commands owned by another feature", () => {
    const state = { config: { ...mockConfig } };
    expect(handleMockOnboardingCommand("get_config", undefined, state)).toMatchObject({
      handled: false,
      shouldSave: false,
      state,
    });
  });
});
