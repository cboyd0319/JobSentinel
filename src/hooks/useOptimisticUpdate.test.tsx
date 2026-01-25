import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useOptimisticUpdate } from "./useOptimisticUpdate";
import { ToastProvider } from "../contexts/ToastContext";
import { ReactNode } from "react";

// Wrapper with ToastContext
const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe("useOptimisticUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies optimistic update immediately", async () => {
    const asyncFn = vi.fn().mockResolvedValue("final-value");

    const { result } = renderHook(
      () => useOptimisticUpdate<string, [string]>(asyncFn, { showSuccessToast: false }),
      { wrapper }
    );

    expect(result.current.data).toBeNull();

    // Execute with optimistic value
    await result.current.execute("optimistic-value", "arg1");

    // After async completes, should have final value
    await waitFor(() => {
      expect(result.current.data).toBe("final-value");
      expect(result.current.loading).toBe(false);
    });

    expect(asyncFn).toHaveBeenCalledWith("arg1");
  });

  it("rolls back on error", async () => {
    const asyncFn = vi
      .fn()
      .mockResolvedValueOnce("initial-value")
      .mockRejectedValueOnce(new Error("Failed"));
    const onRollback = vi.fn();

    const { result } = renderHook(
      () =>
        useOptimisticUpdate<string, [string]>(asyncFn, {
          onRollback,
          showErrorToast: false,
          showSuccessToast: false,
        }),
      { wrapper }
    );

    // Set initial data with first call
    await result.current.execute("initial-value", "arg1");
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBe("initial-value");
    });

    // Now attempt update that will fail
    await result.current.execute("optimistic-value", "arg2");

    // Should roll back to previous value after error
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBe("initial-value");
      expect(result.current.error).toBe("Failed");
    });

    expect(onRollback).toHaveBeenCalled();
  });

  it("calls success callback on successful update", async () => {
    const onSuccess = vi.fn();
    const asyncFn = vi.fn().mockResolvedValue("success-value");

    const { result } = renderHook(
      () =>
        useOptimisticUpdate<string, [string]>(asyncFn, {
          onSuccess,
          showSuccessToast: false,
        }),
      { wrapper }
    );

    await result.current.execute("optimistic", "arg");

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(onSuccess).toHaveBeenCalledWith("success-value");
  });

  it("calls error callback on failure", async () => {
    const error = new Error("Test error");
    const onError = vi.fn();
    const asyncFn = vi.fn().mockRejectedValue(error);

    const { result } = renderHook(
      () =>
        useOptimisticUpdate<string, [string]>(asyncFn, {
          onError,
          showErrorToast: false,
        }),
      { wrapper }
    );

    await result.current.execute("optimistic", "arg");

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(onError).toHaveBeenCalledWith(error);
  });

  it("resets state correctly", async () => {
    const asyncFn = vi.fn().mockResolvedValue("value");

    const { result } = renderHook(
      () => useOptimisticUpdate<string, [string]>(asyncFn, { showSuccessToast: false }),
      { wrapper }
    );

    await result.current.execute("optimistic", "arg");

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBe("value");
    });

    // Reset and check state
    result.current.reset();

    await waitFor(() => {
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  it("handles multiple sequential updates", async () => {
    let callCount = 0;
    const asyncFn = vi.fn().mockImplementation(async () => {
      callCount++;
      return `value-${callCount}`;
    });

    const { result } = renderHook(
      () => useOptimisticUpdate<string, []>(asyncFn, { showSuccessToast: false }),
      { wrapper }
    );

    // First update
    await result.current.execute("optimistic-1");
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBe("value-1");
    });

    // Second update - wait for loading and data together
    await result.current.execute("optimistic-2");
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBe("value-2");
    });

    expect(asyncFn).toHaveBeenCalledTimes(2);
  });
});
