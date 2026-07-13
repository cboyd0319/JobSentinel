import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useDashboardSavedSearches } from "./useDashboardSavedSearches";
import { safeInvoke } from "../../../utils/api";
import {
  BROWSER_ASSIST_LEARNING_ENABLED_STORAGE_KEY,
  BROWSER_ASSIST_LEARNING_STORAGE_KEY,
} from "../../../shared/browserAssistLearning";

const mockToast = {
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

vi.mock("../../../shared/toast/useToast", () => ({
  useToast: () => mockToast,
}));

vi.mock("../../../hooks/useUndo", () => ({
  useUndo: () => ({ pushAction: vi.fn() }),
}));

vi.mock("../../../utils/api", () => ({
  safeInvoke: vi.fn(),
  safeInvokeWithToast: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockSafeInvoke = vi.mocked(safeInvoke);

const currentFilters = {
  sortBy: "score-desc" as const,
  scoreFilter: "all" as const,
  sourceFilter: "all",
  remoteFilter: "all",
  bookmarkFilter: "all",
  notesFilter: "all",
  postedDateFilter: "week" as const,
  ghostFilter: "ghost" as const,
  salaryMinFilter: 55000,
  salaryMaxFilter: 72000,
};

describe("useDashboardSavedSearches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockSafeInvoke.mockResolvedValue([]);
  });

  it("maps camelCase saved searches returned by the backend", async () => {
    mockSafeInvoke.mockResolvedValueOnce([
      {
        id: "search-1",
        name: "Remote Support",
        sortBy: "score-desc",
        scoreFilter: "high",
        sourceFilter: "linkedin",
        remoteFilter: "remote",
        bookmarkFilter: "bookmarked",
        notesFilter: "with-notes",
        postedDateFilter: "week",
        salaryMinFilter: 50000,
        salaryMaxFilter: 80000,
        ghostFilter: "ghost",
        textSearch: null,
        createdAt: "2026-05-20T00:00:00Z",
        lastUsedAt: null,
      },
    ]);

    const { result } = renderHook(() => useDashboardSavedSearches());

    await waitFor(() => {
      expect(result.current.savedSearches).toEqual([
        {
          id: "search-1",
          name: "Remote Support",
          filters: {
            sortBy: "score-desc",
            scoreFilter: "high",
            sourceFilter: "linkedin",
            remoteFilter: "remote",
            bookmarkFilter: "bookmarked",
            notesFilter: "with-notes",
            postedDateFilter: "week",
            ghostFilter: "ghost",
            salaryMinFilter: 50000,
            salaryMaxFilter: 80000,
          },
          createdAt: "2026-05-20T00:00:00Z",
        },
      ]);
    });
  });

  it("sends create_saved_search with the backend search envelope", async () => {
    mockSafeInvoke
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({
        id: "search-2",
        name: "Remote Support",
        createdAt: "2026-05-20T00:00:00Z",
      });

    const { result } = renderHook(() => useDashboardSavedSearches());

    act(() => {
      result.current.setNewSearchName("Remote Support");
    });

    await act(async () => {
      await result.current.handleSaveSearch(() => currentFilters);
    });

    expect(mockSafeInvoke).toHaveBeenCalledWith(
      "create_saved_search",
      {
        search: {
          id: "",
          name: "Remote Support",
          sortBy: "score-desc",
          scoreFilter: "all",
          sourceFilter: "all",
          remoteFilter: "all",
          bookmarkFilter: "all",
          notesFilter: "all",
          postedDateFilter: "week",
          salaryMinFilter: 55000,
          salaryMaxFilter: 72000,
          ghostFilter: "ghost",
          textSearch: null,
          createdAt: "",
          lastUsedAt: null,
        },
      },
      {
        logContext: "Create saved search",
      },
    );
  });

  it("records saved search names as local learning when learning is on", async () => {
    window.localStorage.setItem(BROWSER_ASSIST_LEARNING_ENABLED_STORAGE_KEY, "true");
    mockSafeInvoke
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({
        id: "search-2",
        name: "Remote Support",
        createdAt: "2026-05-20T00:00:00Z",
      });

    const { result } = renderHook(() => useDashboardSavedSearches());

    act(() => {
      result.current.setNewSearchName("Remote Support");
    });

    await act(async () => {
      await result.current.handleSaveSearch(() => currentFilters);
    });

    const learning = window.localStorage.getItem(BROWSER_ASSIST_LEARNING_STORAGE_KEY);
    expect(learning).toContain("Remote Support");
    expect(learning).toContain("saved_search");
    expect(learning).not.toContain("salaryMinFilter");
  });

  it("uses plain validation copy when saving without a name", async () => {
    mockSafeInvoke.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useDashboardSavedSearches());

    await act(async () => {
      await result.current.handleSaveSearch(() => currentFilters);
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      "Name this search",
      "Add a name, then save again.",
    );
    expect(mockSafeInvoke).not.toHaveBeenCalledWith(
      "create_saved_search",
      expect.anything(),
      expect.anything(),
    );
  });
});
