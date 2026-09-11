/** Verifies dashboard work-arrangement labels retain the job's raw geography. */

import { describe, expect, it } from "vitest";
import { formatDashboardWorkArrangement } from "./workArrangement";

describe("formatDashboardWorkArrangement", () => {
  it("keeps regional location context for every known arrangement", () => {
    expect(formatDashboardWorkArrangement("remote", "United Kingdom")).toBe(
      "Remote · United Kingdom",
    );
    expect(formatDashboardWorkArrangement("hybrid", "SW1A 1AA")).toBe(
      "Hybrid · SW1A 1AA",
    );
    expect(formatDashboardWorkArrangement("onsite", "80202")).toBe(
      "On-site · 80202",
    );
  });

  it("does not repeat an exact arrangement-only location", () => {
    expect(formatDashboardWorkArrangement("remote", "Remote")).toBe("Remote");
  });
});
