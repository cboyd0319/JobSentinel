import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatCompactDateTime,
  formatEventDate,
  formatInterviewDate,
  formatRelativeDate,
  getRelativeTimeUntil,
} from "./dateFormatting";

describe("date formatting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-25T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("relative past dates", () => {
    it("formats recent elapsed time", () => {
      expect(formatRelativeDate("2026-01-25T11:59:30Z")).toBe("Just now");
      expect(formatRelativeDate("2026-01-25T11:30:00Z")).toBe("30m ago");
      expect(formatRelativeDate("2026-01-25T07:00:00Z")).toBe("5h ago");
      expect(formatRelativeDate("2026-01-22T12:00:00Z")).toBe("3d ago");
    });

    it("uses a localized date after one week", () => {
      const result = formatRelativeDate("2026-01-15T12:00:00Z");
      expect(result).not.toContain("d ago");
      expect(result).toMatch(/\d/);
    });
  });

  describe("fixed date displays", () => {
    it("formats an event with weekday and year", () => {
      const result = formatEventDate("2026-01-25T12:00:00Z");
      expect(result).toContain("Jan");
      expect(result).toContain("25");
      expect(result).toContain("2026");
    });

    it("formats an interview with weekday and time but no year", () => {
      const result = formatInterviewDate("2026-01-25T14:30:00Z");
      expect(result).toContain("Jan");
      expect(result).toContain("25");
      expect(result).not.toContain("2026");
      expect(result).toMatch(/\d:\d/);
    });

    it("formats a compact timestamp without a weekday or year", () => {
      const result = formatCompactDateTime("2026-01-25T14:30:00Z");
      expect(result).toContain("Jan");
      expect(result).toContain("25");
      expect(result).not.toContain("2026");
      expect(result).not.toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
    });
  });

  describe("relative future dates", () => {
    it("formats past, near, and future times", () => {
      expect(getRelativeTimeUntil("2026-01-24T12:00:00Z")).toBe("Past");
      expect(getRelativeTimeUntil("2026-01-25T12:30:00Z")).toBe("< 1 hour");
      expect(getRelativeTimeUntil("2026-01-25T17:00:00Z")).toBe("5 hours");
      expect(getRelativeTimeUntil("2026-01-26T14:00:00Z")).toBe("Tomorrow");
      expect(getRelativeTimeUntil("2026-01-28T12:00:00Z")).toBe("3 days");
    });
  });

  it("uses plain unavailable copy for invalid dates", () => {
    expect(formatRelativeDate("not a date")).toBe("Date not shown");
    expect(formatEventDate("not a date")).toBe("Date not shown");
    expect(formatInterviewDate("not a date")).toBe("Date not shown");
    expect(formatCompactDateTime("not a date")).toBe("Date not shown");
    expect(getRelativeTimeUntil("not a date")).toBe("Date not shown");
  });
});
