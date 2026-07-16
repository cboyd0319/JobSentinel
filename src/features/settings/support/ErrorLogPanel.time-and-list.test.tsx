import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ErrorReport } from "../../../shared/errorReporting/errorReporter";
import { ErrorLogPanel } from "./ErrorLogPanel";

const mockUseErrorReporting = vi.fn();
vi.mock("../../../shared/errorReporting/useErrorReporting", () => ({
  useErrorReporting: () => mockUseErrorReporting(),
}));

vi.mock("../../../shared/errorReporting/supportReport", () => ({
  copySanitizedDebugReport: vi.fn(),
  saveSanitizedDebugReport: vi.fn(),
}));

const SAFE_PROBLEM_SUMMARY =
  "JobSentinel recorded a problem. App data stays on this device.";

const createMockError = (overrides: Partial<ErrorReport> = {}): ErrorReport => ({
  id: "test-error-1",
  type: "render",
  message: "Test error message",
  timestamp: new Date().toISOString(),
  stack: "Error: Test error\n    at TestComponent",
  ...overrides,
});

describe("ErrorLogPanel time and list behavior", () => {
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

  it("renders all errors without exposing raw messages", () => {
    mockUseErrorReporting.mockReturnValue({
      ...defaultMockReturn,
      errors: [
        createMockError({ id: "1", message: "First error" }),
        createMockError({ id: "2", message: "Second error" }),
        createMockError({ id: "3", message: "Third error" }),
      ],
    });

    render(<ErrorLogPanel />);

    expect(screen.getAllByText(SAFE_PROBLEM_SUMMARY)).toHaveLength(3);
    expect(screen.queryByText("First error")).not.toBeInTheDocument();
    expect(screen.queryByText("Second error")).not.toBeInTheDocument();
    expect(screen.queryByText("Third error")).not.toBeInTheDocument();
  });

  it("expands errors independently without exposing raw stacks", () => {
    mockUseErrorReporting.mockReturnValue({
      ...defaultMockReturn,
      errors: [
        createMockError({ id: "1", message: "First error", stack: "Stack 1" }),
        createMockError({ id: "2", message: "Second error", stack: "Stack 2" }),
      ],
    });

    render(<ErrorLogPanel />);

    fireEvent.click(screen.getAllByRole("button", { expanded: false })[0]);

    expect(screen.getByText("Extra details kept hidden")).toBeInTheDocument();
    expect(screen.queryByText("Stack 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Stack 2")).not.toBeInTheDocument();
  });
});
