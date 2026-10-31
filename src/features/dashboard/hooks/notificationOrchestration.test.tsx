/** Verifies dashboard notification and stale-delivery orchestration. */

import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Job, ScrapingStatus, Statistics } from "../types";
import { useDashboardAutoRefresh } from "./useDashboardAutoRefresh";
import { useDashboardManualSearch } from "./useDashboardManualSearch";

const mocks = vi.hoisted(() => ({
  invalidateCacheByCommand: vi.fn(),
  notifyScrapingComplete: vi.fn(),
  safeInvoke: vi.fn(),
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("../../../platform/tauri", () => ({
  invalidateCacheByCommand: mocks.invalidateCacheByCommand,
  safeInvoke: mocks.safeInvoke,
}));

vi.mock("../../../shared/toast/useToast", () => ({
  useToast: () => mocks.toast,
}));

vi.mock("../notifications", async () => {
  const actual = await vi.importActual<typeof import("../notifications")>(
    "../notifications",
  );
  return {
    ...actual,
    notifyScrapingComplete: mocks.notifyScrapingComplete,
  };
});

const previousJob: Job = {
  id: 1,
  title: "Existing role",
  company: "Example",
  location: "Remote",
  url: "https://example.com/jobs/1",
  source: "indeed",
  score: 0.9,
  created_at: "2026-07-17T12:00:00Z",
};
const newJob: Job = {
  ...previousJob,
  id: 2,
  title: "New saved-alert match",
  url: "https://example.com/jobs/2",
  score: 0.6,
};
const unchangedStatistics: Statistics = {
  total_jobs: 2,
  high_matches: 1,
  average_score: 0.75,
};
const status: ScrapingStatus = {
  last_scrape: "2026-07-17T12:00:00Z",
  next_scrape: null,
  is_running: false,
};

function createDeferred<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return {
    promise,
    resolve: (value: T) => resolve(value),
    reject: (reason?: unknown) => reject(reason),
  };
}

function mockDashboardCommands(statistics: Statistics) {
  mocks.safeInvoke.mockImplementation((command: string) => {
    switch (command) {
      case "get_dashboard_preferences":
        return Promise.resolve({
          anyJobSourceEnabled: true,
          autoRefresh: { enabled: false, interval_minutes: 30 },
          salaryFloorUsd: null,
        });
      case "get_recent_jobs":
        return Promise.resolve([previousJob, newJob]);
      case "get_statistics":
        return Promise.resolve(statistics);
      case "get_scraping_status":
        return Promise.resolve(status);
      default:
        return Promise.resolve(undefined);
    }
  });
}

describe("dashboard notification orchestration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.notifyScrapingComplete.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("checks saved alerts after manual search when the aggregate high-match count is zero", async () => {
    mockDashboardCommands({ ...unchangedStatistics, high_matches: 0 });
    const { result, unmount } = renderHook(() =>
      useDashboardManualSearch({
        jobs: [previousJob],
        setAnyJobSourceEnabled: vi.fn(),
        setError: vi.fn(),
        setJobs: vi.fn(),
        setScrapingStatus: vi.fn(),
        setStatistics: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleSearchNow();
    });

    expect(mocks.notifyScrapingComplete).toHaveBeenCalledWith([newJob]);
    unmount();
  });

  it("keeps manual-search delivery available through StrictMode effect replay", async () => {
    mockDashboardCommands(unchangedStatistics);
    const setJobs = vi.fn();
    const { result, unmount } = renderHook(
      () => useDashboardManualSearch({
        jobs: [previousJob],
        setAnyJobSourceEnabled: vi.fn(),
        setError: vi.fn(),
        setJobs,
        setScrapingStatus: vi.fn(),
        setStatistics: vi.fn(),
      }),
      { wrapper: StrictMode },
    );

    await act(async () => {
      await result.current.handleSearchNow();
    });

    expect(setJobs).toHaveBeenCalledWith([previousJob, newJob]);
    unmount();
  });

  it("checks saved alerts after auto-refresh when the aggregate count is unchanged", async () => {
    mockDashboardCommands(unchangedStatistics);
    const onDataUpdate = vi.fn();
    const { result, unmount } = renderHook(() =>
      useDashboardAutoRefresh({
        searching: false,
        showSettings: false,
        jobs: [previousJob],
        statistics: unchangedStatistics,
        onDataUpdate,
      }),
    );

    act(() => {
      result.current.setAutoRefreshInterval(1);
      result.current.setAutoRefreshEnabled(true);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(mocks.notifyScrapingComplete).toHaveBeenCalledWith([newJob]);
    unmount();
  });

  it("suppresses stale auto-refresh jobs and notifications after Settings opens", async () => {
    const search = createDeferred<undefined>();
    mockDashboardCommands(unchangedStatistics);
    mocks.safeInvoke.mockImplementation((command: string) => {
      if (command === "search_jobs") return search.promise;
      if (command === "get_recent_jobs") return Promise.resolve([previousJob, newJob]);
      if (command === "get_statistics") return Promise.resolve(unchangedStatistics);
      if (command === "get_scraping_status") return Promise.resolve(status);
      return Promise.resolve(undefined);
    });
    const onDataUpdate = vi.fn();
    const { result, rerender, unmount } = renderHook(
      ({ showSettings }) => useDashboardAutoRefresh({
        searching: false,
        showSettings,
        jobs: [previousJob],
        statistics: unchangedStatistics,
        onDataUpdate,
      }),
      { initialProps: { showSettings: false } },
    );

    act(() => {
      result.current.setAutoRefreshInterval(1);
      result.current.setAutoRefreshEnabled(true);
    });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(mocks.safeInvoke).toHaveBeenCalledWith("search_jobs", {}, {
      logContext: "Auto-refresh search jobs",
      silent: true,
    });
    rerender({ showSettings: true });
    await act(async () => {
      search.resolve(undefined);
      await Promise.resolve();
    });

    expect(onDataUpdate).not.toHaveBeenCalled();
    expect(mocks.notifyScrapingComplete).not.toHaveBeenCalled();
    expect(mocks.toast.success).not.toHaveBeenCalled();
    unmount();
  });

  it("keeps auto-refresh delivery when the toast context identity changes", async () => {
    const search = createDeferred<undefined>();
    mocks.safeInvoke.mockImplementation((command: string) => {
      if (command === "search_jobs") return search.promise;
      if (command === "get_recent_jobs") return Promise.resolve([previousJob, newJob]);
      if (command === "get_statistics") return Promise.resolve(unchangedStatistics);
      if (command === "get_scraping_status") return Promise.resolve(status);
      return Promise.resolve(undefined);
    });
    const onDataUpdate = vi.fn();
    const { result, rerender, unmount } = renderHook(
      ({ toastVersion }) => {
        void toastVersion;
        return useDashboardAutoRefresh({
          searching: false,
          showSettings: false,
          jobs: [previousJob],
          statistics: unchangedStatistics,
          onDataUpdate,
        });
      },
      { initialProps: { toastVersion: 0 } },
    );

    act(() => {
      result.current.setAutoRefreshInterval(1);
      result.current.setAutoRefreshEnabled(true);
    });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    mocks.toast = { ...mocks.toast };
    rerender({ toastVersion: 1 });
    await act(async () => {
      search.resolve(undefined);
      await Promise.resolve();
    });

    expect(onDataUpdate).toHaveBeenCalledWith({
      jobs: [previousJob, newJob],
      stats: unchangedStatistics,
      status,
    });
    unmount();
  });

  it("releases a cancelled manual search only after its native work finishes", async () => {
    const search = createDeferred<undefined>();
    mockDashboardCommands(unchangedStatistics);
    mocks.safeInvoke.mockImplementation((command: string) => {
      if (command === "search_jobs") return search.promise;
      if (command === "get_dashboard_preferences") {
        return Promise.resolve({
          anyJobSourceEnabled: true,
          autoRefresh: { enabled: false, interval_minutes: 30 },
          salaryFloorUsd: null,
        });
      }
      if (command === "get_recent_jobs") return Promise.resolve([previousJob, newJob]);
      if (command === "get_statistics") return Promise.resolve(unchangedStatistics);
      if (command === "get_scraping_status") return Promise.resolve(status);
      return Promise.resolve(undefined);
    });
    const setError = vi.fn();
    const setJobs = vi.fn();
    const { result, rerender, unmount } = renderHook(
      ({ showSettings }) => useDashboardManualSearch({
        showSettings,
        jobs: [previousJob],
        setAnyJobSourceEnabled: vi.fn(),
        setError,
        setJobs,
        setScrapingStatus: vi.fn(),
        setStatistics: vi.fn(),
      }),
      { initialProps: { showSettings: false } },
    );

    let pendingSearch: Promise<void>;
    await act(async () => {
      pendingSearch = result.current.handleSearchNow();
      await Promise.resolve();
    });
    expect(result.current.searching).toBe(true);
    setError.mockClear();
    rerender({ showSettings: true });
    expect(result.current.searching).toBe(true);
    await act(async () => {
      search.resolve(undefined);
      await pendingSearch;
    });

    expect(setJobs).not.toHaveBeenCalled();
    expect(setError).not.toHaveBeenCalled();
    expect(mocks.toast.success).not.toHaveBeenCalled();
    expect(result.current.searching).toBe(false);
    expect(result.current.searchCooldown).toBe(false);

    rerender({ showSettings: false });
    mocks.safeInvoke.mockImplementation((command: string) => {
      if (command === "get_dashboard_preferences") {
        return Promise.resolve({ anyJobSourceEnabled: true });
      }
      return Promise.resolve(undefined);
    });
    await act(async () => {
      await result.current.handleSearchNow();
    });
    expect(
      mocks.safeInvoke.mock.calls.filter(([command]) => command === "search_jobs"),
    ).toHaveLength(2);
    unmount();
  });

  it("suppresses an obsolete manual-search error after Settings opens", async () => {
    const search = createDeferred<undefined>();
    mockDashboardCommands(unchangedStatistics);
    mocks.safeInvoke.mockImplementation((command: string) => {
      if (command === "search_jobs") return search.promise;
      if (command === "get_dashboard_preferences") {
        return Promise.resolve({ anyJobSourceEnabled: true });
      }
      return Promise.resolve(undefined);
    });
    const setError = vi.fn();
    const { result, rerender, unmount } = renderHook(
      ({ showSettings }) => useDashboardManualSearch({
        showSettings,
        jobs: [previousJob],
        setAnyJobSourceEnabled: vi.fn(),
        setError,
        setJobs: vi.fn(),
        setScrapingStatus: vi.fn(),
        setStatistics: vi.fn(),
      }),
      { initialProps: { showSettings: false } },
    );

    let pendingSearch: Promise<void>;
    await act(async () => {
      pendingSearch = result.current.handleSearchNow();
      await Promise.resolve();
    });
    setError.mockClear();
    rerender({ showSettings: true });
    await act(async () => {
      search.reject(new Error("stale search failure"));
      await pendingSearch;
    });

    expect(setError).not.toHaveBeenCalled();
    expect(mocks.toast.error).not.toHaveBeenCalled();
    expect(result.current.searching).toBe(false);
    expect(result.current.searchCooldown).toBe(false);
    unmount();
  });
});
