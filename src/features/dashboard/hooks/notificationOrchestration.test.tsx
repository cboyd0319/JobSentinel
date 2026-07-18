import { act, renderHook } from "@testing-library/react";
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
});
