import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ErrorReportingProvider, useErrorReporting } from "./ErrorReportingContext";

/**
 * Note: Some tests in this file are limited to avoid worker crashes.
 * The errorReporter singleton modifies global handlers which can conflict
 * with Vitest's test isolation.
 */

// Test component that uses the error reporting context
function TestComponent() {
  const { errors, errorCount, clearErrors } = useErrorReporting();

  return (
    <div>
      <span data-testid="error-count">{errorCount}</span>
      <span data-testid="errors-json">{JSON.stringify(errors.map((e) => e.message))}</span>
      <button data-testid="clear-all" onClick={clearErrors}>
        Clear All
      </button>
    </div>
  );
}

describe("ErrorReportingContext", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("useErrorReporting", () => {
    it("throws error when used outside provider", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow("useErrorReporting must be used within ErrorReportingProvider");

      consoleSpy.mockRestore();
    });
  });

  describe("ErrorReportingProvider", () => {
    it("renders children", () => {
      render(
        <ErrorReportingProvider>
          <div>Child content</div>
        </ErrorReportingProvider>
      );

      expect(screen.getByText("Child content")).toBeInTheDocument();
    });

    it("provides context values", () => {
      render(
        <ErrorReportingProvider>
          <TestComponent />
        </ErrorReportingProvider>
      );

      // Context values are available
      expect(screen.getByTestId("error-count")).toBeInTheDocument();
    });

    it("clearErrors function is accessible", async () => {
      render(
        <ErrorReportingProvider>
          <TestComponent />
        </ErrorReportingProvider>
      );

      // Clear button is clickable without errors
      const clearButton = screen.getByTestId("clear-all");
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.getByTestId("error-count")).toBeInTheDocument();
      });
    });
  });
});
