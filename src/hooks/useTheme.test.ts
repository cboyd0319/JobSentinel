import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTheme } from "./useTheme";
import { ThemeProvider } from "../contexts/ThemeContext";

describe("useTheme", () => {
  it("throws error when used outside ThemeProvider", () => {
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow("useTheme must be used within a ThemeProvider");
  });

  it("returns context when used within ThemeProvider", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current).toBeDefined();
    expect(result.current.theme).toBeDefined();
    expect(typeof result.current.setTheme).toBe("function");
  });
});
