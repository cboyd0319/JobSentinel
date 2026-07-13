import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { useDashboardSearch } from "./useDashboardSearch";

vi.mock("../../../utils/errorUtils", () => ({
  logError: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

describe("useDashboardSearch", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("loads search history with the backend limit argument", async () => {
    mockInvoke.mockResolvedValueOnce(["remote customer support"]);

    const { result } = renderHook(() => useDashboardSearch());

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("get_search_history", { limit: 20 });
    });

    await waitFor(() => {
      expect(result.current.searchHistory).toEqual(["remote customer support"]);
    });
  });
});
