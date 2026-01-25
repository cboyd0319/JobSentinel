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
      expect(result.title).toBe("Too Many Requests");
    });

    it("handles database locked errors", () => {
      const result = getUserFriendlyError(new Error("database is locked"));
      expect(result.title).toBe("Database Busy");
    });

    it("handles missing required field errors", () => {
      const result = getUserFriendlyError(new Error("required field missing"));
      expect(result.title).toBe("Missing Information");
    });

    it("handles unknown errors with generic message", () => {
      const result = getUserFriendlyError(new Error("some random error"));
      expect(result.title).toBeDefined();
      expect(result.message).toBeDefined();
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
        "Technical details"
      );
      expect(error.title).toBe("Test Title");
      expect(error.message).toBe("Test Message");
      expect(error.action).toBe("Test Action");
      expect(error.technical).toBe("Technical details");
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
