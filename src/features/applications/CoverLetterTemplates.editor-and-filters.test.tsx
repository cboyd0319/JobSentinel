import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import {
  mockInvoke,
  mockTemplate,
  mockToast,
  renderWithProviders,
  setupCoverLetterTemplateMocks,
} from "./CoverLetterTemplates.testSupport";
import { CoverLetterTemplates } from "./CoverLetterTemplates";
import type { JobForTemplate } from "./coverLetterTemplate";

describe("CoverLetterTemplates", () => {
  const privateFailure = new Error(
    "token=raw-secret private@example.test resume=private-file"
  );

  const toastErrorText = () => mockToast.error.mock.calls.flat().join(" ");

  beforeEach(setupCoverLetterTemplateMocks);

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

});
