import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CoverLetterTemplates, fillTemplatePlaceholders, type JobForTemplate } from "./CoverLetterTemplates";

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
vi.mock("../contexts", () => ({
  useToast: () => mockToast,
}));

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
    title: "Software Engineer",
    company: "TechCorp",
    location: "San Francisco, CA",
  };

  it("replaces {company} placeholder", () => {
    const result = fillTemplatePlaceholders("Apply to {company}", job);
    expect(result).toBe("Apply to TechCorp");
  });

  it("replaces {position} placeholder", () => {
    const result = fillTemplatePlaceholders("Role: {position}", job);
    expect(result).toBe("Role: Software Engineer");
  });

  it("replaces {location} placeholder", () => {
    const result = fillTemplatePlaceholders("Location: {location}", job);
    expect(result).toBe("Location: San Francisco, CA");
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
    const result = fillTemplatePlaceholders("{your_name}", job, { name: "John Doe" });
    expect(result).toBe("John Doe");
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
    expect(result).toBe("I'm Jane, applying for Software Engineer at TechCorp.");
  });

  it("replaces all occurrences of same placeholder", () => {
    const template = "{company} is great. I want to work at {company}.";
    const result = fillTemplatePlaceholders(template, job);
    expect(result).toBe("TechCorp is great. I want to work at TechCorp.");
  });
});

