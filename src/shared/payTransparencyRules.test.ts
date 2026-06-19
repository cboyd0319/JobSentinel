import { describe, expect, it } from "vitest";
import {
  findPayTransparencyRule,
  getPayTransparencyGuidance,
  PAY_TRANSPARENCY_LAST_REVIEWED,
  PAY_TRANSPARENCY_RULES,
} from "./payTransparencyRules";

describe("pay transparency rules", () => {
  it("keeps current source-review metadata on regional rules", () => {
    expect(PAY_TRANSPARENCY_LAST_REVIEWED).toBe("2026-06-19");
    expect(PAY_TRANSPARENCY_RULES.length).toBeGreaterThanOrEqual(10);
    expect(
      PAY_TRANSPARENCY_RULES.every((rule) => rule.sourceUrl.startsWith("https://")),
    ).toBe(true);
  });

  it("matches supported job locations by state, abbreviation, or city", () => {
    expect(findPayTransparencyRule("Denver, CO")?.regionCode).toBe("US-CO");
    expect(findPayTransparencyRule("San Francisco, California")?.regionCode).toBe(
      "US-CA",
    );
    expect(findPayTransparencyRule("Chicago, IL")?.regionCode).toBe("US-IL");
    expect(findPayTransparencyRule("Boston, MA")?.regionCode).toBe("US-MA");
  });

  it("does not confuse Washington DC with Washington State", () => {
    expect(findPayTransparencyRule("Washington, DC")?.regionCode).toBe("US-DC");
    expect(findPayTransparencyRule("Seattle, WA")?.regionCode).toBe("US-WA");
  });

  it("returns a plain review cue when a supported region has no usable pay range", () => {
    expect(
      getPayTransparencyGuidance({
        location: "Denver, CO",
        salaryMin: null,
        salaryMax: null,
      }),
    ).toEqual({
      title: "Check pay range",
      description:
        "Colorado has pay-range posting rules for covered employers. This saved job has no usable pay range, so open the employer posting and confirm the written range before applying.",
      ariaLabel: "pay range to check for Colorado",
      regionLabel: "Colorado",
      sourceUrl:
        "https://cdle.colorado.gov/dlss/labor-laws-by-topic/equal-pay-for-equal-work-act",
    });
  });

  it("keeps quiet when pay is listed or the location is not supported", () => {
    expect(
      getPayTransparencyGuidance({
        location: "Denver, CO",
        salaryMin: 70000,
        salaryMax: 90000,
      }),
    ).toBeNull();
    expect(
      getPayTransparencyGuidance({
        location: "Des Moines, IA",
        salaryMin: null,
        salaryMax: null,
      }),
    ).toBeNull();
  });
});
