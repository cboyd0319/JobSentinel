import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import ResumeMatch from "./ResumeMatchPage";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockReadStorageValue = vi.hoisted(() => vi.fn(() => null));
const mockRemoveStorageValue = vi.hoisted(() => vi.fn(() => true));
const mockWriteStorageValue = vi.hoisted(() => vi.fn(() => true));

vi.mock("../../../shared/browserStorage", () => ({
  readStorageValue: mockReadStorageValue,
  removeStorageValue: mockRemoveStorageValue,
  writeStorageValue: mockWriteStorageValue,
}));

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

vi.mock("../../../shared/toast/useToast", () => ({
  useToast: () => mockToast,
}));

vi.mock("../../../shared/errorReporting/logger", () => ({
  logError: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

const validResume = {
  contact_info: {
    name: "Jordan Lee",
    email: "jordan@example.com",
    phone: "555-1234",
    location: "Denver, CO",
    linkedin: null,
    github: null,
    website: null,
  },
  summary: "Customer success manager",
  experience: [
    {
      title: "Customer Success Manager",
      company: "ExampleCo",
      location: "Remote",
      start_date: "2022-01",
      end_date: "Present",
      achievements: ["Improved onboarding and retention"],
      current: true,
    },
  ],
  skills: [
    {
      name: "Customer Retention",
      category: "Customer Success",
      proficiency: "advanced",
    },
  ],
  education: [
    {
      degree: "BA Communications",
      institution: "Example University",
      location: "Denver, CO",
      graduation_date: "2018",
      gpa: null,
      honors: [],
    },
  ],
  certifications: [],
  projects: [],
  custom_sections: {},
};

const mockAnalysis = {
  overall_score: 82,
  keyword_score: 80,
  format_score: 84,
  completeness_score: 82,
  keyword_matches: [],
  missing_keywords: [],
  missing_keyword_details: [],
  format_issues: [],
  suggestions: [],
};

const mockJobAnalysis = {
  ...mockAnalysis,
  keyword_matches: [
    {
      keyword: "onboarding",
      importance: "Required" as const,
      found_in: ["experience"],
      frequency: 2,
    },
    {
      keyword: "retention",
      importance: "Preferred" as const,
      found_in: ["summary"],
      frequency: 1,
    },
  ],
  missing_keywords: ["account management"],
  missing_keyword_details: [
    {
      keyword: "account management",
      importance: "Required" as const,
    },
  ],
};

const mockActiveResume = {
  id: 42,
  name: "Customer Success Resume",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  format_label: "PDF",
  has_readable_text: true,
  readable_text_chars: 1520,
};

function mockInvokeResponses(responses: Record<string, unknown | Error>) {
  mockInvoke.mockImplementation((command) => {
    if (Object.prototype.hasOwnProperty.call(responses, command)) {
      const response = responses[command];
      if (response instanceof Error) return Promise.reject(response);
      return Promise.resolve(response);
    }
    if (command === "get_active_resume") return Promise.resolve(null);
    return Promise.resolve(mockAnalysis);
  });
}

async function openResumeAppImport(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /import from resume app/i }));
}

