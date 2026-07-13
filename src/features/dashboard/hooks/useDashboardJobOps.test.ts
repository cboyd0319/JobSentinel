import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { useDashboardJobOps } from "./useDashboardJobOps";
import type { Job, DuplicateGroup } from "../types";
import { safeInvokeWithToast } from "../../../utils/api";
import { exportJobsToCSV } from "../../../utils/export";
import {
  BROWSER_ASSIST_LEARNING_ENABLED_STORAGE_KEY,
  BROWSER_ASSIST_LEARNING_STORAGE_KEY,
} from "../../../shared/browserAssistLearning";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const mockToast = {
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};
vi.mock("../../../shared/toast/useToast", () => ({ useToast: () => mockToast }));

const mockPushAction = vi.fn();
vi.mock("../../../shared/undo/useUndo", () => ({
  useUndo: () => ({ pushAction: mockPushAction }),
}));

vi.mock("../../../shared/errorReporting/logger", () => ({ logError: vi.fn() }));
vi.mock("../../../utils/export", () => ({ exportJobsToCSV: vi.fn() }));
vi.mock("../../../utils/api", () => ({
  invalidateCacheByCommand: vi.fn(),
  safeInvokeWithToast: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);
const mockSafeInvokeWithToast = vi.mocked(safeInvokeWithToast);
const mockExportJobsToCSV = vi.mocked(exportJobsToCSV);

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
  window.localStorage.clear();
});

function applyJobsUpdate(
  update: Job[] | ((prev: Job[]) => Job[]),
  previousJobs: Job[],
): Job[] {
  return Array.isArray(update) ? update : update(previousJobs);
}

// ─── handleToggleBookmark ────────────────────────────────────────────────────

describe("handleToggleBookmark", () => {
  it("updates bookmark state immediately while backend request is pending", async () => {
    const jobs = [
      makeJob({ id: 1, bookmarked: true }),
      makeJob({ id: 2, bookmarked: false }),
    ];
    const { result, setJobs } = renderJobOps(jobs);

    let resolveToggle!: (value: boolean) => void;
    const pendingToggle = new Promise<boolean>((resolve) => {
      resolveToggle = resolve;
    });
    mockInvoke.mockReturnValueOnce(pendingToggle);

    let togglePromise!: Promise<void>;
    act(() => {
      togglePromise = result.current.handleToggleBookmark(1);
    });

    expect(mockInvoke).toHaveBeenCalledWith("toggle_bookmark", { id: 1 });
    expect(setJobs).toHaveBeenCalledOnce();

    const optimisticJobs = applyJobsUpdate(setJobs.mock.calls[0][0], jobs);
    expect(optimisticJobs.find((job) => job.id === 1)?.bookmarked).toBe(false);
    expect(optimisticJobs.find((job) => job.id === 2)?.bookmarked).toBe(false);

    await act(async () => {
      resolveToggle(false);
      await togglePromise;
    });

    expect(mockPushAction).toHaveBeenCalledOnce();
    expect(mockPushAction.mock.calls[0][0]).toMatchObject({
      type: "bookmark",
      description: "Unbookmarked: Customer Support Coordinator",
    });
  });

  it("rolls back optimistic bookmark state and shows an error when backend fails", async () => {
    const jobs = [makeJob({ id: 1, bookmarked: false })];
    const { result, setJobs } = renderJobOps(jobs);
    mockInvoke.mockRejectedValueOnce(new Error("backend down"));

    await act(async () => {
      await result.current.handleToggleBookmark(1);
    });

    expect(setJobs).toHaveBeenCalledTimes(2);

    const optimisticJobs = applyJobsUpdate(setJobs.mock.calls[0][0], jobs);
    expect(optimisticJobs[0].bookmarked).toBe(true);

    const rolledBackJobs = applyJobsUpdate(setJobs.mock.calls[1][0], optimisticJobs);
    expect(rolledBackJobs[0].bookmarked).toBe(false);

    expect(mockToast.error).toHaveBeenCalledWith(
      "Could not update bookmark",
      "Bookmark was not changed. Try again, or copy a safe support report if this keeps happening.",
    );
    expect(mockPushAction).not.toHaveBeenCalled();
  });

  it("uses safe support report guidance when bookmark undo fails", async () => {
    const jobs = [makeJob({ id: 1, bookmarked: false })];
    const { result } = renderJobOps(jobs);
    mockInvoke.mockResolvedValueOnce(true);

    await act(async () => {
      await result.current.handleToggleBookmark(1);
    });

    expect(mockPushAction).toHaveBeenCalledOnce();
    const pushedAction = mockPushAction.mock.calls[0][0];
    mockInvoke.mockRejectedValueOnce(new Error("backend down"));

    await act(async () => {
      await pushedAction.undo();
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      "Could not undo change",
      "Bookmark was not restored. Check the job list, then copy a safe support report if this keeps happening.",
    );
  });

  it("records confirmed bookmarks as local learning when learning is on", async () => {
    window.localStorage.setItem(BROWSER_ASSIST_LEARNING_ENABLED_STORAGE_KEY, "true");
    const jobs = [makeJob({ id: 1, bookmarked: false })];
    const { result } = renderJobOps(jobs);
    mockInvoke.mockResolvedValueOnce(true);

    await act(async () => {
      await result.current.handleToggleBookmark(1);
    });

    const learning = window.localStorage.getItem(BROWSER_ASSIST_LEARNING_STORAGE_KEY);
    expect(learning).toContain("Customer Support Coordinator");
    expect(learning).toContain("CareBridge Services");
    expect(learning).not.toContain("https://example.com/job/1");
  });
});

describe("handleHideJob", () => {
  it("records dismissed jobs as local learning when learning is on", async () => {
    window.localStorage.setItem(BROWSER_ASSIST_LEARNING_ENABLED_STORAGE_KEY, "true");
    const jobs = [makeJob({ id: 1 })];
    const { result } = renderJobOps(jobs);
    mockSafeInvokeWithToast.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.handleHideJob(1);
    });

    const learning = window.localStorage.getItem(BROWSER_ASSIST_LEARNING_STORAGE_KEY);
    expect(learning).toContain("Customer Support Coordinator");
    expect(learning).toContain("dismissed");
    expect(learning).not.toContain("https://example.com/job/1");
  });
});

