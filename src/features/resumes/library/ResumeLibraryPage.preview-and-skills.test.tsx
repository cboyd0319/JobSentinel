import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  makeResumeSummary,
  makeUserSkill,
  mockResumeLibraryResponses,
  mockSafeInvoke,
  mockSafeInvokeWithToast,
  mockToast,
  resetResumeLibraryMocks,
} from "./ResumeLibraryPage.testSupport";
import ResumeLibraryPage from "./ResumeLibraryPage";

describe("Resume page", () => {
  beforeEach(resetResumeLibraryMocks);

  it("copies the readable resume text after the user opens the preview", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    mockResumeLibraryResponses({
      get_active_resume: makeResumeSummary(),
      get_resume_text_preview: {
        resume_id: 1,
        name: "Care Coordinator Resume",
        has_text: true,
        text_preview: "Care coordinator\nPatient scheduling",
        text_chars: 35,
        is_truncated: false,
      },
    });

    render(<ResumeLibraryPage onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Care Coordinator Resume")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "See what JobSentinel read" }));
    await user.click(await screen.findByRole("button", { name: "Copy text" }));

    expect(writeText).toHaveBeenCalledWith("Care coordinator\nPatient scheduling");
    expect(mockToast.success).toHaveBeenCalledWith(
      "Text copied",
      "Readable resume text copied to your clipboard.",
    );
  });

  it("labels saved skill source instead of showing raw confidence percentages", async () => {
    mockResumeLibraryResponses({
      get_active_resume: makeResumeSummary(),
      get_user_skills: [
        makeUserSkill({
          skill_category: "Care coordination",
          confidence_score: 0.95,
          proficiency_level: "Advanced",
          source: "resume",
        }),
        makeUserSkill({
          id: 2,
          skill_name: "Community Outreach",
          skill_category: "Community programs",
          years_experience: null,
          proficiency_level: "Intermediate",
        }),
      ],
    });

    render(<ResumeLibraryPage onBack={vi.fn()} />);

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

  it("lets job seekers explicitly use reviewed resume skills for local sorting", async () => {
    const user = userEvent.setup();

    mockResumeLibraryResponses({
      get_active_resume: makeResumeSummary(),
      get_resume_matching_preference: { enabled: false },
      get_user_skills: [makeUserSkill()],
      set_resume_matching_enabled: { enabled: true },
    });

    render(<ResumeLibraryPage onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Saved Skills (1)")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Use these skills to sort jobs" }));

    expect(mockSafeInvoke).toHaveBeenCalledWith(
      "set_resume_matching_enabled",
      { enabled: true },
      { logContext: "Use resume skills for job sorting" },
    );
    expect(await screen.findByText("Resume skills are helping sort jobs.")).toBeInTheDocument();
    expect(mockToast.success).toHaveBeenCalledWith(
      "Resume skills will help sort jobs",
      "JobSentinel will use these reviewed local skills in job sorting.",
    );
  });

  it("shows resume skill sorting as on when already enabled", async () => {
    mockResumeLibraryResponses({
      get_active_resume: makeResumeSummary(),
      get_resume_matching_preference: { enabled: true },
      get_user_skills: [makeUserSkill()],
    });

    render(<ResumeLibraryPage onBack={vi.fn()} />);

    expect(await screen.findByText("Resume skills are helping sort jobs.")).toBeInTheDocument();
    expect(screen.getByText("On")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop using resume skills" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use these skills to sort jobs" })).not.toBeInTheDocument();
  });

  it("clears optional skill details and trims skill names when editing", async () => {
    const user = userEvent.setup();

    mockSafeInvokeWithToast.mockResolvedValue(undefined);
    mockResumeLibraryResponses({
      get_active_resume: makeResumeSummary(),
      get_user_skills: [makeUserSkill({ proficiency_level: "Intermediate" })],
    });

    render(<ResumeLibraryPage onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Saved Skills (1)")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Edit skill: Patient Scheduling" }));
    await user.clear(screen.getByPlaceholderText("Skill name"));
    await user.type(screen.getByPlaceholderText("Skill name"), "  Care Navigation  ");
    await user.selectOptions(screen.getByDisplayValue("Customer or Patient Support"), "");
    await user.clear(screen.getByPlaceholderText("Years"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockSafeInvokeWithToast).toHaveBeenCalledWith(
      "update_user_skill",
      {
        skillId: 1,
        updates: {
          skill_name: "Care Navigation",
          skill_category: null,
          proficiency_level: "Some practice",
          years_experience: null,
        },
      },
      expect.anything(),
      { logContext: "Update user skill" },
    );
  });

  it("uses action-first validation copy when editing a skill without a name", async () => {
    const user = userEvent.setup();

    mockResumeLibraryResponses({
      get_active_resume: makeResumeSummary(),
      get_user_skills: [
        makeUserSkill({
          skill_category: null,
          years_experience: null,
        }),
      ],
    });

    render(<ResumeLibraryPage onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Saved Skills (1)")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Edit skill: Patient Scheduling" }));
    await user.clear(screen.getByPlaceholderText("Skill name"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Name the skill",
      "Add a skill name, then save again.",
    );
    expect(mockSafeInvokeWithToast).not.toHaveBeenCalledWith(
      "update_user_skill",
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it("uses action-first validation copy when adding a skill without a name", async () => {
    const user = userEvent.setup();

    mockResumeLibraryResponses({
      get_active_resume: makeResumeSummary(),
    });

    render(<ResumeLibraryPage onBack={vi.fn()} />);

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
});
