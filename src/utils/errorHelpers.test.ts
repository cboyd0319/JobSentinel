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
vi.mock("./errorReporting", () => ({
  errorReporter: {
    captureApiError: vi.fn(),
    captureCustom: vi.fn(),
  },
}));

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
      expect(ERROR_MESSAGES[ErrorType.VALIDATION]).toContain("Invalid");
      expect(ERROR_MESSAGES[ErrorType.TIMEOUT]).toContain("timed out");
    });
  });

  describe("getUserMessage", () => {
    it("returns message from AppError", () => {
      const error = new AppError("Custom message", ErrorType.NETWORK);
      
      // getUserMessage returns the standard message for the type, not the custom message
      expect(getUserMessage(error)).toBe(ERROR_MESSAGES[ErrorType.NETWORK]);
    });

    it("returns message from standard Error", () => {
      const error = new Error("Standard error message");
      
      expect(getUserMessage(error)).toBe("Standard error message");
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
        // handleApiError calls getUserMessage which returns original error message for non-AppError
        expect((error as AppError).message).toBe("Network failure");
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

  describe("retry", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("returns result on first success", async () => {
      const operation = vi.fn().mockResolvedValue("success");
      
      const result = await retry(operation);
      
      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("retries on network errors", async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce("success");
      
      const promise = retry(operation, { maxRetries: 3, initialDelay: 100 });
      
      // Advance timers for retries
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);
      
      const result = await promise;
      
      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("throws after max retries exhausted", async () => {
      const error = new Error("Network error");
      const operation = vi.fn().mockRejectedValue(error);
      
      const retryPromise = retry(operation, { maxRetries: 2, initialDelay: 100 });
      
      // Need to wait for promise to be rejected during timer advancement
      await Promise.race([
        retryPromise.catch(() => {}), // Suppress unhandled rejection
        (async () => {
          await vi.advanceTimersByTimeAsync(100);
          await vi.advanceTimersByTimeAsync(200);
        })()
      ]);
      
      await expect(retryPromise).rejects.toThrow("Network error");
      expect(operation).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it("doesn't retry non-retryable errors", async () => {
      const error = new Error("Validation failed");
      const operation = vi.fn().mockRejectedValue(error);
      
      await expect(retry(operation)).rejects.toThrow("Validation failed");
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it("uses exponential backoff", async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error("timeout"))
        .mockRejectedValueOnce(new Error("timeout"))
        .mockRejectedValueOnce(new Error("timeout"))
        .mockResolvedValueOnce("success");
      
      const promise = retry(operation, {
        maxRetries: 3,
        initialDelay: 100,
        backoffFactor: 2,
      });
      
      // First retry: 100ms
      await vi.advanceTimersByTimeAsync(100);
      
      // Second retry: 200ms (100 * 2)
      await vi.advanceTimersByTimeAsync(200);
      
      // Third retry: 400ms (200 * 2)
      await vi.advanceTimersByTimeAsync(400);
      
      const result = await promise;
      
      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(4);
    });

    it("respects maxDelay cap", async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce("success");
      
      const promise = retry(operation, {
        maxRetries: 2,
        initialDelay: 1000,
        maxDelay: 1500,
        backoffFactor: 3,
      });
      
      // First retry: 1000ms
      await vi.advanceTimersByTimeAsync(1000);
      
      // Second retry: should be capped at 1500ms (not 3000ms)
      await vi.advanceTimersByTimeAsync(1500);
      
      const result = await promise;
      
      expect(result).toBe("success");
    });

    it("calls onRetry callback", async () => {
      const onRetry = vi.fn();
      const error = new Error("Network error");
      const operation = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce("success");
      
      const promise = retry(operation, {
        maxRetries: 1,
        initialDelay: 100,
        onRetry,
      });
      
      await vi.advanceTimersByTimeAsync(100);
      
      await promise;
      
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, error);
    });

    it("uses custom shouldRetry predicate", async () => {
      const shouldRetry = vi.fn().mockReturnValue(false);
      const operation = vi.fn().mockRejectedValue(new Error("Network error"));
      
      await expect(retry(operation, { shouldRetry })).rejects.toThrow();
      
      expect(operation).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledTimes(1);
    });

    it("retries timeout errors by default", async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error("Request timeout"))
        .mockResolvedValueOnce("success");
      
      const promise = retry(operation, { maxRetries: 1, initialDelay: 100 });
      
      await vi.advanceTimersByTimeAsync(100);
      
      const result = await promise;
      
      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("handles AppError instances", async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new AppError("Network issue", ErrorType.NETWORK))
        .mockResolvedValueOnce("success");
      
      const promise = retry(operation, { maxRetries: 1, initialDelay: 100 });
      
      await vi.advanceTimersByTimeAsync(100);
      
      const result = await promise;
      
      expect(result).toBe("success");
    });
  });

  describe("createDebouncedErrorHandler", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("debounces error handling", () => {
      const handler = vi.fn();
      const debouncedHandler = createDebouncedErrorHandler(handler, 1000);
      
      const error1 = new Error("Error 1");
      const error2 = new Error("Error 2");
      const error3 = new Error("Error 3");
      
      debouncedHandler(error1);
      debouncedHandler(error2);
      debouncedHandler(error3);
      
      expect(handler).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(1000);
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(error3); // Only last error
    });

    it("resets timer on each call", () => {
      const handler = vi.fn();
      const debouncedHandler = createDebouncedErrorHandler(handler, 1000);
      
      debouncedHandler(new Error("Error 1"));
      
      vi.advanceTimersByTime(500);
      
      debouncedHandler(new Error("Error 2"));
      
      vi.advanceTimersByTime(500);
      
      expect(handler).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(500);
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("uses default delay of 1000ms", () => {
      const handler = vi.fn();
      const debouncedHandler = createDebouncedErrorHandler(handler);
      
      debouncedHandler(new Error("Test"));
      
      vi.advanceTimersByTime(999);
      expect(handler).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(1);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("handles multiple errors with custom delay", () => {
      const handler = vi.fn();
      const debouncedHandler = createDebouncedErrorHandler(handler, 500);
      
      debouncedHandler(new Error("Error 1"));
      debouncedHandler(new Error("Error 2"));
      
      vi.advanceTimersByTime(500);
      
      expect(handler).toHaveBeenCalledTimes(1);
      
      debouncedHandler(new Error("Error 3"));
      
      vi.advanceTimersByTime(500);
      
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it("clears pending timeout correctly", () => {
      const handler = vi.fn();
      const debouncedHandler = createDebouncedErrorHandler(handler, 1000);
      
      debouncedHandler(new Error("Error 1"));
      vi.advanceTimersByTime(500);
      
      debouncedHandler(new Error("Error 2"));
      vi.advanceTimersByTime(999);
      
      expect(handler).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(1);
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(new Error("Error 2"));
    });

    it("handles non-Error objects", () => {
      const handler = vi.fn();
      const debouncedHandler = createDebouncedErrorHandler(handler, 500);
      
      debouncedHandler("string error");
      
      vi.advanceTimersByTime(500);
      
      expect(handler).toHaveBeenCalledWith("string error");
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
      
      expect(console.group).toHaveBeenCalledWith("🔴 Error Details");
      expect(console.error).toHaveBeenCalledWith("Error:", error);
      expect(console.log).toHaveBeenCalledWith("Type:", ErrorType.UNKNOWN);
      expect(console.log).toHaveBeenCalledWith("Message:", "Test error");
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
      
      expect(console.log).toHaveBeenCalledWith("Stack:", error.stack);
      
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
