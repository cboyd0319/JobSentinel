import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportJobsToCsv } from "../jobCsvExport";
import type { Job } from "../types";
import { useDashboardJobOps } from "./useDashboardJobOps";

const mockToast = {
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};
vi.mock("../../../shared/toast/useToast", () => ({ useToast: () => mockToast }));
vi.mock("../../../shared/undo/useUndo", () => ({
  useUndo: () => ({ pushAction: vi.fn() }),
}));
vi.mock("../../../shared/errorReporting/logger", () => ({ logError: vi.fn() }));
vi.mock("../jobCsvExport", () => ({ exportJobsToCsv: vi.fn() }));
vi.mock("../../../platform/tauri", () => ({
  invalidateCacheByCommand: vi.fn(),
  invoke: vi.fn(),
  safeInvokeWithToast: vi.fn(),
}));

const mockExportJobsToCsv = vi.mocked(exportJobsToCsv);

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 1,
    title: "Customer Support Coordinator",
    company: "CareBridge Services",
    location: "Remote",
    url: "https://example.com/job/1",
    source: "linkedin",
    score: 0.85,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function renderJobOps(jobs: Job[]) {
  return renderHook(() => useDashboardJobOps(jobs, vi.fn()));
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("useDashboardJobOps export handlers", () => {
  it("exports a provided job list without requiring selected jobs", () => {
    const jobs = [makeJob({ id: 1 }), makeJob({ id: 2 })];
    const { result } = renderJobOps(jobs);

    act(() => {
      result.current.handleExportJobs(jobs);
    });

    expect(mockExportJobsToCsv).toHaveBeenCalledWith(jobs);
    expect(mockToast.success).toHaveBeenCalledWith(
      "Downloaded 2 jobs",
      "Job list downloaded to your computer.",
    );
  });

  it("shows reviewable copy instead of downloading an empty list", () => {
    const { result } = renderJobOps([]);

    act(() => {
      result.current.handleExportJobs([]);
    });

    expect(mockExportJobsToCsv).not.toHaveBeenCalled();
    expect(mockToast.info).toHaveBeenCalledWith(
      "No jobs to download",
      "Change filters or select jobs first.",
    );
  });

  it("bulk export still exports only selected jobs", () => {
    const jobs = [makeJob({ id: 1 }), makeJob({ id: 2 }), makeJob({ id: 3 })];
    const { result } = renderJobOps(jobs);

    act(() => {
      result.current.setSelectedJobIds(new Set([2, 3]));
    });

    act(() => {
      result.current.handleBulkExport(jobs);
    });

    expect(mockExportJobsToCsv).toHaveBeenCalledWith([jobs[1], jobs[2]]);
    expect(mockToast.success).toHaveBeenCalledWith(
      "Downloaded 2 jobs",
      "Job list downloaded to your computer.",
    );
  });
});
