import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AsyncButton } from "./AsyncButton";
import { ToastProvider } from "../contexts/ToastContext";

// Helper to render with ToastProvider
const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

describe("AsyncButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("renders button with children", () => {
      const mockOnClick = vi.fn().mockResolvedValue(undefined);
      renderWithToast(<AsyncButton onClick={mockOnClick}>Click Me</AsyncButton>);
      expect(screen.getByText("Click Me")).toBeInTheDocument();
    });

    it("renders with custom variant", () => {
      const mockOnClick = vi.fn().mockResolvedValue(undefined);
      const { container } = renderWithToast(
        <AsyncButton onClick={mockOnClick} variant="danger">
          Delete
        </AsyncButton>
      );
      const button = container.querySelector("button");
      expect(button).toHaveClass("bg-danger");
    });

    it("renders with custom size", () => {
      const mockOnClick = vi.fn().mockResolvedValue(undefined);
      const { container } = renderWithToast(
        <AsyncButton onClick={mockOnClick} size="sm">
          Small
        </AsyncButton>
      );
      const button = container.querySelector("button");
      expect(button).toHaveClass("px-3", "py-1.5");
    });

    it("renders with icon", () => {
      const mockOnClick = vi.fn().mockResolvedValue(undefined);
      const icon = <span data-testid="test-icon">★</span>;
      renderWithToast(
        <AsyncButton onClick={mockOnClick} icon={icon}>
          With Icon
        </AsyncButton>
      );
      expect(screen.getByTestId("test-icon")).toBeInTheDocument();
    });
  });

  describe("async operation handling", () => {
    it("calls onClick when clicked", async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn().mockResolvedValue(undefined);
      renderWithToast(<AsyncButton onClick={mockOnClick}>Click</AsyncButton>);

      await user.click(screen.getByText("Click"));
      await waitFor(() => expect(mockOnClick).toHaveBeenCalledTimes(1));
    });

    it("shows loading state during async operation", async () => {
      const user = userEvent.setup();
      let resolve: () => void;
      const mockOnClick = vi.fn(
        () => new Promise<void>((r) => (resolve = r))
      );

      renderWithToast(<AsyncButton onClick={mockOnClick}>Process</AsyncButton>);

      await user.click(screen.getByText("Process"));

      // Check loading state
      await waitFor(() => {
        const button = screen.getByRole("button");
        expect(button).toBeDisabled();
      });

      // Resolve the promise
      resolve!();
      await waitFor(() => {
        const button = screen.getByRole("button");
        expect(button).not.toBeDisabled();
      });
    });

    it("disables button during async operation", async () => {
      const user = userEvent.setup();
      let resolve: () => void;
      const mockOnClick = vi.fn(
        () => new Promise<void>((r) => (resolve = r))
      );

      renderWithToast(<AsyncButton onClick={mockOnClick}>Submit</AsyncButton>);

      const button = screen.getByRole("button");
      expect(button).not.toBeDisabled();

      await user.click(button);

      await waitFor(() => expect(button).toBeDisabled());

      resolve!();
      await waitFor(() => expect(button).not.toBeDisabled());
    });

    it("respects disabled prop", () => {
      const mockOnClick = vi.fn().mockResolvedValue(undefined);
      renderWithToast(
        <AsyncButton onClick={mockOnClick} disabled>
          Disabled
        </AsyncButton>
      );

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("stays disabled when both loading and disabled prop", async () => {
      const user = userEvent.setup();
      let resolve: () => void;
      const mockOnClick = vi.fn(
        () => new Promise<void>((r) => (resolve = r))
      );

      renderWithToast(
        <AsyncButton onClick={mockOnClick} disabled>
          Process
        </AsyncButton>
      );

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();

      // Even after trying to click (shouldn't work due to disabled)
      await user.click(button);
      expect(button).toBeDisabled();
    });
  });

  describe("success handling", () => {
    it("calls onSuccess callback after successful operation", async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn().mockResolvedValue(undefined);
      const mockOnSuccess = vi.fn();

      renderWithToast(
        <AsyncButton onClick={mockOnClick} onSuccess={mockOnSuccess}>
          Success
        </AsyncButton>
      );

      await user.click(screen.getByText("Success"));
      await waitFor(() => expect(mockOnSuccess).toHaveBeenCalledTimes(1));
    });

    it("shows success toast with custom message", async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn().mockResolvedValue(undefined);

      renderWithToast(
        <AsyncButton
          onClick={mockOnClick}
          successMessage="Operation completed successfully"
        >
          Do It
        </AsyncButton>
      );

      await user.click(screen.getByText("Do It"));
      await waitFor(() => {
        expect(screen.getByText("Operation completed successfully")).toBeInTheDocument();
      });
    });

    it("does not show success toast when showSuccessToast is false", async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn().mockResolvedValue(undefined);

      renderWithToast(
        <AsyncButton
          onClick={mockOnClick}
          successMessage="Success"
          showSuccessToast={false}
        >
          No Toast
        </AsyncButton>
      );

      await user.click(screen.getByText("No Toast"));
      await waitFor(() => expect(mockOnClick).toHaveBeenCalled());

      // Success toast should not appear
      expect(screen.queryByText("Success")).not.toBeInTheDocument();
    });

    it("shows success toast by default when message provided", async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn().mockResolvedValue(undefined);

      renderWithToast(
        <AsyncButton onClick={mockOnClick} successMessage="Done">
          Click
        </AsyncButton>
      );

      await user.click(screen.getByText("Click"));
      await waitFor(() => {
        expect(screen.getByText("Done")).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("calls onError callback when operation fails", async () => {
      const user = userEvent.setup();
      const error = new Error("Test error");
      const mockOnClick = vi.fn().mockRejectedValue(error);
      const mockOnError = vi.fn();

      renderWithToast(
        <AsyncButton onClick={mockOnClick} onError={mockOnError}>
          Fail
        </AsyncButton>
      );

      await user.click(screen.getByText("Fail"));
      await waitFor(() => expect(mockOnError).toHaveBeenCalledWith(error));
    });

    it("shows error toast with custom message", async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn().mockRejectedValue(new Error("Network error"));

      renderWithToast(
        <AsyncButton onClick={mockOnClick} errorMessage="Failed to save">
          Save
        </AsyncButton>
      );

      await user.click(screen.getByText("Save"));
      await waitFor(() => {
        expect(screen.getByText("Failed to save")).toBeInTheDocument();
      });
    });

    it("shows default error message when no custom message", async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn().mockRejectedValue(new Error("Something went wrong"));

      renderWithToast(<AsyncButton onClick={mockOnClick}>Fail</AsyncButton>);

      await user.click(screen.getByText("Fail"));
      await waitFor(() => {
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      });
    });

    it("does not show error toast when showErrorToast is false", async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn().mockRejectedValue(new Error("Error"));
      const mockOnError = vi.fn();

      renderWithToast(
        <AsyncButton
          onClick={mockOnClick}
          showErrorToast={false}
          onError={mockOnError}
        >
          Silent Error
        </AsyncButton>
      );

      await user.click(screen.getByText("Silent Error"));
      await waitFor(() => expect(mockOnError).toHaveBeenCalled());

      // Error toast should not appear
      expect(screen.queryByText("Error")).not.toBeInTheDocument();
    });

    it("re-enables button after error", async () => {
      const user = userEvent.setup();
      // Use a slow promise to ensure we can catch the loading state
      let reject: (error: Error) => void;
      const mockOnClick = vi.fn(
        () =>
          new Promise<void>((_, rej) => {
            reject = rej;
          })
      );

      renderWithToast(
        <AsyncButton onClick={mockOnClick} showErrorToast={false}>
          Retry
        </AsyncButton>
      );

      const button = screen.getByRole("button");

      // Button should start enabled
      expect(button).not.toBeDisabled();

      await user.click(button);

      // Should become disabled during async operation
      await waitFor(() => expect(button).toBeDisabled());

      // Reject the promise to trigger error handling
      reject!(new Error("Test error"));

      // Should re-enable after error is handled
      await waitFor(() => expect(button).not.toBeDisabled());
    });

    it("handles string errors", async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn().mockRejectedValue("String error");

      renderWithToast(<AsyncButton onClick={mockOnClick}>String Error</AsyncButton>);

      await user.click(screen.getByText("String Error"));
      await waitFor(() => {
        expect(screen.getByText("String error")).toBeInTheDocument();
      });
    });

    it("handles unknown error types", async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn().mockRejectedValue({ code: 500 });

      renderWithToast(<AsyncButton onClick={mockOnClick}>Unknown Error</AsyncButton>);

      await user.click(screen.getByText("Unknown Error"));
      await waitFor(() => {
        // Should show some error message
        const errorElements = screen.queryAllByText(/error|failed/i);
        expect(errorElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe("loading text", () => {
    it("shows custom loading text during operation", async () => {
      const user = userEvent.setup();
      let resolve: () => void;
      const mockOnClick = vi.fn(
        () => new Promise<void>((r) => (resolve = r))
      );

      renderWithToast(
        <AsyncButton onClick={mockOnClick} loadingText="Processing...">
          Submit
        </AsyncButton>
      );

      await user.click(screen.getByText("Submit"));

      await waitFor(() => {
        expect(screen.getByText("Processing...")).toBeInTheDocument();
      });

      resolve!();
    });
  });

  describe("edge cases", () => {
    it("prevents multiple concurrent clicks", async () => {
      const user = userEvent.setup();
      let resolve: () => void;
      const mockOnClick = vi.fn(
        () => new Promise<void>((r) => (resolve = r))
      );

      renderWithToast(<AsyncButton onClick={mockOnClick}>Multi Click</AsyncButton>);

      const button = screen.getByText("Multi Click");

      // Click multiple times rapidly
      await user.click(button);
      await user.click(button);
      await user.click(button);

      // Should only call once due to disabled state
      expect(mockOnClick).toHaveBeenCalledTimes(1);

      resolve!();
    });

    it("handles rapid click-resolve-click cycles", async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn().mockResolvedValue(undefined);

      renderWithToast(<AsyncButton onClick={mockOnClick}>Rapid</AsyncButton>);

      const button = screen.getByText("Rapid");

      await user.click(button);
      await waitFor(() => expect(mockOnClick).toHaveBeenCalledTimes(1));

      await user.click(button);
      await waitFor(() => expect(mockOnClick).toHaveBeenCalledTimes(2));
    });

    it("works with empty success message", async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn().mockResolvedValue(undefined);

      renderWithToast(
        <AsyncButton onClick={mockOnClick} successMessage="">
          No Message
        </AsyncButton>
      );

      await user.click(screen.getByText("No Message"));
      await waitFor(() => expect(mockOnClick).toHaveBeenCalled());
    });
  });

  describe("forwardRef", () => {
    it("forwards ref to button element", () => {
      const ref = vi.fn();
      const mockOnClick = vi.fn().mockResolvedValue(undefined);

      renderWithToast(
        <AsyncButton ref={ref} onClick={mockOnClick}>
          Ref Test
        </AsyncButton>
      );

      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe("accessibility", () => {
    it("button is keyboard accessible", async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn().mockResolvedValue(undefined);

      renderWithToast(<AsyncButton onClick={mockOnClick}>Keyboard</AsyncButton>);

      const button = screen.getByText("Keyboard");
      button.focus();

      await user.keyboard("{Enter}");
      await waitFor(() => expect(mockOnClick).toHaveBeenCalled());
    });

    it("maintains proper disabled state for screen readers", async () => {
      const user = userEvent.setup();
      let resolve: () => void;
      const mockOnClick = vi.fn(
        () => new Promise<void>((r) => (resolve = r))
      );

      renderWithToast(<AsyncButton onClick={mockOnClick}>Accessible</AsyncButton>);

      const button = screen.getByRole("button");
      await user.click(button);

      await waitFor(() => expect(button).toHaveAttribute("disabled"));

      resolve!();
      await waitFor(() => expect(button).not.toHaveAttribute("disabled"));
    });
  });
});
