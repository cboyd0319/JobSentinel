import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMetricRating, getMetricUnit, getPerformanceSummary } from "./vitals";
import type { Metric } from "web-vitals";

// Mock web-vitals
vi.mock("web-vitals", () => ({
  onCLS: vi.fn(),
  onFCP: vi.fn(),
  onINP: vi.fn(),
  onLCP: vi.fn(),
  onTTFB: vi.fn(),
}));

describe("vitals utilities", () => {
  describe("getMetricRating", () => {
    it("returns Good for good rating", () => {
      const metric: Metric = {
        name: "LCP",
        value: 2000,
        rating: "good",
        id: "test-id",
        delta: 0,
        entries: [],
        navigationType: "navigate",
      };

      expect(getMetricRating(metric)).toBe("✅ Good");
    });

    it("returns Needs Improvement for needs-improvement rating", () => {
      const metric: Metric = {
        name: "LCP",
        value: 3000,
        rating: "needs-improvement",
        id: "test-id",
        delta: 0,
        entries: [],
        navigationType: "navigate",
      };

      expect(getMetricRating(metric)).toBe("⚠️ Needs Improvement");
    });

    it("returns Poor for poor rating", () => {
      const metric: Metric = {
        name: "LCP",
        value: 5000,
        rating: "poor",
        id: "test-id",
        delta: 0,
        entries: [],
        navigationType: "navigate",
      };

      expect(getMetricRating(metric)).toBe("❌ Poor");
    });

    it("falls back to threshold check for CLS", () => {
      const goodCLS: Metric = {
        name: "CLS",
        value: 0.05,
        rating: undefined as unknown as "good" | "needs-improvement" | "poor",
        id: "test-id",
        delta: 0,
        entries: [],
        navigationType: "navigate",
      };

      expect(getMetricRating(goodCLS)).toBe("✅ Good");

      const poorCLS: Metric = {
        ...goodCLS,
        value: 0.5,
      };

      expect(getMetricRating(poorCLS)).toBe("❌ Poor");
    });

    it("returns Unknown for unknown metric name", () => {
      const unknownMetric: Metric = {
        name: "UNKNOWN" as "CLS",
        value: 100,
        rating: undefined as unknown as "good" | "needs-improvement" | "poor",
        id: "test-id",
        delta: 0,
        entries: [],
        navigationType: "navigate",
      };

      expect(getMetricRating(unknownMetric)).toBe("Unknown");
    });
  });

  describe("getMetricUnit", () => {
    it("returns empty string for CLS (unitless)", () => {
      expect(getMetricUnit("CLS")).toBe("");
    });

    it("returns ms for other metrics", () => {
      expect(getMetricUnit("LCP")).toBe("ms");
      expect(getMetricUnit("FCP")).toBe("ms");
      expect(getMetricUnit("INP")).toBe("ms");
      expect(getMetricUnit("TTFB")).toBe("ms");
    });
  });

  describe("getPerformanceSummary", () => {
    beforeEach(() => {
      // Mock performance API
      vi.spyOn(performance, "getEntriesByType").mockImplementation((type) => {
        if (type === "navigation") {
          return [
            {
              domContentLoadedEventEnd: 500,
              loadEventEnd: 1000,
              domInteractive: 300,
            } as PerformanceNavigationTiming,
          ];
        }
        if (type === "resource") {
          return [{} as PerformanceResourceTiming, {} as PerformanceResourceTiming, {} as PerformanceResourceTiming];
        }
        return [];
      });
    });

    it("returns performance summary object", () => {
      const summary = getPerformanceSummary();

      expect(summary).toHaveProperty("domContentLoaded");
      expect(summary).toHaveProperty("loadComplete");
      expect(summary).toHaveProperty("domInteractive");
      expect(summary).toHaveProperty("resourceCount");
      expect(summary).toHaveProperty("jsHeapSize");
    });

    it("includes navigation timing", () => {
      const summary = getPerformanceSummary();

      expect(summary.domContentLoaded).toBe(500);
      expect(summary.loadComplete).toBe(1000);
      expect(summary.domInteractive).toBe(300);
    });

    it("includes resource count", () => {
      const summary = getPerformanceSummary();
      expect(summary.resourceCount).toBe(3);
    });
  });
});
