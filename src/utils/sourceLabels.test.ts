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

  it("labels community hiring posts without acronym-first wording", () => {
    expect(formatJobSourceLabel("hn_hiring")).toBe("Startup and tech job posts");
  });

  it("cleans unknown source IDs before rendering", () => {
    expect(formatJobSourceLabel("city_careers")).toBe("City Careers");
  });

  it("labels missing source data without implying it came from the posting", () => {
    const guidance = getJobSourceGuidance("   ");

    expect(guidance.label).toBe("Source not shown");
    expect(guidance.description).toBe(
      "No source was recorded for this posting. Open the original job page before tailoring.",
    );
  });
});
