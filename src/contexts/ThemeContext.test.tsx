import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider } from "./ThemeContext";
import { useTheme } from "../hooks/useTheme";

// Test component that uses the theme context
function TestComponent() {
  const { theme, resolvedTheme, setTheme, toggleTheme, highContrast, setHighContrast } = useTheme();

  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <span data-testid="high-contrast">{String(highContrast)}</span>
      <button onClick={() => setTheme("light")}>Set Light</button>
      <button onClick={() => setTheme("dark")}>Set Dark</button>
      <button onClick={() => setTheme("system")}>Set System</button>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <button onClick={() => setHighContrast(true)}>Enable High Contrast</button>
      <button onClick={() => setHighContrast(false)}>Disable High Contrast</button>
    </div>
  );
}

describe("ThemeContext", () => {
  const localStorageMock = {
    store: {} as Record<string, string>,
    getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      localStorageMock.store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete localStorageMock.store[key];
    }),
    clear: vi.fn(() => {
      localStorageMock.store = {};
    }),
  };

  beforeEach(() => {
    localStorageMock.store = {};
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("ThemeProvider", () => {
    it("renders children", () => {
      render(
        <ThemeProvider>
          <div>Child content</div>
        </ThemeProvider>
      );

      expect(screen.getByText("Child content")).toBeInTheDocument();
    });

    it("defaults to dark theme for new users", () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    });

    it("loads theme from localStorage", () => {
      localStorageMock.store["jobsentinel-theme"] = "light";

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId("theme")).toHaveTextContent("light");
    });
  });

  describe("setTheme", () => {
    it("sets theme to light", async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText("Set Light"));

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent("light");
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith("jobsentinel-theme", "light");
    });

    it("sets theme to dark", async () => {
      localStorageMock.store["jobsentinel-theme"] = "light";

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText("Set Dark"));

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent("dark");
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith("jobsentinel-theme", "dark");
    });

    it("sets theme to system", async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText("Set System"));

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent("system");
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith("jobsentinel-theme", "system");
    });
  });

  describe("toggleTheme", () => {
    it("toggles from dark to light", async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText("Toggle Theme"));

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent("light");
      });
    });

    it("toggles from light to dark", async () => {
      localStorageMock.store["jobsentinel-theme"] = "light";

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText("Toggle Theme"));

      await waitFor(() => {
        expect(screen.getByTestId("theme")).toHaveTextContent("dark");
      });
    });
  });

  describe("highContrast", () => {
    it("defaults to false", () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId("high-contrast")).toHaveTextContent("false");
    });

    it("enables high contrast", async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText("Enable High Contrast"));

      await waitFor(() => {
        expect(screen.getByTestId("high-contrast")).toHaveTextContent("true");
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith("jobsentinel-high-contrast", "true");
    });

    it("disables high contrast", async () => {
      localStorageMock.store["jobsentinel-high-contrast"] = "true";

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText("Disable High Contrast"));

      await waitFor(() => {
        expect(screen.getByTestId("high-contrast")).toHaveTextContent("false");
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith("jobsentinel-high-contrast", "false");
    });

    it("loads high contrast from localStorage", () => {
      localStorageMock.store["jobsentinel-high-contrast"] = "true";

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId("high-contrast")).toHaveTextContent("true");
    });
  });

  describe("resolvedTheme", () => {
    it("resolves system theme to dark when system prefers dark", () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByText("Set System"));

      // System preference is dark in our mock
      expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
    });
  });
});
