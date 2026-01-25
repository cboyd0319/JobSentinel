import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorLogPanel } from "./ErrorLogPanel";
import type { ErrorReport } from "../utils/errorReporting";

// Mock the useErrorReporting hook
const mockUseErrorReporting = vi.fn();
vi.mock("../contexts/ErrorReportingContext", () => ({
  useErrorReporting: () => mockUseErrorReporting(),
}));

const createMockError = (overrides: Partial<ErrorReport> = {}): ErrorReport => ({
  id: "test-error-1",
  type: "render",
  message: "Test error message",
  timestamp: new Date().toISOString(),
  stack: "Error: Test error\n    at TestComponent",
  ...overrides,
});

describe("ErrorLogPanel", () => {
  const defaultMockReturn = {
    errors: [],
    clearErrors: vi.fn(),
    clearError: vi.fn(),
    exportErrors: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseErrorReporting.mockReturnValue(defaultMockReturn);
  });

  describe("rendering", () => {
    it("renders Error Logs title", () => {
      render(<ErrorLogPanel />);

      expect(screen.getByText("Error Logs")).toBeInTheDocument();
    });

    it("shows 'No errors recorded' when empty", () => {
      render(<ErrorLogPanel />);

      expect(screen.getByText("No errors recorded")).toBeInTheDocument();
    });

    it("shows empty state message", () => {
      render(<ErrorLogPanel />);

      expect(screen.getByText("No errors have been recorded")).toBeInTheDocument();
      expect(screen.getByText("Errors will appear here when they occur")).toBeInTheDocument();
    });

    it("shows checkmark icon in empty state", () => {
      const { container } = render(<ErrorLogPanel />);

      const svg = container.querySelector('svg[aria-hidden="true"]');
      expect(svg).toBeInTheDocument();
    });
  });

  describe("with errors", () => {
    it("shows error count", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError()],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByText("1 error recorded")).toBeInTheDocument();
    });

    it("shows plural error count", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ id: "1" }), createMockError({ id: "2" })],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByText("2 errors recorded")).toBeInTheDocument();
    });

    it("displays error message", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ message: "Something went wrong" })],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("shows Export button when errors exist", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError()],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
    });

    it("shows Clear All button when errors exist", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError()],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByRole("button", { name: "Clear All" })).toBeInTheDocument();
    });

    it("hides action buttons when no errors", () => {
      render(<ErrorLogPanel />);

      expect(screen.queryByRole("button", { name: "Export" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Clear All" })).not.toBeInTheDocument();
    });
  });

  describe("error type badges", () => {
    it("shows React badge for render errors", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ type: "render" })],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByText("React")).toBeInTheDocument();
    });

    it("shows Runtime badge for unhandled errors", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ type: "unhandled" })],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByText("Runtime")).toBeInTheDocument();
    });

    it("shows Promise badge for promise errors", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ type: "promise" })],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByText("Promise")).toBeInTheDocument();
    });

    it("shows API badge for api errors", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ type: "api" })],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByText("API")).toBeInTheDocument();
    });

    it("shows Custom badge for custom errors", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ type: "custom" })],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByText("Custom")).toBeInTheDocument();
    });
  });

  describe("error expansion", () => {
    it("expands error details on click", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ stack: "Test stack trace" })],
      });

      render(<ErrorLogPanel />);

      // Stack trace not visible initially
      expect(screen.queryByText("Stack Trace")).not.toBeInTheDocument();

      // Click to expand
      fireEvent.click(screen.getByText("Test error message"));

      // Now stack trace should be visible
      expect(screen.getByText("Stack Trace")).toBeInTheDocument();
      expect(screen.getByText("Test stack trace")).toBeInTheDocument();
    });

    it("shows component stack when available", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ componentStack: "at MyComponent" })],
      });

      render(<ErrorLogPanel />);

      fireEvent.click(screen.getByText("Test error message"));

      expect(screen.getByText("Component Stack")).toBeInTheDocument();
      expect(screen.getByText("at MyComponent")).toBeInTheDocument();
    });

    it("shows context when available", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ context: { userId: "123", action: "test" } })],
      });

      render(<ErrorLogPanel />);

      fireEvent.click(screen.getByText("Test error message"));

      expect(screen.getByText("Context")).toBeInTheDocument();
    });

    it("has aria-expanded attribute", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError()],
      });

      render(<ErrorLogPanel />);

      const button = screen.getByRole("button", { expanded: false });
      expect(button).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(button);

      expect(button).toHaveAttribute("aria-expanded", "true");
    });

    it("shows Dismiss button when expanded", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError()],
      });

      render(<ErrorLogPanel />);

      fireEvent.click(screen.getByText("Test error message"));

      expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
    });
  });

  describe("actions", () => {
    it("calls exportErrors when Export clicked", () => {
      const exportErrors = vi.fn();
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError()],
        exportErrors,
      });

      render(<ErrorLogPanel />);

      fireEvent.click(screen.getByRole("button", { name: "Export" }));

      expect(exportErrors).toHaveBeenCalledTimes(1);
    });

    it("calls clearErrors when Clear All clicked", () => {
      const clearErrors = vi.fn();
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError()],
        clearErrors,
      });

      render(<ErrorLogPanel />);

      fireEvent.click(screen.getByRole("button", { name: "Clear All" }));

      expect(clearErrors).toHaveBeenCalledTimes(1);
    });

    it("calls clearError with error id when Dismiss clicked", () => {
      const clearError = vi.fn();
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ id: "error-123" })],
        clearError,
      });

      render(<ErrorLogPanel />);

      // Expand the error first
      fireEvent.click(screen.getByText("Test error message"));

      // Click Dismiss
      fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

      expect(clearError).toHaveBeenCalledWith("error-123");
    });
  });

  describe("relative time formatting", () => {
    it("shows 'Just now' for recent errors", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ timestamp: new Date().toISOString() })],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByText("Just now")).toBeInTheDocument();
    });

    it("shows minutes ago for older errors", () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ timestamp: fiveMinutesAgo })],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByText("5m ago")).toBeInTheDocument();
    });

    it("shows hours ago for older errors", () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ timestamp: threeHoursAgo })],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByText("3h ago")).toBeInTheDocument();
    });

    it("shows days ago for old errors", () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ timestamp: twoDaysAgo })],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByText("2d ago")).toBeInTheDocument();
    });
  });

  describe("multiple errors", () => {
    it("renders all errors", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [
          createMockError({ id: "1", message: "First error" }),
          createMockError({ id: "2", message: "Second error" }),
          createMockError({ id: "3", message: "Third error" }),
        ],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByText("First error")).toBeInTheDocument();
      expect(screen.getByText("Second error")).toBeInTheDocument();
      expect(screen.getByText("Third error")).toBeInTheDocument();
    });

    it("each error can be expanded independently", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [
          createMockError({ id: "1", message: "First error", stack: "Stack 1" }),
          createMockError({ id: "2", message: "Second error", stack: "Stack 2" }),
        ],
      });

      render(<ErrorLogPanel />);

      // Expand first error
      fireEvent.click(screen.getByText("First error"));

      expect(screen.getByText("Stack 1")).toBeInTheDocument();
      expect(screen.queryByText("Stack 2")).not.toBeInTheDocument();
    });
  });
});