describe("ResumeMatch", () => {
  const privateFailure = new Error(
    "token=raw-secret private@example.test local-resume-file"
  );

  const toastErrorText = () => mockToast.error.mock.calls.flat().join(" ");

  beforeEach(() => {
    vi.clearAllMocks();
    mockReadStorageValue.mockReturnValue(null);
    mockRemoveStorageValue.mockReturnValue(true);
    mockWriteStorageValue.mockReturnValue(true);
    mockInvokeResponses({});
  });

  it("exposes named back and bullet draft controls", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(<ResumeMatch onBack={onBack} />);

    await user.click(screen.getByRole("button", { name: /back to dashboard/i }));
    expect(onBack).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: /draft alternative bullet/i }));

    expect(
      screen.getByRole("textbox", { name: /current bullet point/i }),
    ).toBeInTheDocument();
  });

  it("starts with choose or add before copied resume details import", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<ResumeMatch onBack={vi.fn()} onNavigate={onNavigate} />);

    expect(screen.getByText(/choose a saved resume or add one/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/copied resume details/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/for a PDF resume/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/choose a saved resume or upload one/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /choose or add resume/i }));

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith("resume");
    });

    await openResumeAppImport(user);

    expect(screen.getByLabelText(/copied resume details/i)).toBeInTheDocument();
  });

  it("restores local review draft after navigating to add a resume", async () => {
    mockReadStorageValue.mockReturnValueOnce(JSON.stringify({
      jobDescription: "Need onboarding and retention experience",
      resumeJson: JSON.stringify(validResume),
      analysisResult: mockJobAnalysis,
      analysisInputSource: "copied",
      showAdvancedResumeImport: true,
      showComparison: true,
    }));

    render(<ResumeMatch onBack={vi.fn()} onNavigate={vi.fn()} />);

    expect(screen.getByLabelText(/^job post$/i)).toHaveValue(
      "Need onboarding and retention experience",
    );
    expect(screen.getByLabelText(/copied resume details/i)).toHaveValue(
      JSON.stringify(validResume),
    );
    expect(screen.getByText("Resume Fit")).toBeInTheDocument();
    expect(mockRemoveStorageValue).toHaveBeenCalledWith(
      "session",
      "jobsentinel-resume-match-draft-v1",
    );
  });

  it("discloses same-session copied resume draft restore behavior", async () => {
    const user = userEvent.setup();

    render(<ResumeMatch onBack={vi.fn()} onNavigate={vi.fn()} />);

    await openResumeAppImport(user);

    expect(
      screen.getByText(/can be restored during this app session/i),
    ).toBeInTheDocument();
  });

  it("saves local review draft before opening the resume page", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<ResumeMatch onBack={vi.fn()} onNavigate={onNavigate} />);

    fireEvent.change(screen.getByLabelText(/^job post$/i), {
      target: { value: "Need onboarding and retention experience" },
    });
    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /choose or add resume/i }));

    expect(mockWriteStorageValue).toHaveBeenCalledWith(
      "session",
      "jobsentinel-resume-match-draft-v1",
      expect.stringContaining("Need onboarding and retention experience"),
    );
    expect(onNavigate).toHaveBeenCalledWith("resume");
  });

  it("reviews a job against the active saved resume without copied details", async () => {
    const user = userEvent.setup();
    mockInvoke.mockImplementation((command) => {
      if (command === "get_active_resume") return Promise.resolve(mockActiveResume);
      if (command === "analyze_active_resume_for_job") return Promise.resolve(mockJobAnalysis);
      return Promise.resolve(mockAnalysis);
    });
    render(<ResumeMatch onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /choose or add resume/i }));

    expect(await screen.findByText(/selected resume:/i)).toBeInTheDocument();
    expect(screen.getByText(mockActiveResume.name)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^job post$/i), {
      target: { value: "Need onboarding, retention, and account management experience" },
    });
    await user.click(screen.getByRole("button", { name: /review match/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("analyze_active_resume_for_job", {
        jobDescription: "Need onboarding, retention, and account management experience",
      });
    });
    expect(mockInvoke).not.toHaveBeenCalledWith("analyze_resume_for_job", expect.anything());
    expect(await screen.findByText("Resume Fit")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /show comparison/i })).not.toBeInTheDocument();
  });

  it("shows selected resume readable-text status before match review", async () => {
    mockInvoke.mockImplementation((command) => {
      if (command === "get_active_resume") return Promise.resolve(mockActiveResume);
      return Promise.resolve(mockAnalysis);
    });
    render(<ResumeMatch onBack={vi.fn()} />);

    expect(await screen.findByText(/selected resume:/i)).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText("1,520 readable characters for local review.")).toBeInTheDocument();
    expect(screen.queryByText(/file_path|parsed_text|resume=private-file/i)).not.toBeInTheDocument();
  });

  it("shows unreadable selected resume status before match review", async () => {
    mockInvoke.mockImplementation((command) => {
      if (command === "get_active_resume") {
        return Promise.resolve({
          ...mockActiveResume,
          format_label: "DOCX",
          has_readable_text: false,
          readable_text_chars: 0,
        });
      }
      return Promise.resolve(mockAnalysis);
    });
    render(<ResumeMatch onBack={vi.fn()} />);

    expect(await screen.findByText(/selected resume:/i)).toBeInTheDocument();
    expect(screen.getByText("DOCX")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No readable text found. Follow employer file instructions first, then choose a readable PDF, DOCX, TXT, Markdown, or HTML resume.",
      ),
    ).toBeInTheDocument();
  });

  it("loads the active saved resume on page open and reviews without an extra resume click", async () => {
    const user = userEvent.setup();
    mockInvoke.mockImplementation((command) => {
      if (command === "get_active_resume") return Promise.resolve(mockActiveResume);
      if (command === "analyze_active_resume_for_job") return Promise.resolve(mockJobAnalysis);
      return Promise.resolve(mockAnalysis);
    });
    render(<ResumeMatch onBack={vi.fn()} />);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("get_active_resume");
    });
    expect(await screen.findByText(/selected resume:/i)).toBeInTheDocument();
    expect(screen.getByText(mockActiveResume.name)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^job post$/i), {
      target: { value: "Need onboarding, retention, and account management experience" },
    });
    await user.click(screen.getByRole("button", { name: /review match/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("analyze_active_resume_for_job", {
        jobDescription: "Need onboarding, retention, and account management experience",
      });
    });
    expect(mockToast.success).toHaveBeenCalledWith(
      "Review ready",
      "Use the details below as a guide before you apply.",
    );
    expect(mockToast.success).not.toHaveBeenCalledWith(
      "Resume selected",
      expect.any(String),
    );
  });

  it("validates copied resume details before format review", async () => {
    const user = userEvent.setup();
    render(<ResumeMatch onBack={vi.fn()} />);

    await openResumeAppImport(user);

    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify({ contact_info: { name: "Jane" } }) },
    });

    await user.click(screen.getByRole("button", { name: /review format only/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Could not read copied resume details",
      "Choose or add a resume instead, or paste copied resume details from JobSentinel or another resume app.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith("analyze_resume_format", expect.anything());
  });

  it("validates copied resume details before match review", async () => {
    const user = userEvent.setup();
    render(<ResumeMatch onBack={vi.fn()} />);

    await openResumeAppImport(user);

    fireEvent.change(screen.getByLabelText(/^job post$/i), {
      target: { value: "Need onboarding and retention experience" },
    });
    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify("not a resume") },
    });

    await user.click(screen.getByRole("button", { name: /review match/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Could not read copied resume details",
      "Choose or add a resume instead, or paste copied resume details from JobSentinel or another resume app.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith("analyze_resume_for_job", expect.anything());
  });

  it("uses action-first validation copy before match review without a job post", async () => {
    const user = userEvent.setup();
    render(<ResumeMatch onBack={vi.fn()} />);

    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review match/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Add job post",
      "Paste the job post, then review again.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith("analyze_resume_for_job", expect.anything());
  });

  it("submits valid copied resume details for format review", async () => {
    const user = userEvent.setup();
    render(<ResumeMatch onBack={vi.fn()} />);

    await openResumeAppImport(user);

    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review format only/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("analyze_resume_format", {
        resume: validResume,
      });
    });
    expect(mockToast.success).toHaveBeenCalledWith(
      "Format review complete",
      "Review the format details below.",
    );
  });

  it("explains strong resume words without screening-tool framing", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({ get_ats_power_words: ["Led", "Improved"] });
    render(<ResumeMatch onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /view action words/i }));

    expect(await screen.findByText("Action Words for Clarity")).toBeInTheDocument();
    expect(screen.getByText(/make bullet points easier to scan/i)).toBeInTheDocument();
    expect(screen.queryByText(/Strong Resume Words/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ATS systems/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/screening tools/i)).not.toBeInTheDocument();
  });

  it("gives a plain recovery path when Resume Builder cannot receive the job post", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    mockWriteStorageValue.mockReturnValueOnce(false);
    render(<ResumeMatch onBack={vi.fn()} onNavigate={onNavigate} />);

    fireEvent.change(screen.getByLabelText(/^job post$/i), {
      target: { value: "Need onboarding and retention experience" },
    });
    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review match/i }));

    const builderButton = await screen.findByRole("button", { name: /review in resume builder/i });
    await user.click(builderButton);

    expect(mockToast.error).toHaveBeenCalledWith(
      "Could not open Resume Builder with this job",
      "Copy the job post and paste it in Resume Builder instead.",
    );
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("does not show raw private details when job analysis fails", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({ analyze_resume_for_job: privateFailure });
    render(<ResumeMatch onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^job post$/i), {
      target: { value: "Need onboarding and retention experience" },
    });
    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review match/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Review could not run",
        expect.stringContaining("safe support report")
      );
    });

    expect(toastErrorText()).not.toMatch(/raw-secret|private@example\.test|resume=private-file/);
  });

  it("does not show raw private details when format analysis fails", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({ analyze_resume_format: privateFailure });
    render(<ResumeMatch onBack={vi.fn()} />);

    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review format only/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Review could not run",
        expect.stringContaining("safe support report")
      );
    });

    expect(toastErrorText()).not.toMatch(/raw-secret|private@example\.test|resume=private-file/);
  });

  it("does not show raw private details when bullet improvement fails", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({ improve_bullet_point: privateFailure });
    render(<ResumeMatch onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /draft alternative bullet/i }));
    fireEvent.change(screen.getByPlaceholderText(/reduce missed appointments/i), {
      target: { value: "Improved customer onboarding." },
    });
    await user.click(screen.getByRole("button", { name: "Draft" }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Could not draft bullet",
        expect.stringContaining("safe support report")
      );
    });

    expect(toastErrorText()).not.toMatch(/raw-secret|private@example\.test|resume=private-file/);
  });

  it("shows plain bullet frameworks before drafting an alternative", async () => {
    const user = userEvent.setup();
    render(<ResumeMatch onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /draft alternative bullet/i }));

    expect(screen.getByText("Use one simple structure")).toBeInTheDocument();
    expect(screen.getByText(/Action \+ scope \+ method \+ result/i)).toBeInTheDocument();
    expect(screen.getByText(/X-Y-Z/i)).toBeInTheDocument();
    expect(screen.getByText(/CAR/i)).toBeInTheDocument();
    expect(screen.getByText(/Only use details that are true/i)).toBeInTheDocument();
    expect(screen.queryByText(/beat ATS/i)).not.toBeInTheDocument();
  });

  it("uses action-first validation copy before drafting an empty bullet", async () => {
    const user = userEvent.setup();
    render(<ResumeMatch onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /draft alternative bullet/i }));
    await user.click(screen.getByRole("button", { name: "Draft" }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Add a bullet point",
      "Paste or write one bullet, then draft again.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith("improve_bullet_point", expect.anything());
  });
});
