import { describe, expect, it } from "vitest";
import {
  getPayFloorGuidance,
  getPostingRiskGuidance,
  getSalaryRangeQualityGuidance,
  getScamRiskGuidance,
} from "./jobCardGuidance";

describe("jobCardGuidance", () => {
  it("flags gift-card requests as possible scam signs", () => {
    expect(
      getScamRiskGuidance(
        "We will reimburse you after you buy gift cards for onboarding equipment.",
      ),
    ).toEqual({
      title: "Possible scam sign",
      description:
        "This posting mentions money, checks, or sensitive details early. Verify the employer, do not pay fees, and do not share sensitive information before confirming the job.",
      ariaLabel: "possible scam sign",
    });
  });

  it("keeps ordinary descriptions quiet for scam guidance", () => {
    expect(
      getScamRiskGuidance("Help customers, document issues, and support a care team."),
    ).toBeNull();
  });

  it("keeps stale evidence visible when posting-risk score is unavailable", () => {
    expect(
      getPostingRiskGuidance(
        null,
        JSON.stringify([
          {
            category: "stale",
            description: "Posted 70 days ago",
            severity: "medium",
            weight: 0.2,
          },
        ]),
      ),
    ).toMatchObject({
      title: "Check posting evidence",
      ariaLabel: "posting evidence to check",
    });
  });

  it("treats missing or reversed pay as unavailable when salary floor exists", () => {
    expect(getPayFloorGuidance(150000, 80000, 100000)).toMatchObject({
      title: "Pay not listed",
      ariaLabel: "pay not listed; compare before tailoring",
    });
  });

  it("flags very wide pay ranges as weaker evidence", () => {
    expect(getSalaryRangeQualityGuidance(45000, 140000)).toMatchObject({
      title: "Very wide pay range",
      ariaLabel: "very wide pay range",
    });
  });
});
