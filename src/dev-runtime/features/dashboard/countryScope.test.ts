/** Verifies bounded, fail-closed mock geography country classification. */

import { describe, expect, it } from "vitest";
import { mockJobs } from "../../mocks/data";
import { classifyMockCountryScope } from "./countryScope";

const unitedKingdom = {
  raw_location: "London",
  country: { raw_country: "United Kingdom", alpha2: "GB" },
};

describe("mock country scope", () => {
  it("rejects malformed geography outside the selected remote applicant locations", () => {
    const job = {
      ...mockJobs[0],
      remote: true,
      geography: {
        worksite_locations: Array.from({ length: 17 }, () => unitedKingdom),
        remote_applicant_locations: [unitedKingdom],
      },
    };

    expect(classifyMockCountryScope(job, "GB")).toBe("unknown");
  });

  it("does not trust empty location text or contradictory raw country evidence", () => {
    expect(classifyMockCountryScope({
      ...mockJobs[1],
      geography: {
        worksite_locations: [{ ...unitedKingdom, raw_location: "" }],
        remote_applicant_locations: [],
      },
    }, "GB")).toBe("unknown");

    expect(classifyMockCountryScope({
      ...mockJobs[0],
      remote: true,
      geography: {
        worksite_locations: [],
        remote_applicant_locations: [{
          raw_location: "London",
          country: { raw_country: "United States", alpha2: "GB" },
        }],
      },
    }, "GB")).toBe("unknown");
  });

  it("bounds raw location evidence by native UTF-8 byte limits", () => {
    expect(classifyMockCountryScope({
      ...mockJobs[1],
      geography: {
        worksite_locations: [{
          ...unitedKingdom,
          raw_location: "a".repeat(1025),
        }],
        remote_applicant_locations: [],
      },
    }, "GB")).toBe("unknown");
  });
});