describe("handleSaveNotes", () => {
  it("records note activity without storing note text when learning is on", async () => {
    window.localStorage.setItem(BROWSER_ASSIST_LEARNING_ENABLED_STORAGE_KEY, "true");
    const jobs = [makeJob({ id: 1, notes: null })];
    const { result } = renderJobOps(jobs);
    mockSafeInvokeWithToast.mockResolvedValueOnce(undefined);

    act(() => {
      result.current.handleEditNotes(1, null);
      result.current.setNotesText("Private recruiter note");
    });

    await act(async () => {
      await result.current.handleSaveNotes();
    });

    const learning = window.localStorage.getItem(BROWSER_ASSIST_LEARNING_STORAGE_KEY);
    expect(learning).toContain("Customer Support Coordinator");
    expect(learning).toContain("note");
    expect(learning).not.toContain("Private recruiter note");
  });
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
    expect(mockToast.warning.mock.calls[0][1]).toContain("rest one at a time");

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
      "Could not hide selected jobs",
      "None of the jobs were hidden. Try hiding one job at a time, or copy a safe support report if this keeps happening.",
    );

    expect(mockToast.warning).not.toHaveBeenCalled();
  });
});

// ─── Export handlers ─────────────────────────────────────────────────────────

describe("export handlers", () => {
  it("exports a provided job list without requiring selected jobs", () => {
    const jobs = [makeJob({ id: 1 }), makeJob({ id: 2 })];
    const { result } = renderJobOps(jobs);

    act(() => {
      result.current.handleExportJobs(jobs);
    });

    expect(mockExportJobsToCSV).toHaveBeenCalledWith(jobs);
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

    expect(mockExportJobsToCSV).not.toHaveBeenCalled();
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

    expect(mockExportJobsToCSV).toHaveBeenCalledWith([
      jobs[1],
      jobs[2],
    ]);
    expect(mockToast.success).toHaveBeenCalledWith(
      "Downloaded 2 jobs",
      "Job list downloaded to your computer.",
    );
  });
});

// ─── handleMergeAllDuplicates ─────────────────────────────────────────────────

describe("handleCheckDuplicates", () => {
  it("uses cautious copy when no repeated postings are found", async () => {
    mockSafeInvokeWithToast.mockResolvedValueOnce([]);
    const { result } = renderJobOps([makeJob({ id: 1 })]);

    await act(async () => {
      await result.current.handleCheckDuplicates();
    });

    expect(result.current.duplicatesModalOpen).toBe(true);
    expect(mockToast.success).toHaveBeenCalledWith(
      "No repeated postings found",
      "No likely repeats found in the current job list.",
    );
    expect(mockToast.info).not.toHaveBeenCalled();
  });

  it("uses review-first copy when possible repeat groups are found", async () => {
    mockSafeInvokeWithToast.mockResolvedValueOnce([makeDuplicateGroup(10, [11])]);
    const { result } = renderJobOps([makeJob({ id: 10 }), makeJob({ id: 11 })]);

    await act(async () => {
      await result.current.handleCheckDuplicates();
    });

    expect(result.current.duplicateGroups).toHaveLength(1);
    expect(mockToast.info).toHaveBeenCalledWith(
      "Possible repeats found",
      "1 group needs review",
    );
    expect(mockToast.success).not.toHaveBeenCalled();
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
      "All possible repeats hidden",
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
      "Partially hidden",
      expect.stringContaining("1 groups hidden"),
    );
    expect(mockToast.warning.mock.calls[0][1]).toContain("hiding the rest one at a time");

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
      "Could not hide possible repeats",
      "None of the possible repeat groups were hidden. Try hiding one group at a time, or copy a safe support report if this keeps happening.",
    );

    expect(mockToast.warning).not.toHaveBeenCalled();
    expect(mockToast.success).not.toHaveBeenCalled();
  });
});
