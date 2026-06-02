import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Resume from "./Resume";
import { safeInvoke, safeInvokeWithToast } from "../utils/api";

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock("../utils/api", () => ({
  safeInvoke: vi.fn(),
  safeInvokeWithToast: vi.fn(),
}));

vi.mock("../contexts", () => ({
  useToast: () => mockToast,
}));

const mockSafeInvoke = vi.mocked(safeInvoke);
const mockSafeInvokeWithToast = vi.mocked(safeInvokeWithToast);

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
      expect(screen.getByText("No Resume Added")).toBeInTheDocument();
    });

    expect(screen.getAllByRole("button", { name: "Import from resume app" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Import Resume Data" })).not.toBeInTheDocument();
    expect(screen.queryByText("No Resume Uploaded")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /upload resume/i })).not.toBeInTheDocument();
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

  it("labels saved skill source instead of showing raw confidence percentages", async () => {
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
        case "get_recent_matches":
          return Promise.resolve([]);
        case "get_user_skills":
          return Promise.resolve([
            {
              id: 1,
              resume_id: 1,
              skill_name: "Patient Scheduling",
              skill_category: "Care coordination",
              confidence_score: 0.95,
              years_experience: 3,
              proficiency_level: "Advanced",
              source: "resume",
            },
            {
              id: 2,
              resume_id: 1,
              skill_name: "Community Outreach",
              skill_category: "Community programs",
              confidence_score: 1,
              years_experience: null,
              proficiency_level: "Intermediate",
              source: "manual",
            },
          ]);
        default:
          return Promise.resolve(null);
      }
    });

    render(<Resume onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Saved Skills (2)")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Found in resume").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Added by you").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Regular use").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Some practice").length).toBeGreaterThan(0);
    expect(screen.queryByText("Advanced")).not.toBeInTheDocument();
    expect(screen.queryByText("Intermediate")).not.toBeInTheDocument();
    expect(screen.queryByText("(95%)")).not.toBeInTheDocument();
    expect(screen.queryByText("(100%)")).not.toBeInTheDocument();
  });

  it("uses action-first validation copy when adding a skill without a name", async () => {
    const user = userEvent.setup();

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
        case "get_user_skills":
        case "get_recent_matches":
          return Promise.resolve([]);
        default:
          return Promise.resolve(null);
      }
    });

    render(<Resume onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Saved Skills (0)")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(screen.getAllByRole("button", { name: "Add Skill" })[0]);

    expect(mockToast.error).toHaveBeenCalledWith(
      "Name the skill",
      "Add a skill name, then save again.",
    );
    expect(mockSafeInvokeWithToast).not.toHaveBeenCalledWith(
      "add_user_skill",
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it("imports structured resumes through backend-owned file handling", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();

    vi.stubGlobal("fetch", fetchSpy);
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
      expect(screen.getByText("No Resume Added")).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole("button", { name: "Import from resume app" })[0]);

    expect(mockSafeInvokeWithToast).toHaveBeenCalledWith(
      "select_and_import_json_resume",
      undefined,
      expect.anything(),
      { logContext: "Import structured resume data" },
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
