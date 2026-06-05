import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AppError,
  ErrorType,
  createDebouncedErrorHandler,
  retry,
} from "./errorHelpers";

describe("errorHelpers async utilities", () => {
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

      await Promise.race([
        retryPromise.catch(() => {}),
        (async () => {
          await vi.advanceTimersByTimeAsync(100);
          await vi.advanceTimersByTimeAsync(200);
        })(),
      ]);

      await expect(retryPromise).rejects.toThrow("Network error");
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("doesn't retry non-retryable errors", async () => {
      const error = new Error("Validation failed");
      const operation = vi.fn().mockRejectedValue(error);

      await expect(retry(operation)).rejects.toThrow("Validation failed");
      expect(operation).toHaveBeenCalledTimes(1);
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

      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);
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

      await vi.advanceTimersByTimeAsync(1000);
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
      expect(handler).toHaveBeenCalledWith(error3);
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
});
