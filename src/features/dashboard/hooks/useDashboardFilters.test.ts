import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useDashboardFilters,
  parseSearchQuery,
  matchesSearchQuery,
} from "./useDashboardFilters";
import type { Job } from "../types";

// Factory for jobs with various score edge cases
function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 1,
    title: "Customer Support Coordinator",
    company: "CareBridge Services",
    location: "Remote",
    url: "https://example.com/job/1",
    source: "linkedin",
    score: 0.85,
    description:
      "Help customers, document issues, coordinate follow-up, and support a care team.",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("useDashboardFilters — score edge cases", () => {
  describe("salary filtering", () => {
    it("treats salary filter values as full yearly dollars", () => {
      const jobs: Job[] = [
        makeJob({
          id: 1,
          title: "Customer Support Lead",
          salary_min: 65000,
          salary_max: 72000,
        }),
        makeJob({
          id: 2,
          title: "Front Desk Coordinator",
          salary_min: 42000,
          salary_max: 52000,
        }),
        makeJob({
          id: 3,
          title: "Operations Manager",
          salary_min: 90000,
          salary_max: 110000,
        }),
      ];

      const { result } = renderHook(() => useDashboardFilters(jobs));

      act(() => result.current.setSalaryMinFilter(60000));

      expect(result.current.filteredAndSortedJobs.map((j) => j.id).sort()).toEqual([1, 3]);

      act(() => result.current.setSalaryMaxFilter(80000));

      expect(result.current.filteredAndSortedJobs.map((j) => j.id)).toEqual([1]);
    });

    it("keeps minimum-only pay visible when top listed pay is unknown", () => {
      const jobs: Job[] = [
        makeJob({
          id: 1,
          title: "Open-ended Coordinator",
          salary_min: 45000,
          salary_max: null,
        }),
        makeJob({
          id: 2,
          title: "Known Below Floor",
          salary_min: null,
          salary_max: 52000,
        }),
        makeJob({
          id: 3,
          title: "Known Above Floor",
          salary_min: 70000,
          salary_max: 90000,
        }),
      ];

      const { result } = renderHook(() => useDashboardFilters(jobs));

      act(() => result.current.setSalaryMinFilter(65000));

      expect(result.current.filteredAndSortedJobs.map((j) => j.id).sort()).toEqual([1, 3]);
    });

    it("keeps maximum-only pay visible when bottom listed pay is unknown", () => {
      const jobs: Job[] = [
        makeJob({
          id: 1,
          title: "Open-ended Specialist",
          salary_min: null,
          salary_max: 150000,
        }),
        makeJob({
          id: 2,
          title: "Known Above Cap",
          salary_min: 90000,
          salary_max: 120000,
        }),
        makeJob({
          id: 3,
          title: "Known Below Cap",
          salary_min: 55000,
          salary_max: 75000,
        }),
      ];

      const { result } = renderHook(() => useDashboardFilters(jobs));

      act(() => result.current.setSalaryMaxFilter(80000));

      expect(result.current.filteredAndSortedJobs.map((j) => j.id).sort()).toEqual([1, 3]);
    });

    it("treats malformed listed pay as unavailable", () => {
      const jobs: Job[] = [
        makeJob({
          id: 1,
          title: "Reversed Range",
          salary_min: 150000,
          salary_max: 80000,
        }),
        makeJob({
          id: 2,
          title: "Negative Pay",
          salary_min: -10000,
          salary_max: 80000,
        }),
        makeJob({
          id: 3,
          title: "Infinite Pay",
          salary_min: 70000,
          salary_max: Infinity,
        }),
        makeJob({
          id: 4,
          title: "Usable Range",
          salary_min: 70000,
          salary_max: 90000,
        }),
      ];

      const { result } = renderHook(() => useDashboardFilters(jobs));

      act(() => result.current.setSalaryMinFilter(65000));

      expect(result.current.filteredAndSortedJobs.map((j) => j.id)).toEqual([4]);
    });
  });

  describe("posting-risk filtering", () => {
    const staleReason = JSON.stringify([
      {
        category: "stale",
        description: "Posted 70 days ago",
        weight: 0.2,
        severity: "medium",
      },
    ]);

    it("includes stale or repost evidence in needs-review results", () => {
      const jobs: Job[] = [
        makeJob({ id: 1, ghost_score: 0.42, ghost_reasons: staleReason }),
        makeJob({ id: 2, ghost_score: Infinity, ghost_reasons: staleReason }),
        makeJob({ id: 3, ghost_score: 0.7, ghost_reasons: null }),
        makeJob({ id: 4, ghost_score: 0.2, ghost_reasons: null }),
      ];

      const { result } = renderHook(() => useDashboardFilters(jobs));

      act(() => result.current.setGhostFilter("ghost"));

      expect(result.current.filteredAndSortedJobs.map((j) => j.id).sort()).toEqual([
        1,
        2,
        3,
      ]);
    });

    it("hides stale or repost evidence from lower-risk results", () => {
      const jobs: Job[] = [
        makeJob({ id: 1, ghost_score: 0.42, ghost_reasons: staleReason }),
        makeJob({ id: 2, ghost_score: 0.7, ghost_reasons: null }),
        makeJob({ id: 3, ghost_score: 0.2, ghost_reasons: null }),
      ];

      const { result } = renderHook(() => useDashboardFilters(jobs));

      act(() => result.current.setGhostFilter("real"));

      expect(result.current.filteredAndSortedJobs.map((j) => j.id)).toEqual([3]);
    });

    it("routes low-detail card warnings through posting-risk filters", () => {
      const jobs: Job[] = [
        makeJob({
          id: 1,
          title: "Remote Opportunity",
          description: "Apply today.",
          ghost_score: null,
          ghost_reasons: null,
        }),
        makeJob({
          id: 2,
          title: "Customer Support Coordinator",
          description: "Help customers, document issues, and support a care team.",
          ghost_score: 0.2,
          ghost_reasons: null,
        }),
      ];

      const { result } = renderHook(() => useDashboardFilters(jobs));

      act(() => result.current.setGhostFilter("real"));

      expect(result.current.filteredAndSortedJobs.map((j) => j.id)).toEqual([2]);

      act(() => result.current.setGhostFilter("ghost"));

      expect(result.current.filteredAndSortedJobs.map((j) => j.id)).toEqual([1]);
    });

    it("routes possible scam card warnings through posting-risk filters", () => {
      const jobs: Job[] = [
        makeJob({
          id: 1,
          title: "Customer Support Assistant",
          description:
            "We will interview over Telegram and ask you to deposit the equipment check.",
          ghost_score: 0.2,
          ghost_reasons: null,
        }),
        makeJob({
          id: 2,
          title: "Customer Support Coordinator",
          description: "Help customers, document issues, and support a care team.",
          ghost_score: 0.2,
          ghost_reasons: null,
        }),
      ];

      const { result } = renderHook(() => useDashboardFilters(jobs));

      act(() => result.current.setGhostFilter("real"));

      expect(result.current.filteredAndSortedJobs.map((j) => j.id)).toEqual([2]);

      act(() => result.current.setGhostFilter("ghost"));

      expect(result.current.filteredAndSortedJobs.map((j) => j.id)).toEqual([1]);
    });

    it("routes repeated local sightings through posting-risk filters", () => {
      const jobs: Job[] = [
        makeJob({
          id: 1,
          ghost_score: 0.2,
          ghost_reasons: null,
          times_seen: 3,
        }),
        makeJob({
          id: 2,
          ghost_score: 0.2,
          ghost_reasons: null,
          times_seen: 1,
        }),
        makeJob({
          id: 3,
          ghost_score: 0.2,
          ghost_reasons: null,
          times_seen: Infinity,
        }),
        makeJob({
          id: 4,
          ghost_score: 0.2,
          ghost_reasons: null,
        }),
      ];

      const { result } = renderHook(() => useDashboardFilters(jobs));

      act(() => result.current.setGhostFilter("ghost"));

      expect(result.current.filteredAndSortedJobs.map((j) => j.id)).toEqual([1]);

      act(() => result.current.setGhostFilter("real"));

      expect(result.current.filteredAndSortedJobs.map((j) => j.id)).toEqual([2, 3, 4]);
    });
  });

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
      { title: "Care Coordinator", company: "Community Care", location: null },
      { includes: [], excludes: [], isOr: false },
    );
    expect(result).toBe(true);
  });

  it("excludes matching exclude terms", () => {
    const result = matchesSearchQuery(
      { title: "Care Coordinator", company: "Community Care", location: null },
      { includes: [], excludes: ["community"], isOr: false },
    );
    expect(result).toBe(false);
  });
});
