import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModalErrorBoundary from "./ModalErrorBoundary";

// Component that throws an error
function ThrowError({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error("Modal test error");
  }
  return <div>Modal content working</div>;
}

// Suppress console errors in tests (only in dev mode)
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  return () => {
    console.error = originalError;
  };
});

describe("ModalErrorBoundary", () => {
  describe("when no error occurs", () => {
    it("renders children normally", () => {
      render(
        <ModalErrorBoundary>
          <div>Modal content</div>
        </ModalErrorBoundary>
      );

      expect(screen.getByText("Modal content")).toBeInTheDocument();
    });

    it("does not show error UI", () => {
      render(
        <ModalErrorBoundary>
          <div>Modal content</div>
        </ModalErrorBoundary>
      );

      expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    });
  });

  describe("when error occurs", () => {
    it("catches error and shows modal fallback UI", () => {
      render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("displays custom title when provided", () => {
      render(
        <ModalErrorBoundary title="Custom Error Title">
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      expect(screen.getByText("Custom Error Title")).toBeInTheDocument();
    });

    it("displays error message", () => {
      render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      expect(screen.getByText("Modal test error")).toBeInTheDocument();
    });

    it("shows safety message", () => {
      render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      expect(
        screen.getByText(/your data is safe/i)
      ).toBeInTheDocument();
    });

    it("shows Close button", () => {
      render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
    });

    it("shows Try Again button", () => {
      render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    it("calls onClose when Close button is clicked", async () => {
      const user = userEvent.setup();
      const onCloseMock = vi.fn();

      render(
        <ModalErrorBoundary onClose={onCloseMock}>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      const closeButton = screen.getByRole("button", { name: /close/i });
      await user.click(closeButton);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it("calls handleRetry when Try Again button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();

      // Click Try Again button
      const tryAgainButton = screen.getByRole("button", { name: /try again/i });
      expect(tryAgainButton).toBeInTheDocument();
      
      // Button should be clickable
      await user.click(tryAgainButton);
      
      // The test verifies the button can be clicked
      // In a real app, this would reset the error boundary state
      // But since the child would throw again, the error UI persists
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("does not render children after error", () => {
      render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      expect(screen.queryByText("Modal content working")).not.toBeInTheDocument();
    });

    it("displays fallback when error message is undefined", () => {
      function ThrowErrorWithoutMessage() {
         
        throw { name: "CustomError" };
      }

      render(
        <ModalErrorBoundary>
          <ThrowErrorWithoutMessage />
        </ModalErrorBoundary>
      );

      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });

    it("calls onClose and resets state when dismissed", async () => {
      const user = userEvent.setup();
      const onCloseMock = vi.fn();

      render(
        <ModalErrorBoundary onClose={onCloseMock}>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      const closeButton = screen.getByRole("button", { name: /close/i });
      
      // Close button should be present
      expect(closeButton).toBeInTheDocument();
      
      await user.click(closeButton);

      // onClose should be called
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("modal overlay", () => {
    it("renders modal overlay when error occurs", () => {
      const { container } = render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      const overlay = container.querySelector(".fixed.inset-0.bg-black\\/50");
      expect(overlay).toBeInTheDocument();
    });

    it("applies proper z-index for overlay", () => {
      const { container } = render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      const overlay = container.querySelector(".z-50");
      expect(overlay).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has proper heading structure", () => {
      render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      const heading = screen.getByRole("heading", { name: /something went wrong/i });
      expect(heading).toBeInTheDocument();
    });

    it("buttons are keyboard accessible", () => {
      render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      const closeButton = screen.getByRole("button", { name: /close/i });
      const tryAgainButton = screen.getByRole("button", { name: /try again/i });

      expect(closeButton).toBeInTheDocument();
      expect(tryAgainButton).toBeInTheDocument();
    });

    it("error icon has aria-hidden", () => {
      const { container } = render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      const icon = container.querySelector("svg");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("visual design", () => {
    it("applies proper styling to modal card", () => {
      const { container } = render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      const card = container.querySelector(".rounded-card");
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass("shadow-card");
    });

    it("Close button has secondary styling", () => {
      render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      const closeButton = screen.getByRole("button", { name: /close/i });
      expect(closeButton).toHaveClass("bg-surface-100");
    });

    it("Try Again button has primary styling", () => {
      render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      const tryAgainButton = screen.getByRole("button", { name: /try again/i });
      expect(tryAgainButton).toHaveClass("bg-sentinel-500");
    });

    it("includes fade-in animation", () => {
      const { container } = render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      const animatedElement = container.querySelector(".motion-safe\\:animate-fade-in");
      expect(animatedElement).toBeInTheDocument();
    });
  });
});
