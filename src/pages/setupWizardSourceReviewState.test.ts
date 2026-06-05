import { describe, expect, it } from "vitest";
import { createDefaultSetupConfig } from "./setupWizardPreferences";
import {
  getSetupWizardSourceReviewOptions,
  toggleSetupJobSource,
} from "./setupWizardSourceReviewState";

describe("setup wizard source review state", () => {
  it("marks suggested broad sources unchecked until selected", () => {
    const config = {
      ...createDefaultSetupConfig(),
      title_allowlist: ["Office Manager"],
      keywords_boost: ["Scheduling"],
    };

    expect(getSetupWizardSourceReviewOptions(config)).toEqual([
      expect.objectContaining({
        key: "simplyhired",
        checked: false,
      }),
    ]);
  });

  it("fills SimplyHired query from reviewed search words only after opt-in", () => {
    const config = {
      ...createDefaultSetupConfig(),
      title_allowlist: ["Office Manager"],
      keywords_boost: ["Scheduling"],
      location_preferences: {
        ...createDefaultSetupConfig().location_preferences,
        cities: ["Denver"],
      },
    };

    expect(config.simplyhired).toMatchObject({
      enabled: false,
      query: "",
    });

    const toggled = toggleSetupJobSource(config, "simplyhired", true);

    expect(toggled.simplyhired).toMatchObject({
      enabled: true,
      query: "Office Manager Scheduling",
      location: "Denver",
    });
  });
});
