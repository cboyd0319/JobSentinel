import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScreeningAnswersForm } from "./ScreeningAnswersForm";
import { mockAnswers } from "./ScreeningAnswersForm.testData";

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

describe("ScreeningAnswersForm form contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue([]);
  });

  describe("accessibility", () => {
    it("modal has proper dialog role", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("form fields have proper labels", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/question wording to look for/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/answer type/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/your answer/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
      });
    });

    it("edit buttons have descriptive aria-label", async () => {
      mockInvoke.mockResolvedValue(mockAnswers);
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        const editButtons = screen.getAllByLabelText(/Edit answer/);
        expect(editButtons.length).toBeGreaterThan(0);
      });
    });

    it("required fields are marked", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      await waitFor(() => {
        const patternInput = screen.getByLabelText(/question wording to look for/i);
        const answerInput = screen.getByLabelText(/your answer/i);
        expect(patternInput).toHaveAttribute("required");
        expect(answerInput).toHaveAttribute("required");
      });
    });

    it("error messages have proper aria attributes", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const answerInput = screen.getByLabelText(/your answer/i);
      await user.click(answerInput);
      fireEvent.blur(answerInput);

      await waitFor(() => {
        expect(answerInput).toHaveAttribute("aria-invalid", "true");
      });
    });
  });

  describe("maxLength attributes", () => {
    it("question wording to look for has maxLength of 200", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question wording to look for/i);
      expect(patternInput).toHaveAttribute("maxLength", "200");
    });

    it("answer input has maxLength of 500 for text type", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const answerInput = screen.getByLabelText(/your answer/i);
      expect(answerInput).toHaveAttribute("maxLength", "500");
    });

    it("textarea has maxLength of 2000", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const answerTypeSelect = screen.getByLabelText(/answer type/i);
      await user.selectOptions(answerTypeSelect, "textarea");

      await waitFor(() => {
        const answerInput = screen.getByLabelText(/your answer/i);
        expect(answerInput).toHaveAttribute("maxLength", "2000");
      });
    });

    it("notes field has maxLength of 500", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const notesInput = screen.getByLabelText(/notes/i);
      expect(notesInput).toHaveAttribute("maxLength", "500");
    });
  });
});
