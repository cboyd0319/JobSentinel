import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Resume from "./Resume";
import { safeInvoke, safeInvokeWithToast } from "../utils/api";
import { open } from "@tauri-apps/plugin-dialog";

vi.mock("../utils/api", () => ({
  safeInvoke: vi.fn(),
  safeInvokeWithToast: vi.fn(),
}));

vi.mock("../contexts", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

const mockSafeInvoke = vi.mocked(safeInvoke);
const mockSafeInvokeWithToast = vi.mocked(safeInvokeWithToast);
const mockOpen = vi.mocked(open);

describe("Resume page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("labels structured resume import as a resume-app file path", async () => {
    mockSafeInvoke.mockImplementation((command: string) => {
      switch (command) {
        case "get_active_resume":
          return Promise.resolve(null);
        case "list_all_resumes":
        case "get_user_skills":
        case "get_recent_matches":
          return Promise.resolve([]);
        default:
          return Promise.resolve(null);
      }
    });

    render(<Resume onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("No Resume Uploaded")).toBeInTheDocument();
    });

    expect(screen.getAllByRole("button", { name: "Import from resume app" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Import Resume Data" })).not.toBeInTheDocument();
  });

  it("renders resume match sub-scores as percentages from backend fractions", async () => {
    mockSafeInvoke.mockImplementation((command: string) => {
      switch (command) {
        case "get_active_resume":
          return Promise.resolve({
            id: 1,
            name: "Care Coordinator Resume",
            is_active: true,
            created_at: "2026-05-21T12:00:00Z",
            updated_at: "2026-05-21T12:00:00Z",
          });
        case "list_all_resumes":
          return Promise.resolve([]);
        case "get_user_skills":
          return Promise.resolve([]);
        case "get_recent_matches":
          return Promise.resolve([
            {
              id: 10,
              resume_id: 1,
              job_hash: "job-hash",
              job_title: "Care Coordinator",
              company: "Community Health Partners",
              overall_match_score: 0.82,
              skills_match_score: 0.75,
              experience_match_score: 0.5,
              education_match_score: 0.25,
              matching_skills: ["Scheduling"],
              missing_skills: ["Case Management"],
              gap_analysis: null,
              created_at: "2026-05-21T12:00:00Z",
            },
          ]);
        default:
          return Promise.resolve(null);
      }
    });

    render(<Resume onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Care Coordinator")).toBeInTheDocument();
    });

    expect(screen.getByText("Recent Resume Matches")).toBeInTheDocument();
    expect(screen.getByText("Saved Skills (0)")).toBeInTheDocument();
    expect(screen.getByText("Match Details")).toBeInTheDocument();
    expect(screen.getByText("Skills fit")).toBeInTheDocument();
    expect(screen.getByText("Experience fit")).toBeInTheDocument();
    expect(screen.getByText("Education fit")).toBeInTheDocument();
    expect(screen.getByText("Skills found in both (1)")).toBeInTheDocument();
    expect(screen.getByText("Skills to review (1)")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("No skills saved yet")).toBeInTheDocument();
    expect(
      screen.getByText("JobSentinel can suggest skills from a resume, or you can add them yourself."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/score breakdown/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/matched skills|missing skills/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/skills extracted|extract skills automatically/i)).not.toBeInTheDocument();
  });

  it("imports structured resumes through backend file handling", async () => {
    const user = userEvent.setup();
    const selectedPath = String.raw`C:\Resume Files\resume export.JSON`;
    const fetchSpy = vi.fn();

    vi.stubGlobal("fetch", fetchSpy);
    mockOpen.mockResolvedValue(selectedPath);
    mockSafeInvokeWithToast.mockResolvedValue(42);
    mockSafeInvoke.mockImplementation((command: string) => {
      switch (command) {
        case "get_active_resume":
          return Promise.resolve(null);
        case "list_all_resumes":
        case "get_user_skills":
        case "get_recent_matches":
          return Promise.resolve([]);
        default:
          return Promise.resolve(null);
      }
    });

    render(<Resume onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("No Resume Uploaded")).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole("button", { name: "Import from resume app" })[0]);

    expect(mockSafeInvokeWithToast).toHaveBeenCalledWith(
      "import_json_resume_file",
      { name: "resume export", filePath: selectedPath },
      expect.anything(),
      { logContext: "Import structured resume data" },
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
