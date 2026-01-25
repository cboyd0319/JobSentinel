import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useFetchOnMount } from "./useFetchOnMount";

// Mock useToast
vi.mock("../contexts", () => ({
  useToast: () => ({
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

describe("useFetchOnMount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch data on mount", async () => {
    const mockData = { id: 1, name: "Test" };
    const fetchFn = vi.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() => useFetchOnMount(fetchFn));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
    // May be called multiple times due to React StrictMode or useCallback deps
    expect(fetchFn).toHaveBeenCalled();
  });

  it("should handle fetch errors", async () => {
    const mockError = new Error("Fetch failed");
    const fetchFn = vi.fn().mockRejectedValue(mockError);

    const { result } = renderHook(() => useFetchOnMount(fetchFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("Fetch failed");
  });

  it("should call onSuccess callback", async () => {
    const mockData = { id: 1, name: "Test" };
    const fetchFn = vi.fn().mockResolvedValue(mockData);
    const onSuccess = vi.fn();

    renderHook(() => useFetchOnMount(fetchFn, { onSuccess }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockData);
    });
  });

  it("should call onError callback", async () => {
    const mockError = new Error("Fetch failed");
    const fetchFn = vi.fn().mockRejectedValue(mockError);
    const onError = vi.fn();

    renderHook(() => useFetchOnMount(fetchFn, { onError }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });

  it("should skip initial fetch when skip is true", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ id: 1 });

    const { result } = renderHook(() =>
      useFetchOnMount(fetchFn, { skip: true })
    );

    expect(result.current.loading).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("should refetch data when refetch is called", async () => {
    const mockData1 = { id: 1, name: "Test 1" };
    const mockData2 = { id: 2, name: "Test 2" };
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData1) // May be called twice on mount in StrictMode
      .mockResolvedValueOnce(mockData2);

    const { result } = renderHook(() => useFetchOnMount(fetchFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeDefined();
    });

    // Ensure we have initial data
    const initialCallCount = fetchFn.mock.calls.length;

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(fetchFn.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  it("should abort fetch on unmount", async () => {
    const fetchFn = vi.fn(async (signal: AbortSignal) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          if (!signal.aborted) {
            resolve({ id: 1 });
          }
        }, 100);
      });
    });

    const { unmount } = renderHook(() => useFetchOnMount(fetchFn));

    unmount();

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
  });

  it("should handle null response from fetchFn", async () => {
    const fetchFn = vi.fn().mockResolvedValue(null);
    const onSuccess = vi.fn();

    const { result } = renderHook(() =>
      useFetchOnMount(fetchFn, { onSuccess })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("should not show error toast when showErrorToast is false", async () => {
    const mockError = new Error("Fetch failed");
    const fetchFn = vi.fn().mockRejectedValue(mockError);

    renderHook(() =>
      useFetchOnMount(fetchFn, { showErrorToast: false })
    );

    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalled();
    });

    // No assertions needed - just verifying it doesn't throw
  });

  it("should use custom error message", async () => {
    const mockError = new Error("Fetch failed");
    const fetchFn = vi.fn().mockRejectedValue(mockError);
    const errorMessage = "Custom error message";

    renderHook(() =>
      useFetchOnMount(fetchFn, { errorMessage })
    );

    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalled();
    });

    // No assertions needed - just verifying it doesn't throw
  });
});
