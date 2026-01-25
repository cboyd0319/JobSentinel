import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AnnouncerProvider, useAnnouncer } from "./AnnouncerContext";

// Test component that uses the announcer context
function TestComponent() {
  const { announce } = useAnnouncer();

  return (
    <div>
      <button onClick={() => announce("Polite message")}>Announce Polite</button>
      <button onClick={() => announce("Assertive message", "assertive")}>
        Announce Assertive
      </button>
    </div>
  );
}

describe("AnnouncerContext", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("AnnouncerProvider", () => {
    it("renders children", () => {
      render(
        <AnnouncerProvider>
          <div>Child content</div>
        </AnnouncerProvider>
      );

      expect(screen.getByText("Child content")).toBeInTheDocument();
    });

    it("renders live regions for screen readers", () => {
      render(
        <AnnouncerProvider>
          <div>Child</div>
        </AnnouncerProvider>
      );

      // Check for polite live region
      const politeRegion = screen.getByRole("status");
      expect(politeRegion).toBeInTheDocument();
      expect(politeRegion).toHaveAttribute("aria-live", "polite");
      expect(politeRegion).toHaveAttribute("aria-atomic", "true");

      // Check for assertive live region
      const assertiveRegion = screen.getByRole("alert");
      expect(assertiveRegion).toBeInTheDocument();
      expect(assertiveRegion).toHaveAttribute("aria-live", "assertive");
      expect(assertiveRegion).toHaveAttribute("aria-atomic", "true");
    });
  });

  describe("useAnnouncer", () => {
    it("throws error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow("useAnnouncer must be used within an AnnouncerProvider");

      consoleSpy.mockRestore();
    });
  });

  describe("announce", () => {
    it("announces polite message by default", () => {
      render(
        <AnnouncerProvider>
          <TestComponent />
        </AnnouncerProvider>
      );

      act(() => {
        screen.getByText("Announce Polite").click();
      });

      const politeRegion = screen.getByRole("status");
      expect(politeRegion).toHaveTextContent("Polite message");
    });

    it("announces assertive message when specified", () => {
      render(
        <AnnouncerProvider>
          <TestComponent />
        </AnnouncerProvider>
      );

      act(() => {
        screen.getByText("Announce Assertive").click();
      });

      const assertiveRegion = screen.getByRole("alert");
      expect(assertiveRegion).toHaveTextContent("Assertive message");
    });

    it("clears polite message after timeout", () => {
      render(
        <AnnouncerProvider>
          <TestComponent />
        </AnnouncerProvider>
      );

      act(() => {
        screen.getByText("Announce Polite").click();
      });

      const politeRegion = screen.getByRole("status");
      expect(politeRegion).toHaveTextContent("Polite message");

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(politeRegion).toHaveTextContent("");
    });

    it("clears assertive message after timeout", () => {
      render(
        <AnnouncerProvider>
          <TestComponent />
        </AnnouncerProvider>
      );

      act(() => {
        screen.getByText("Announce Assertive").click();
      });

      const assertiveRegion = screen.getByRole("alert");
      expect(assertiveRegion).toHaveTextContent("Assertive message");

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(assertiveRegion).toHaveTextContent("");
    });

    it("replaces previous message with new announcement", () => {
      render(
        <AnnouncerProvider>
          <TestComponent />
        </AnnouncerProvider>
      );

      act(() => {
        screen.getByText("Announce Polite").click();
      });

      const politeRegion = screen.getByRole("status");
      expect(politeRegion).toHaveTextContent("Polite message");

      // Announce again before timeout
      act(() => {
        vi.advanceTimersByTime(500);
        screen.getByText("Announce Polite").click();
      });

      // Should still show message (new announcement)
      expect(politeRegion).toHaveTextContent("Polite message");

      // Advance past second timeout
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(politeRegion).toHaveTextContent("");
    });
  });
});
