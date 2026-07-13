import { describe, expect, it } from "vitest";
import {
  formatSalaryNumber,
  formatSalaryRange,
  hasMalformedSalaryRangeInput,
  truncateJobDescription,
} from "./jobDisplayFormatting";

describe("job display formatting", () => {
  describe("salary", () => {
    it("formats compact salary numbers", () => {
      expect(formatSalaryNumber(50000)).toBe("$50k");
      expect(formatSalaryNumber(1500)).toBe("$2k");
      expect(formatSalaryNumber(999)).toBe("$999");
    });

    it("formats complete and partial ranges", () => {
      expect(formatSalaryRange(80000, 120000)).toBe("$80k - $120k");
      expect(formatSalaryRange(100000, null)).toBe("$100k+");
      expect(formatSalaryRange(null, 150000)).toBe("Up to $150k");
    });

    it("omits absent or malformed ranges", () => {
      expect(formatSalaryRange()).toBeNull();
      expect(formatSalaryRange(null, null)).toBeNull();
      expect(formatSalaryRange(-50000, null)).toBeNull();
      expect(formatSalaryRange(null, Infinity)).toBeNull();
      expect(formatSalaryRange(NaN, 150000)).toBeNull();
      expect(formatSalaryRange(150000, 80000)).toBeNull();
    });

    it("identifies malformed listed salary input", () => {
      expect(hasMalformedSalaryRangeInput(-1, null)).toBe(true);
      expect(hasMalformedSalaryRangeInput(null, Infinity)).toBe(true);
      expect(hasMalformedSalaryRangeInput(150000, 80000)).toBe(true);
      expect(hasMalformedSalaryRangeInput(80000, 150000)).toBe(false);
    });
  });

  describe("job descriptions", () => {
    it("normalizes whitespace and preserves short text", () => {
      expect(truncateJobDescription("text   with\n\nspacing")).toBe(
        "text with spacing",
      );
      expect(truncateJobDescription(null)).toBeNull();
    });

    it("truncates long text with an ellipsis", () => {
      expect(truncateJobDescription("This is a longer sentence", 10)).toBe(
        "This is a...",
      );
      expect(truncateJobDescription("a".repeat(150), 120)).toHaveLength(123);
    });
  });
});