describe("CoverLetterTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
  });

  describe("loading state", () => {
    it("shows loading spinner initially", async () => {
      mockInvoke.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<CoverLetterTemplates />);

      expect(screen.getByText("Loading templates...")).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("shows error message when loading fails", async () => {
      mockInvoke.mockRejectedValue(new Error("Network error"));

      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("Failed to Load Templates")).toBeInTheDocument();
      });
    });

    it("shows Try Again button on error", async () => {
      mockInvoke.mockRejectedValue(new Error("Network error"));

      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
      });
    });

    it("retries loading when Try Again is clicked", async () => {
      // First attempt fails
      mockInvoke
        .mockResolvedValueOnce(0) // seed_default_templates
        .mockRejectedValueOnce(new Error("Network error")); // list_cover_letter_templates

      render(<CoverLetterTemplates />);

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

      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("No templates yet")).toBeInTheDocument();
      });
    });

    it("shows helper text for creating first template", async () => {
      mockInvoke.mockResolvedValue([]);

      render(<CoverLetterTemplates />);

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
      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("Test Template")).toBeInTheDocument();
      });
    });

    it("shows template content", async () => {
      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText(/Dear \{hiring_manager\}/)).toBeInTheDocument();
      });
    });

    it("shows category badge", async () => {
      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("General")).toBeInTheDocument();
      });
    });

    it("shows word count", async () => {
      render(<CoverLetterTemplates />);

      await waitFor(() => {
        // The template has 9 words
        expect(screen.getByText(/9 words/)).toBeInTheDocument();
      });
    });

    it("shows New Template button", async () => {
      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "New Template" })).toBeInTheDocument();
      });
    });

    it("shows Copy button", async () => {
      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
      });
    });

    it("shows Edit button", async () => {
      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
      });
    });

    it("shows Delete button", async () => {
      render(<CoverLetterTemplates />);

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
      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Copy" }));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockTemplate.content);
    });

    it("shows success toast after copying", async () => {
      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Copy" }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "Copied to clipboard",
          "Remember to replace the placeholders"
        );
      });
    });
  });

  describe("delete functionality", () => {
    beforeEach(() => {
      mockInvoke
        .mockResolvedValueOnce(0) // seed_default_templates
        .mockResolvedValueOnce([mockTemplate]); // list_cover_letter_templates
    });

    it("shows delete confirmation modal", async () => {
      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      expect(screen.getByText("Delete Template")).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
    });

    it("closes modal when Cancel is clicked", async () => {
      render(<CoverLetterTemplates />);

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

      render(<CoverLetterTemplates />);

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
  });

  describe("create functionality", () => {
    beforeEach(() => {
      mockInvoke
        .mockResolvedValueOnce(0) // seed_default_templates
        .mockResolvedValueOnce([]); // list_cover_letter_templates
    });

    it("shows editor when New Template is clicked", async () => {
      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "New Template" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "New Template" }));

      expect(screen.getByLabelText("Template Name")).toBeInTheDocument();
      // Category dropdown is present (label without htmlFor, so query differently)
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("shows placeholder hints in editor", async () => {
      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "New Template" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "New Template" }));

      expect(screen.getByText("Available placeholders (click to insert):")).toBeInTheDocument();
      expect(screen.getByText("{company}")).toBeInTheDocument();
      expect(screen.getByText("{position}")).toBeInTheDocument();
    });

    it("shows word and character count", async () => {
      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "New Template" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "New Template" }));

      expect(screen.getByText(/0 words · 0 characters/)).toBeInTheDocument();
    });

    it("disables Create button when name is empty", async () => {
      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "New Template" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "New Template" }));

      expect(screen.getByRole("button", { name: "Create Template" })).toBeDisabled();
    });

    it("closes editor when Cancel is clicked", async () => {
      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "New Template" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "New Template" }));
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByLabelText("Template Name")).not.toBeInTheDocument();
    });
  });

  describe("edit functionality", () => {
    beforeEach(() => {
      mockInvoke
        .mockResolvedValueOnce(0) // seed_default_templates
        .mockResolvedValueOnce([mockTemplate]); // list_cover_letter_templates
    });

    it("shows editor with template data when Edit is clicked", async () => {
      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Edit" }));

      expect(screen.getByLabelText("Template Name")).toHaveValue("Test Template");
    });

    it("shows Update Template button when editing", async () => {
      render(<CoverLetterTemplates />);

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
      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("All (3)")).toBeInTheDocument();
      });
    });

    it("shows category filter buttons", async () => {
      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("General (1)")).toBeInTheDocument();
        expect(screen.getByText("Tech & Engineering (1)")).toBeInTheDocument();
        expect(screen.getByText("Creative & Design (1)")).toBeInTheDocument();
      });
    });

    it("filters templates by category", async () => {
      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("Tech Template")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("General (1)"));

      expect(screen.getByText("General Template")).toBeInTheDocument();
      expect(screen.queryByText("Tech Template")).not.toBeInTheDocument();
    });

    it("shows empty message for filtered category", async () => {
      render(<CoverLetterTemplates />);

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
      render(<CoverLetterTemplates selectedJob={selectedJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Use for Job" })).toBeInTheDocument();
      });
    });

    it("does not show Use for Job button when no job", async () => {
      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("Test Template")).toBeInTheDocument();
      });

      expect(screen.queryByRole("button", { name: "Use for Job" })).not.toBeInTheDocument();
    });

    it("fills template and copies when Use for Job is clicked", async () => {
      render(<CoverLetterTemplates selectedJob={selectedJob} />);

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
      render(<CoverLetterTemplates selectedJob={selectedJob} />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Use for Job" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Use for Job" }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "Template filled and copied!",
          "Check for [bracketed] placeholders that need manual editing"
        );
      });
    });
  });

  describe("header", () => {
    beforeEach(() => {
      mockInvoke
        .mockResolvedValueOnce(0) // seed_default_templates
        .mockResolvedValueOnce([]); // list_cover_letter_templates
    });

    it("shows title", async () => {
      render(<CoverLetterTemplates />);

      await waitFor(() => {
        expect(screen.getByText("Cover Letter Templates")).toBeInTheDocument();
      });
    });

    it("shows description", async () => {
      render(<CoverLetterTemplates />);

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
      render(<CoverLetterTemplates />);

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
      render(<CoverLetterTemplates />);

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
      render(<CoverLetterTemplates />);

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
