import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useDashboardSavedSearches } from "./useDashboardSavedSearches";
import { safeInvoke } from "../../utils/api";

const mockToast = {
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

vi.mock("../../contexts", () => ({
  useToast: () => mockToast,
}));

vi.mock("../../hooks/useUndo", () => ({
  useUndo: () => ({ pushAction: vi.fn() }),
}));

vi.mock("../../utils/api", () => ({
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
  salaryMinFilter: 120000,
  salaryMaxFilter: 180000,
};

describe("useDashboardSavedSearches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeInvoke.mockResolvedValue([]);
  });

  it("maps camelCase saved searches returned by the backend", async () => {
    mockSafeInvoke.mockResolvedValueOnce([
      {
        id: "search-1",
        name: "Remote Rust",
        sortBy: "score-desc",
        scoreFilter: "high",
        sourceFilter: "linkedin",
        remoteFilter: "remote",
        bookmarkFilter: "bookmarked",
        notesFilter: "with-notes",
        postedDateFilter: "week",
        salaryMinFilter: 100000,
        salaryMaxFilter: 200000,
        ghostFilter: null,
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
          name: "Remote Rust",
          filters: {
            sortBy: "score-desc",
            scoreFilter: "high",
            sourceFilter: "linkedin",
            remoteFilter: "remote",
            bookmarkFilter: "bookmarked",
            notesFilter: "with-notes",
            postedDateFilter: "week",
            salaryMinFilter: 100000,
            salaryMaxFilter: 200000,
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
        name: "Remote Rust",
        createdAt: "2026-05-20T00:00:00Z",
      });

    const { result } = renderHook(() => useDashboardSavedSearches());

    act(() => {
      result.current.setNewSearchName("Remote Rust");
    });

    await act(async () => {
      await result.current.handleSaveSearch(() => currentFilters);
    });

    expect(mockSafeInvoke).toHaveBeenCalledWith(
      "create_saved_search",
      {
        search: {
          id: "",
          name: "Remote Rust",
          sortBy: "score-desc",
          scoreFilter: "all",
          sourceFilter: "all",
          remoteFilter: "all",
          bookmarkFilter: "all",
          notesFilter: "all",
          postedDateFilter: "week",
          salaryMinFilter: 120000,
          salaryMaxFilter: 180000,
          ghostFilter: null,
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
});
