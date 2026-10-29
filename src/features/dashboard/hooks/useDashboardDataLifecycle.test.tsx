/** Verifies dashboard country context loads even when the filtered job list is empty. */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cachedInvoke } from "../../../platform/tauri";
import { useDashboardDataLifecycle } from "./useDashboardDataLifecycle";
import type { Job } from "../types";

vi.mock("../../../platform/tauri", () => ({ cachedInvoke: vi.fn(), invalidateCacheByCommand: vi.fn() }));
vi.mock("../../../platform/tauri/events", () => ({ listen: vi.fn().mockResolvedValue(() => {}) }));
vi.mock("../../../shared/toast/useToast", () => ({ useToast: () => ({ success: vi.fn() }) }));

function options() {
  return {
    jobs: [], autoRefreshEnabled: false,
    setAnyJobSourceEnabled: vi.fn(), setAutoRefreshEnabled: vi.fn(),
    setAutoRefreshInterval: vi.fn(), setError: vi.fn(), setJobs: vi.fn(),
    setLoading: vi.fn(), setSalaryFloorUsd: vi.fn(), setSearchCountry: vi.fn(),
    setScrapingStatus: vi.fn(), setStatistics: vi.fn(),
  };
}

beforeEach(() => vi.mocked(cachedInvoke).mockReset());

describe("dashboard search-country context", () => {
  it("loads the explicit saved country without relying on a returned job", async () => {
    vi.mocked(cachedInvoke)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ total_jobs: 2, high_matches: 0, average_score: 0 })
      .mockResolvedValueOnce({ is_running: false, last_scrape: null, next_scrape: null })
      .mockResolvedValueOnce({ searchCountry: "GB" });
    const inputs = options();
    renderHook(() => useDashboardDataLifecycle(inputs));
    await waitFor(() => expect(inputs.setSearchCountry).toHaveBeenCalledWith("GB"));
    expect(inputs.setJobs).toHaveBeenCalledWith([]);
  });

  it.each(["jobs", "preferences"])("ignores an older %s response after a fresh country load", async (phase) => {
    const base: Job = { id: 1, title: "Role", company: "Example", location: null,
      url: "https://example.com/job", source: "import", score: null, created_at: "2026-09-11T00:00:00Z" };
    const oldJobs = [{ ...base, search_country: "US" }];
    const newJobs = [{ ...base, id: 2, search_country: "GB" }];
    let resolveOld!: (value: unknown) => void;
    const older = new Promise<unknown>((resolve) => { resolveOld = resolve; });
    let jobsCalls = 0, preferencesCalls = 0;
    vi.mocked(cachedInvoke).mockImplementation(<T,>(command: string) => {
      if (command === "get_recent_jobs") {
        jobsCalls += 1;
        if (phase === "jobs" && jobsCalls === 1) return older as Promise<T>;
        return Promise.resolve(jobsCalls === 1 ? oldJobs : newJobs) as Promise<T>;
      }
      if (command === "get_dashboard_preferences") {
        preferencesCalls += 1;
        if (phase === "preferences" && preferencesCalls === 1) return older as Promise<T>;
        return Promise.resolve({ searchCountry: "GB" }) as Promise<T>;
      }
      return Promise.resolve({}) as Promise<T>;
    });
    const inputs = options();
    const { result } = renderHook(() => useDashboardDataLifecycle(inputs));
    await waitFor(() => expect(phase === "jobs" ? jobsCalls : preferencesCalls).toBe(1));
    await act(async () => result.current.fetchData());
    expect(inputs.setJobs).toHaveBeenLastCalledWith(newJobs);
    expect(inputs.setSearchCountry).toHaveBeenLastCalledWith("GB");
    await act(async () => resolveOld(phase === "jobs" ? oldJobs : { searchCountry: "US" }));
    expect(inputs.setJobs).toHaveBeenLastCalledWith(newJobs);
    expect(inputs.setSearchCountry).toHaveBeenLastCalledWith("GB");
    expect(inputs.setLoading.mock.calls.filter(([loading]) => loading === false)).toHaveLength(1);
  });
});
