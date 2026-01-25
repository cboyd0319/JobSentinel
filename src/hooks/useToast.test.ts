import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useToast } from "./useToast";
import { ToastProvider } from "../contexts/ToastContext";

describe("useToast", () => {
  it("throws error when used outside ToastProvider", () => {
    expect(() => {
      renderHook(() => useToast());
    }).toThrow("useToast must be used within a ToastProvider");
  });

  it("returns context when used within ToastProvider", () => {
    const { result } = renderHook(() => useToast(), {
      wrapper: ToastProvider,
    });

    expect(result.current).toBeDefined();
    expect(typeof result.current.success).toBe("function");
    expect(typeof result.current.error).toBe("function");
    expect(typeof result.current.info).toBe("function");
    expect(typeof result.current.warning).toBe("function");
  });
});
