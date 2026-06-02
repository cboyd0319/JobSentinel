import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import ResumeOptimizer from "./ResumeOptimizer";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockWriteStorageValue = vi.hoisted(() => vi.fn(() => true));

vi.mock("../utils/browserStorage", () => ({
  writeStorageValue: mockWriteStorageValue,
}));

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

vi.mock("../contexts", () => ({
  useToast: () => mockToast,
}));

vi.mock("../utils/errorUtils", () => ({
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
};

const mockSuggestionAnalysis = {
  ...mockAnalysis,
  suggestions: [
    {
      category: "AddKeyword" as const,
      suggestion: "Add account management if it honestly fits.",
      impact: "Helps align the resume with the job post.",
    },
    {
      category: "RewordBullet" as const,
      suggestion: "Rewrite one bullet to show customer outcomes.",
      impact: "Makes the result easier to understand.",
    },
  ],
};

const mockIssueAnalysis = {
  ...mockAnalysis,
  format_issues: [
    {
      severity: "Warning" as const,
      issue: "Summary could be easier to read",
      fix: "Use one short paragraph.",
    },
  ],
  suggestions: [
    {
      category: "RewordBullet" as const,
      suggestion: "Rewrite one bullet to show the result.",
      impact: "Makes the outcome easier to understand.",
    },
  ],
};

async function openResumeAppImport(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /import from resume app/i }));
}

