import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  invalidateCache,
  invalidateCacheByCommand,
  clearCache,
  getCacheStats,
} from "./api";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("api utilities", () => {
  beforeEach(() => {
    // Clear cache before each test
    clearCache();
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
