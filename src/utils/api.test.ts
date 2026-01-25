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
});
