import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SetupWizard from "./SetupWizard";
import { ToastProvider } from "../../contexts";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

const mockSavedResumeSkillSuggestions = () => {
  mockInvoke.mockImplementation((command: string) => {
    switch (command) {
      case "get_active_resume":
        return Promise.resolve({
          id: 7,
          name: "Care Resume",
          is_active: true,
          created_at: "2026-05-21T12:00:00Z",
          updated_at: "2026-05-21T12:00:00Z",
          format_label: "PDF",
          has_readable_text: true,
          readable_text_chars: 1200,
        });
      case "get_user_skills":
        return Promise.resolve([
          {
            id: 1,
            resume_id: 7,
            skill_name: "Scheduling",
            skill_category: "Operations",
            confidence_score: 0.92,
            years_experience: null,
            proficiency_level: null,
            source: "resume",
          },
          {
            id: 2,
            resume_id: 7,
            skill_name: "Case management",
            skill_category: "Client service",
            confidence_score: 0.88,
            years_experience: null,
            proficiency_level: null,
            source: "resume",
          },
        ]);
      case "complete_setup":
        return Promise.resolve(undefined);
      default:
        return Promise.resolve(undefined);
    }
  });
};

describe("SetupWizard resume suggestions", () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("waits for explicit user action before checking saved resume skills", async () => {
    const user = userEvent.setup();
    mockSavedResumeSkillSuggestions();

    renderWithProviders(<SetupWizard onComplete={mockOnComplete} />);

    await user.click(screen.getByRole("button", { name: /build my search/i }));
    await user.type(screen.getByPlaceholderText("Add a job title..."), "Care Coordinator{enter}");

    expect(screen.getByRole("button", { name: /check saved resume skills/i })).toBeInTheDocument();
    expect(screen.queryByText("Use reviewed resume skills")).not.toBeInTheDocument();

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "get_active_resume",
      expect.anything(),
      expect.anything(),
    );
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "get_user_skills",
      expect.anything(),
      expect.anything(),
    );

    await user.click(screen.getByRole("button", { name: /check saved resume skills/i }));

    await waitFor(() => {
      expect(screen.getByText("Use reviewed resume skills")).toBeInTheDocument();
    });
    expect(screen.getByText("Care Resume")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add scheduling to search/i })).toBeInTheDocument();
    expect(screen.queryByText(/resume_id|confidence_score|file_path|parsed_text/)).not.toBeInTheDocument();
  });

  it("adds all visible resume skills only after the user asks and chooses the bulk action", async () => {
    const user = userEvent.setup();
    mockSavedResumeSkillSuggestions();

    renderWithProviders(<SetupWizard onComplete={mockOnComplete} />);

    await user.click(screen.getByRole("button", { name: /build my search/i }));
    await user.type(screen.getByPlaceholderText("Add a job title..."), "Care Coordinator{enter}");
    await user.click(screen.getByRole("button", { name: /check saved resume skills/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add all visible/i })).toBeInTheDocument();
    });
    expect(screen.queryByText("Added Scheduling")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add all visible/i }));

    expect(screen.getByText("Added Scheduling")).toBeInTheDocument();
    expect(screen.getByText("Added Case management")).toBeInTheDocument();
    expect(
      screen.getByText("Added skills appear above. Remove any you do not want."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^continue$/i }));
    await user.click(screen.getByRole("button", { name: /^continue$/i }));

    expect(screen.getByText("Saved resume skills")).toBeInTheDocument();
    expect(
      screen.getByText(
        "From Care Resume: Scheduling, Case management. Remove any you do not want before starting.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /start finding jobs/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "complete_setup",
        expect.objectContaining({
          config: expect.objectContaining({
            title_allowlist: ["Care Coordinator"],
            keywords_boost: ["Scheduling", "Case management"],
          }),
        }),
      );
    });
  });
});
