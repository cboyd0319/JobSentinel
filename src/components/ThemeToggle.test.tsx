import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "./ThemeToggle";
import { ThemeProvider } from "../contexts/ThemeContext";

// Mock localStorage
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

describe("ThemeToggle", () => {
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

  it("renders a button", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("has accessible label for dark mode", () => {
    localStorageMock.store["jobsentinel-theme"] = "dark";

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    expect(screen.getByLabelText("Switch to light mode")).toBeInTheDocument();
  });

  it("has accessible label for light mode", () => {
    localStorageMock.store["jobsentinel-theme"] = "light";

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    expect(screen.getByLabelText("Switch to dark mode")).toBeInTheDocument();
  });

  it("toggles theme when clicked", () => {
    localStorageMock.store["jobsentinel-theme"] = "light";

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    // After clicking, should switch to dark mode
    expect(screen.getByLabelText("Switch to light mode")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <ThemeProvider>
        <ThemeToggle className="custom-class" />
      </ThemeProvider>
    );

    const button = screen.getByRole("button");
    expect(button.className).toContain("custom-class");
  });

  it("contains sun and moon icons", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    // Both SVGs should be present (hidden/visible based on theme)
    const svgs = screen.getAllByRole("button")[0].querySelectorAll("svg");
    expect(svgs).toHaveLength(2);
  });
});
