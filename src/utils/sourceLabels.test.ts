import { describe, expect, it } from "vitest";
import {
  formatJobSourceLabel,
  getJobSourceGuidance,
  normalizeJobSourceKey,
} from "./sourceLabels";

describe("sourceLabels", () => {
  it("normalizes common source keys before lookup", () => {
    expect(normalizeJobSourceKey("Manual Import")).toBe("manual_import");
    expect(formatJobSourceLabel("manual_import")).toBe("Saved by you");
  });

  it("labels employer-side hiring sources in plain language", () => {
    const guidance = getJobSourceGuidance("greenhouse");

    expect(guidance.label).toBe("Greenhouse hiring page");
    expect(guidance.description).toContain("verify before tailoring");
  });

  it("cleans unknown source IDs before rendering", () => {
    expect(formatJobSourceLabel("city_careers")).toBe("City Careers");
  });
});
