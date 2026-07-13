import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScreeningAnswersForm } from "./ScreeningAnswersForm";
import { mockAnswers } from "./ScreeningAnswersForm.testData";

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock useToast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};
vi.mock("../../shared/toast/useToast", () => ({
  useToast: () => mockToast,
}));

describe("ScreeningAnswersForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
  });
  describe("add modal", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue([]);
    });

    it("opens modal when Add Answer button is clicked", async () => {
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
        expect(screen.getByText("Add Screening Answer")).toBeInTheDocument();
      });
    });

    it("renders all form fields in modal", async () => {
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

    it("explains that symbols are matched as normal text", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      expect(
        screen.getByText(/symbols count as normal text/i),
      ).toBeInTheDocument();
    });

    it("closes modal when Cancel button is clicked", async () => {
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

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("renders Save Answer button", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /save answer/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe("form field types", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue([]);
    });

    it("renders text input for answer when type is text", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      await waitFor(() => {
        const answerInput = screen.getByLabelText(/your answer/i);
        expect(answerInput.tagName.toLowerCase()).toBe("input");
      });
    });

    it("renders textarea for answer when type is textarea", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      // Change answer type to textarea
      const answerTypeSelect = screen.getByLabelText(/answer type/i);
      await user.selectOptions(answerTypeSelect, "textarea");

      await waitFor(() => {
        const answerInput = screen.getByLabelText(/your answer/i);
        expect(answerInput.tagName.toLowerCase()).toBe("textarea");
      });
    });

    it("textarea has correct rows attribute", async () => {
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
        expect(answerInput).toHaveAttribute("rows", "4");
      });
    });

    it("shows all answer type options", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      await waitFor(() => {
        const select = screen.getByLabelText(/answer type/i);
        const options = Array.from(select.querySelectorAll("option"));
        expect(options).toHaveLength(4);
        expect(options.map((o) => o.textContent)).toEqual([
          "Text input",
          "Yes/No",
          "Long text / Paragraph",
          "Menu choice",
        ]);
      });
    });
  });

  describe("edit functionality", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue(mockAnswers);
    });

    it("opens modal with edit title when editing", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getAllByLabelText(/Edit answer/)[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByLabelText(/Edit answer/)[0]);

      await waitFor(() => {
        expect(screen.getByText("Edit Screening Answer")).toBeInTheDocument();
      });
    });

    it("populates form with existing answer data", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getAllByLabelText(/Edit answer/)[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByLabelText(/Edit answer/)[0]);

      await waitFor(() => {
        const patternInput = screen.getByLabelText(
          /question wording to look for/i,
        ) as HTMLInputElement;
        const answerInput = screen.getByLabelText(
          /your answer/i,
        ) as HTMLInputElement;
        const notesInput = screen.getByLabelText(/notes/i) as HTMLInputElement;

        expect(patternInput.value).toBe("years of experience");
        expect(answerInput.value).toBe("5 years");
        expect(notesInput.value).toBe("Professional experience");
      });
    });

    it("opens legacy defaults with editable plain wording", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue([
        {
          id: 4,
          questionPattern: "(?i)18.*years.*age",
          answer: "Yes",
          answerType: "yes_no",
          notes: "Age requirement",
          createdAt: "2024-01-04T00:00:00Z",
          updatedAt: "2024-01-04T00:00:00Z",
        },
      ]);
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Edit answer/)).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText(/Edit answer/));

      await waitFor(() => {
        expect(screen.getByLabelText(/question wording to look for/i)).toHaveValue(
          "18 years of age",
        );
      });
      expect(screen.queryByDisplayValue(/\(\?i\)/)).not.toBeInTheDocument();
    });

    it("updates legacy aliases without creating a new saved answer", async () => {
      const user = userEvent.setup();
      const legacyAnswer = {
        id: 6,
        questionPattern: "work authorized",
        answer: "Yes",
        answerType: "yes_no",
        notes: "US work authorization",
        createdAt: "2024-01-06T00:00:00Z",
        updatedAt: "2024-01-06T00:00:00Z",
      };
      mockInvoke
        .mockResolvedValueOnce([legacyAnswer])
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([{ ...legacyAnswer, answer: "No" }]);

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Edit answer/)).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText(/Edit answer/));
      await waitFor(() => {
        expect(screen.getByLabelText(/question wording to look for/i)).toHaveValue(
          "work authorization",
        );
      });

      const answerInput = screen.getByLabelText(/your answer/i);
      fireEvent.change(answerInput, { target: { value: "No" } });
      await waitFor(() => {
        expect(answerInput).toHaveValue("No");
      });
      const updateButton = screen.getByRole("button", { name: /update answer/i });
      await waitFor(() => {
        expect(updateButton).toBeEnabled();
      });
      await user.click(updateButton);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          "upsert_screening_answer",
          expect.objectContaining({
            questionPattern: "work authorized",
            answer: "No",
          }),
        );
      });
    });

    it("populates answer type when editing", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getAllByLabelText(/Edit answer/)[1]).toBeInTheDocument();
      });

      await user.click(screen.getAllByLabelText(/Edit answer/)[1]);

      await waitFor(() => {
        const answerTypeSelect = screen.getByLabelText(
          /answer type/i,
        ) as HTMLSelectElement;
        expect(answerTypeSelect.value).toBe("yes_no");
      });
    });

    it("shows Update button when editing", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getAllByLabelText(/Edit answer/)[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByLabelText(/Edit answer/)[0]);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /update answer/i }),
        ).toBeInTheDocument();
      });
    });

    it("shows Updating... text during edit submission", async () => {
      const user = userEvent.setup();
      mockInvoke
        .mockResolvedValueOnce(mockAnswers)
        .mockImplementation(() => new Promise(() => {}));

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getAllByLabelText(/Edit answer/)[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByLabelText(/Edit answer/)[0]);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /update answer/i }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /update answer/i }));

      await waitFor(() => {
        expect(screen.getByText(/updating\.\.\./i)).toBeInTheDocument();
      });
    });

    it("handles null notes when editing", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getAllByLabelText(/Edit answer/)[1]).toBeInTheDocument();
      });

      await user.click(screen.getAllByLabelText(/Edit answer/)[1]);

      await waitFor(() => {
        const notesInput = screen.getByLabelText(/notes/i) as HTMLInputElement;
        expect(notesInput.value).toBe("");
      });
    });

    it("renders textarea when editing textarea answer type", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getAllByLabelText(/Edit answer/)[2]).toBeInTheDocument();
      });

      await user.click(screen.getAllByLabelText(/Edit answer/)[2]);

      await waitFor(() => {
        const answerInput = screen.getByLabelText(/your answer/i);
        expect(answerInput.tagName.toLowerCase()).toBe("textarea");
      });
    });
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
      const error = new Error("Failed to load");
      mockInvoke.mockRejectedValue(error);

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledTimes(1);
      });
    });
  });
});
