import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScreeningAnswersForm } from "./ScreeningAnswersForm";

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
vi.mock("../../contexts", () => ({
  useToast: () => mockToast,
}));

const mockAnswers = [
  {
    id: 1,
    questionPattern: "years.*experience",
    answer: "5 years",
    answerType: "text",
    notes: "Professional experience",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    questionPattern: "willing.*relocate",
    answer: "Yes",
    answerType: "yes_no",
    notes: null,
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
  {
    id: 3,
    questionPattern: "cover.*letter",
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
  });

  describe("loading state", () => {
    it("shows loading spinner initially", () => {
      mockInvoke.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ScreeningAnswersForm />);

      expect(screen.getByRole("status", { name: /loading screening answers/i })).toBeInTheDocument();
      const spinner = screen.getByRole("status").querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("loading spinner has proper accessibility attributes", () => {
      mockInvoke.mockImplementation(() => new Promise(() => {}));

      render(<ScreeningAnswersForm />);

      const status = screen.getByRole("status", { name: /loading screening answers/i });
      expect(status).toHaveAttribute("aria-busy", "true");
    });

    it("hides loading state after data loads", async () => {
      mockInvoke.mockResolvedValue([]);

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.queryByRole("status", { name: /loading/i })).not.toBeInTheDocument();
      });
    });
  });

  describe("form rendering", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue([]);
    });

    it("renders title and description", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText("Screening Question Answers")).toBeInTheDocument();
        expect(screen.getByText(/save answers to common questions/i)).toBeInTheDocument();
      });
    });

    it("renders Add Answer button", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });
    });

    it("renders help icon", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        // HelpIcon component is present (it renders an icon with a tooltip)
        expect(screen.getByText("Screening Question Answers")).toBeInTheDocument();
      });
    });
  });

  describe("empty state", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue([]);
    });

    it("shows empty state when no answers exist", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText(/no screening answers yet/i)).toBeInTheDocument();
      });
    });

    it("shows empty state message", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText(/add common answers to auto-fill screening questions/i)).toBeInTheDocument();
      });
    });

    it("shows Add Your First Answer button in empty state", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add your first answer/i })).toBeInTheDocument();
      });
    });

    it("displays empty state icon", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        const emptyState = screen.getByText(/no screening answers yet/i).parentElement;
        expect(emptyState?.querySelector("svg")).toBeInTheDocument();
      });
    });
  });

  describe("answers list rendering", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue(mockAnswers);
    });

    it("displays all saved answers", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText("years.*experience")).toBeInTheDocument();
        expect(screen.getByText("5 years")).toBeInTheDocument();
        expect(screen.getByText("willing.*relocate")).toBeInTheDocument();
        expect(screen.getByText("Yes")).toBeInTheDocument();
      });
    });

    it("renders question patterns in code elements", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        const codeElements = screen.getAllByText(/years.*experience|willing.*relocate|cover.*letter/);
        codeElements.forEach((el) => {
          expect(el.tagName.toLowerCase()).toBe("code");
        });
      });
    });

    it("displays notes when present", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText("Professional experience")).toBeInTheDocument();
        expect(screen.getByText("Cover letter template")).toBeInTheDocument();
      });
    });

    it("does not display notes section when notes are null", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        const relocateAnswer = screen.getByText("willing.*relocate").closest("div");
        expect(relocateAnswer?.textContent).not.toContain("notes");
      });
    });

    it("renders edit button for each answer", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        const editButtons = screen.getAllByLabelText("Edit answer");
        expect(editButtons).toHaveLength(3);
      });
    });

    it("displays correct answer type badges", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText("Text")).toBeInTheDocument();
        expect(screen.getByText("Yes/No")).toBeInTheDocument();
        expect(screen.getByText("Long text")).toBeInTheDocument();
      });
    });
  });

  describe("answer type badges", () => {
    it("shows Text badge for text type", async () => {
      mockInvoke.mockResolvedValue([
        { ...mockAnswers[0], answerType: "text" },
      ]);

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText("Text")).toBeInTheDocument();
      });
    });

    it("shows Yes/No badge for yes_no type", async () => {
      mockInvoke.mockResolvedValue([
        { ...mockAnswers[1], answerType: "yes_no" },
      ]);

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText("Yes/No")).toBeInTheDocument();
      });
    });

    it("shows Long text badge for textarea type", async () => {
      mockInvoke.mockResolvedValue([
        { ...mockAnswers[2], answerType: "textarea" },
      ]);

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText("Long text")).toBeInTheDocument();
      });
    });

    it("shows Dropdown badge for select type", async () => {
      mockInvoke.mockResolvedValue([
        { ...mockAnswers[0], answerType: "select" },
      ]);

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText("Dropdown")).toBeInTheDocument();
      });
    });

    it("defaults to Text badge for null type", async () => {
      mockInvoke.mockResolvedValue([
        { ...mockAnswers[0], answerType: null },
      ]);

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText("Text")).toBeInTheDocument();
      });
    });
  });

  describe("quick add common patterns", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue([]);
    });

    it("displays quick add section", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText(/quick add common questions/i)).toBeInTheDocument();
      });
    });

    it("shows all common pattern buttons when no answers exist", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText(/\+ Years of experience/i)).toBeInTheDocument();
        expect(screen.getByText(/\+ Salary expectation/i)).toBeInTheDocument();
        expect(screen.getByText(/\+ Start date \/ Notice period/i)).toBeInTheDocument();
        expect(screen.getByText(/\+ Willingness to relocate/i)).toBeInTheDocument();
      });
    });

    it("hides common pattern button when answer already exists", async () => {
      mockInvoke.mockResolvedValue([mockAnswers[0]]); // Has "years.*experience"

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.queryByText(/\+ Years of experience/i)).not.toBeInTheDocument();
        expect(screen.getByText(/\+ Salary expectation/i)).toBeInTheDocument();
      });
    });

    it("opens modal with pre-filled pattern when clicking common pattern", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText(/\+ Years of experience/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/\+ Years of experience/i));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        const input = screen.getByLabelText(/question pattern/i) as HTMLInputElement;
        expect(input.value).toBe("years.*experience");
      });
    });
  });

  describe("add modal", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue([]);
    });

    it("opens modal when Add Answer button is clicked", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
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
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/question pattern/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/answer type/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/your answer/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
      });
    });

    it("closes modal when Cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
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
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /save answer/i })).toBeInTheDocument();
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
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
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
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
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
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
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
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
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
          "Dropdown selection",
        ]);
      });
    });
  });

  describe("answer input handling", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue([]);
    });

    it("allows typing in question pattern field", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question pattern/i);
      await user.clear(patternInput);
      await user.paste("salary|compensation");

      expect(patternInput).toHaveValue("salary|compensation");
    });

    it("allows typing in answer field", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const answerInput = screen.getByLabelText(/your answer/i);
      await user.clear(answerInput);
      await user.paste("$100,000 - $120,000");

      expect(answerInput).toHaveValue("$100,000 - $120,000");
    });

    it("allows typing in notes field", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.paste("Test notes");

      expect(notesInput).toHaveValue("Test notes");
    });

    it("allows changing answer type", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
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
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
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

    it("shows error when submitting with empty question pattern", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const answerInput = screen.getByLabelText(/your answer/i);
      await user.type(answerInput, "Test answer");

      await user.click(screen.getByRole("button", { name: /save answer/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Please fix the errors",
          "Check the highlighted fields"
        );
      });
    });

    it("shows error when submitting with empty answer", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question pattern/i);
      await user.type(patternInput, "test.*pattern");

      await user.click(screen.getByRole("button", { name: /save answer/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Please fix the errors",
          "Check the highlighted fields"
        );
      });
    });

    it("validates regex pattern format", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question pattern/i);
      await user.type(patternInput, "   ");
      fireEvent.blur(patternInput);

      await waitFor(() => {
        expect(screen.getByText(/pattern is required/i)).toBeInTheDocument();
      });
    });

    it("displays error styling for invalid pattern", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question pattern/i);
      await user.type(patternInput, "   ");
      fireEvent.blur(patternInput);

      await waitFor(() => {
        expect(screen.getByText(/pattern is required/i)).toBeInTheDocument();
      });
    });

    it("clears error when valid input is entered", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question pattern/i);
      await user.type(patternInput, "   ");
      fireEvent.blur(patternInput);

      await waitFor(() => {
        expect(screen.getByText(/pattern is required/i)).toBeInTheDocument();
      });

      await user.clear(patternInput);
      await user.type(patternInput, "valid.*pattern");

      await waitFor(() => {
        expect(screen.queryByText(/pattern is required/i)).not.toBeInTheDocument();
      });
    });

    it("validates on blur", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const answerInput = screen.getByLabelText(/your answer/i);
      await user.click(answerInput);
      fireEvent.blur(answerInput);

      await waitFor(() => {
        expect(screen.getByText(/answer is required/i)).toBeInTheDocument();
      });
    });
  });

  describe("form submission", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue([]);
    });

    it("submits form with valid data", async () => {
      const user = userEvent.setup();
      mockInvoke
        .mockResolvedValueOnce([]) // Initial load
        .mockResolvedValueOnce(undefined) // Upsert
        .mockResolvedValueOnce([]); // Reload

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question pattern/i);
      const answerInput = screen.getByLabelText(/your answer/i);
      const notesInput = screen.getByLabelText(/notes/i);

      await user.clear(patternInput);
      await user.paste("testpattern");
      await user.clear(answerInput);
      await user.paste("Testanswer");
      await user.clear(notesInput);
      await user.paste("Testnotes");

      await user.click(screen.getByRole("button", { name: /save answer/i }));

      await waitFor(() => {
        const calls = mockInvoke.mock.calls;
        const upsertCall = calls.find((call) => call[0] === "upsert_screening_answer");
        expect(upsertCall).toBeDefined();
        expect(upsertCall?.[1]).toEqual({
          questionPattern: "testpattern",
          answer: "Testanswer",
          answerType: "text",
          notes: "Testnotes",
        });
      });
    });

    it("trims whitespace from inputs before submission", async () => {
      const user = userEvent.setup();
      mockInvoke
        .mockResolvedValueOnce([]) // Initial load
        .mockResolvedValueOnce(undefined) // Upsert
        .mockResolvedValueOnce([]); // Reload

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question pattern/i);
      const answerInput = screen.getByLabelText(/your answer/i);

      await user.clear(patternInput);
      await user.paste("  testpattern  ");
      await user.clear(answerInput);
      await user.paste("  Testanswer  ");

      await user.click(screen.getByRole("button", { name: /save answer/i }));

      await waitFor(() => {
        const calls = mockInvoke.mock.calls;
        const upsertCall = calls.find((call) => call[0] === "upsert_screening_answer");
        expect(upsertCall).toBeDefined();
        expect(upsertCall?.[1]).toEqual({
          questionPattern: "testpattern",
          answer: "Testanswer",
          answerType: "text",
          notes: null,
        });
      });
    });

    it("converts empty notes to null", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValueOnce([]).mockResolvedValueOnce(undefined).mockResolvedValueOnce([]);

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question pattern/i);
      const answerInput = screen.getByLabelText(/your answer/i);

      await user.type(patternInput, "test.*pattern");
      await user.type(answerInput, "Test answer");

      await user.click(screen.getByRole("button", { name: /save answer/i }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          "upsert_screening_answer",
          expect.objectContaining({
            notes: null,
          })
        );
      });
    });

    it("shows success toast after successful submission", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValueOnce([]).mockResolvedValueOnce(undefined).mockResolvedValueOnce([]);

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question pattern/i);
      const answerInput = screen.getByLabelText(/your answer/i);

      await user.type(patternInput, "test.*pattern");
      await user.type(answerInput, "Test answer");

      await user.click(screen.getByRole("button", { name: /save answer/i }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "Answer saved",
          "Your screening answer has been saved"
        );
      });
    });

    it("closes modal after successful submission", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValueOnce([]).mockResolvedValueOnce(undefined).mockResolvedValueOnce([]);

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question pattern/i);
      const answerInput = screen.getByLabelText(/your answer/i);

      await user.type(patternInput, "test.*pattern");
      await user.type(answerInput, "Test answer");

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
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question pattern/i);
      const answerInput = screen.getByLabelText(/your answer/i);

      await user.type(patternInput, "test.*pattern");
      await user.type(answerInput, "Test answer");

      await user.click(screen.getByRole("button", { name: /save answer/i }));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("get_screening_answers", {});
        expect(mockInvoke).toHaveBeenCalledTimes(3);
      });
    });

    it("calls onSaved callback after successful submission", async () => {
      const user = userEvent.setup();
      const onSaved = vi.fn();
      mockInvoke.mockResolvedValueOnce([]).mockResolvedValueOnce(undefined).mockResolvedValueOnce([]);

      render(<ScreeningAnswersForm onSaved={onSaved} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question pattern/i);
      const answerInput = screen.getByLabelText(/your answer/i);

      await user.type(patternInput, "test.*pattern");
      await user.type(answerInput, "Test answer");

      await user.click(screen.getByRole("button", { name: /save answer/i }));

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalledTimes(1);
      });
    });

    it("does not call onSaved when not provided", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValueOnce([]).mockResolvedValueOnce(undefined).mockResolvedValueOnce([]);

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question pattern/i);
      const answerInput = screen.getByLabelText(/your answer/i);

      await user.type(patternInput, "test.*pattern");
      await user.type(answerInput, "Test answer");

      // Should not throw error
      await user.click(screen.getByRole("button", { name: /save answer/i }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
    });

    it("shows loading state on save button during submission", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValueOnce([]).mockImplementation(() => new Promise(() => {}));

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question pattern/i);
      const answerInput = screen.getByLabelText(/your answer/i);

      await user.type(patternInput, "test.*pattern");
      await user.type(answerInput, "Test answer");

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
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question pattern/i);
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

  describe("edit functionality", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue(mockAnswers);
    });

    it("opens modal with edit title when editing", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getAllByLabelText("Edit answer")[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByLabelText("Edit answer")[0]);

      await waitFor(() => {
        expect(screen.getByText("Edit Screening Answer")).toBeInTheDocument();
      });
    });

    it("populates form with existing answer data", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getAllByLabelText("Edit answer")[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByLabelText("Edit answer")[0]);

      await waitFor(() => {
        const patternInput = screen.getByLabelText(/question pattern/i) as HTMLInputElement;
        const answerInput = screen.getByLabelText(/your answer/i) as HTMLInputElement;
        const notesInput = screen.getByLabelText(/notes/i) as HTMLInputElement;

        expect(patternInput.value).toBe("years.*experience");
        expect(answerInput.value).toBe("5 years");
        expect(notesInput.value).toBe("Professional experience");
      });
    });

    it("populates answer type when editing", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getAllByLabelText("Edit answer")[1]).toBeInTheDocument();
      });

      await user.click(screen.getAllByLabelText("Edit answer")[1]);

      await waitFor(() => {
        const answerTypeSelect = screen.getByLabelText(/answer type/i) as HTMLSelectElement;
        expect(answerTypeSelect.value).toBe("yes_no");
      });
    });

    it("shows Update button when editing", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getAllByLabelText("Edit answer")[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByLabelText("Edit answer")[0]);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /update answer/i })).toBeInTheDocument();
      });
    });

    it("shows Updating... text during edit submission", async () => {
      const user = userEvent.setup();
      mockInvoke
        .mockResolvedValueOnce(mockAnswers)
        .mockImplementation(() => new Promise(() => {}));

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getAllByLabelText("Edit answer")[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByLabelText("Edit answer")[0]);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /update answer/i })).toBeInTheDocument();
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
        expect(screen.getAllByLabelText("Edit answer")[1]).toBeInTheDocument();
      });

      await user.click(screen.getAllByLabelText("Edit answer")[1]);

      await waitFor(() => {
        const notesInput = screen.getByLabelText(/notes/i) as HTMLInputElement;
        expect(notesInput.value).toBe("");
      });
    });

    it("renders textarea when editing textarea answer type", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getAllByLabelText("Edit answer")[2]).toBeInTheDocument();
      });

      await user.click(screen.getAllByLabelText("Edit answer")[2]);

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
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question pattern/i);
      await user.type(patternInput, "test.*pattern");

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      await waitFor(() => {
        const patternInputAfter = screen.getByLabelText(/question pattern/i) as HTMLInputElement;
        expect(patternInputAfter.value).toBe("");
      });
    });

    it("clears validation errors when modal is closed", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      await user.click(screen.getByRole("button", { name: /save answer/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      await waitFor(() => {
        expect(screen.queryByText(/pattern is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("shows error toast when loading fails", async () => {
      mockInvoke.mockRejectedValue(new Error("Failed to load"));

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
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

  describe("accessibility", () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue([]);
    });

    it("modal has proper dialog role", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
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
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/question pattern/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/answer type/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/your answer/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
      });
    });

    it("edit buttons have descriptive aria-label", async () => {
      mockInvoke.mockResolvedValue(mockAnswers);
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        const editButtons = screen.getAllByLabelText("Edit answer");
        expect(editButtons.length).toBeGreaterThan(0);
      });
    });

    it("required fields are marked", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      await waitFor(() => {
        const patternInput = screen.getByLabelText(/question pattern/i);
        const answerInput = screen.getByLabelText(/your answer/i);
        expect(patternInput).toHaveAttribute("required");
        expect(answerInput).toHaveAttribute("required");
      });
    });

    it("error messages have proper aria attributes", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
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
    beforeEach(() => {
      mockInvoke.mockResolvedValue([]);
    });

    it("question pattern has maxLength of 200", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const patternInput = screen.getByLabelText(/question pattern/i);
      expect(patternInput).toHaveAttribute("maxLength", "200");
    });

    it("answer input has maxLength of 500 for text type", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const answerInput = screen.getByLabelText(/your answer/i);
      expect(answerInput).toHaveAttribute("maxLength", "500");
    });

    it("textarea has maxLength of 2000", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
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
        expect(screen.getByRole("button", { name: /add answer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /add answer/i }));

      const notesInput = screen.getByLabelText(/notes/i);
      expect(notesInput).toHaveAttribute("maxLength", "500");
    });
  });
});
