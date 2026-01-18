import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBoundary from "./ErrorBoundary";

// Mock error reporter
vi.mock("../utils/errorReporting", () => ({
  errorReporter: {
    captureReactError: vi.fn(),
  },
}));

// Component that throws an error
function ThrowError({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div>Working component</div>;
}

// Suppress console errors in tests
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
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

      expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    });
  });

  describe("when error occurs", () => {
    it("catches error and shows fallback UI", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("displays error message", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText("Test error message")).toBeInTheDocument();
    });

    it("shows reload button", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(
        screen.getByRole("button", { name: /reload application/i })
      ).toBeInTheDocument();
    });

    it("shows safety message", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(
        screen.getByText(/your data is safe/i)
      ).toBeInTheDocument();
    });

    it("reloads window when reload button is clicked", async () => {
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
        name: /reload application/i,
      });
      await user.click(reloadButton);

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
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw { name: "CustomError" };
      }

      render(
        <ErrorBoundary>
          <ThrowErrorWithoutMessage />
        </ErrorBoundary>
      );

      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has proper heading structure", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const heading = screen.getByRole("heading", { name: /something went wrong/i });
      expect(heading).toBeInTheDocument();
    });

    it("button is keyboard accessible", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const button = screen.getByRole("button", { name: /reload application/i });
      expect(button).toHaveClass("focus:ring-2");
    });

    it("error icon has aria-hidden", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const icon = screen.getByRole("button").parentElement?.querySelector("svg");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("visual design", () => {
    it("applies proper styling classes", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const heading = screen.getByRole("heading", { name: /something went wrong/i });
      expect(heading).toHaveClass("font-display", "text-display-lg");
    });

    it("reload button has proper styling", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const button = screen.getByRole("button", { name: /reload application/i });
      expect(button).toHaveClass("bg-sentinel-500", "hover:bg-sentinel-600");
    });
  });
});
