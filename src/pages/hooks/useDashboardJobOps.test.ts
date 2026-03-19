import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { useDashboardJobOps } from "./useDashboardJobOps";
import type { Job, DuplicateGroup } from "../DashboardTypes";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const mockToast = {
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};
vi.mock("../../contexts", () => ({ useToast: () => mockToast }));

const mockPushAction = vi.fn();
vi.mock("../../contexts/UndoContext", () => ({
  useUndo: () => ({ pushAction: mockPushAction }),
}));

vi.mock("../../utils/errorUtils", () => ({ logError: vi.fn() }));
vi.mock("../../utils/export", () => ({ exportJobsToCSV: vi.fn() }));
vi.mock("../../utils/api", () => ({
  invalidateCacheByCommand: vi.fn(),
  safeInvokeWithToast: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

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

function makeDuplicateGroup(
  primaryId: number,
  jobIds: number[],
): DuplicateGroup {
  return {
    primary_id: primaryId,
    jobs: jobIds.map((id) => makeJob({ id })),
    sources: ["linkedin"],
  };
}

function renderJobOps(jobs: Job[]) {
  const setJobs = vi.fn();
  const { result } = renderHook(() => useDashboardJobOps(jobs, setJobs));
  return { result, setJobs };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── handleBulkHide ───────────────────────────────────────────────────────────

describe("handleBulkHide", () => {
  it("no-ops when selection is empty", async () => {
    const jobs = [makeJob({ id: 1 }), makeJob({ id: 2 })];
    const { result, setJobs } = renderJobOps(jobs);

    await act(async () => {
      await result.current.handleBulkHide();
    });

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(setJobs).not.toHaveBeenCalled();
    expect(mockToast.error).not.toHaveBeenCalled();
    expect(mockToast.warning).not.toHaveBeenCalled();
  });

  it("all succeed: removes all selected jobs, no failure toast, pushes undo action", async () => {
    const jobs = [makeJob({ id: 1 }), makeJob({ id: 2 }), makeJob({ id: 3 })];
    const { result, setJobs } = renderJobOps(jobs);

    mockInvoke.mockResolvedValue(undefined);

    await act(async () => {
      result.current.setSelectedJobIds(new Set([1, 2]));
    });

    await act(async () => {
      await result.current.handleBulkHide();
    });

    expect(mockInvoke).toHaveBeenCalledWith("hide_job", { id: 1 });
    expect(mockInvoke).toHaveBeenCalledWith("hide_job", { id: 2 });

    // setJobs called with jobs filtered to exclude hidden ids
    expect(setJobs).toHaveBeenCalledOnce();
    const updater = setJobs.mock.calls[0][0];
    const remaining = Array.isArray(updater) ? updater : updater(jobs);
    expect(remaining.map((j: Job) => j.id)).toEqual([3]);

    expect(mockPushAction).toHaveBeenCalledOnce();
    expect(mockPushAction.mock.calls[0][0]).toMatchObject({
      type: "hide",
      description: "Hidden 2 jobs",
    });

    expect(mockToast.warning).not.toHaveBeenCalled();
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it("partial failure: removes only succeeded jobs, shows warning toast with counts", async () => {
    const jobs = [makeJob({ id: 1 }), makeJob({ id: 2 }), makeJob({ id: 3 })];
    const { result, setJobs } = renderJobOps(jobs);

    // id 1 succeeds, id 2 fails, id 3 succeeds
    mockInvoke
      .mockResolvedValueOnce(undefined) // id 1
      .mockRejectedValueOnce(new Error("network error")) // id 2
      .mockResolvedValueOnce(undefined); // id 3

    await act(async () => {
      result.current.setSelectedJobIds(new Set([1, 2, 3]));
    });

    await act(async () => {
      await result.current.handleBulkHide();
    });

    // Only ids 1 and 3 should be removed
    expect(setJobs).toHaveBeenCalledOnce();
    const updater = setJobs.mock.calls[0][0];
    const remaining = Array.isArray(updater) ? updater : updater(jobs);
    expect(remaining.map((j: Job) => j.id)).toEqual([2]);

    // Undo action pushed only for the 2 that succeeded
    expect(mockPushAction).toHaveBeenCalledOnce();
    expect(mockPushAction.mock.calls[0][0]).toMatchObject({
      type: "hide",
      description: "Hidden 2 jobs",
    });

    // Warning toast with correct counts
    expect(mockToast.warning).toHaveBeenCalledOnce();
    expect(mockToast.warning).toHaveBeenCalledWith(
      "Partially hidden",
      expect.stringContaining("2 jobs hidden"),
    );
    expect(mockToast.warning.mock.calls[0][1]).toContain("1 failed");

    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it("all fail: no jobs removed, error toast, no undo action", async () => {
    const jobs = [makeJob({ id: 1 }), makeJob({ id: 2 })];
    const { result, setJobs } = renderJobOps(jobs);

    mockInvoke.mockRejectedValue(new Error("backend down"));

    await act(async () => {
      result.current.setSelectedJobIds(new Set([1, 2]));
    });

    await act(async () => {
      await result.current.handleBulkHide();
    });

    expect(setJobs).not.toHaveBeenCalled();
    expect(mockPushAction).not.toHaveBeenCalled();

    expect(mockToast.error).toHaveBeenCalledOnce();
    expect(mockToast.error).toHaveBeenCalledWith(
      "Bulk Hide Failed",
      expect.any(String),
    );

    expect(mockToast.warning).not.toHaveBeenCalled();
  });
});

// ─── handleMergeAllDuplicates ─────────────────────────────────────────────────

describe("handleMergeAllDuplicates", () => {
  const fetchData = vi.fn().mockResolvedValue(undefined);

  function seedDuplicateGroups(
    result: ReturnType<typeof renderJobOps>["result"],
    groups: DuplicateGroup[],
  ) {
    act(() => {
      result.current.setDuplicateGroups(groups);
    });
  }

  it("all succeed: clears groups, closes modal, shows success toast", async () => {
    const jobs = [
      makeJob({ id: 10 }),
      makeJob({ id: 11 }),
      makeJob({ id: 20 }),
    ];
    const { result } = renderJobOps(jobs);

    const groups = [makeDuplicateGroup(10, [11]), makeDuplicateGroup(20, [21])];
    seedDuplicateGroups(result, groups);

    mockInvoke.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.handleMergeAllDuplicates(fetchData);
    });

    expect(fetchData).toHaveBeenCalledOnce();

    expect(result.current.duplicateGroups).toHaveLength(0);
    expect(result.current.duplicatesModalOpen).toBe(false);

    expect(mockToast.success).toHaveBeenCalledWith(
      "All duplicates merged",
      expect.stringContaining("2 groups"),
    );
    expect(mockToast.warning).not.toHaveBeenCalled();
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it("partial failure: shows warning toast, modal stays open", async () => {
    const jobs = [makeJob({ id: 10 }), makeJob({ id: 20 })];
    const { result } = renderJobOps(jobs);

    const groups = [makeDuplicateGroup(10, [11]), makeDuplicateGroup(20, [21])];
    seedDuplicateGroups(result, groups);

    // First group succeeds, second fails
    mockInvoke
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("merge conflict"));

    await act(async () => {
      // Open modal first so we can verify it stays open
      result.current.setDuplicatesModalOpen(true);
    });

    await act(async () => {
      await result.current.handleMergeAllDuplicates(fetchData);
    });

    expect(fetchData).toHaveBeenCalledOnce();

    // Modal should still be open (not closed on partial failure)
    expect(result.current.duplicatesModalOpen).toBe(true);

    expect(mockToast.warning).toHaveBeenCalledOnce();
    expect(mockToast.warning).toHaveBeenCalledWith(
      "Partially merged",
      expect.stringContaining("1 groups merged"),
    );
    expect(mockToast.warning.mock.calls[0][1]).toContain("1 failed");

    expect(mockToast.error).not.toHaveBeenCalled();
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it("all fail: shows error toast", async () => {
    const jobs = [makeJob({ id: 10 }), makeJob({ id: 20 })];
    const { result } = renderJobOps(jobs);

    const groups = [makeDuplicateGroup(10, [11]), makeDuplicateGroup(20, [21])];
    seedDuplicateGroups(result, groups);

    mockInvoke.mockRejectedValue(new Error("backend error"));

    await act(async () => {
      await result.current.handleMergeAllDuplicates(fetchData);
    });

    expect(fetchData).toHaveBeenCalledOnce();

    expect(mockToast.error).toHaveBeenCalledOnce();
    expect(mockToast.error).toHaveBeenCalledWith(
      "Bulk Merge Failed",
      expect.any(String),
    );

    expect(mockToast.warning).not.toHaveBeenCalled();
    expect(mockToast.success).not.toHaveBeenCalled();
  });
});
