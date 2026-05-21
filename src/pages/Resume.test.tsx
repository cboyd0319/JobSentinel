import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Resume from "./Resume";
import { safeInvoke } from "../utils/api";

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

describe("Resume page", () => {
  it("renders resume match sub-scores as percentages from backend fractions", async () => {
    mockSafeInvoke.mockImplementation((command: string) => {
      switch (command) {
        case "get_active_resume":
          return Promise.resolve({
            id: 1,
            name: "Senior Engineer Resume",
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
              job_title: "Senior Frontend Engineer",
              company: "Acme",
              overall_match_score: 0.82,
              skills_match_score: 0.75,
              experience_match_score: 0.5,
              education_match_score: 0.25,
              matching_skills: ["React"],
              missing_skills: ["Kubernetes"],
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
      expect(screen.getByText("Senior Frontend Engineer")).toBeInTheDocument();
    });

    expect(screen.getByText("Skills (50%)")).toBeInTheDocument();
    expect(screen.getByText("Experience (30%)")).toBeInTheDocument();
    expect(screen.getByText("Education (20%)")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });
});
