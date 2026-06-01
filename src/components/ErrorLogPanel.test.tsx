import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorLogPanel } from "./ErrorLogPanel";
import type { ErrorReport } from "../utils/errorReporting";

// Mock the useErrorReporting hook
const mockUseErrorReporting = vi.fn();
vi.mock("../hooks/useErrorReporting", () => ({
  useErrorReporting: () => mockUseErrorReporting(),
}));

const mockCopySanitizedDebugReport = vi.fn();
const mockSaveSanitizedDebugReport = vi.fn();
vi.mock("../services/feedbackService", () => ({
  copySanitizedDebugReport: (...args: unknown[]) =>
    mockCopySanitizedDebugReport(...args),
  saveSanitizedDebugReport: (...args: unknown[]) =>
    mockSaveSanitizedDebugReport(...args),
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
    mockSaveSanitizedDebugReport.mockReset();
    mockUseErrorReporting.mockReturnValue(defaultMockReturn);
  });

  describe("rendering", () => {
    it("renders recent problems title", () => {
      render(<ErrorLogPanel />);

      expect(screen.getByText("Recent Problems")).toBeInTheDocument();
    });

    it("shows 'No problems recorded' when empty", () => {
      render(<ErrorLogPanel />);

      expect(screen.getByText("No problems recorded")).toBeInTheDocument();
    });

    it("shows empty state message", () => {
      render(<ErrorLogPanel />);

      expect(screen.getByText("No problems have been recorded")).toBeInTheDocument();
      expect(screen.getByText("Problems will appear here when they occur")).toBeInTheDocument();
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

      expect(screen.getByText("1 problem recorded")).toBeInTheDocument();
    });

    it("shows plural error count", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ id: "1" }), createMockError({ id: "2" })],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByText("2 problems recorded")).toBeInTheDocument();
    });

    it("displays error message", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ message: "Something went wrong" })],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("sanitizes stored error messages before display", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [
          createMockError({
            message:
              "Failed for candidate@example.com with token=abc123 at /Users/chad/private/resume.pdf",
          }),
        ],
      });

      const { container } = render(<ErrorLogPanel />);

      expect(container.textContent).toContain("email hidden");
      expect(container.textContent).toContain("private token hidden");
      expect(container.textContent).toContain("file path hidden");
      expect(container.textContent).not.toContain("[EMAIL]");
      expect(container.textContent).not.toContain("[TOKEN]");
      expect(container.textContent).not.toContain("/[USER_PATH]");
      expect(container.textContent).not.toContain("candidate@example.com");
      expect(container.textContent).not.toContain("token=abc123");
      expect(container.textContent).not.toContain("/Users/chad");
    });

    it("shows Save Problem Details button when errors exist", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError()],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByRole("button", { name: "Save Problem Details" })).toBeInTheDocument();
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

      expect(screen.queryByRole("button", { name: "Save Problem Details" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Clear All" })).not.toBeInTheDocument();
    });

    it("shows one-click debug report copy action even before errors exist", () => {
      render(<ErrorLogPanel />);

      expect(
        screen.getByRole("button", { name: "Copy Safe Report" })
      ).toBeInTheDocument();
    });

    it("shows one-click debug report save action even before errors exist", () => {
      render(<ErrorLogPanel />);

      expect(
        screen.getByRole("button", { name: "Save Safe Report" })
      ).toBeInTheDocument();
    });
  });

  describe("error type badges", () => {
    it("shows Screen badge for render errors", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ type: "render" })],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByText("Screen")).toBeInTheDocument();
    });

    it("shows App badge for unhandled errors", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ type: "unhandled" })],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByText("App")).toBeInTheDocument();
    });

    it("shows Task badge for promise errors", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ type: "promise" })],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByText("Task")).toBeInTheDocument();
    });

    it("shows Connection badge for api errors", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ type: "api" })],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByText("Connection")).toBeInTheDocument();
    });

    it("shows Custom badge for custom errors", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ type: "custom" })],
      });

      render(<ErrorLogPanel />);

      expect(screen.getByText("App")).toBeInTheDocument();
    });
  });

  describe("error expansion", () => {
    it("expands support details without showing raw stack text", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [
          createMockError({
            stack:
              "Error: token=abc for candidate@example.com at /Users/chad/private/resume.pdf",
          }),
        ],
      });

      const { container } = render(<ErrorLogPanel />);

      // Stack trace not visible initially
      expect(screen.queryByText("Safe report details")).not.toBeInTheDocument();

      // Click to expand
      fireEvent.click(screen.getByText("Test error message"));

      expect(screen.getByText("Safe report details")).toBeInTheDocument();
      expect(
        screen.getByText(/Extra problem details are included/)
      ).toBeInTheDocument();
      expect(container.textContent).not.toContain("token=abc");
      expect(container.textContent).not.toContain("candidate@example.com");
      expect(container.textContent).not.toContain("/Users/chad");
    });

    it("summarizes screen details without showing raw component stack", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError({ componentStack: "at MyComponent" })],
      });

      render(<ErrorLogPanel />);

      fireEvent.click(screen.getByText("Test error message"));

      expect(screen.getByText("Safe report details")).toBeInTheDocument();
      expect(screen.queryByText("at MyComponent")).not.toBeInTheDocument();
    });

    it("shows readable sanitized context when available", () => {
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [
          createMockError({
            context: {
              user_email: "candidate@example.com",
              jobUrl: "https://example.com/jobs?token=abc",
              nested: { token: "secret" },
              action: "test",
            },
          }),
        ],
      });

      const { container } = render(<ErrorLogPanel />);

      fireEvent.click(screen.getByText("Test error message"));

      expect(screen.getByText("Problem details")).toBeInTheDocument();
      expect(screen.getByText("user email")).toBeInTheDocument();
      expect(screen.getByText("email hidden")).toBeInTheDocument();
      expect(screen.getByText("job url")).toBeInTheDocument();
      expect(screen.getByText("https://example.com/jobs")).toBeInTheDocument();
      expect(screen.getByText("nested")).toBeInTheDocument();
      expect(screen.getByText("Details summarized")).toBeInTheDocument();
      expect(screen.getByText("action")).toBeInTheDocument();
      expect(screen.getByText("test")).toBeInTheDocument();
      expect(container.textContent).not.toContain("candidate@example.com");
      expect(container.textContent).not.toContain("token=abc");
      expect(container.textContent).not.toContain("secret");
      expect(container.textContent).not.toContain('"user_email"');
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
    it("calls exportErrors when Save Problem Details clicked", () => {
      const exportErrors = vi.fn();
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors: [createMockError()],
        exportErrors,
      });

      render(<ErrorLogPanel />);

      fireEvent.click(screen.getByRole("button", { name: "Save Problem Details" }));

      expect(exportErrors).toHaveBeenCalledTimes(1);
    });

    it("copies a sanitized debug report with current errors", async () => {
      const user = userEvent.setup();
      const errors = [createMockError({ id: "error-123" })];
      mockCopySanitizedDebugReport.mockResolvedValueOnce({
        content: "safe report",
        copied: true,
        errorCount: 1,
      });
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors,
      });

      render(<ErrorLogPanel />);

      await user.click(screen.getByRole("button", { name: "Copy Safe Report" }));

      expect(mockCopySanitizedDebugReport).toHaveBeenCalledWith(errors);
      expect(await screen.findByText("Safe report copied")).toBeInTheDocument();
    });

    it("saves a sanitized debug report with current errors", async () => {
      const user = userEvent.setup();
      const errors = [createMockError({ id: "error-123" })];
      mockSaveSanitizedDebugReport.mockResolvedValueOnce({
        fileName: "jobsentinel-debug-report.txt",
        revealToken: "feedback-token",
      });
      mockUseErrorReporting.mockReturnValue({
        ...defaultMockReturn,
        errors,
      });

      render(<ErrorLogPanel />);

      await user.click(screen.getByRole("button", { name: "Save Safe Report" }));

      expect(mockSaveSanitizedDebugReport).toHaveBeenCalledWith(errors);
      expect(
        await screen.findByText("Safe report saved: jobsentinel-debug-report.txt")
      ).toBeInTheDocument();
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

      expect(screen.getByText("Safe report details")).toBeInTheDocument();
      expect(screen.queryByText("Stack 1")).not.toBeInTheDocument();
      expect(screen.queryByText("Stack 2")).not.toBeInTheDocument();
    });
  });
});
