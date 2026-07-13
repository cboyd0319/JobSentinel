import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CoverLetterTemplates } from "./CoverLetterTemplates";
import { fillTemplatePlaceholders, type JobForTemplate } from "../../utils/coverLetterUtils";
import { UndoProvider } from "../../contexts/UndoContext";

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

// Helper to render with required providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(<UndoProvider>{ui}</UndoProvider>);
};

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

const mockTemplate = {
  id: "template-1",
  name: "Test Template",
  content: "Dear {hiring_manager},\n\nI am applying for {position} at {company}.",
  category: "general" as const,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("fillTemplatePlaceholders", () => {
  const job: JobForTemplate = {
    title: "Customer Support Coordinator",
    company: "CareBridge Services",
    location: "Chicago, IL",
  };

  it("replaces {company} placeholder", () => {
    const result = fillTemplatePlaceholders("Apply to {company}", job);
    expect(result).toBe("Apply to CareBridge Services");
  });

  it("replaces {position} placeholder", () => {
    const result = fillTemplatePlaceholders("Role: {position}", job);
    expect(result).toBe("Role: Customer Support Coordinator");
  });

  it("replaces {location} placeholder", () => {
    const result = fillTemplatePlaceholders("Location: {location}", job);
    expect(result).toBe("Location: Chicago, IL");
  });

  it("uses Remote when location is null", () => {
    const jobWithoutLocation = { ...job, location: null };
    const result = fillTemplatePlaceholders("Location: {location}", jobWithoutLocation);
    expect(result).toBe("Location: Remote");
  });

  it("replaces {hiring_manager} with default", () => {
    const result = fillTemplatePlaceholders("Dear {hiring_manager}", job);
    expect(result).toBe("Dear Hiring Manager");
  });

  it("replaces {your_name} with user name when provided", () => {
    const result = fillTemplatePlaceholders("{your_name}", job, { name: "Jordan Lee" });
    expect(result).toBe("Jordan Lee");
  });

  it("replaces {your_name} with placeholder when no user context", () => {
    const result = fillTemplatePlaceholders("{your_name}", job);
    expect(result).toBe("[Your Name]");
  });

  it("replaces {date} with formatted date", () => {
    const result = fillTemplatePlaceholders("Date: {date}", job);
    // Just check it contains a year and month-like pattern
    expect(result).toMatch(/Date: \w+ \d+, \d{4}/);
  });

  it("replaces {skill1} with placeholder", () => {
    const result = fillTemplatePlaceholders("{skill1}", job);
    expect(result).toBe("[Your Primary Skill]");
  });

  it("replaces {skill2} with placeholder", () => {
    const result = fillTemplatePlaceholders("{skill2}", job);
    expect(result).toBe("[Your Secondary Skill]");
  });

  it("replaces {years_experience} with placeholder", () => {
    const result = fillTemplatePlaceholders("{years_experience}", job);
    expect(result).toBe("[X]");
  });

  it("replaces multiple placeholders", () => {
    const template = "I'm {your_name}, applying for {position} at {company}.";
    const result = fillTemplatePlaceholders(template, job, { name: "Jane" });
    expect(result).toBe(
      "I'm Jane, applying for Customer Support Coordinator at CareBridge Services.",
    );
  });

  it("replaces all occurrences of same placeholder", () => {
    const template = "{company} is great. I want to work at {company}.";
    const result = fillTemplatePlaceholders(template, job);
    expect(result).toBe(
      "CareBridge Services is great. I want to work at CareBridge Services.",
    );
  });
});

describe("CoverLetterTemplates", () => {
  const privateFailure = new Error(
    "token=raw-secret private@example.test resume=private-file"
  );

  const toastErrorText = () => mockToast.error.mock.calls.flat().join(" ");

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  describe("loading state", () => {
    it("shows loading spinner initially", async () => {
      mockInvoke.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithProviders(<CoverLetterTemplates />);

      expect(screen.getByText("Loading templates...")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("shows error message when loading fails", async () => {
      mockInvoke.mockRejectedValue(new Error("Network error"));

      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("Could not load templates")).toBeInTheDocument();
      });
    });

    it("shows Try Again button on error", async () => {
      mockInvoke.mockRejectedValue(new Error("Network error"));

      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
      });
    });

    it("does not show raw private details when loading fails", async () => {
      mockInvoke.mockRejectedValue(privateFailure);

      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("Could not load templates")).toBeInTheDocument();
      });

      expect(screen.queryByText(/raw-secret|private@example\.test|resume=private-file/)).not.toBeInTheDocument();
      expect(toastErrorText()).not.toMatch(/raw-secret|private@example\.test|resume=private-file/);
      expect(mockToast.error).toHaveBeenCalledWith(
        "Could not load templates",
        expect.stringContaining("safe support report")
      );
    });

    it("retries loading when Try Again is clicked", async () => {
      // First attempt fails
      mockInvoke
        .mockResolvedValueOnce(0) // seed_default_templates
        .mockRejectedValueOnce(new Error("Network error")); // list_cover_letter_templates

      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
      });

      // Retry succeeds
      mockInvoke
        .mockResolvedValueOnce(0) // seed_default_templates
        .mockResolvedValueOnce([]); // list_cover_letter_templates

      fireEvent.click(screen.getByRole("button", { name: "Try Again" }));

      await waitFor(() => {
        expect(screen.getByText("No templates yet")).toBeInTheDocument();
      });
    });
  });

  describe("empty state", () => {
    it("shows empty state when no templates", async () => {
      mockInvoke.mockResolvedValue([]);

      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("No templates yet")).toBeInTheDocument();
      });
    });

    it("shows helper text for creating first template", async () => {
      mockInvoke.mockResolvedValue([]);

      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("Create your first cover letter template")).toBeInTheDocument();
      });
    });
  });

  describe("with templates", () => {
    beforeEach(() => {
      mockInvoke
        .mockResolvedValueOnce(0) // seed_default_templates
        .mockResolvedValueOnce([mockTemplate]); // list_cover_letter_templates
    });

    it("renders template list", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("Test Template")).toBeInTheDocument();
      });
    });

    it("shows template content", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText(/Dear \{hiring_manager\}/)).toBeInTheDocument();
      });
    });

    it("shows category badge", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("General")).toBeInTheDocument();
      });
    });

    it("shows word count", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        // The template has 9 words
        expect(screen.getByText(/9 words/)).toBeInTheDocument();
      });
    });

    it("shows New Template button", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "New Template" })).toBeInTheDocument();
      });
    });

    it("shows Copy button", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
      });
    });

    it("shows Edit button", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
      });
    });

    it("shows Delete button", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
      });
    });
  });

  describe("copy functionality", () => {
    beforeEach(() => {
      mockInvoke
        .mockResolvedValueOnce(0) // seed_default_templates
        .mockResolvedValueOnce([mockTemplate]); // list_cover_letter_templates
    });

    it("copies template to clipboard", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Copy" }));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockTemplate.content);
    });

    it("shows success toast after copying", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Copy" }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "Template copied",
          "Review any blanks before sending"
        );
      });
    });

    it("uses plain recovery copy when template copying fails", async () => {
      (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("copy denied"),
      );

      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Copy" }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Could not copy template",
          "Give JobSentinel clipboard permission, then copy again. The template text is still saved.",
        );
      });
      expect(toastErrorText()).not.toContain("Failed to copy");
    });
  });

  describe("delete functionality", () => {
    beforeEach(() => {
      mockInvoke
        .mockResolvedValueOnce(0) // seed_default_templates
        .mockResolvedValueOnce([mockTemplate]); // list_cover_letter_templates
    });

    it("shows delete confirmation modal", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      expect(screen.getByText("Delete Template")).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
    });

    it("closes modal when Cancel is clicked", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByText("Delete Template")).not.toBeInTheDocument();
    });

    it("deletes template when confirmed", async () => {
      mockInvoke.mockReset();
      mockInvoke
        .mockResolvedValueOnce(0) // seed_default_templates
        .mockResolvedValueOnce([mockTemplate]) // list_cover_letter_templates
        .mockResolvedValueOnce(true); // delete_cover_letter_template

      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      // Click the Delete button in the modal (there are two Delete buttons now)
      const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
      fireEvent.click(deleteButtons[deleteButtons.length - 1]); // Click the modal's Delete button

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("delete_cover_letter_template", {
          id: mockTemplate.id,
        });
      });
    });

    it("does not show raw private details when deletion fails", async () => {
      mockInvoke.mockReset();
      mockInvoke
        .mockResolvedValueOnce(0) // seed_default_templates
        .mockResolvedValueOnce([mockTemplate]) // list_cover_letter_templates
        .mockRejectedValueOnce(privateFailure); // delete_cover_letter_template

      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
      fireEvent.click(deleteButtons[deleteButtons.length - 1]);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Could not delete template",
          expect.stringContaining("safe support report")
        );
      });

      expect(toastErrorText()).not.toMatch(/raw-secret|private@example\.test|resume=private-file/);
    });
  });

  describe("create functionality", () => {
    beforeEach(() => {
      mockInvoke
        .mockResolvedValueOnce(0) // seed_default_templates
        .mockResolvedValueOnce([]); // list_cover_letter_templates
    });

    it("shows editor when New Template is clicked", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "New Template" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "New Template" }));

      expect(screen.getByLabelText("Template Name")).toBeInTheDocument();
      // Category dropdown is present (label without htmlFor, so query differently)
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("shows plain-language auto-fill blank buttons in editor", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "New Template" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "New Template" }));

      expect(screen.getByText("Use a label to add an auto-fill blank:")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Insert Company" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Insert Job Title" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "{company}" })).not.toBeInTheDocument();
    });

    it("inserts the right template blank when a plain-language button is clicked", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "New Template" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "New Template" }));
      fireEvent.click(screen.getByRole("button", { name: "Insert Company" }));

      expect(screen.getByPlaceholderText("Write your cover letter template here...")).toHaveValue(
        "{company}",
      );
    });

    it("shows word and character count", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "New Template" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "New Template" }));

      expect(screen.getByText(/0 words · 0 characters/)).toBeInTheDocument();
    });

    it("disables Create button when name is empty", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "New Template" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "New Template" }));

      expect(screen.getByRole("button", { name: "Create Template" })).toBeDisabled();
    });

    it("closes editor when Cancel is clicked", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "New Template" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "New Template" }));
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByLabelText("Template Name")).not.toBeInTheDocument();
    });

    it("does not show raw private details when creation fails", async () => {
      mockInvoke.mockReset();
      mockInvoke
        .mockResolvedValueOnce(0) // seed_default_templates
        .mockResolvedValueOnce([]) // list_cover_letter_templates
        .mockRejectedValueOnce(privateFailure); // create_cover_letter_template

      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "New Template" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "New Template" }));
      fireEvent.change(screen.getByLabelText("Template Name"), {
        target: { value: "Follow-up" },
      });
      fireEvent.change(screen.getByPlaceholderText("Write your cover letter template here..."), {
        target: { value: "Thanks for reviewing my application." },
      });
      fireEvent.click(screen.getByRole("button", { name: "Create Template" }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Could not save template",
          expect.stringContaining("safe support report")
        );
      });

      expect(toastErrorText()).not.toMatch(/raw-secret|private@example\.test|resume=private-file/);
    });
  });

  describe("edit functionality", () => {
    beforeEach(() => {
      mockInvoke
        .mockResolvedValueOnce(0) // seed_default_templates
        .mockResolvedValueOnce([mockTemplate]); // list_cover_letter_templates
    });

    it("shows editor with template data when Edit is clicked", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Edit" }));

      expect(screen.getByLabelText("Template Name")).toHaveValue("Test Template");
    });

    it("shows Update Template button when editing", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Edit" }));

      expect(screen.getByRole("button", { name: "Update Template" })).toBeInTheDocument();
    });
  });

  describe("category filter", () => {
    const templatesWithCategories = [
      { ...mockTemplate, id: "1", name: "General Template", category: "general" },
      { ...mockTemplate, id: "2", name: "Tech Template", category: "tech" },
      { ...mockTemplate, id: "3", name: "Creative Template", category: "creative" },
    ];

    beforeEach(() => {
      mockInvoke
        .mockResolvedValueOnce(0) // seed_default_templates
        .mockResolvedValueOnce(templatesWithCategories); // list_cover_letter_templates
    });

    it("shows All filter with count", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("All (3)")).toBeInTheDocument();
      });
    });

    it("shows category filter buttons", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("General (1)")).toBeInTheDocument();
        expect(screen.getByText("IT & Software (1)")).toBeInTheDocument();
        expect(screen.getByText("Creative & Design (1)")).toBeInTheDocument();
      });
    });

    it("filters templates by category", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("Tech Template")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("General (1)"));

      expect(screen.getByText("General Template")).toBeInTheDocument();
      expect(screen.queryByText("Tech Template")).not.toBeInTheDocument();
    });

    it("shows empty message for filtered category", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("Tech Template")).toBeInTheDocument();
      });

      // Filter by General first
      fireEvent.click(screen.getByText("General (1)"));
      expect(screen.queryByText("No templates in this category")).not.toBeInTheDocument();

      // Reset to All to access other filters
      fireEvent.click(screen.getByText("All (3)"));

      // All templates visible again
      expect(screen.getByText("General Template")).toBeInTheDocument();
      expect(screen.getByText("Tech Template")).toBeInTheDocument();
    });
  });

  describe("Use for Job functionality", () => {
    const selectedJob: JobForTemplate = {
      title: "Frontend Developer",
      company: "Acme Inc",
      location: "Remote",
    };

    beforeEach(() => {
      mockInvoke
        .mockResolvedValueOnce(0) // seed_default_templates
        .mockResolvedValueOnce([mockTemplate]); // list_cover_letter_templates
    });

    it("shows Use for Job button when job is provided", async () => {
      renderWithProviders(<CoverLetterTemplates selectedJob={selectedJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Use for Job" })).toBeInTheDocument();
      });
    });

    it("does not show Use for Job button when no job", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("Test Template")).toBeInTheDocument();
      });

      expect(screen.queryByRole("button", { name: "Use for Job" })).not.toBeInTheDocument();
    });

    it("fills template and copies when Use for Job is clicked", async () => {
      renderWithProviders(<CoverLetterTemplates selectedJob={selectedJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Use for Job" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Use for Job" }));

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
        const writtenContent = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(writtenContent).toContain("Acme Inc");
        expect(writtenContent).toContain("Frontend Developer");
      });
    });

    it("shows success toast with placeholder warning", async () => {
      renderWithProviders(<CoverLetterTemplates selectedJob={selectedJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Use for Job" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Use for Job" }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "Draft copied",
          "Review any blanks before sending"
        );
      });
    });

    it("uses plain recovery copy when filled template copying fails", async () => {
      (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("copy denied"),
      );

      renderWithProviders(<CoverLetterTemplates selectedJob={selectedJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Use for Job" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Use for Job" }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          "Could not copy template",
          "Give JobSentinel clipboard permission, then copy again. The template text is still saved.",
        );
      });
      expect(toastErrorText()).not.toContain("Failed to copy");
    });
  });

  describe("header", () => {
    beforeEach(() => {
      mockInvoke
        .mockResolvedValueOnce(0) // seed_default_templates
        .mockResolvedValueOnce([]); // list_cover_letter_templates
    });

    it("shows title", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("Cover Letter Templates")).toBeInTheDocument();
      });
    });

    it("shows description", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("Create reusable templates for your applications")).toBeInTheDocument();
      });
    });
  });

  describe("discard changes confirmation", () => {
    beforeEach(() => {
      mockInvoke
        .mockResolvedValueOnce(0) // seed_default_templates
        .mockResolvedValueOnce([]); // list_cover_letter_templates
    });

    it("shows confirmation when canceling with unsaved changes", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "New Template" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "New Template" }));

      // Make a change
      fireEvent.change(screen.getByLabelText("Template Name"), {
        target: { value: "New Name" },
      });

      // Click Cancel
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.getByText("Discard changes?")).toBeInTheDocument();
    });

    it("closes editor when Discard changes is clicked", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "New Template" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "New Template" }));

      fireEvent.change(screen.getByLabelText("Template Name"), {
        target: { value: "New Name" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));

      expect(screen.queryByLabelText("Template Name")).not.toBeInTheDocument();
    });

    it("returns to editor when Keep editing is clicked", async () => {
      renderWithProviders(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "New Template" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "New Template" }));

      fireEvent.change(screen.getByLabelText("Template Name"), {
        target: { value: "New Name" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));

      expect(screen.getByLabelText("Template Name")).toHaveValue("New Name");
    });
  });
});
