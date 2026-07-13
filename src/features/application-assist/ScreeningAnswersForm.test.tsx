import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

  describe("loading state", () => {
    it("shows loading spinner initially", () => {
      mockInvoke.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ScreeningAnswersForm />);

      expect(
        screen.getByRole("status", { name: /loading screening answers/i }),
      ).toBeInTheDocument();
      const spinner = screen.getByRole("status").querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("loading spinner has proper accessibility attributes", () => {
      mockInvoke.mockImplementation(() => new Promise(() => {}));

      render(<ScreeningAnswersForm />);

      const status = screen.getByRole("status", {
        name: /loading screening answers/i,
      });
      expect(status).toHaveAttribute("aria-busy", "true");
    });

    it("hides loading state after data loads", async () => {
      mockInvoke.mockResolvedValue([]);

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.queryByRole("status", { name: /loading/i }),
        ).not.toBeInTheDocument();
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
        expect(
          screen.getByText("Screening Question Answers"),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/save answers to common questions/i),
        ).toBeInTheDocument();
      });
    });

    it("renders Add Answer button", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add answer/i }),
        ).toBeInTheDocument();
      });
    });

    it("renders help icon", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        // HelpIcon component is present (it renders an icon with a tooltip)
        expect(
          screen.getByText("Screening Question Answers"),
        ).toBeInTheDocument();
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
        expect(
          screen.getByText(/no screening answers yet/i),
        ).toBeInTheDocument();
      });
    });

    it("shows empty state message", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByText(
            /add common answers to prepare screening questions/i,
          ),
        ).toBeInTheDocument();
      });
    });

    it("shows Add Your First Answer button in empty state", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add your first answer/i }),
        ).toBeInTheDocument();
      });
    });

    it("displays empty state icon", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        const emptyState = screen.getByText(
          /no screening answers yet/i,
        ).parentElement;
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
        expect(screen.getByText("Looks for: Years of experience")).toBeInTheDocument();
        expect(screen.getByText("5 years")).toBeInTheDocument();
        expect(screen.getByText("Looks for: Willingness to relocate")).toBeInTheDocument();
        expect(screen.getByText("Yes")).toBeInTheDocument();
      });
    });

    it("renders question match text as plain labels", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        const matchLabels = screen.getAllByText(/Looks for:/);
        matchLabels.forEach((el) => {
          expect(el.tagName.toLowerCase()).not.toBe("code");
        });
      });
    });

    it("hides legacy regex defaults behind plain labels", async () => {
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
        {
          id: 5,
          questionPattern: "(?i)authorized.*work.*(united states|us|usa)",
          answer: "Yes",
          answerType: "yes_no",
          notes: "US work authorization",
          createdAt: "2024-01-05T00:00:00Z",
          updatedAt: "2024-01-05T00:00:00Z",
        },
      ]);

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText("Looks for: Age requirement")).toBeInTheDocument();
        expect(screen.getByText("Looks for: Work authorization")).toBeInTheDocument();
      });
      expect(screen.queryByText(/\(\?i\)/)).not.toBeInTheDocument();
    });

    it("hides custom matcher syntax behind a plain fallback label", async () => {
      mockInvoke.mockResolvedValue([
        {
          id: 10,
          questionPattern: "salary|compensation",
          answer: "Open to discussion",
          answerType: "text",
          notes: "Compensation",
          createdAt: "2024-01-10T00:00:00Z",
          updatedAt: "2024-01-10T00:00:00Z",
        },
        {
          id: 11,
          questionPattern: "^\\bremote\\b.+preference$",
          answer: "Remote preferred",
          answerType: "text",
          notes: "Remote preference",
          createdAt: "2024-01-11T00:00:00Z",
          updatedAt: "2024-01-11T00:00:00Z",
        },
      ]);

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.getAllByText("Looks for: Custom screening question"),
        ).toHaveLength(2);
      });
      expect(screen.queryByText(/salary\|compensation/)).not.toBeInTheDocument();
      expect(screen.queryByText(/\^\\bremote/)).not.toBeInTheDocument();
    });

    it("uses plain labels for older saved wording aliases", async () => {
      mockInvoke.mockResolvedValue([
        {
          id: 6,
          questionPattern: "work authorized",
          answer: "Yes",
          answerType: "yes_no",
          notes: "US work authorization",
          createdAt: "2024-01-06T00:00:00Z",
          updatedAt: "2024-01-06T00:00:00Z",
        },
      ]);

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText("Looks for: Work authorization")).toBeInTheDocument();
      });
      expect(screen.queryByText("Looks for: work authorized")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /\+ work authorization/i })).not.toBeInTheDocument();
    });

    it("does not quick-add a duplicate when a legacy default already exists", async () => {
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
        expect(screen.getByText("Looks for: Age requirement")).toBeInTheDocument();
      });
      expect(screen.queryByRole("button", { name: /\+ age requirement/i })).not.toBeInTheDocument();
    });

    it("uses plain labels for answer learning state", async () => {
      mockInvoke.mockResolvedValue([
        {
          ...mockAnswers[0],
          confidenceScore: 0.82,
          timesUsed: 4,
          timesModified: 3,
        },
        {
          ...mockAnswers[1],
          confidenceScore: 0.55,
          timesUsed: 4,
          timesModified: 1,
        },
      ]);

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText("Usually matches")).toBeInTheDocument();
        expect(screen.getByText("Review before using")).toBeInTheDocument();
        expect(screen.getByText("Often edited")).toBeInTheDocument();
        expect(screen.getByText("Sometimes edited")).toBeInTheDocument();
      });

      expect(screen.queryByText(/% confident/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Modified .*%/i)).not.toBeInTheDocument();
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
        const relocateAnswer = screen
          .getByText("Looks for: Willingness to relocate")
          .closest("div");
        expect(relocateAnswer?.textContent).not.toContain("notes");
      });
    });

    it("renders edit button for each answer", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        const editButtons = screen.getAllByLabelText(/Edit answer/);
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
      mockInvoke.mockResolvedValue([{ ...mockAnswers[0], answerType: "text" }]);

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

    it("shows menu-choice badge for select type", async () => {
      mockInvoke.mockResolvedValue([
        { ...mockAnswers[0], answerType: "select" },
      ]);

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText("Menu choice")).toBeInTheDocument();
      });
    });

    it("defaults to Text badge for null type", async () => {
      mockInvoke.mockResolvedValue([{ ...mockAnswers[0], answerType: null }]);

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
        expect(
          screen.getByText(/quick add common questions/i),
        ).toBeInTheDocument();
      });
    });

    it("shows all common pattern buttons when no answers exist", async () => {
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText(/\+ Years of experience/i)).toBeInTheDocument();
        expect(screen.getByText(/\+ Salary expectation/i)).toBeInTheDocument();
        expect(
          screen.getByText(/\+ Start date \/ Notice period/i),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/\+ Willingness to relocate/i),
        ).toBeInTheDocument();
        expect(screen.getByText(/\+ Travel availability/i)).toBeInTheDocument();
        expect(screen.getByText(/\+ Reliable transportation/i)).toBeInTheDocument();
        expect(screen.getByText(/\+ Work authorization/i)).toBeInTheDocument();
        expect(screen.getByText(/\+ Citizenship/i)).toBeInTheDocument();
        expect(screen.getByText(/\+ Schedule availability/i)).toBeInTheDocument();
        expect(screen.getByText(/\+ Overtime availability/i)).toBeInTheDocument();
        expect(screen.getByText(/\+ Holiday availability/i)).toBeInTheDocument();
        expect(screen.getByText(/\+ Management experience/i)).toBeInTheDocument();
        expect(screen.getByText(/\+ Visa sponsorship/i)).toBeInTheDocument();
        expect(screen.getByText(/\+ Driver's license/i)).toBeInTheDocument();
        expect(screen.getByText(/\+ Certification or license/i)).toBeInTheDocument();
        expect(screen.getByText(/\+ Background check/i)).toBeInTheDocument();
        expect(screen.getByText(/\+ Drug screen/i)).toBeInTheDocument();
        expect(screen.getByText(/\+ Language fluency/i)).toBeInTheDocument();
        expect(screen.getByText(/\+ Physical requirements/i)).toBeInTheDocument();
        expect(screen.getByText(/\+ Age requirement/i)).toBeInTheDocument();
      });
    });

    it("hides common pattern button when answer already exists", async () => {
      mockInvoke.mockResolvedValue([mockAnswers[0]]); // Has "years of experience"

      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(
          screen.queryByText(/\+ Years of experience/i),
        ).not.toBeInTheDocument();
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
        const input = screen.getByLabelText(
          /question wording to look for/i,
        ) as HTMLInputElement;
        expect(input.value).toBe("years of experience");
      });
    });

    it("shows extra review guidance for hard screening quick-add answers", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText(/\+ Background check/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/\+ Background check/i));

      expect(screen.getByTestId("hard-screening-answer-guidance")).toHaveTextContent(
        "Review this answer against the exact question before using it. Use only what is true and backed by your resume or records.",
      );
    });

    it.each([
      "Schedule availability",
      "Education level",
      "Reliable transportation",
    ])("shows hard review guidance for %s quick-add answers", async (label) => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText(new RegExp(`\\+ ${label}`, "i"))).toBeInTheDocument();
      });

      await user.click(screen.getByText(new RegExp(`\\+ ${label}`, "i")));

      expect(screen.getByTestId("hard-screening-answer-guidance")).toHaveTextContent(
        "Use only what is true and backed by your resume or records.",
      );
    });

    it("does not show hard screening guidance for ordinary quick-add answers", async () => {
      const user = userEvent.setup();
      render(<ScreeningAnswersForm />);

      await waitFor(() => {
        expect(screen.getByText(/\+ Years of experience/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/\+ Years of experience/i));

      expect(screen.queryByTestId("hard-screening-answer-guidance")).not.toBeInTheDocument();
    });
  });
});
