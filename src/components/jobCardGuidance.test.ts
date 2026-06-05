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
        "This posting mentions money, checks, messaging apps, or sensitive details early. Verify the employer, do not pay fees, and do not share sensitive information before confirming the job.",
      ariaLabel: "possible scam sign",
    });
  });

  it("flags crypto or payment-app transfer requests as possible scam signs", () => {
    expect(
      getScamRiskGuidance(
        "The coordinator will send Bitcoin funds and ask you to transfer them to vendors.",
      ),
    ).toMatchObject({
      title: "Possible scam sign",
      ariaLabel: "possible scam sign",
    });
  });

  it("flags passport or direct-deposit requests before an offer", () => {
    expect(
      getScamRiskGuidance(
        "Send your passport and direct deposit details before the interview starts.",
      ),
    ).toMatchObject({
      title: "Possible scam sign",
      ariaLabel: "possible scam sign",
    });
  });

  it("flags reversed sensitive-detail requests before an interview", () => {
    expect(
      getScamRiskGuidance(
        "Before the interview, submit your SSN and bank account details to confirm eligibility.",
      ),
    ).toMatchObject({
      title: "Possible scam sign",
      ariaLabel: "possible scam sign",
    });
  });

  it("flags messaging-app-only interviews as possible scam signs", () => {
    expect(
      getScamRiskGuidance(
        "Our recruiter will complete your interview by Telegram message today.",
      ),
    ).toMatchObject({
      title: "Possible scam sign",
      ariaLabel: "possible scam sign",
    });
  });

  it("keeps ordinary descriptions quiet for scam guidance", () => {
    expect(
      getScamRiskGuidance("Help customers, document issues, and support a care team."),
    ).toBeNull();
  });

  it("keeps ordinary payroll descriptions quiet for scam guidance", () => {
    expect(
      getScamRiskGuidance(
        "Process payroll, reconcile invoices, and support vendor payment reporting.",
      ),
    ).toBeNull();
  });

  it("keeps ordinary team chat descriptions quiet for scam guidance", () => {
    expect(
      getScamRiskGuidance(
        "Coordinate updates through team chat, email, and weekly staff meetings.",
      ),
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

  it("flags open-ended starting pay below the user's floor as a review cue", () => {
    expect(getPayFloorGuidance(45000, null, 65000)).toEqual({
      title: "Open-ended listed pay",
      description:
        "Only starting pay is listed below your $65,000/year floor. Confirm the realistic top range before tailoring.",
      ariaLabel: "open-ended listed pay; confirm range before tailoring",
    });
  });

  it("flags very wide pay ranges as weaker evidence", () => {
    expect(getSalaryRangeQualityGuidance(45000, 140000)).toMatchObject({
      title: "Very wide pay range",
      ariaLabel: "very wide pay range",
    });
  });

  it("flags starting-only listed pay as open-ended range evidence", () => {
    expect(getSalaryRangeQualityGuidance(45000, null)).toEqual({
      title: "Open-ended listed pay",
      description:
        "Only starting pay is listed. Confirm the realistic top range before tailoring.",
      ariaLabel: "open-ended listed pay",
    });
  });
});
