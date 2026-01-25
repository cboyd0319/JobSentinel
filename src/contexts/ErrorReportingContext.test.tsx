import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ErrorReportingProvider, useErrorReporting } from "./ErrorReportingContext";
import { errorReporter } from "../utils/errorReporting";

// Test component that uses the error reporting context
function TestComponent() {
  const { errors, errorCount, captureError, clearErrors, clearError, exportErrors } =
    useErrorReporting();

  return (
    <div>
      <span data-testid="error-count">{errorCount}</span>
      <span data-testid="errors-json">{JSON.stringify(errors.map((e) => e.message))}</span>
      <button
        data-testid="capture"
        onClick={() => captureError(new Error("Test error"), { test: true })}
      >
        Capture Error
      </button>
      <button data-testid="clear-all" onClick={clearErrors}>
        Clear All
      </button>
      <button
        data-testid="clear-first"
        onClick={() => errors[0] && clearError(errors[0].id)}
      >
        Clear First
      </button>
      <button data-testid="export" onClick={exportErrors}>
        Export
      </button>
    </div>
  );
}

describe("ErrorReportingContext", () => {
  beforeEach(() => {
    // Initialize and clear the error reporter
    errorReporter.init();
    errorReporter.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    errorReporter.clear();
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

    it("initializes with empty errors", () => {
      render(
        <ErrorReportingProvider>
          <TestComponent />
        </ErrorReportingProvider>
      );

      expect(screen.getByTestId("error-count")).toHaveTextContent("0");
    });
  });

  describe("captureError", () => {
    it("captures error and updates count", async () => {
      render(
        <ErrorReportingProvider>
          <TestComponent />
        </ErrorReportingProvider>
      );

      fireEvent.click(screen.getByTestId("capture"));

      await waitFor(() => {
        expect(screen.getByTestId("error-count")).toHaveTextContent("1");
      });
    });

    it("captures multiple errors", async () => {
      render(
        <ErrorReportingProvider>
          <TestComponent />
        </ErrorReportingProvider>
      );

      fireEvent.click(screen.getByTestId("capture"));
      fireEvent.click(screen.getByTestId("capture"));

      await waitFor(() => {
        expect(screen.getByTestId("error-count")).toHaveTextContent("2");
      });
    });
  });

  describe("clearErrors", () => {
    it("clears all errors", async () => {
      render(
        <ErrorReportingProvider>
          <TestComponent />
        </ErrorReportingProvider>
      );

      fireEvent.click(screen.getByTestId("capture"));
      await waitFor(() => {
        expect(screen.getByTestId("error-count")).toHaveTextContent("1");
      });

      fireEvent.click(screen.getByTestId("clear-all"));

      await waitFor(() => {
        expect(screen.getByTestId("error-count")).toHaveTextContent("0");
      });
    });
  });

  describe("clearError", () => {
    it("clears specific error by id", async () => {
      render(
        <ErrorReportingProvider>
          <TestComponent />
        </ErrorReportingProvider>
      );

      fireEvent.click(screen.getByTestId("capture"));
      fireEvent.click(screen.getByTestId("capture"));

      await waitFor(() => {
        expect(screen.getByTestId("error-count")).toHaveTextContent("2");
      });

      fireEvent.click(screen.getByTestId("clear-first"));

      await waitFor(() => {
        expect(screen.getByTestId("error-count")).toHaveTextContent("1");
      });
    });
  });

  describe("exportErrors", () => {
    it("calls downloadExport on error reporter", async () => {
      const downloadSpy = vi.spyOn(errorReporter, "downloadExport").mockImplementation(() => {});

      render(
        <ErrorReportingProvider>
          <TestComponent />
        </ErrorReportingProvider>
      );

      fireEvent.click(screen.getByTestId("export"));

      expect(downloadSpy).toHaveBeenCalled();

      downloadSpy.mockRestore();
    });
  });

  describe("error updates", () => {
    it("updates when errors are captured externally", async () => {
      render(
        <ErrorReportingProvider>
          <TestComponent />
        </ErrorReportingProvider>
      );

      expect(screen.getByTestId("error-count")).toHaveTextContent("0");

      // Capture error directly through errorReporter (wrapped in act)
      await waitFor(() => {
        errorReporter.captureCustom("External error");
      });

      await waitFor(() => {
        expect(screen.getByTestId("error-count")).toHaveTextContent("1");
      });
    });
  });
});