describe("ResumeOptimizer", () => {
  const privateFailure = new Error(
    "token=raw-secret chad@example.com /Users/chad/private/resume.pdf"
  );

  const toastErrorText = () => mockToast.error.mock.calls.flat().join(" ");

  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteStorageValue.mockReturnValue(true);
    mockInvoke.mockResolvedValue(mockAnalysis);
  });

  it("starts with choose or upload before resume app export import", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<ResumeOptimizer onBack={vi.fn()} onNavigate={onNavigate} />);

    expect(screen.getByText(/choose a saved resume or upload one/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/resume app export/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/for a PDF resume/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /choose or upload resume/i }));

    expect(onNavigate).toHaveBeenCalledWith("resume");

    await openResumeAppImport(user);

    expect(screen.getByLabelText(/resume app export/i)).toBeInTheDocument();
  });

  it("validates resume app export before format review", async () => {
    const user = userEvent.setup();
    render(<ResumeOptimizer onBack={vi.fn()} />);

    await openResumeAppImport(user);

    fireEvent.change(screen.getByLabelText(/resume app export/i), {
      target: { value: JSON.stringify({ contact_info: { name: "Jane" } }) },
    });

    await user.click(screen.getByRole("button", { name: /review format only/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Resume app export not recognized",
      "Choose or upload a resume instead, or paste a resume app export from JobSentinel or another resume app.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith("analyze_resume_format", expect.anything());
  });

  it("validates resume app export before match review", async () => {
    const user = userEvent.setup();
    render(<ResumeOptimizer onBack={vi.fn()} />);

    await openResumeAppImport(user);

    fireEvent.change(screen.getByLabelText(/^job post$/i), {
      target: { value: "Need onboarding and retention experience" },
    });
    fireEvent.change(screen.getByLabelText(/resume app export/i), {
      target: { value: JSON.stringify("not a resume") },
    });

    await user.click(screen.getByRole("button", { name: /review match/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Resume app export not recognized",
      "Choose or upload a resume instead, or paste a resume app export from JobSentinel or another resume app.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith("analyze_resume_for_job", expect.anything());
  });

  it("uses action-first validation copy before match review without a job post", async () => {
    const user = userEvent.setup();
    render(<ResumeOptimizer onBack={vi.fn()} />);

    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/resume app export/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review match/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Add job post",
      "Paste the job post, then review again.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith("analyze_resume_for_job", expect.anything());
  });

  it("submits valid resume app export for format review", async () => {
    const user = userEvent.setup();
    render(<ResumeOptimizer onBack={vi.fn()} />);

    await openResumeAppImport(user);

    fireEvent.change(screen.getByLabelText(/resume app export/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review format only/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("analyze_resume_format", {
        resume: validResume,
      });
    });
    expect(mockToast.success).toHaveBeenCalledWith("Format review complete", "Format score: 84%");
  });

  it("uses plain job-word copy for job match results", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce(mockJobAnalysis);
    render(<ResumeOptimizer onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^job post$/i), {
      target: { value: "Need onboarding, retention, and account management experience" },
    });
    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/resume app export/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review match/i }));

    await waitFor(() => {
      expect(screen.getByText("Resume Match")).toBeInTheDocument();
    });

    expect(screen.getByText("Job Words Overview")).toBeInTheDocument();
    expect(screen.getByText("Job words")).toBeInTheDocument();
    expect(screen.getByText("Words Found (2)")).toBeInTheDocument();
    expect(screen.getByText("Words To Add (1)")).toBeInTheDocument();
    expect(screen.getByText("Only add these words when they honestly fit your experience.")).toBeInTheDocument();
    expect(screen.queryByText(/Keyword Matches/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Missing Keywords/i)).not.toBeInTheDocument();
  });

  it("explains strong resume words without screening-tool framing", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce(["Led", "Improved"]);
    render(<ResumeOptimizer onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /view strong resume words/i }));

    expect(await screen.findByText("Strong Resume Words")).toBeInTheDocument();
    expect(screen.getByText(/make bullet points easier to scan/i)).toBeInTheDocument();
    expect(screen.queryByText(/ATS systems/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/screening tools/i)).not.toBeInTheDocument();
  });

  it("shows plain suggestion category labels", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce(mockSuggestionAnalysis);
    render(<ResumeOptimizer onBack={vi.fn()} />);

    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/resume app export/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review format only/i }));

    expect(await screen.findByText("Suggestions (2)")).toBeInTheDocument();
    expect(screen.getByText("Add job words")).toBeInTheDocument();
    expect(screen.getByText("Rewrite bullet")).toBeInTheDocument();
    expect(screen.queryByText("AddKeyword")).not.toBeInTheDocument();
    expect(screen.queryByText("RewordBullet")).not.toBeInTheDocument();
  });

  it("uses plain labels for readability details", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce(mockIssueAnalysis);
    render(<ResumeOptimizer onBack={vi.fn()} />);

    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/resume app export/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review format only/i }));

    expect(await screen.findByText("Details to Check (1)")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Summary could be easier to read")).toBeInTheDocument();
    expect(screen.getByText("How to fix: Use one short paragraph.")).toBeInTheDocument();
    expect(screen.getByText("Why it helps: Makes the outcome easier to understand.")).toBeInTheDocument();
    expect(screen.queryByText("Warning")).not.toBeInTheDocument();
    expect(screen.queryByText(/Fix:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Impact:/)).not.toBeInTheDocument();
  });

  it("gives a plain recovery path when Resume Builder cannot receive the job post", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    mockWriteStorageValue.mockReturnValueOnce(false);
    render(<ResumeOptimizer onBack={vi.fn()} onNavigate={onNavigate} />);

    fireEvent.change(screen.getByLabelText(/^job post$/i), {
      target: { value: "Need onboarding and retention experience" },
    });
    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/resume app export/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review match/i }));

    const tailorButton = await screen.findByRole("button", { name: /tailor resume for this job/i });
    await user.click(tailorButton);

    expect(mockToast.error).toHaveBeenCalledWith(
      "Could not open Resume Builder with this job",
      "Copy the job post and paste it in Resume Builder instead.",
    );
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("does not show raw private details when job analysis fails", async () => {
    const user = userEvent.setup();
    mockInvoke.mockRejectedValueOnce(privateFailure);
    render(<ResumeOptimizer onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^job post$/i), {
      target: { value: "Need onboarding and retention experience" },
    });
    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/resume app export/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review match/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Review could not run",
        expect.stringContaining("safe support report")
      );
    });

    expect(toastErrorText()).not.toMatch(/raw-secret|chad@example\.com|\/Users\/chad/);
  });

  it("does not show raw private details when format analysis fails", async () => {
    const user = userEvent.setup();
    mockInvoke.mockRejectedValueOnce(privateFailure);
    render(<ResumeOptimizer onBack={vi.fn()} />);

    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/resume app export/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review format only/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Review could not run",
        expect.stringContaining("safe support report")
      );
    });

    expect(toastErrorText()).not.toMatch(/raw-secret|chad@example\.com|\/Users\/chad/);
  });

  it("does not show raw private details when bullet improvement fails", async () => {
    const user = userEvent.setup();
    mockInvoke.mockRejectedValueOnce(privateFailure);
    render(<ResumeOptimizer onBack={vi.fn()} />);

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

    expect(toastErrorText()).not.toMatch(/raw-secret|chad@example\.com|\/Users\/chad/);
  });

  it("uses action-first validation copy before drafting an empty bullet", async () => {
    const user = userEvent.setup();
    render(<ResumeOptimizer onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /draft alternative bullet/i }));
    await user.click(screen.getByRole("button", { name: "Draft" }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Add a bullet point",
      "Paste or write one bullet, then draft again.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith("improve_bullet_point", expect.anything());
  });
});
