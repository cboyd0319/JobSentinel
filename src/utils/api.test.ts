import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  deduplicatedInvoke,
  cachedInvoke,
  invalidateCache,
  invalidateCacheByCommand,
  clearCache,
  getCacheStats,
} from "./api";
import { invoke } from "@tauri-apps/api/core";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

describe("api utilities", () => {
  beforeEach(() => {
    // Clear cache and mocks before each test
    clearCache();
    mockInvoke.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("deduplicatedInvoke", () => {
    it("calls invoke with command and args", async () => {
      mockInvoke.mockResolvedValueOnce({ data: "test" });

      const result = await deduplicatedInvoke("test_command", { id: 1 });

      expect(mockInvoke).toHaveBeenCalledWith("test_command", { id: 1 });
      expect(result).toEqual({ data: "test" });
    });

    it("deduplicates concurrent calls with same args", async () => {
      let resolvePromise: (value: unknown) => void;
      const slowPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockInvoke.mockReturnValueOnce(slowPromise as Promise<unknown>);

      // Start two concurrent calls
      const promise1 = deduplicatedInvoke("slow_command", { id: 1 });
      const promise2 = deduplicatedInvoke("slow_command", { id: 1 });

      // Should only have called invoke once
      expect(mockInvoke).toHaveBeenCalledTimes(1);

      // Resolve the promise
      resolvePromise!({ result: "done" });

      // Both promises should resolve to the same value
      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toEqual({ result: "done" });
      expect(result2).toEqual({ result: "done" });
    });

    it("makes separate calls for different args", async () => {
      mockInvoke.mockResolvedValueOnce({ id: 1 });
      mockInvoke.mockResolvedValueOnce({ id: 2 });

      const [result1, result2] = await Promise.all([
        deduplicatedInvoke("command", { id: 1 }),
        deduplicatedInvoke("command", { id: 2 }),
      ]);

      expect(mockInvoke).toHaveBeenCalledTimes(2);
      expect(result1).toEqual({ id: 1 });
      expect(result2).toEqual({ id: 2 });
    });

    it("allows new call after previous completes", async () => {
      mockInvoke.mockResolvedValueOnce({ call: 1 });
      mockInvoke.mockResolvedValueOnce({ call: 2 });

      const result1 = await deduplicatedInvoke("command", { id: 1 });
      const result2 = await deduplicatedInvoke("command", { id: 1 });

      expect(mockInvoke).toHaveBeenCalledTimes(2);
      expect(result1).toEqual({ call: 1 });
      expect(result2).toEqual({ call: 2 });
    });
  });

  describe("cachedInvoke", () => {
    it("caches response for subsequent calls", async () => {
      mockInvoke.mockResolvedValueOnce({ data: "cached" });

      const result1 = await cachedInvoke("cached_command", { id: 1 });
      const result2 = await cachedInvoke("cached_command", { id: 1 });

      // Should only call invoke once
      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(result1).toEqual({ data: "cached" });
      expect(result2).toEqual({ data: "cached" });
    });

    it("respects TTL and refetches after expiry", async () => {
      vi.useFakeTimers();
      mockInvoke.mockResolvedValueOnce({ version: 1 });
      mockInvoke.mockResolvedValueOnce({ version: 2 });

      const result1 = await cachedInvoke("command", { id: 1 }, 1000); // 1 second TTL

      // Advance time past TTL
      vi.advanceTimersByTime(1500);

      const result2 = await cachedInvoke("command", { id: 1 }, 1000);

      expect(mockInvoke).toHaveBeenCalledTimes(2);
      expect(result1).toEqual({ version: 1 });
      expect(result2).toEqual({ version: 2 });

      vi.useRealTimers();
    });

    it("uses different cache entries for different args", async () => {
      mockInvoke.mockResolvedValueOnce({ id: 1 });
      mockInvoke.mockResolvedValueOnce({ id: 2 });

      const result1 = await cachedInvoke("command", { id: 1 });
      const result2 = await cachedInvoke("command", { id: 2 });

      expect(mockInvoke).toHaveBeenCalledTimes(2);
      expect(result1).toEqual({ id: 1 });
      expect(result2).toEqual({ id: 2 });
    });

    it("returns cached value within TTL", async () => {
      vi.useFakeTimers();
      mockInvoke.mockResolvedValueOnce({ data: "original" });

      await cachedInvoke("command", undefined, 5000);

      // Advance time but stay within TTL
      vi.advanceTimersByTime(3000);

      const result = await cachedInvoke("command", undefined, 5000);

      expect(mockInvoke).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ data: "original" });

      vi.useRealTimers();
    });
  });

  describe("clearCache", () => {
    it("clears all cached entries", () => {
      // Get initial stats
      const initialStats = getCacheStats();
      expect(initialStats.cacheSize).toBe(0);

      // Clear should work on empty cache
      clearCache();
      const afterClear = getCacheStats();
      expect(afterClear.cacheSize).toBe(0);
    });
  });

  describe("getCacheStats", () => {
    it("returns cache statistics", () => {
      const stats = getCacheStats();

      expect(stats).toHaveProperty("cacheSize");
      expect(stats).toHaveProperty("inFlightCount");
      expect(stats).toHaveProperty("entries");
      expect(typeof stats.cacheSize).toBe("number");
      expect(typeof stats.inFlightCount).toBe("number");
      expect(Array.isArray(stats.entries)).toBe(true);
    });

    it("reports zero entries when cache is empty", () => {
      const stats = getCacheStats();
      expect(stats.cacheSize).toBe(0);
      expect(stats.entries).toHaveLength(0);
    });
  });

  describe("invalidateCache", () => {
    it("does not throw when invalidating non-existent key", () => {
      expect(() => invalidateCache("non_existent_command")).not.toThrow();
    });

    it("does not throw with args", () => {
      expect(() =>
        invalidateCache("command", { key: "value" })
      ).not.toThrow();
    });
  });

  describe("invalidateCacheByCommand", () => {
    it("does not throw when invalidating non-existent command", () => {
      expect(() => invalidateCacheByCommand("non_existent")).not.toThrow();
    });
  });

  describe("safeInvoke", () => {
    beforeEach(async () => {
      // Reset modules to clear any cached imports
      vi.resetModules();
    });

    it("successfully returns data from invoke", async () => {
      mockInvoke.mockResolvedValueOnce({ data: "success" });

      const result = await import("./api").then((m) =>
        m.safeInvoke<{ data: string }>("test_command", { id: 1 })
      );

      expect(result).toEqual({ data: "success" });
      expect(mockInvoke).toHaveBeenCalledWith("test_command", { id: 1 });
    });

    it("throws enhanced error with user-friendly message", async () => {
      const error = new Error("Network error");
      mockInvoke.mockRejectedValueOnce(error);

      const { safeInvoke } = await import("./api");

      await expect(
        safeInvoke("failing_command", { id: 1 })
      ).rejects.toHaveProperty("userFriendly");
    });

    it("includes invoke context in enhanced error", async () => {
      const error = new Error("Test error");
      mockInvoke.mockRejectedValueOnce(error);

      const { safeInvoke } = await import("./api");

      try {
        await safeInvoke("test_cmd", { id: 1 });
        expect.fail("Should have thrown");
      } catch (e: unknown) {
        const enhancedError = e as { invokeCommand?: string; invokeArgs?: unknown };
        expect(enhancedError.invokeCommand).toBe("test_cmd");
        expect(enhancedError.invokeArgs).toEqual({ id: 1 });
      }
    });

    it("accepts custom log context", async () => {
      const error = new Error("Context error");
      mockInvoke.mockRejectedValueOnce(error);

      const { safeInvoke } = await import("./api");

      try {
        await safeInvoke("cmd", undefined, { logContext: "Custom Context" });
        expect.fail("Should have thrown");
      } catch (e: unknown) {
        // Error should be logged with custom context (verify it was enhanced)
        expect(e).toHaveProperty("userFriendly");
      }
    });

    it("supports silent mode without logging", async () => {
      const error = new Error("Silent error");
      mockInvoke.mockRejectedValueOnce(error);

      const { safeInvoke } = await import("./api");

      try {
        await safeInvoke("cmd", undefined, { silent: true });
        expect.fail("Should have thrown");
      } catch (e: unknown) {
        // Should still throw but not log
        expect(e).toHaveProperty("userFriendly");
      }
    });

    it("handles string errors", async () => {
      mockInvoke.mockRejectedValueOnce("String error message");

      const { safeInvoke } = await import("./api");

      try {
        await safeInvoke("cmd");
        expect.fail("Should have thrown");
      } catch (e: unknown) {
        expect(e).toHaveProperty("userFriendly");
      }
    });

    it("handles unknown error types", async () => {
      mockInvoke.mockRejectedValueOnce({ code: 500, status: "error" });

      const { safeInvoke } = await import("./api");

      try {
        await safeInvoke("cmd");
        expect.fail("Should have thrown");
      } catch (e: unknown) {
        expect(e).toHaveProperty("userFriendly");
      }
    });

    it("works without arguments", async () => {
      mockInvoke.mockResolvedValueOnce({ status: "ok" });

      const { safeInvoke } = await import("./api");
      const result = await safeInvoke("no_args_cmd");

      expect(result).toEqual({ status: "ok" });
      expect(mockInvoke).toHaveBeenCalledWith("no_args_cmd", undefined);
    });
  });

  describe("safeInvokeWithToast", () => {
    const mockToast = {
      error: vi.fn(),
      success: vi.fn(),
    };

    beforeEach(async () => {
      mockToast.error.mockClear();
      mockToast.success.mockClear();
      vi.resetModules();
    });

    it("returns data on success", async () => {
      mockInvoke.mockResolvedValueOnce({ data: "success" });

      const { safeInvokeWithToast } = await import("./api");
      const result = await safeInvokeWithToast<{ data: string }>(
        "cmd",
        { id: 1 },
        mockToast
      );

      expect(result).toEqual({ data: "success" });
      expect(mockToast.error).not.toHaveBeenCalled();
    });

    it("shows error toast on failure", async () => {
      const error = new Error("Operation failed");
      mockInvoke.mockRejectedValueOnce(error);

      const { safeInvokeWithToast } = await import("./api");

      try {
        await safeInvokeWithToast("cmd", { id: 1 }, mockToast);
        expect.fail("Should have thrown");
      } catch {
        expect(mockToast.error).toHaveBeenCalled();
      }
    });

    it("uses custom error title", async () => {
      const error = new Error("Failed");
      mockInvoke.mockRejectedValueOnce(error);

      const { safeInvokeWithToast } = await import("./api");

      try {
        await safeInvokeWithToast("cmd", undefined, mockToast, {
          errorTitle: "Custom Error Title",
        });
        expect.fail("Should have thrown");
      } catch {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Custom Error Title",
          expect.any(String)
        );
      }
    });

    it("shows user-friendly error message", async () => {
      const error = new Error("Network timeout");
      mockInvoke.mockRejectedValueOnce(error);

      const { safeInvokeWithToast } = await import("./api");

      try {
        await safeInvokeWithToast("cmd", undefined, mockToast);
        expect.fail("Should have thrown");
      } catch {
        const [[title, message]] = mockToast.error.mock.calls;
        expect(title).toBeTruthy();
        expect(message).toBeTruthy();
      }
    });

    it("respects silent mode", async () => {
      const error = new Error("Silent error");
      mockInvoke.mockRejectedValueOnce(error);

      const { safeInvokeWithToast } = await import("./api");

      try {
        await safeInvokeWithToast("cmd", undefined, mockToast, {
          silent: true,
        });
        expect.fail("Should have thrown");
      } catch {
        // Toast should still be shown even in silent mode
        // (silent only affects logging, not toast)
        expect(mockToast.error).toHaveBeenCalled();
      }
    });

    it("includes action in toast message if available", async () => {
      const error = new Error("Network error");
      mockInvoke.mockRejectedValueOnce(error);

      const { safeInvokeWithToast } = await import("./api");

      try {
        await safeInvokeWithToast("cmd", undefined, mockToast);
        expect.fail("Should have thrown");
      } catch {
        expect(mockToast.error).toHaveBeenCalled();
        const [[, message]] = mockToast.error.mock.calls;
        expect(typeof message).toBe("string");
      }
    });

    it("works with undefined args", async () => {
      mockInvoke.mockResolvedValueOnce({ ok: true });

      const { safeInvokeWithToast } = await import("./api");
      const result = await safeInvokeWithToast("cmd", undefined, mockToast);

      expect(result).toEqual({ ok: true });
    });

    it("falls back to generic error title when none provided", async () => {
      const error = new Error("Generic error");
      mockInvoke.mockRejectedValueOnce(error);

      const { safeInvokeWithToast } = await import("./api");

      try {
        await safeInvokeWithToast("cmd", undefined, mockToast);
        expect.fail("Should have thrown");
      } catch {
        const [[title]] = mockToast.error.mock.calls;
        expect(title).toBeTruthy();
        expect(typeof title).toBe("string");
      }
    });
  });
});
