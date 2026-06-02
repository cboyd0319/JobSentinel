import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PageErrorBoundary from "./PageErrorBoundary";

// Mock dependencies
vi.mock("./Button", () => ({
  Button: ({ children, onClick, variant }: { children: React.ReactNode; onClick?: () => void; variant?: string }) => (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  ),
}));

vi.mock("./EmptyState", () => ({
  EmptyState: ({ title, description, illustration }: { title: string; description?: string; illustration?: string }) => (
    <div data-testid="empty-state">
      <div data-illustration={illustration}>{title}</div>
      {description && <p>{description}</p>}
    </div>
  ),
}));

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

const mockSaveSanitizedDebugReport = vi.fn();
vi.mock("../services/feedbackService", () => ({
  saveSanitizedDebugReport: (...args: unknown[]) =>
    mockSaveSanitizedDebugReport(...args),
}));

// Component that throws an error
function ThrowError({
  shouldThrow = false,
  message = "Page test error",
}: {
  shouldThrow?: boolean;
  message?: string;
}) {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>Page content working</div>;
}

// Suppress console errors in tests
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  mockSaveSanitizedDebugReport.mockReset();
  return () => {
    console.error = originalError;
  };
});

describe("PageErrorBoundary", () => {
  describe("when no error occurs", () => {
    it("renders children normally", () => {
      render(
        <PageErrorBoundary>
          <div>Page content</div>
        </PageErrorBoundary>
      );

      expect(screen.getByText("Page content")).toBeInTheDocument();
    });

    it("does not show error UI", () => {
      render(
        <PageErrorBoundary>
          <div>Page content</div>
        </PageErrorBoundary>
      );

      expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    });
  });

  describe("when error occurs", () => {
    it("catches error and shows error UI", () => {
      render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });

    it("displays default page error title", () => {
      render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.getByText("This page needs attention")).toBeInTheDocument();
    });

    it("displays custom page name in title", () => {
      render(
        <PageErrorBoundary pageName="Dashboard">
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.getByText("Dashboard needs attention")).toBeInTheDocument();
    });

    it("displays protective message in description", () => {
      render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(
        screen.getByText(/this page needs attention\. app data stays on this device/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/save a safe support report/i)).toBeInTheDocument();
      expect(screen.queryByText("Page test error")).not.toBeInTheDocument();
    });

    it("does not expose private details in visible page error messages", () => {
      vi.stubEnv("DEV", false);

      const { container } = render(
        <PageErrorBoundary>
          <ThrowError
            shouldThrow={true}
            message="Failed at /Users/alice/private.txt with token=abc and candidate@example.com"
          />
        </PageErrorBoundary>
      );

      expect(container.textContent).toContain("This page needs attention");
      expect(container.textContent).not.toContain("/Users/alice");
      expect(container.textContent).not.toContain("token=abc");
      expect(container.textContent).not.toContain("candidate@example.com");
      expect(container.textContent).not.toContain("[USER_PATH]");
      expect(container.textContent).not.toContain("[TOKEN]");
      expect(container.textContent).not.toContain("[EMAIL]");

      vi.unstubAllEnvs();
    });

    it("uses EmptyState with error illustration", () => {
      render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      const emptyState = screen.getByTestId("empty-state");
      expect(emptyState.querySelector("[data-illustration='error']")).toBeInTheDocument();
    });

    it("shows Try Again button", () => {
      render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    it("saves a sanitized debug report from the page error screen", async () => {
      const user = userEvent.setup();
      mockSaveSanitizedDebugReport.mockResolvedValueOnce({
        fileName: "jobsentinel-debug-report.txt",
        revealToken: "feedback-token",
      });

      render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      await user.click(
        screen.getByRole("button", { name: /save safe support report/i })
      );

      expect(mockSaveSanitizedDebugReport).toHaveBeenCalledTimes(1);
      expect(
        screen.getByText("Safe support report saved: jobsentinel-debug-report.txt")
      ).toBeInTheDocument();
    });

    it("shows Go Back button when onBack is provided", () => {
      const onBackMock = vi.fn();

      render(
        <PageErrorBoundary onBack={onBackMock}>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.getByRole("button", { name: /go back/i })).toBeInTheDocument();
    });

    it("does not show Go Back button when onBack is not provided", () => {
      render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.queryByRole("button", { name: /go back/i })).not.toBeInTheDocument();
    });

    it("calls onBack when Go Back button is clicked", async () => {
      const user = userEvent.setup();
      const onBackMock = vi.fn();

      render(
        <PageErrorBoundary onBack={onBackMock}>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      const goBackButton = screen.getByRole("button", { name: /go back/i });
      await user.click(goBackButton);

      expect(onBackMock).toHaveBeenCalledTimes(1);
    });

    it("calls handleRetry when Try Again button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.getByTestId("empty-state")).toBeInTheDocument();

      // Click Try Again button
      const tryAgainButton = screen.getByRole("button", { name: /try again/i });
      expect(tryAgainButton).toBeInTheDocument();
      
      // Button should be clickable
      await user.click(tryAgainButton);
      
      // The test verifies the button can be clicked
      // In a real app, this would reset the error boundary state
      // But since the child would throw again, the error UI persists
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });

    it("tells users to save a safe support report after repeated retry failures", async () => {
      const user = userEvent.setup();

      render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      await user.click(screen.getByRole("button", { name: /try again/i }));
      await user.click(screen.getByRole("button", { name: /try again/i }));

      expect(
        screen.getByText(/save a safe support report before leaving this page/i),
      ).toBeInTheDocument();
      expect(screen.queryByText(/this page may be temporarily unavailable/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /save safe support report/i })).toBeInTheDocument();
    });

    it("shows default local data message when error message is undefined", () => {
      function ThrowErrorWithoutMessage() {
         
        throw { name: "CustomError" };
      }

      render(
        <PageErrorBoundary>
          <ThrowErrorWithoutMessage />
        </PageErrorBoundary>
      );

      expect(
        screen.getByText(/this page needs attention. app data stays on this device./i)
      ).toBeInTheDocument();
    });

    it("displays fallback when error message is undefined", () => {
      function ThrowErrorWithoutMessage() {
         
        throw { name: "CustomError" };
      }

      render(
        <PageErrorBoundary>
          <ThrowErrorWithoutMessage />
        </PageErrorBoundary>
      );

      expect(
        screen.getByText(/this page needs attention\. app data stays on this device/i)
      ).toBeInTheDocument();
    });

    it("includes local data message in description", () => {
      render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      const description = screen.getByText(/this page needs attention\. app data stays on this device/i);
      expect(description).toBeInTheDocument();
    });

    it("does not render children after error", () => {
      render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.queryByText("Page content working")).not.toBeInTheDocument();
    });
  });

  describe("development mode", () => {
    it("shows support details in dev mode", () => {
      // Mock dev environment
      vi.stubEnv("DEV", true);

      render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.getByText(/support details/i)).toBeInTheDocument();

      vi.unstubAllEnvs();
    });

    it("support details are in a collapsible section", () => {
      vi.stubEnv("DEV", true);

      const { container } = render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      const details = container.querySelector("details");
      expect(details).toBeInTheDocument();

      const summary = details?.querySelector("summary");
      expect(summary).toBeInTheDocument();
      expect(summary).toHaveTextContent(/support details/i);

      vi.unstubAllEnvs();
    });

    it("shows error stack in support details", () => {
      vi.stubEnv("DEV", true);

      const { container } = render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      const pre = container.querySelector("pre");
      expect(pre).toBeInTheDocument();

      vi.unstubAllEnvs();
    });
  });

  describe("button variants", () => {
    it("Go Back button uses secondary variant", () => {
      const onBackMock = vi.fn();

      render(
        <PageErrorBoundary onBack={onBackMock}>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      const goBackButton = screen.getByRole("button", { name: /go back/i });
      expect(goBackButton).toHaveAttribute("data-variant", "secondary");
    });

    it("Try Again button uses default variant", () => {
      render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      const tryAgainButton = screen.getByRole("button", { name: /try again/i });
      // Default variant means no variant attribute
      expect(tryAgainButton).not.toHaveAttribute("data-variant");
    });
  });

  describe("layout", () => {
    it("applies proper container styling", () => {
      const { container } = render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      const outerDiv = container.firstChild;
      expect(outerDiv).toHaveClass("min-h-[60vh]", "flex", "items-center", "justify-center");
    });

    it("constrains content width", () => {
      const { container } = render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      const innerDiv = container.querySelector(".max-w-md");
      expect(innerDiv).toBeInTheDocument();
    });

    it("buttons are in a flex container with proper gap", () => {
      const onBackMock = vi.fn();

      const { container } = render(
        <PageErrorBoundary onBack={onBackMock}>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      const buttonContainer = container.querySelector(".flex.gap-3");
      expect(buttonContainer).toBeInTheDocument();
    });
  });
});
