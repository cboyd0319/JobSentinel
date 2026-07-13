import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const mockAnswers = [
  {
    id: 1,
    questionPattern: "years of experience",
    answer: "5 years",
    answerType: "text",
    notes: "Professional experience",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    questionPattern: "relocate",
    answer: "Yes",
    answerType: "yes_no",
    notes: null,
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
  {
    id: 3,
    questionPattern: "cover letter",
    answer: "I am passionate about software development...",
    answerType: "textarea",
    notes: "Cover letter template",
    createdAt: "2024-01-03T00:00:00Z",
    updatedAt: "2024-01-03T00:00:00Z",
  },
];

describe("ScreeningAnswersForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
  });

  describe("answer input handling", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue([]);
    });

    it("allows typing in question wording to look for field", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question wording to look for/i);
      fireEvent.change(patternInput, {
        target: { value: "salary" },
      });

      expect(patternInput).toHaveValue("salary");
    });

    it("shows hard screening guidance when typed question wording needs exact review", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question wording to look for/i);
      fireEvent.change(patternInput, {
        target: { value: "US citizen" },
      });

      expect(screen.getByTestId("hard-screening-answer-guidance")).toHaveTextContent(
        "Use only what is true and backed by your resume or records.",
      );
    });

    it("shows hard screening guidance for auto-insurance wording", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question wording to look for/i);
      fireEvent.change(patternInput, {
        target: { value: "proof of auto insurance" },
      });

      expect(screen.getByTestId("hard-screening-answer-guidance")).toHaveTextContent(
        "Use only what is true and backed by your resume or records.",
      );
    });

    it("allows typing in answer field", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const answerInput = screen.getByLabelText(/your answer/i);
      // Use fireEvent.change for controlled inputs — userEvent.type can drop
      // characters when React re-renders between keystrokes in test environments
      fireEvent.change(answerInput, {
        target: { value: "$100,000 - $120,000" },
      });

      expect(answerInput).toHaveValue("$100,000 - $120,000");
    });

    it("allows typing in notes field", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const notesInput = screen.getByLabelText(/notes/i);
      fireEvent.change(notesInput, { target: { value: "Test notes" } });

      expect(notesInput).toHaveValue("Test notes");
    });

    it("allows changing answer type", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const answerTypeSelect = screen.getByLabelText(/answer type/i);
      await user.selectOptions(answerTypeSelect, "yes_no");

      expect(answerTypeSelect).toHaveValue("yes_no");
    });

    it("switches input type when answer type changes", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      let answerInput = screen.getByLabelText(/your answer/i);
      expect(answerInput.tagName.toLowerCase()).toBe("input");

      const answerTypeSelect = screen.getByLabelText(/answer type/i);
      await user.selectOptions(answerTypeSelect, "textarea");

      await waitFor(() => {
        answerInput = screen.getByLabelText(/your answer/i);
        expect(answerInput.tagName.toLowerCase()).toBe("textarea");
      });
    });
  });

  describe("form validation", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue([]);
    });

    it("shows error when submitting with empty question wording to look for", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const answerInput = screen.getByLabelText(/your answer/i);
      await user.type(answerInput, "Test answer");

      await user.click(screen.getByRole("button", { name: /save answer/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Check highlighted fields",
          "Add the missing details, then save again.",
        );
      });
    });

    it("shows error when submitting with empty answer", async () => {
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

      await user.click(screen.getByRole("button", { name: /save answer/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Check highlighted fields",
          "Add the missing details, then save again.",
        );
      });
    });

    it("validates question text match format", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question wording to look for/i);
      await user.type(patternInput, "   ");
      fireEvent.blur(patternInput);

      await waitFor(() => {
        expect(screen.getByText(/add question wording/i)).toBeInTheDocument();
      });
    });

    it("displays error styling for invalid pattern", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question wording to look for/i);
      await user.type(patternInput, "   ");
      fireEvent.blur(patternInput);

      await waitFor(() => {
        expect(screen.getByText(/add question wording/i)).toBeInTheDocument();
      });
    });

    it("clears error when valid input is entered", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question wording to look for/i);
      await user.type(patternInput, "   ");
      fireEvent.blur(patternInput);

      await waitFor(() => {
        expect(screen.getByText(/add question wording/i)).toBeInTheDocument();
      });

      await user.clear(patternInput);
      await user.type(patternInput, "valid.*pattern");

      await waitFor(() => {
        expect(
          screen.queryByText(/add question wording/i),
        ).not.toBeInTheDocument();
      });
    });

    it("validates on blur", async () => {
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
        expect(screen.getByText("Add answer.")).toBeInTheDocument();
      });
    });
  });

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

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question wording to look for/i);
      const answerInput = screen.getByLabelText(/your answer/i);
      const notesInput = screen.getByLabelText(/notes/i);

      fireEvent.change(patternInput, { target: { value: "testpattern" } });
      fireEvent.change(answerInput, { target: { value: "Testanswer" } });
      fireEvent.change(notesInput, { target: { value: "Testnotes" } });

      await user.click(screen.getByRole("button", { name: /save answer/i }));

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

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question wording to look for/i);
      const answerInput = screen.getByLabelText(/your answer/i);

      fireEvent.change(patternInput, { target: { value: "Security+" } });
      fireEvent.change(answerInput, { target: { value: "Yes" } });

      await user.click(screen.getByRole("button", { name: /save answer/i }));

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

        render(<ScreeningAnswersForm />);

        await waitFor(() => {
          expect(
            screen.getByRole("button", { name: /add answer/i }),
          ).toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: /add answer/i }));

        const patternInput = screen.getByLabelText(/question wording to look for/i);
        const answerInput = screen.getByLabelText(/your answer/i);

        fireEvent.change(patternInput, { target: { value: "  testpattern  " } });
        fireEvent.change(answerInput, { target: { value: "  Testanswer  " } });

        await user.click(screen.getByRole("button", { name: /save answer/i }));

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
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("reloads answers after successful submission", async () => {
      const user = userEvent.setup();
      mockInvoke
        .mockResolvedValueOnce([]) // Initial load
        .mockResolvedValueOnce(undefined) // Upsert
        .mockResolvedValueOnce(mockAnswers); // Reload

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

      render(<ScreeningAnswersForm onSaved={onSaved} />);

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
        expect(onSaved).toHaveBeenCalledTimes(1);
      });
    });

    it("does not call onSaved when not provided", async () => {
      const user = userEvent.setup();
      mockInvoke
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([]);

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

      // Should not throw error
      await user.click(screen.getByRole("button", { name: /save answer/i }));

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
