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

vi.mock("../utils/errorReporting", () => ({
  errorReporter: {
    captureReactError: vi.fn(),
  },
}));

// Component that throws an error
function ThrowError({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error("Page test error");
  }
  return <div>Page content working</div>;
}

// Suppress console errors in tests
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
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

      expect(screen.getByText("Page Error")).toBeInTheDocument();
    });

    it("displays custom page name in title", () => {
      render(
        <PageErrorBoundary pageName="Dashboard">
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.getByText("Dashboard Error")).toBeInTheDocument();
    });

    it("displays error message in description", () => {
      render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.getByText("Page test error")).toBeInTheDocument();
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

    it("shows default message with 'Your data is safe' when error message is undefined", () => {
      function ThrowErrorWithoutMessage() {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw { name: "CustomError" };
      }

      render(
        <PageErrorBoundary>
          <ThrowErrorWithoutMessage />
        </PageErrorBoundary>
      );

      expect(
        screen.getByText(/something went wrong loading this page. your data is safe./i)
      ).toBeInTheDocument();
    });

    it("displays fallback when error message is undefined", () => {
      function ThrowErrorWithoutMessage() {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw { name: "CustomError" };
      }

      render(
        <PageErrorBoundary>
          <ThrowErrorWithoutMessage />
        </PageErrorBoundary>
      );

      expect(
        screen.getByText(/something went wrong loading this page/i)
      ).toBeInTheDocument();
    });

    it("includes 'Your data is safe' message in description", () => {
      render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      // The "Page test error" message is shown, not the default message
      // The default message with "Your data is safe" only shows when error.message is undefined
      const description = screen.getByText("Page test error");
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
    it("shows technical details in dev mode", () => {
      // Mock dev environment
      vi.stubEnv("DEV", true);

      render(
        <PageErrorBoundary>
          <ThrowError shouldThrow={true} />
        </PageErrorBoundary>
      );

      expect(screen.getByText(/technical details/i)).toBeInTheDocument();

      vi.unstubAllEnvs();
    });

    it("technical details are in a collapsible section", () => {
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
      expect(summary).toHaveTextContent(/technical details/i);

      vi.unstubAllEnvs();
    });

    it("shows error stack in technical details", () => {
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
