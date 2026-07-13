import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CoverLetterTemplates } from "./CoverLetterTemplates";
import { UndoProvider } from "../../app/providers/UndoProvider";

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

const renderWithProviders = (ui: React.ReactElement) =>
  render(<UndoProvider>{ui}</UndoProvider>);

Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

describe("CoverLetterTemplates editing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
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
