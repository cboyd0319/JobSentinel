import { describe, expect, it } from "vitest";
import { formatCurrency } from "./currencyFormatting";

describe("currency formatting", () => {
  it("formats US dollars without fractional digits", () => {
    expect(formatCurrency(120000)).toBe("$120,000");
    expect(formatCurrency(1500)).toBe("$1,500");
    expect(formatCurrency(50)).toBe("$50");
    expect(formatCurrency(0)).toBe("$0");
  });

  it("uses unavailable copy for missing values", () => {
    expect(formatCurrency(null)).toBe("N/A");
  });
});
