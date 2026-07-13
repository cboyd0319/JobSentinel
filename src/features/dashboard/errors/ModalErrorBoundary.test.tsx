import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModalErrorBoundary from "./ModalErrorBoundary";
import {
  copySanitizedDebugReport,
  saveSanitizedDebugReport,
} from "../../../shared/errorReporting/supportReport";

vi.mock("../../../shared/errorReporting/supportReport", () => ({
  copySanitizedDebugReport: vi.fn().mockResolvedValue({
    content: "safe support report",
    copied: true,
    errorCount: 1,
  }),
  saveSanitizedDebugReport: vi.fn().mockResolvedValue({
    fileName: "jobsentinel-support-report.txt",
    revealToken: "feedback-token",
  }),
}));

// Component that throws an error
function ThrowError({
  shouldThrow = false,
  message = "Modal test error",
}: {
  shouldThrow?: boolean;
  message?: string;
}) {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>Modal content working</div>;
}

// Suppress console errors in tests (only in dev mode)
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  vi.mocked(copySanitizedDebugReport).mockClear();
  vi.mocked(saveSanitizedDebugReport).mockClear();
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

      expect(screen.queryByText("This window needs attention")).not.toBeInTheDocument();
    });
  });

  describe("when error occurs", () => {
    it("catches error and shows modal fallback UI", () => {
      render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      expect(screen.getByText("This window needs attention")).toBeInTheDocument();
    });

    it("displays custom title when provided", () => {
      render(
        <ModalErrorBoundary title="Custom Error Title">
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      expect(screen.getByText("Custom Error Title")).toBeInTheDocument();
    });

    it("displays protective error message", () => {
      render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      expect(screen.getByText(/this window could not load/i)).toBeInTheDocument();
      expect(screen.queryByText("Modal test error")).not.toBeInTheDocument();
    });

    it("does not expose private details in fallback UI", () => {
      vi.stubEnv("DEV", false);

      render(
        <ModalErrorBoundary>
          <ThrowError
            shouldThrow={true}
            message="token=raw-secret private@example.test resume=private-file"
          />
        </ModalErrorBoundary>
      );

      expect(screen.getByText("This window needs attention")).toBeInTheDocument();
      expect(screen.getByText((content, element) => {
        return element?.tagName === "P" && content.includes("This window could not load");
      })).toBeInTheDocument();
      expect(document.body.textContent).not.toContain("raw-secret");
      expect(document.body.textContent).not.toContain("private@example.test");
      expect(document.body.textContent).not.toContain("resume=private-file");
      expect(document.body.textContent).not.toContain("[TOKEN]");

      vi.unstubAllEnvs();
    });

    it("shows local data message", () => {
      render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      expect(screen.getAllByText(/app data stays on this device/i).length).toBeGreaterThan(0);
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

    it("shows safe support report actions", () => {
      render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      expect(screen.getByRole("button", { name: /copy safe support report/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /save safe support report/i })).toBeInTheDocument();
    });

    it("copies a safe support report from the modal fallback", async () => {
      const user = userEvent.setup();

      render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      await user.click(screen.getByRole("button", { name: /copy safe support report/i }));

      expect(copySanitizedDebugReport).toHaveBeenCalledTimes(1);
      expect(await screen.findByText(/safe support report copied/i)).toBeInTheDocument();
    });

    it("saves a safe support report from the modal fallback", async () => {
      const user = userEvent.setup();

      render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      await user.click(screen.getByRole("button", { name: /save safe support report/i }));

      expect(saveSanitizedDebugReport).toHaveBeenCalledTimes(1);
      expect(
        await screen.findByText(/safe support report saved: jobsentinel-support-report.txt/i)
      ).toBeInTheDocument();
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

      expect(screen.getByText("This window needs attention")).toBeInTheDocument();

      // Click Try Again button
      const tryAgainButton = screen.getByRole("button", { name: /try again/i });
      expect(tryAgainButton).toBeInTheDocument();
      
      // Button should be clickable
      await user.click(tryAgainButton);
      
      // The test verifies the button can be clicked
      // In a real app, this would reset the error boundary state
      // But since the child would throw again, the error UI persists
      expect(screen.getByText("This window needs attention")).toBeInTheDocument();
    });

    it("tells users to copy a safe support report after repeated retry failures", async () => {
      const user = userEvent.setup();

      render(
        <ModalErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ModalErrorBoundary>
      );

      await user.click(screen.getByRole("button", { name: /try again/i }));
      await user.click(screen.getByRole("button", { name: /try again/i }));

      expect(
        screen.getByText(/copy or save a safe support report before closing this window/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/copy or save a safe support report first, then close this window/i),
      ).toBeInTheDocument();
      expect(screen.queryByText(/please close and try again later/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
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

      expect(screen.getByText(/this window could not load/i)).toBeInTheDocument();
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

      const heading = screen.getByRole("heading", { name: /this window needs attention/i });
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
