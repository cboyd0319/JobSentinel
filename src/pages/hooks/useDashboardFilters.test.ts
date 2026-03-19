import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useDashboardFilters,
  parseSearchQuery,
  matchesSearchQuery,
} from "./useDashboardFilters";
import type { Job } from "../DashboardTypes";

// Factory for jobs with various score edge cases
function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 1,
    title: "Software Engineer",
    company: "Acme Corp",
    location: "Remote",
    url: "https://example.com/job/1",
    source: "linkedin",
    score: 0.85,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("useDashboardFilters — score edge cases", () => {
  describe("sorting with non-finite scores", () => {
    it("sorts null scores to the bottom in score-desc", () => {
      const jobs: Job[] = [
        makeJob({ id: 1, score: null }),
        makeJob({ id: 2, score: 0.9 }),
        makeJob({ id: 3, score: null }),
        makeJob({ id: 4, score: 0.5 }),
      ];

      const { result } = renderHook(() => useDashboardFilters(jobs));

      const ids = result.current.filteredAndSortedJobs.map((j) => j.id);
      // 0.9 and 0.5 should come before nulls
      expect(ids[0]).toBe(2);
      expect(ids[1]).toBe(4);
      // Nulls at the bottom
      expect(ids.slice(2).sort()).toEqual([1, 3]);
    });

    it("sorts NaN scores to the bottom in score-desc", () => {
      const jobs: Job[] = [
        makeJob({ id: 1, score: NaN }),
        makeJob({ id: 2, score: 0.8 }),
        makeJob({ id: 3, score: NaN }),
        makeJob({ id: 4, score: 0.3 }),
      ];

      const { result } = renderHook(() => useDashboardFilters(jobs));

      const ids = result.current.filteredAndSortedJobs.map((j) => j.id);
      expect(ids[0]).toBe(2);
      expect(ids[1]).toBe(4);
    });

    it("sorts Infinity scores to the bottom in score-desc", () => {
      const jobs: Job[] = [
        makeJob({ id: 1, score: Infinity }),
        makeJob({ id: 2, score: 0.7 }),
        makeJob({ id: 3, score: -Infinity }),
      ];

      const { result } = renderHook(() => useDashboardFilters(jobs));

      const ids = result.current.filteredAndSortedJobs.map((j) => j.id);
      // Only 0.7 is finite; Infinity and -Infinity should sort to bottom
      expect(ids[0]).toBe(2);
    });

    it("sorts null scores to the bottom in score-asc", () => {
      const jobs: Job[] = [
        makeJob({ id: 1, score: null }),
        makeJob({ id: 2, score: 0.3 }),
        makeJob({ id: 3, score: 0.9 }),
      ];

      const { result } = renderHook(() => useDashboardFilters(jobs));

      // Switch to asc
      act(() => result.current.setSortBy("score-asc"));

      const ids = result.current.filteredAndSortedJobs.map((j) => j.id);
      // -1 (null) < 0.3 < 0.9
      expect(ids[0]).toBe(1);
      expect(ids[1]).toBe(2);
      expect(ids[2]).toBe(3);
    });
  });

  describe("score filtering with non-finite values", () => {
    it("excludes NaN scores when score filter is active", () => {
      const jobs: Job[] = [
        makeJob({ id: 1, score: NaN }),
        makeJob({ id: 2, score: 0.8 }),
        makeJob({ id: 3, score: 0.3 }),
      ];

      const { result } = renderHook(() => useDashboardFilters(jobs));

      act(() => result.current.setScoreFilter("high"));

      const ids = result.current.filteredAndSortedJobs.map((j) => j.id);
      expect(ids).toContain(2);
      expect(ids).not.toContain(1); // NaN excluded
    });

    it("excludes Infinity scores when score filter is active", () => {
      const jobs: Job[] = [
        makeJob({ id: 1, score: Infinity }),
        makeJob({ id: 2, score: 0.8 }),
      ];

      const { result } = renderHook(() => useDashboardFilters(jobs));

      act(() => result.current.setScoreFilter("high"));

      const ids = result.current.filteredAndSortedJobs.map((j) => j.id);
      expect(ids).not.toContain(1); // Infinity excluded
    });

    it("excludes null scores when score filter is active", () => {
      const jobs: Job[] = [
        makeJob({ id: 1, score: null }),
        makeJob({ id: 2, score: 0.8 }),
        makeJob({ id: 3, score: 0.2 }),
      ];

      const { result } = renderHook(() => useDashboardFilters(jobs));

      act(() => result.current.setScoreFilter("low"));

      const ids = result.current.filteredAndSortedJobs.map((j) => j.id);
      expect(ids).toContain(3);
      expect(ids).not.toContain(1); // null excluded
    });

    it("shows all jobs including null scores when filter is 'all'", () => {
      const jobs: Job[] = [
        makeJob({ id: 1, score: null }),
        makeJob({ id: 2, score: 0.8 }),
      ];

      const { result } = renderHook(() => useDashboardFilters(jobs));

      expect(result.current.filteredAndSortedJobs).toHaveLength(2);
    });
  });

  describe("mixed edge cases", () => {
    it("handles an entirely null-scored dataset without crashing", () => {
      const jobs: Job[] = [
        makeJob({ id: 1, score: null }),
        makeJob({ id: 2, score: null }),
        makeJob({ id: 3, score: null }),
      ];

      const { result } = renderHook(() => useDashboardFilters(jobs));

      expect(result.current.filteredAndSortedJobs).toHaveLength(3);
    });

    it("handles mixed null, NaN, and valid scores in sort", () => {
      const jobs: Job[] = [
        makeJob({ id: 1, score: null }),
        makeJob({ id: 2, score: NaN }),
        makeJob({ id: 3, score: 0.5 }),
        makeJob({ id: 4, score: 0.9 }),
        makeJob({ id: 5, score: 0 }),
      ];

      const { result } = renderHook(() => useDashboardFilters(jobs));

      const scores = result.current.filteredAndSortedJobs.map((j) => j.id);
      // Valid scores first (0.9, 0.5, 0), then non-finite at bottom
      expect(scores[0]).toBe(4); // 0.9
      expect(scores[1]).toBe(3); // 0.5
      expect(scores[2]).toBe(5); // 0
    });
  });
});

describe("parseSearchQuery", () => {
  it("handles empty string", () => {
    const result = parseSearchQuery("");
    expect(result.includes).toEqual([]);
    expect(result.excludes).toEqual([]);
  });

  it("handles NOT prefix", () => {
    const result = parseSearchQuery("-remote");
    expect(result.excludes).toContain("remote");
  });
});

describe("matchesSearchQuery", () => {
  it("returns true when no query terms", () => {
    const result = matchesSearchQuery(
      { title: "Engineer", company: "Acme", location: null },
      { includes: [], excludes: [], isOr: false },
    );
    expect(result).toBe(true);
  });

  it("excludes matching exclude terms", () => {
    const result = matchesSearchQuery(
      { title: "Engineer", company: "Acme", location: null },
      { includes: [], excludes: ["acme"], isOr: false },
    );
    expect(result).toBe(false);
  });
});
