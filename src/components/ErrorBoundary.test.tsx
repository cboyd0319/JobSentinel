import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBoundary from "./ErrorBoundary";

// Mock error reporter
vi.mock("../utils/errorReporting", async () => {
  const actual = await vi.importActual<typeof import("../utils/errorReporting")>(
    "../utils/errorReporting"
  );

  return {
    ...actual,
    errorReporter: {
      captureReactError: vi.fn(),
      getErrors: vi.fn(() => []),
    },
  };
});

const mockCopySanitizedDebugReport = vi.fn();
const mockSaveSanitizedDebugReport = vi.fn();
vi.mock("../services/feedbackService", () => ({
  copySanitizedDebugReport: (...args: unknown[]) =>
    mockCopySanitizedDebugReport(...args),
  saveSanitizedDebugReport: (...args: unknown[]) =>
    mockSaveSanitizedDebugReport(...args),
}));

// Component that throws an error
function ThrowError({
  shouldThrow = false,
  message = "Test error message",
}: {
  shouldThrow?: boolean;
  message?: string;
}) {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>Working component</div>;
}

// Suppress console errors in tests
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  mockCopySanitizedDebugReport.mockReset();
  mockSaveSanitizedDebugReport.mockReset();
  return () => {
    console.error = originalError;
  };
});

describe("ErrorBoundary", () => {
  describe("when no error occurs", () => {
    it("renders children normally", () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText("Child content")).toBeInTheDocument();
    });

    it("does not show error UI", () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );

      expect(screen.queryByText("JobSentinel needs attention")).not.toBeInTheDocument();
    });
  });

  describe("when error occurs", () => {
    it("catches error and shows fallback UI", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText("JobSentinel needs attention")).toBeInTheDocument();
    });

    it("displays protective error message", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/JobSentinel ran into a problem/i)).toBeInTheDocument();
      expect(screen.getByText(/copy a safe support report/i)).toBeInTheDocument();
      expect(screen.queryByText("Test error message")).not.toBeInTheDocument();
    });

    it("does not expose private details in visible error messages", () => {
      vi.stubEnv("DEV", false);

      const { container } = render(
        <ErrorBoundary>
          <ThrowError
            shouldThrow={true}
            message="Failed at /Users/alice/private.txt with token=abc and candidate@example.com"
          />
        </ErrorBoundary>
      );

      expect(container.textContent).toContain("JobSentinel ran into a problem");
      expect(container.textContent).not.toContain("/Users/alice");
      expect(container.textContent).not.toContain("token=abc");
      expect(container.textContent).not.toContain("candidate@example.com");
      expect(container.textContent).not.toContain("[USER_PATH]");
      expect(container.textContent).not.toContain("[TOKEN]");
      expect(container.textContent).not.toContain("[EMAIL]");

      vi.unstubAllEnvs();
    });

    it("shows reset app window button", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Component shows "Try Again" and "Reset App Window" buttons
      expect(
        screen.getByRole("button", { name: /try again/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reset app window/i })
      ).toBeInTheDocument();
    });

    it("shows local data message", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getAllByText(/app data stays on this device/i).length).toBeGreaterThan(0);
    });

    it("copies a sanitized support report from the crash screen", async () => {
      const user = userEvent.setup();
      mockCopySanitizedDebugReport.mockResolvedValueOnce({
        content: "safe support report",
        copied: true,
        errorCount: 1,
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      await user.click(
        screen.getByRole("button", { name: /copy safe support report/i })
      );

      expect(mockCopySanitizedDebugReport).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Safe support report copied")).toBeInTheDocument();
    });

    it("saves a sanitized support report from the crash screen", async () => {
      const user = userEvent.setup();
      mockSaveSanitizedDebugReport.mockResolvedValueOnce({
        fileName: "jobsentinel-support-report.txt",
        revealToken: "feedback-token",
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      await user.click(
        screen.getByRole("button", { name: /save safe support report/i })
      );

      expect(mockSaveSanitizedDebugReport).toHaveBeenCalledTimes(1);
      expect(
        screen.getByText("Safe support report saved: jobsentinel-support-report.txt")
      ).toBeInTheDocument();
    });

    it("resets app window when reset button is clicked", async () => {
      const user = userEvent.setup();
      const reloadMock = vi.fn();
      Object.defineProperty(window, "location", {
        writable: true,
        value: { reload: reloadMock },
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole("button", {
        name: /reset app window/i,
      });
      await user.click(reloadButton);

      expect(reloadMock).toHaveBeenCalledTimes(1);
    });

    it("uses protective reset wording after repeated crashes", async () => {
      const user = userEvent.setup();

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      await user.click(screen.getByRole("button", { name: /try again/i }));

      expect(
        screen.getByText(/copy or save a safe support report first/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/saved jobs and applications stay on this device/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^reset app window$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reset local app settings/i }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/temporary app data/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/clear app data/i)).not.toBeInTheDocument();
    });

    it("preserves visual preferences when resetting the app window", async () => {
      const user = userEvent.setup();
      const reloadMock = vi.fn();
      const storage = new Map<string, string>();
      Object.defineProperty(window, "location", {
        writable: true,
        value: { reload: reloadMock },
      });

      vi.mocked(localStorage.getItem).mockImplementation(
        (key: string) => storage.get(key) ?? null
      );
      vi.mocked(localStorage.setItem).mockImplementation(
        (key: string, value: string) => {
          storage.set(key, value);
        }
      );
      vi.mocked(localStorage.clear).mockImplementation(() => {
        storage.clear();
      });

      localStorage.setItem("jobsentinel-theme", "dark");
      localStorage.setItem("jobsentinel-high-contrast", "true");
      localStorage.setItem("jobsentinel-job-cache", "stale");

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      await user.click(screen.getByRole("button", { name: /try again/i }));
      await user.click(
        await screen.findByRole("button", { name: /reset local app settings/i })
      );

      expect(localStorage.getItem("jobsentinel-theme")).toBe("dark");
      expect(localStorage.getItem("jobsentinel-high-contrast")).toBe("true");
      expect(localStorage.getItem("jobsentinel-job-cache")).toBeNull();
      expect(reloadMock).toHaveBeenCalledTimes(1);
    });

    it("does not render children after error", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText("Working component")).not.toBeInTheDocument();
    });

    it("displays fallback when error message is undefined", () => {
      function ThrowErrorWithoutMessage() {
         
        throw { name: "CustomError" };
      }

      render(
        <ErrorBoundary>
          <ThrowErrorWithoutMessage />
        </ErrorBoundary>
      );

      expect(screen.getByText(/JobSentinel ran into a problem/i)).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has proper heading structure", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const heading = screen.getByRole("heading", { name: /JobSentinel needs attention/i });
      expect(heading).toBeInTheDocument();
    });

    it("button is keyboard accessible", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const button = screen.getByRole("button", { name: /reset app window/i });
      expect(button).toHaveClass("focus-visible:ring-2");
    });

    it("error icon has aria-hidden", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // The icon is inside a div in the error UI, not inside the button
      const icon = document.querySelector("svg[aria-hidden='true']");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("visual design", () => {
    it("renders heading with proper styling", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const heading = screen.getByRole("heading", { name: /JobSentinel needs attention/i });
      expect(heading).toBeInTheDocument();
    });

    it("renders reset app window button", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const button = screen.getByRole("button", { name: /reset app window/i });
      expect(button).toBeInTheDocument();
    });
  });
});
