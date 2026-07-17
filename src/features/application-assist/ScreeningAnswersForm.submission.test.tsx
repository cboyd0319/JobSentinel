import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  mockInvoke,
  mockToast,
  openAndSubmitAnswer,
  resetScreeningAnswerMocks,
} from "./ScreeningAnswersForm.testSupport";
import { ScreeningAnswersForm } from "./ScreeningAnswersForm";
import { mockAnswers } from "./ScreeningAnswersForm.testData";

describe("ScreeningAnswersForm", () => {
  beforeEach(resetScreeningAnswerMocks);

  describe("form submission", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue([]);
    });

    it("submits form with valid data", { timeout: 10000 }, async () => {
      const user = userEvent.setup();
      mockInvoke
        .mockResolvedValueOnce([]) // Initial load
        .mockResolvedValueOnce(undefined) // Upsert
        .mockResolvedValueOnce([]); // Reload

      await openAndSubmitAnswer(user, {
        pattern: "testpattern",
        answer: "Testanswer",
        notes: "Testnotes",
      });

      await waitFor(() => {
        const calls = mockInvoke.mock.calls;
        const upsertCall = calls.find(
          (call) => call[0] === "upsert_screening_answer",
        );
        expect(upsertCall).toBeDefined();
        expect(upsertCall?.[1]).toEqual({
          questionPattern: "testpattern",
          answer: "Testanswer",
          answerType: "text",
          notes: "Testnotes",
        });
      });
    });

    it("submits question wording with symbols as literal text", { timeout: 10000 }, async () => {
      const user = userEvent.setup();
      mockInvoke
        .mockResolvedValueOnce([]) // Initial load
        .mockResolvedValueOnce(undefined) // Upsert
        .mockResolvedValueOnce([]); // Reload

      await openAndSubmitAnswer(user, {
        pattern: "Security+",
        answer: "Yes",
      });

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          "upsert_screening_answer",
          expect.objectContaining({
            questionPattern: "Security+",
            answer: "Yes",
          }),
        );
      });
    });

    it(
      "trims whitespace from inputs before submission",
      { timeout: 10000 },
      async () => {
        const user = userEvent.setup();
        mockInvoke
          .mockResolvedValueOnce([]) // Initial load
          .mockResolvedValueOnce(undefined) // Upsert
          .mockResolvedValueOnce([]); // Reload

        await openAndSubmitAnswer(user, {
          pattern: "  testpattern  ",
          answer: "  Testanswer  ",
        });

        await waitFor(() => {
          const calls = mockInvoke.mock.calls;
          const upsertCall = calls.find(
            (call) => call[0] === "upsert_screening_answer",
          );
          expect(upsertCall).toBeDefined();
          expect(upsertCall?.[1]).toEqual({
            questionPattern: "testpattern",
            answer: "Testanswer",
            answerType: "text",
            notes: null,
          });
        });
      },
    );

    it("converts empty notes to null", async () => {
      const user = userEvent.setup();
      mockInvoke
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([]);

      await openAndSubmitAnswer(user);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          "upsert_screening_answer",
          expect.objectContaining({
            notes: null,
          }),
        );
      });
    });

    it("shows success toast after successful submission", async () => {
      const user = userEvent.setup();
      mockInvoke
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([]);

      await openAndSubmitAnswer(user);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "Answer saved",
          "Your screening answer has been saved",
        );
      });
    });

    it("closes modal after successful submission", async () => {
      const user = userEvent.setup();
      mockInvoke
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([]);

      await openAndSubmitAnswer(user);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("reloads answers after successful submission", async () => {
      const user = userEvent.setup();
      mockInvoke
        .mockResolvedValueOnce([]) // Initial load
        .mockResolvedValueOnce(undefined) // Upsert
        .mockResolvedValueOnce(mockAnswers); // Reload

      await openAndSubmitAnswer(user);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("get_screening_answers", {});
        expect(mockInvoke).toHaveBeenCalledTimes(3);
      });
    });

    it("calls onSaved callback after successful submission", async () => {
      const user = userEvent.setup();
      const onSaved = vi.fn();
      mockInvoke
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([]);

      await openAndSubmitAnswer(user, { onSaved });

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalledTimes(1);
      });
    });

    it("does not call onSaved when not provided", async () => {
      const user = userEvent.setup();
      mockInvoke
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([]);

      await openAndSubmitAnswer(user);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
    });

    it("shows loading state on save button during submission", async () => {
      const user = userEvent.setup();
      mockInvoke
        .mockResolvedValueOnce([])
        .mockImplementation(() => new Promise(() => {}));

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question wording to look for/i);
      const answerInput = screen.getByLabelText(/your answer/i);

      fireEvent.change(patternInput, { target: { value: "test.*pattern" } });
      fireEvent.change(answerInput, { target: { value: "Test answer" } });

      await user.click(screen.getByRole("button", { name: /save answer/i }));

      await waitFor(() => {
        expect(screen.getByText(/saving\.\.\./i)).toBeInTheDocument();
      });
    });

    it("handles submission error gracefully", async () => {
      const user = userEvent.setup();
      mockInvoke
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error("Network error"));

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question wording to look for/i);
      const answerInput = screen.getByLabelText(/your answer/i);

      await user.type(patternInput, "test.*pattern");
      await user.type(answerInput, "Test answer");

      await user.click(screen.getByRole("button", { name: /save answer/i }));

      await waitFor(() => {
        // Modal should remain open on error
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });
  });

});
