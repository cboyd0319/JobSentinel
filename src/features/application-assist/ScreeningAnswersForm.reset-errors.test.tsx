import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScreeningAnswersForm } from "./ScreeningAnswersForm";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};
vi.mock("../../shared/toast/useToast", () => ({
  useToast: () => mockToast,
}));

describe("ScreeningAnswersForm reset and errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
  });

  describe("form reset", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue([]);
    });

    it("resets form when modal is closed", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question wording to look for/i);
      await user.type(patternInput, "test.*pattern");

      await user.click(screen.getByRole("button", { name: /cancel/i }));
      await user.click(screen.getByRole("button", { name: /add answer/i }));

      await waitFor(() => {
        const patternInputAfter = screen.getByLabelText(
          /question wording to look for/i,
        ) as HTMLInputElement;
        expect(patternInputAfter.value).toBe("");
      });
    });

    it("clears validation errors when modal is closed", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));
      await user.click(screen.getByRole("button", { name: /save answer/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });

      await user.click(screen.getByRole("button", { name: /cancel/i }));
      await user.click(screen.getByRole("button", { name: /add answer/i }));

      await waitFor(() => {
        expect(
          screen.queryByText(/add question wording/i),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("shows error toast when loading fails", async () => {
      mockInvoke.mockRejectedValue(new Error("Failed to load"));

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Could not load saved answers",
          "Try again. If it keeps happening, copy a safe support report.",
        );
      });
    });

    it("calls toast error when loading fails", async () => {
      mockInvoke.mockRejectedValue(new Error("Failed to load"));

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledTimes(1);
      });
    });
  });
});
