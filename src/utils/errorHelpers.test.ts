import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ErrorType,
  AppError,
  ERROR_MESSAGES,
  getUserMessage,
  classifyError,
  handleApiError,
  withErrorHandling,
  retry,
  createDebouncedErrorHandler,
  isRecoverableError,
  logErrorDetails,
  createErrorFromResponse,
} from "./errorHelpers";
import { errorReporter } from "./errorReporting";

// Mock errorReporting module
vi.mock("./errorReporting", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./errorReporting")>();
  return {
    ...actual,
    errorReporter: {
      captureApiError: vi.fn(),
      captureCustom: vi.fn(),
    },
  };
});

describe("errorHelpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AppError", () => {
    it("creates an AppError with message and type", () => {
      const error = new AppError("Test error", ErrorType.NETWORK);
      
      expect(error.message).toBe("Test error");
      expect(error.type).toBe(ErrorType.NETWORK);
      expect(error.name).toBe("AppError");
      expect(error.context).toBeUndefined();
    });

    it("creates an AppError with context", () => {
      const context = { userId: 123, action: "fetch" };
      const error = new AppError("Test error", ErrorType.API, context);
      
      expect(error.context).toEqual(context);
    });

    it("defaults to UNKNOWN type when not specified", () => {
      const error = new AppError("Test error");
      
      expect(error.type).toBe(ErrorType.UNKNOWN);
    });

    it("extends Error and is instanceof Error", () => {
      const error = new AppError("Test error");
      
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });
  });

  describe("ERROR_MESSAGES", () => {
    it("has messages for all error types", () => {
      const errorTypes = Object.values(ErrorType);
      
      errorTypes.forEach(type => {
        expect(ERROR_MESSAGES[type]).toBeDefined();
        expect(typeof ERROR_MESSAGES[type]).toBe("string");
        expect(ERROR_MESSAGES[type].length).toBeGreaterThan(0);
      });
    });

    it("provides user-friendly messages", () => {
      expect(ERROR_MESSAGES[ErrorType.NETWORK]).toContain("connection");
      expect(ERROR_MESSAGES[ErrorType.API]).toContain("unavailable");
      expect(ERROR_MESSAGES[ErrorType.VALIDATION]).toContain("needs review");
      expect(ERROR_MESSAGES[ErrorType.TIMEOUT]).toContain("took too long");
      expect(ERROR_MESSAGES[ErrorType.UNKNOWN]).toContain("safe support report");
      expect(Object.values(ERROR_MESSAGES).join("\n")).not.toContain("Please try again");
    });
  });

  describe("getUserMessage", () => {
    it("returns message from AppError", () => {
      const error = new AppError("Custom message", ErrorType.NETWORK);
      
      // getUserMessage returns the standard message for the type, not the custom message
      expect(getUserMessage(error)).toBe(ERROR_MESSAGES[ErrorType.NETWORK]);
    });

    it("returns type-based message from standard Error", () => {
      const error = new Error("Standard error message");
      
      expect(getUserMessage(error)).toBe(ERROR_MESSAGES[ErrorType.UNKNOWN]);
    });

    it("never exposes raw sensitive details from standard Error messages", () => {
      const error = new Error(
        "Failed for token=abc123 at https://hooks.slack.com/services/T000/B000/secret and resume=private-file"
      );

      const message = getUserMessage(error);

      expect(message).toBe(ERROR_MESSAGES[ErrorType.UNKNOWN]);
      expect(message).not.toContain("abc123");
      expect(message).not.toContain("hooks.slack.com");
      expect(message).not.toContain("resume=private-file");
    });

    it("keeps useful category messages without exposing raw error text", () => {
      const error = new Error("Network failure for token=abc123");

      expect(getUserMessage(error)).toBe(ERROR_MESSAGES[ErrorType.NETWORK]);
    });

    it("returns default message for unknown error types", () => {
      expect(getUserMessage("string error")).toBe(ERROR_MESSAGES[ErrorType.UNKNOWN]);
      expect(getUserMessage(null)).toBe(ERROR_MESSAGES[ErrorType.UNKNOWN]);
      expect(getUserMessage(undefined)).toBe(ERROR_MESSAGES[ErrorType.UNKNOWN]);
      expect(getUserMessage(123)).toBe(ERROR_MESSAGES[ErrorType.UNKNOWN]);
    });

    it("returns standard message from ERROR_MESSAGES for AppError", () => {
      const error = new AppError("Custom unknown error", ErrorType.UNKNOWN);
      
      // getUserMessage returns ERROR_MESSAGES[type] for AppError, not the custom message
      expect(getUserMessage(error)).toBe(ERROR_MESSAGES[ErrorType.UNKNOWN]);
    });
  });

  describe("classifyError", () => {
    it("returns type from AppError", () => {
      const error = new AppError("Test", ErrorType.VALIDATION);
      
      expect(classifyError(error)).toBe(ErrorType.VALIDATION);
    });

    it("classifies network errors", () => {
      expect(classifyError(new Error("Network error occurred"))).toBe(ErrorType.NETWORK);
      expect(classifyError(new Error("fetch failed"))).toBe(ErrorType.NETWORK);
      expect(classifyError(new Error("NETWORK timeout"))).toBe(ErrorType.NETWORK);
    });

    it("classifies timeout errors", () => {
      expect(classifyError(new Error("Request timeout"))).toBe(ErrorType.TIMEOUT);
      expect(classifyError(new Error("Operation timeout"))).toBe(ErrorType.TIMEOUT);
      expect(classifyError(new Error("TIMEOUT"))).toBe(ErrorType.TIMEOUT);
    });

    it("classifies unauthorized errors", () => {
      expect(classifyError(new Error("401 Unauthorized"))).toBe(ErrorType.UNAUTHORIZED);
      expect(classifyError(new Error("unauthorized access"))).toBe(ErrorType.UNAUTHORIZED);
      expect(classifyError(new Error("UNAUTHORIZED"))).toBe(ErrorType.UNAUTHORIZED);
    });

    it("classifies not found errors", () => {
      expect(classifyError(new Error("404 Not Found"))).toBe(ErrorType.NOT_FOUND);
      expect(classifyError(new Error("Resource not found"))).toBe(ErrorType.NOT_FOUND);
      expect(classifyError(new Error("NOT FOUND"))).toBe(ErrorType.NOT_FOUND);
    });

    it("classifies validation errors", () => {
      expect(classifyError(new Error("Validation failed"))).toBe(ErrorType.VALIDATION);
      expect(classifyError(new Error("Invalid input"))).toBe(ErrorType.VALIDATION);
      expect(classifyError(new Error("VALIDATION error"))).toBe(ErrorType.VALIDATION);
    });

    it("classifies parse errors", () => {
      expect(classifyError(new Error("Parse error"))).toBe(ErrorType.PARSE);
      expect(classifyError(new Error("JSON parse failed"))).toBe(ErrorType.PARSE);
      expect(classifyError(new Error("JSON error occurred"))).toBe(ErrorType.PARSE);
    });

    it("returns UNKNOWN for unclassifiable errors", () => {
      expect(classifyError(new Error("Some random error"))).toBe(ErrorType.UNKNOWN);
      expect(classifyError("string error")).toBe(ErrorType.UNKNOWN);
      expect(classifyError(null)).toBe(ErrorType.UNKNOWN);
    });

    it("is case-insensitive", () => {
      expect(classifyError(new Error("NETWORK ERROR"))).toBe(ErrorType.NETWORK);
      expect(classifyError(new Error("network error"))).toBe(ErrorType.NETWORK);
      expect(classifyError(new Error("Network Error"))).toBe(ErrorType.NETWORK);
    });
  });

  describe("handleApiError", () => {
    it("throws AppError with correct type and message", async () => {
      const originalError = new Error("Network failure");
      
      await expect(handleApiError(originalError)).rejects.toThrow(AppError);
      
      try {
        await handleApiError(originalError);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).type).toBe(ErrorType.NETWORK);
        expect((error as AppError).message).toBe(ERROR_MESSAGES[ErrorType.NETWORK]);
      }
    });

    it("sanitizes original error context before throwing", async () => {
      const originalError = new Error(
        "Failed for token=abc123 at https://hooks.slack.com/services/T000/B000/secret and resume=private-file"
      );

      try {
        await handleApiError(originalError);
      } catch (error) {
        const originalErrorContext = (error as AppError).context?.originalError;
        expect(originalErrorContext).toBeTypeOf("string");
        expect(originalErrorContext).not.toContain("abc123");
        expect(originalErrorContext).not.toContain("hooks.slack.com/services");
        expect(originalErrorContext).not.toContain("resume=private-file");
        expect(originalErrorContext).toContain("[TOKEN]");
        expect(originalErrorContext).toContain("resume=[REDACTED]");
      }
    });

    it("includes context in thrown error", async () => {
      const context = { userId: 456, endpoint: "/api/test" };
      
      try {
        await handleApiError(new Error("Test error"), context);
      } catch (error) {
        expect((error as AppError).context).toMatchObject(context);
        expect((error as AppError).context?.originalError).toBeDefined();
      }
    });

    it("calls errorReporter.captureApiError", async () => {
      const error = new Error("Test error");
      
      try {
        await handleApiError(error);
      } catch {
        // Expected to throw
      }
      
      expect(errorReporter.captureApiError).toHaveBeenCalledTimes(1);
      expect(errorReporter.captureApiError).toHaveBeenCalledWith(
        expect.any(AppError),
        expect.objectContaining({ originalError: "Test error" })
      );
    });

    it("handles non-Error objects", async () => {
      try {
        await handleApiError("string error");
      } catch (error) {
        expect((error as AppError).context?.originalError).toBe("string error");
      }
    });
  });

  describe("withErrorHandling", () => {
    it("returns successful operation result", async () => {
      const operation = vi.fn().mockResolvedValue("success");
      
      const result = await withErrorHandling(operation);
      
      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("reports errors and rethrows", async () => {
      const error = new Error("Operation failed");
      const operation = vi.fn().mockRejectedValue(error);
      
      await expect(withErrorHandling(operation)).rejects.toThrow(AppError);
      
      expect(errorReporter.captureApiError).toHaveBeenCalledWith(
        error,
        undefined
      );
    });

    it("includes context in error reporting", async () => {
      const error = new Error("Operation failed");
      const operation = vi.fn().mockRejectedValue(error);
      const context = { action: "test" };
      
      await expect(withErrorHandling(operation, context)).rejects.toThrow();
      
      expect(errorReporter.captureApiError).toHaveBeenCalledWith(
        error,
        context
      );
    });

    it("returns fallback value instead of throwing", async () => {
      const error = new Error("Operation failed");
      const operation = vi.fn().mockRejectedValue(error);
      const fallback = "fallback value";
      
      const result = await withErrorHandling(operation, undefined, fallback);
      
      expect(result).toBe(fallback);
      expect(errorReporter.captureApiError).toHaveBeenCalled();
    });

    it("returns fallback even when it's falsy", async () => {
      const operation = vi.fn().mockRejectedValue(new Error("fail"));
      
      const result1 = await withErrorHandling(operation, undefined, 0);
      expect(result1).toBe(0);
      
      const result2 = await withErrorHandling(operation, undefined, false);
      expect(result2).toBe(false);
      
      const result3 = await withErrorHandling(operation, undefined, "");
      expect(result3).toBe("");
    });

    it("handles non-Error rejections", async () => {
      const operation = vi.fn().mockRejectedValue("string error");
      
      await expect(withErrorHandling(operation)).rejects.toThrow(AppError);
      
      expect(errorReporter.captureApiError).toHaveBeenCalledWith(
        expect.any(Error),
        undefined
      );
    });
  });

  describe("isRecoverableError", () => {
    it("identifies network errors as recoverable", () => {
      const error = new Error("Network connection failed");
      expect(isRecoverableError(error)).toBe(true);
    });

    it("identifies timeout errors as recoverable", () => {
      const error = new Error("Request timeout");
      expect(isRecoverableError(error)).toBe(true);
    });

    it("identifies API errors as recoverable", () => {
      const error = new AppError("API Error", ErrorType.API);
      expect(isRecoverableError(error)).toBe(true);
    });

    it("identifies validation errors as non-recoverable", () => {
      const error = new Error("Validation failed");
      expect(isRecoverableError(error)).toBe(false);
    });

    it("identifies not found errors as non-recoverable", () => {
      const error = new Error("404 not found");
      expect(isRecoverableError(error)).toBe(false);
    });

    it("identifies unauthorized errors as non-recoverable", () => {
      const error = new Error("401 unauthorized");
      expect(isRecoverableError(error)).toBe(false);
    });

    it("identifies parse errors as non-recoverable", () => {
      const error = new Error("JSON parse error");
      expect(isRecoverableError(error)).toBe(false);
    });

    it("identifies unknown errors as non-recoverable", () => {
      const error = new Error("Some random error");
      expect(isRecoverableError(error)).toBe(false);
    });

    it("handles AppError with recoverable types", () => {
      expect(isRecoverableError(new AppError("", ErrorType.NETWORK))).toBe(true);
      expect(isRecoverableError(new AppError("", ErrorType.TIMEOUT))).toBe(true);
      expect(isRecoverableError(new AppError("", ErrorType.API))).toBe(true);
    });

    it("handles AppError with non-recoverable types", () => {
      expect(isRecoverableError(new AppError("", ErrorType.VALIDATION))).toBe(false);
      expect(isRecoverableError(new AppError("", ErrorType.UNAUTHORIZED))).toBe(false);
      expect(isRecoverableError(new AppError("", ErrorType.NOT_FOUND))).toBe(false);
      expect(isRecoverableError(new AppError("", ErrorType.PARSE))).toBe(false);
      expect(isRecoverableError(new AppError("", ErrorType.UNKNOWN))).toBe(false);
    });
  });

  describe("logErrorDetails", () => {
    const originalConsole = {
      group: console.group,
      groupEnd: console.groupEnd,
      error: console.error,
      log: console.log,
    };

    beforeEach(() => {
      console.group = vi.fn();
      console.groupEnd = vi.fn();
      console.error = vi.fn();
      console.log = vi.fn();
    });

    afterEach(() => {
      console.group = originalConsole.group;
      console.groupEnd = originalConsole.groupEnd;
      console.error = originalConsole.error;
      console.log = originalConsole.log;
    });

    it("logs error details in dev mode", () => {
      vi.stubEnv("DEV", true);
      
      const error = new Error("Test error");
      logErrorDetails(error);
      
      expect(console.group).toHaveBeenCalledWith("Error Details");
      expect(console.error).toHaveBeenCalledWith("Error:", expect.objectContaining({
        name: "Error",
        message: "Test error",
      }));
      expect(console.log).toHaveBeenCalledWith("Type:", ErrorType.UNKNOWN);
      expect(console.log).toHaveBeenCalledWith("Message:", ERROR_MESSAGES[ErrorType.UNKNOWN]);
      expect(console.groupEnd).toHaveBeenCalled();
      
      vi.unstubAllEnvs();
    });

    it("logs context when provided", () => {
      vi.stubEnv("DEV", true);
      
      const context = { userId: 123 };
      logErrorDetails(new Error("Test"), context);
      
      expect(console.log).toHaveBeenCalledWith("Context:", context);
      
      vi.unstubAllEnvs();
    });

    it("logs stack trace when available", () => {
      vi.stubEnv("DEV", true);
      
      const error = new Error("Test error");
      logErrorDetails(error);
      
      expect(console.log).toHaveBeenCalledWith("Stack:", expect.stringContaining("Test error"));
      
      vi.unstubAllEnvs();
    });

    it("doesn't log in production mode", () => {
      vi.stubEnv("DEV", false);
      
      logErrorDetails(new Error("Test error"));
      
      expect(console.group).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
      
      vi.unstubAllEnvs();
    });

    it("handles non-Error objects", () => {
      vi.stubEnv("DEV", true);
      
      logErrorDetails("string error");
      
      expect(console.error).toHaveBeenCalledWith("Error:", "string error");
      expect(console.log).toHaveBeenCalledWith("Type:", ErrorType.UNKNOWN);
      
      vi.unstubAllEnvs();
    });

    it("handles AppError", () => {
      vi.stubEnv("DEV", true);
      
      const error = new AppError("Test", ErrorType.NETWORK, { key: "value" });
      logErrorDetails(error);
      
      expect(console.log).toHaveBeenCalledWith("Type:", ErrorType.NETWORK);
      
      vi.unstubAllEnvs();
    });

    it("redacts sensitive details before dev console logging", () => {
      vi.stubEnv("DEV", true);

      const error = new Error(
        "Failed for token=abc123 at https://hooks.slack.com/services/T000/B000/secret and resume=private-file"
      );
      logErrorDetails(error, {
        email: "private@example.test",
        password: "super-secret",
        url: "https://example.com/path?access_token=secret",
      });

      const loggedOutput = [
        ...vi.mocked(console.error).mock.calls.flat(),
        ...vi.mocked(console.log).mock.calls.flat(),
      ]
        .map((value) => JSON.stringify(value))
        .join("\n");

      expect(loggedOutput).not.toContain("abc123");
      expect(loggedOutput).not.toContain("hooks.slack.com/services");
      expect(loggedOutput).not.toContain("resume=private-file");
      expect(loggedOutput).not.toContain("private@example.test");
      expect(loggedOutput).not.toContain("super-secret");
      expect(loggedOutput).not.toContain("access_token=secret");
      expect(loggedOutput).toContain("[TOKEN]");
      expect(loggedOutput).toContain("[REDACTED]");

      vi.unstubAllEnvs();
    });
  });

  describe("createErrorFromResponse", () => {
    it("creates NOT_FOUND error for 404", () => {
      const response = new Response(null, { status: 404, statusText: "Not Found" });
      const error = createErrorFromResponse(response);
      
      expect(error.type).toBe(ErrorType.NOT_FOUND);
      expect(error.message).toBe("Request failed: Not Found");
      expect(error.context?.status).toBe(404);
      expect(error.context?.statusText).toBe("Not Found");
    });

    it("creates UNAUTHORIZED error for 401", () => {
      const response = new Response(null, { status: 401, statusText: "Unauthorized" });
      const error = createErrorFromResponse(response);
      
      expect(error.type).toBe(ErrorType.UNAUTHORIZED);
      expect(error.context?.status).toBe(401);
    });

    it("creates UNAUTHORIZED error for 403", () => {
      const response = new Response(null, { status: 403, statusText: "Forbidden" });
      const error = createErrorFromResponse(response);
      
      expect(error.type).toBe(ErrorType.UNAUTHORIZED);
      expect(error.context?.status).toBe(403);
    });

    it("creates TIMEOUT error for 408", () => {
      const response = new Response(null, { status: 408, statusText: "Request Timeout" });
      const error = createErrorFromResponse(response);
      
      expect(error.type).toBe(ErrorType.TIMEOUT);
    });

    it("creates TIMEOUT error for 504", () => {
      const response = new Response(null, { status: 504, statusText: "Gateway Timeout" });
      const error = createErrorFromResponse(response);
      
      expect(error.type).toBe(ErrorType.TIMEOUT);
    });

    it("creates VALIDATION error for 4xx errors", () => {
      const response = new Response(null, { status: 400, statusText: "Bad Request" });
      const error = createErrorFromResponse(response);
      
      expect(error.type).toBe(ErrorType.VALIDATION);
      
      const response422 = new Response(null, { status: 422, statusText: "Unprocessable Entity" });
      const error422 = createErrorFromResponse(response422);
      
      expect(error422.type).toBe(ErrorType.VALIDATION);
    });

    it("creates API error for 5xx errors", () => {
      const response = new Response(null, { status: 500, statusText: "Internal Server Error" });
      const error = createErrorFromResponse(response);
      
      expect(error.type).toBe(ErrorType.API);
      
      const response503 = new Response(null, { status: 503, statusText: "Service Unavailable" });
      const error503 = createErrorFromResponse(response503);
      
      expect(error503.type).toBe(ErrorType.API);
    });

    it("includes custom context", () => {
      const response = new Response(null, { status: 500, statusText: "Error" });
      const context = { endpoint: "/api/users", method: "POST" };
      const error = createErrorFromResponse(response, context);
      
      expect(error.context).toMatchObject(context);
      expect(error.context?.status).toBe(500);
    });

    it("handles successful status codes", () => {
      const response = new Response(null, { status: 200, statusText: "OK" });
      const error = createErrorFromResponse(response);
      
      expect(error.type).toBe(ErrorType.API);
      expect(error.message).toBe("Request failed: OK");
    });

    it("creates AppError instance", () => {
      const response = new Response(null, { status: 500, statusText: "Error" });
      const error = createErrorFromResponse(response);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it("handles responses with empty statusText", () => {
      const response = new Response(null, { status: 500, statusText: "" });
      const error = createErrorFromResponse(response);
      
      expect(error.message).toBe("Request failed: ");
    });
  });

  describe("edge cases", () => {
    it("handles null errors in classifyError", () => {
      expect(classifyError(null)).toBe(ErrorType.UNKNOWN);
    });

    it("handles undefined errors in getUserMessage", () => {
      expect(getUserMessage(undefined)).toBe(ERROR_MESSAGES[ErrorType.UNKNOWN]);
    });

    it("handles circular references in context", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const circular: any = { name: "test" };
      circular.self = circular;
      
      // Should not throw on circular references
      try {
        await handleApiError(new Error("Test"), circular);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
      }
    });

    it("handles empty string errors", () => {
      expect(classifyError("")).toBe(ErrorType.UNKNOWN);
      expect(getUserMessage("")).toBe(ERROR_MESSAGES[ErrorType.UNKNOWN]);
    });

    it("retry handles immediate success without waiting", async () => {
      const operation = vi.fn().mockResolvedValue("immediate success");
      
      const result = await retry(operation);
      
      expect(result).toBe("immediate success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("debounced handler handles rapid successive calls", () => {
      vi.useFakeTimers();
      const handler = vi.fn();
      const debouncedHandler = createDebouncedErrorHandler(handler, 100);
      
      // Rapid calls
      for (let i = 0; i < 100; i++) {
        debouncedHandler(new Error(`Error ${i}`));
      }
      
      vi.advanceTimersByTime(100);
      
      // Should only call once with the last error
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(new Error("Error 99"));
      
      vi.restoreAllMocks();
    });

    it("handles errors with numeric types", () => {
      const error = { message: 42 };
      expect(classifyError(error)).toBe(ErrorType.UNKNOWN);
    });

    it("handles array errors", () => {
      expect(classifyError([])).toBe(ErrorType.UNKNOWN);
      expect(classifyError(["error"])).toBe(ErrorType.UNKNOWN);
    });
  });
});
