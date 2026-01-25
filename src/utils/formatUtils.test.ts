import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  formatRelativeDate,
  formatEventDate,
  formatDateTime,
  formatInterviewDate,
  formatCompactDateTime,
  getRelativeTimeUntil,
  formatSalaryNumber,
  formatSalaryRange,
  truncateText,
  formatNumber,
  formatPercent,
} from "./formatUtils";

describe("formatUtils", () => {
  describe("formatRelativeDate", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-25T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns 'Just now' for dates less than 1 hour old", () => {
      const thirtyMinutesAgo = new Date("2026-01-25T11:30:00Z").toISOString();
      expect(formatRelativeDate(thirtyMinutesAgo)).toBe("Just now");
    });

    it("returns hours ago for dates less than 24 hours old", () => {
      const fiveHoursAgo = new Date("2026-01-25T07:00:00Z").toISOString();
      expect(formatRelativeDate(fiveHoursAgo)).toBe("5h ago");
    });

    it("returns days ago for dates less than 7 days old", () => {
      const threeDaysAgo = new Date("2026-01-22T12:00:00Z").toISOString();
      expect(formatRelativeDate(threeDaysAgo)).toBe("3d ago");
    });

    it("returns localized date for dates older than 7 days", () => {
      const tenDaysAgo = new Date("2026-01-15T12:00:00Z").toISOString();
      const result = formatRelativeDate(tenDaysAgo);
      // Should be a localized date string, not "10d ago"
      expect(result).not.toContain("d ago");
      expect(result).toMatch(/\d/); // Contains at least one digit (date)
    });
  });

  describe("formatEventDate", () => {
    it("formats date with weekday, month, day, and year", () => {
      const result = formatEventDate("2026-01-25T12:00:00Z");
      // Check for expected components - weekday may vary by timezone
      expect(result).toMatch(/\w{3}/); // 3-letter weekday
      expect(result).toContain("Jan");
      expect(result).toContain("25");
      expect(result).toContain("2026");
    });
  });

  describe("formatDateTime", () => {
    it("formats date with month, day, year, hour, and minute", () => {
      const result = formatDateTime("2026-01-25T14:30:00Z");
      expect(result).toContain("Jan");
      expect(result).toContain("25");
      expect(result).toContain("2026");
      // Time will be localized, so just check it contains numbers
      expect(result).toMatch(/\d:\d/);
    });
  });

  describe("formatInterviewDate", () => {
    it("formats date with weekday, month, day, and time (no year)", () => {
      const result = formatInterviewDate("2026-01-25T14:30:00Z");
      expect(result).toMatch(/\w{3}/); // 3-letter weekday
      expect(result).toContain("Jan");
      expect(result).toContain("25");
      expect(result).not.toContain("2026"); // No year
      expect(result).toMatch(/\d:\d/); // Time
    });
  });

  describe("formatCompactDateTime", () => {
    it("formats date with month, day, and time (no year, no weekday)", () => {
      const result = formatCompactDateTime("2026-01-25T14:30:00Z");
      expect(result).toContain("Jan");
      expect(result).toContain("25");
      expect(result).not.toContain("2026"); // No year
      expect(result).toMatch(/\d:\d/); // Time
      // Should not contain weekday
      expect(result).not.toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
    });
  });

  describe("getRelativeTimeUntil", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-25T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns 'Past' for past dates", () => {
      expect(getRelativeTimeUntil("2026-01-24T12:00:00Z")).toBe("Past");
    });

    it("returns '< 1 hour' for dates within an hour", () => {
      expect(getRelativeTimeUntil("2026-01-25T12:30:00Z")).toBe("< 1 hour");
    });

    it("returns hours for dates within 24 hours", () => {
      expect(getRelativeTimeUntil("2026-01-25T17:00:00Z")).toBe("5 hours");
    });

    it("returns 'Tomorrow' for dates 1 day away", () => {
      expect(getRelativeTimeUntil("2026-01-26T14:00:00Z")).toBe("Tomorrow");
    });

    it("returns days for dates more than 1 day away", () => {
      expect(getRelativeTimeUntil("2026-01-28T12:00:00Z")).toBe("3 days");
    });
  });

  describe("formatSalaryNumber", () => {
    it("formats thousands as k", () => {
      expect(formatSalaryNumber(50000)).toBe("$50k");
      expect(formatSalaryNumber(120000)).toBe("$120k");
      expect(formatSalaryNumber(1500)).toBe("$2k"); // Rounds
    });

    it("formats small numbers without k", () => {
      expect(formatSalaryNumber(500)).toBe("$500");
      expect(formatSalaryNumber(999)).toBe("$999");
    });
  });

  describe("formatSalaryRange", () => {
    it("returns null when no salary data provided", () => {
      expect(formatSalaryRange()).toBe(null);
      expect(formatSalaryRange(null, null)).toBe(null);
      expect(formatSalaryRange(undefined, undefined)).toBe(null);
    });

    it("formats a range with both min and max", () => {
      expect(formatSalaryRange(80000, 120000)).toBe("$80k - $120k");
    });

    it("formats min only with plus sign", () => {
      expect(formatSalaryRange(100000, null)).toBe("$100k+");
    });

    it("formats max only with 'Up to'", () => {
      expect(formatSalaryRange(null, 150000)).toBe("Up to $150k");
    });
  });

  describe("truncateText", () => {
    it("returns null for null or undefined input", () => {
      expect(truncateText(null)).toBe(null);
      expect(truncateText(undefined)).toBe(null);
    });

    it("returns original text if shorter than max length", () => {
      expect(truncateText("Short text")).toBe("Short text");
    });

    it("truncates and adds ellipsis for long text", () => {
      const longText = "a".repeat(150);
      const result = truncateText(longText, 120);
      expect(result).toHaveLength(123); // 120 + "..."
      expect(result?.endsWith("...")).toBe(true);
    });

    it("normalizes whitespace", () => {
      expect(truncateText("text   with\n\nweird   spacing")).toBe(
        "text with weird spacing"
      );
    });

    it("respects custom max length", () => {
      const result = truncateText("This is a longer sentence", 10);
      // After trim, substring(0,10).trim() is "This is a" (9 chars), + "..." = "This is a..."
      expect(result).toBe("This is a...");
    });
  });

  describe("formatNumber", () => {
    it("formats numbers with locale separators", () => {
      const result = formatNumber(1234567);
      expect(result).toMatch(/1.*234.*567/); // Allows for different locale formats
    });

    it("handles small numbers", () => {
      expect(formatNumber(42)).toBe("42");
    });
  });

  describe("formatPercent", () => {
    it("converts decimal to percentage", () => {
      expect(formatPercent(0.75)).toBe("75%");
      expect(formatPercent(1)).toBe("100%");
      expect(formatPercent(0.5)).toBe("50%");
    });

    it("respects decimal places parameter", () => {
      expect(formatPercent(0.756, 1)).toBe("75.6%");
      expect(formatPercent(0.756, 2)).toBe("75.60%");
    });

    it("handles zero", () => {
      expect(formatPercent(0)).toBe("0%");
    });
  });
});
