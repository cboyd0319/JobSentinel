/** Verifies native listed-pay validation, display, and USD comparison boundaries. */

import { describe, expect, it } from "vitest";
import {
  formatJobListedPay,
  formatNativeListedPay,
  getJobUsdAnnualPayBounds,
  parseListedPay,
} from "./listedPay";

const eurMonthlyCtc = {
  min: 5_000,
  max: 7_000,
  currency: "EUR",
  period: "monthly",
  qualifiers: ["ctc"],
  raw_text: "€5,000–€7,000 monthly CTC",
};

describe("listed pay", () => {
  it("retains native currency, period, qualifiers, and source text without converting", () => {
    const pay = parseListedPay(eurMonthlyCtc);

    expect(pay).toEqual(eurMonthlyCtc);
    if (pay === null) throw new Error("valid native pay was rejected");
    expect(formatNativeListedPay(pay)).toBe(
      "5,000–7,000 EUR · monthly · CTC · Source text: €5,000–€7,000 monthly CTC",
    );
    expect(getJobUsdAnnualPayBounds({ listed_pay: eurMonthlyCtc })).toBeNull();
  });

  it("rejects malformed native evidence and never falls back to legacy USD projections", () => {
    const invalidNativePay = { ...eurMonthlyCtc, currency: "eur" };
    const job = {
      listed_pay: invalidNativePay,
      salary_min: 120_000,
      salary_max: 150_000,
      currency: "USD",
    };

    expect(parseListedPay(invalidNativePay)).toBeNull();
    expect(getJobUsdAnnualPayBounds(job)).toBeNull();
    expect(formatJobListedPay(job)).toBe("Listed pay could not be read");
  });

  it("rejects unbounded, hidden, duplicate, and unknown native fields", () => {
    expect(parseListedPay({ ...eurMonthlyCtc, min: Number.POSITIVE_INFINITY })).toBeNull();
    expect(parseListedPay({ ...eurMonthlyCtc, raw_text: "€5,000\u202E" })).toBeNull();
    expect(parseListedPay({ ...eurMonthlyCtc, qualifiers: ["ctc", "ctc"] })).toBeNull();
    expect(parseListedPay({ ...eurMonthlyCtc, source: "untrusted" })).toBeNull();
  });

  it("rejects whitespace-only native source text", () => {
    expect(
      parseListedPay({
        ...eurMonthlyCtc,
        min: null,
        max: null,
        raw_text: "   ",
      }),
    ).toBeNull();
  });

  it("compares only unqualified annual USD evidence and never assumes an omitted currency", () => {
    expect(
      getJobUsdAnnualPayBounds({
        listed_pay: {
          min: 120_000,
          max: 150_000,
          currency: "USD",
          period: "annual",
          qualifiers: [],
          raw_text: null,
        },
      }),
    ).toEqual({ min: 120_000, max: 150_000 });
    expect(
      getJobUsdAnnualPayBounds({ salary_min: 120_000, salary_max: 150_000 }),
    ).toBeNull();
  });

  it("shows validated legacy amounts with unknown currency and period without comparing them", () => {
    const job = { salary_min: 120_000, salary_max: 150_000 };

    expect(formatJobListedPay(job)).toBe(
      "120,000–150,000 Currency not disclosed · period not recorded",
    );
    expect(getJobUsdAnnualPayBounds(job)).toBeNull();
  });
});
