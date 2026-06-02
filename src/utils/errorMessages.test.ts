import { describe, it, expect } from "vitest";
import {
  getUserFriendlyError,
  formatErrorForDisplay,
  isNetworkError,
  isDatabaseError,
  isValidationError,
  getErrorSummary,
  createUserError,
} from "./errorMessages";

describe("errorMessages", () => {
  describe("getUserFriendlyError", () => {
    it("handles network errors", () => {
      const result = getUserFriendlyError(new Error("network timeout"));
      expect(result.title).toBe("Connection Problem");
      expect(result.message).toContain("connect");
    });

    it("handles rate limit errors", () => {
      const result = getUserFriendlyError(new Error("429 Too Many Requests"));
      expect(result.title).toBe("Job Board Asked JobSentinel to Slow Down");
      expect(result.action).toContain("check this site less often");
      expect(`${result.title} ${result.message} ${result.action}`).not.toMatch(/request|delay/i);
    });

    it("uses safe support report guidance when a saved page is gone", () => {
      const result = getUserFriendlyError(new Error("404 not found"));
      const copy = `${result.title} ${result.message} ${result.action}`;

      expect(result.title).toBe("Page Not Found");
      expect(result.action).toContain("Check the job list again");
      expect(result.action).toContain("safe support report");
      expect(copy).not.toMatch(/try refreshing/i);
    });

    it("handles database locked errors", () => {
      const result = getUserFriendlyError(new Error("database is locked"));
      expect(result.title).toBe("Local Data Busy");
      expect(result.action).toContain("safe support report");
      expect(result.action).toContain("closing and reopening JobSentinel");
      expect(result.action).not.toMatch(/restart the app/i);
    });

    it("uses plain human-check copy for site challenges", () => {
      const result = getUserFriendlyError(new Error("captcha cloudflare bot detection"));

      expect(result.title).toBe("Site Asked for a Human Check");
      expect(result.message).toContain("extra human check");
      expect(result.action).toContain("Open the site yourself");
      expect(`${result.title} ${result.message} ${result.action}`).not.toMatch(/bot/i);
    });

    it("uses plain-language copy for common technical failures", () => {
      const userCopy = [
        getUserFriendlyError(new Error("401 unauthorized api key rejected")),
        getUserFriendlyError(new Error("database is locked")),
        getUserFriendlyError(new Error("foreign key constraint failed")),
        getUserFriendlyError(new Error("invalid email")),
        getUserFriendlyError(new Error("permission denied")),
        getUserFriendlyError(new Error("api quota exceeded")),
        getUserFriendlyError(new Error("slack webhook failed")),
        getUserFriendlyError(new Error("smtp error")),
        getUserFriendlyError(new Error("openai model error")),
        getUserFriendlyError(new Error("resume parsing failed")),
        getUserFriendlyError(new Error("context length exceeded")),
        getUserFriendlyError(new Error("config missing")),
        getUserFriendlyError(new Error("config invalid")),
      ].flatMap((result) => [result.title, result.message, result.action ?? ""]);

      expect(userCopy.join("\n")).not.toMatch(
        /API key|API Limit|job board's API|Database Busy|database|Database Corruption|Data Relationship|Invalid Email|Permission Denied|Resume Parsing|Document Too Large|processing|webhook URL|configured channel|SMTP credentials|special API access|Configuration|configuration file|app config/i,
      );
    });

    it("handles missing required field errors", () => {
      const result = getUserFriendlyError(new Error("required field missing"));
      expect(result.title).toBe("Add missing details");
      expect(result.action).toContain("highlighted details");
    });

    it("handles unknown errors with generic message", () => {
      const result = getUserFriendlyError(new Error("some random error"));
      expect(result.title).toBeDefined();
      expect(result.message).toBeDefined();
      expect(result.action).toContain("safe support report");
    });

    it("redacts private values from technical error details", () => {
      const result = getUserFriendlyError({
        message:
          "unexpected token=secret123 for chad@example.com at /Users/chad/private/resume.pdf",
      });

      expect(result.technical).toContain("[TOKEN]");
      expect(result.technical).toContain("[EMAIL]");
      expect(result.technical).toContain("/[USER_PATH]");
      expect(result.technical).not.toContain("secret123");
      expect(result.technical).not.toContain("chad@example.com");
      expect(result.technical).not.toContain("/Users/chad");
    });

    it("handles string errors", () => {
      const result = getUserFriendlyError("string error message");
      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
    });

    it("handles null/undefined errors", () => {
      const result = getUserFriendlyError(null);
      expect(result.title).toBeDefined();
      expect(result.message).toBeDefined();
    });
  });

  describe("formatErrorForDisplay", () => {
    it("formats error with action", () => {
      const error = {
        title: "Test Error",
        message: "This is a test",
        action: "Try again",
      };
      const result = formatErrorForDisplay(error, true);
      expect(result).toContain("Test Error");
      expect(result).toContain("This is a test");
      expect(result).toContain("Try again");
    });

    it("formats error without action when disabled", () => {
      const error = {
        title: "Test Error",
        message: "This is a test",
        action: "Try again",
      };
      const result = formatErrorForDisplay(error, false);
      expect(result).toContain("Test Error");
      expect(result).toContain("This is a test");
      expect(result).not.toContain("Try again");
    });

    it("handles error without action property", () => {
      const error = {
        title: "Test Error",
        message: "This is a test",
      };
      const result = formatErrorForDisplay(error, true);
      expect(result).toContain("Test Error");
      expect(result).toContain("This is a test");
    });
  });

  describe("isNetworkError", () => {
    it("returns true for network errors", () => {
      expect(isNetworkError(new Error("network timeout"))).toBe(true);
      expect(isNetworkError(new Error("fetch failed"))).toBe(true);
      expect(isNetworkError(new Error("connection refused"))).toBe(true);
    });

    it("returns false for non-network errors", () => {
      expect(isNetworkError(new Error("database locked"))).toBe(false);
      expect(isNetworkError(new Error("validation failed"))).toBe(false);
    });

    it("returns false for null/undefined", () => {
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
    });
  });

  describe("isDatabaseError", () => {
    it("returns true for database errors", () => {
      expect(isDatabaseError(new Error("database locked"))).toBe(true);
      expect(isDatabaseError(new Error("SQLITE_BUSY"))).toBe(true);
      expect(isDatabaseError(new Error("unique constraint"))).toBe(true);
    });

    it("returns false for non-database errors", () => {
      expect(isDatabaseError(new Error("network timeout"))).toBe(false);
      expect(isDatabaseError(new Error("validation failed"))).toBe(false);
    });
  });

  describe("isValidationError", () => {
    it("returns true for validation errors", () => {
      expect(isValidationError(new Error("required field"))).toBe(true);
      expect(isValidationError(new Error("invalid email"))).toBe(true);
      expect(isValidationError(new Error("missing parameter"))).toBe(true);
    });

    it("returns false for non-validation errors", () => {
      expect(isValidationError(new Error("network timeout"))).toBe(false);
      expect(isValidationError(new Error("database locked"))).toBe(false);
    });
  });

  describe("getErrorSummary", () => {
    it("returns summary for Error objects", () => {
      const summary = getErrorSummary(new Error("Test error"));
      expect(summary).toBeDefined();
      expect(typeof summary).toBe("string");
    });

    it("returns summary for string errors", () => {
      const summary = getErrorSummary("String error");
      expect(summary).toBeDefined();
    });

    it("returns summary for unknown errors", () => {
      const summary = getErrorSummary({ custom: "error" });
      expect(summary).toBeDefined();
    });
  });

  describe("createUserError", () => {
    it("creates error with all fields", () => {
      const error = createUserError(
        "Test Title",
        "Test Message",
        "Test Action",
        "token=secret123 in /Users/chad/private/resume.pdf"
      );
      expect(error.title).toBe("Test Title");
      expect(error.message).toBe("Test Message");
      expect(error.action).toBe("Test Action");
      expect(error.technical).toContain("[TOKEN]");
      expect(error.technical).toContain("/[USER_PATH]");
      expect(error.technical).not.toContain("secret123");
      expect(error.technical).not.toContain("/Users/chad");
    });

    it("creates error with optional fields", () => {
      const error = createUserError("Title", "Message");
      expect(error.title).toBe("Title");
      expect(error.message).toBe("Message");
      expect(error.action).toBeUndefined();
      expect(error.technical).toBeUndefined();
    });
  });
});
