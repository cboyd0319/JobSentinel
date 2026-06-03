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

const mockGroupedGapAnalysis = {
  ...mockAnalysis,
  keyword_matches: [],
  missing_keywords: ["case management", "salesforce"],
  missing_keyword_details: [
    {
      keyword: "case management",
      importance: "Required" as const,
    },
    {
      keyword: "salesforce",
      importance: "Preferred" as const,
    },
  ],
};

const mockRequirementReviewAnalysis = {
  ...mockAnalysis,
  overall_score: 60,
  keyword_matches: [
    {
      keyword: "scheduling",
      importance: "Required" as const,
      found_in: ["experience"],
      frequency: 1,
    },
    {
      keyword: "crm",
      importance: "Required" as const,
      found_in: ["skills"],
      frequency: 1,
    },
  ],
  missing_keywords: ["security clearance"],
  missing_keyword_details: [
    {
      keyword: "security clearance",
      importance: "Required" as const,
    },
  ],
  requirement_reviews: [
    {
      keyword: "security clearance",
      importance: "Required" as const,
      match_state: "Missing" as const,
      evidence_sections: [],
      hard_constraint: true,
      recommendation:
        "Only add it if true. If this is required and not true, treat the role as higher risk.",
    },
    {
      keyword: "crm",
      importance: "Required" as const,
      match_state: "Partial" as const,
      evidence_sections: ["skills"],
      hard_constraint: false,
      recommendation:
        "Found in a lighter evidence area. Add supporting evidence only if true.",
    },
    {
      keyword: "scheduling",
      importance: "Required" as const,
      match_state: "Direct" as const,
      evidence_sections: ["experience"],
      hard_constraint: false,
      recommendation:
        "Found visible evidence. Keep it clear and tied to real work or credentials.",
    },
  ],
  hard_constraint_risks: [
    {
      requirement: "security clearance",
      category: "SecurityClearance" as const,
      score_cap: 60,
      reason: "A required hard constraint was not clearly found in the resume.",
      action:
        "Verify this before tailoring. If it is not true for you, do not claim it.",
    },
  ],
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

describe("ResumeOptimizer", () => {
  const privateFailure = new Error(
    "token=raw-secret chad@example.com /Users/chad/private/resume.pdf"
  );

  const toastErrorText = () => mockToast.error.mock.calls.flat().join(" ");

  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteStorageValue.mockReturnValue(true);
    mockInvokeResponses({});
  });

  it("starts with choose or add before copied resume details import", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<ResumeOptimizer onBack={vi.fn()} onNavigate={onNavigate} />);

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

  it("reviews a job against the active saved resume without copied details", async () => {
    const user = userEvent.setup();
    mockInvoke.mockImplementation((command) => {
      if (command === "get_active_resume") return Promise.resolve(mockActiveResume);
      if (command === "analyze_active_resume_for_job") return Promise.resolve(mockJobAnalysis);
      return Promise.resolve(mockAnalysis);
    });
    render(<ResumeOptimizer onBack={vi.fn()} />);

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
    render(<ResumeOptimizer onBack={vi.fn()} />);

    expect(await screen.findByText(/selected resume:/i)).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText("1,520 readable characters for local review.")).toBeInTheDocument();
    expect(screen.queryByText(/file_path|parsed_text|\/Users\//i)).not.toBeInTheDocument();
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
    render(<ResumeOptimizer onBack={vi.fn()} />);

    expect(await screen.findByText(/selected resume:/i)).toBeInTheDocument();
    expect(screen.getByText("DOCX")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No readable text found. Follow employer file instructions first, then choose a readable PDF, DOCX, TXT, or Markdown resume.",
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
    render(<ResumeOptimizer onBack={vi.fn()} />);

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
    render(<ResumeOptimizer onBack={vi.fn()} />);

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
    render(<ResumeOptimizer onBack={vi.fn()} />);

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
    render(<ResumeOptimizer onBack={vi.fn()} />);

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
    render(<ResumeOptimizer onBack={vi.fn()} />);

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

  it("uses plain job-word copy for job match results", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({ analyze_resume_for_job: mockJobAnalysis });
    render(<ResumeOptimizer onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^job post$/i), {
      target: { value: "Need onboarding, retention, and account management experience" },
    });
    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review match/i }));

    await waitFor(() => {
      expect(screen.getByText("Resume Fit")).toBeInTheDocument();
    });

    expect(screen.getByText("Job Words Overview")).toBeInTheDocument();
    expect(screen.getByText("Job words")).toBeInTheDocument();
    expect(screen.getByText("Resume Quality")).toBeInTheDocument();
    expect(screen.getByText("Readable format")).toBeInTheDocument();
    expect(screen.getByText("Details included")).toBeInTheDocument();
    expect(screen.getByText("Overall fit")).toBeInTheDocument();
    expect(
      screen.getByText("Local evidence review, not a hiring prediction or a promise about employer systems."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Clear evidence").length).toBeGreaterThan(0);
    expect(screen.queryByText("Overall Match")).not.toBeInTheDocument();
    expect(screen.getByText("Words Found (2)")).toBeInTheDocument();
    expect(screen.getByText("Words To Review (1)")).toBeInTheDocument();
    expect(screen.getByText("Only use these words when they honestly fit your experience and improve clarity.")).toBeInTheDocument();
    expect(
      screen.getByText("Do not force words you cannot support with real work, training, or credentials."),
    ).toBeInTheDocument();
    expect(mockToast.success).toHaveBeenCalledWith(
      "Review ready",
      "Use the details below as a guide before you apply.",
    );
    expect(mockToast.success).not.toHaveBeenCalledWith(
      "Review complete",
      expect.stringContaining("Overall match"),
    );
    expect(screen.queryByText("Completeness")).not.toBeInTheDocument();
    expect(screen.queryByText(/Words To Add/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Keyword Matches/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Missing Keywords/i)).not.toBeInTheDocument();
  });

  it("groups words to review by required and preferred job-post language", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({ analyze_resume_for_job: mockGroupedGapAnalysis });
    render(<ResumeOptimizer onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^job post$/i), {
      target: { value: "Required: case management\n\nPreferred: salesforce" },
    });
    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review match/i }));

    expect(await screen.findByText("Words To Review (2)")).toBeInTheDocument();
    expect(screen.getByText("Required to Review")).toBeInTheDocument();
    expect(screen.getByText("Preferred to Review")).toBeInTheDocument();
    expect(screen.getByText("case management")).toBeInTheDocument();
    expect(screen.getByText("salesforce")).toBeInTheDocument();
    expect(screen.getByText(/Start with required job-post language/i)).toBeInTheDocument();
  });

  it("shows requirement states and hard requirements before tailoring", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({ analyze_resume_for_job: mockRequirementReviewAnalysis });
    render(<ResumeOptimizer onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^job post$/i), {
      target: {
        value: "Required: scheduling, CRM, security clearance",
      },
    });
    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review match/i }));

    expect(await screen.findByText("Evidence status")).toBeInTheDocument();
    expect(screen.getByText("Check must-haves first")).toBeInTheDocument();
    expect(screen.getByText(/required item needs verification before tailoring/i)).toBeInTheDocument();
    expect(await screen.findByText("Hard Requirements To Check (1)")).toBeInTheDocument();
    expect(screen.getByText("Security clearance")).toBeInTheDocument();
    expect(screen.getAllByText("Check first").length).toBeGreaterThan(0);
    expect(screen.getByText(/Verify this before tailoring/i)).toBeInTheDocument();
    expect(screen.getByText("Requirement Review (3)")).toBeInTheDocument();
    expect(screen.getByText("Visible evidence")).toBeInTheDocument();
    expect(screen.getAllByText("Needs support").length).toBeGreaterThan(0);
    expect(screen.getByText("Not found")).toBeInTheDocument();
    expect(screen.getByText("Hard requirement")).toBeInTheDocument();
    expect(screen.getAllByText("Found in: skills list").length).toBeGreaterThan(0);
    expect(screen.getByText("No clear resume evidence found")).toBeInTheDocument();
  });

  it("shows plain labels for requirement evidence sections", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({
      analyze_resume_for_job: {
        ...mockRequirementReviewAnalysis,
        requirement_reviews: [
          {
            keyword: "scheduling",
            importance: "Required" as const,
            match_state: "Strong" as const,
            evidence_sections: ["current experience", "skills"],
            hard_constraint: false,
            recommendation:
              "Strong visible evidence found. Keep it easy to see near the relevant role.",
          },
        ],
      },
    });
    render(<ResumeOptimizer onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^job post$/i), {
      target: {
        value: "Required: scheduling",
      },
    });
    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review match/i }));

    expect(await screen.findByText("Requirement Review (1)")).toBeInTheDocument();
    expect(screen.getByText("Found in: current role experience, skills list")).toBeInTheDocument();
    expect(screen.queryByText("Found in: current experience, skills")).not.toBeInTheDocument();
  });

  it("shows plain next actions from requirement review results", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({ analyze_resume_for_job: mockRequirementReviewAnalysis });
    render(<ResumeOptimizer onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^job post$/i), {
      target: {
        value: "Required: scheduling, CRM, security clearance",
      },
    });
    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review match/i }));

    expect(await screen.findByText("What To Do Next")).toBeInTheDocument();
    expect(screen.getByText(/Check security clearance before tailoring/i)).toBeInTheDocument();
    expect(screen.getByText(/Add supporting evidence for crm only if true/i)).toBeInTheDocument();
    expect(screen.getByText(/Keep scheduling visible/i)).toBeInTheDocument();
    expect(screen.queryByText(/maximize/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/guarantee/i)).not.toBeInTheDocument();
  });

  it("shows experience-specific next action guidance for hard requirements", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({
      analyze_resume_for_job: {
        ...mockAnalysis,
        overall_score: 58,
        hard_constraint_risks: [
          {
            requirement: "8+ years of payroll management",
            category: "Experience" as const,
            score_cap: 65,
            reason: "A required experience constraint was not clearly found.",
            action:
              "Verify this before tailoring. If it is not true for you, do not claim it.",
          },
        ],
      },
    });
    render(<ResumeOptimizer onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^job post$/i), {
      target: {
        value: "Required: 8+ years of payroll management",
      },
    });
    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review match/i }));

    expect(await screen.findByText("What To Do Next")).toBeInTheDocument();
    expect(
      screen.getByText(/check 8\+ years of payroll management before tailoring/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/do not round up or imply more experience/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Years of experience")).toBeInTheDocument();
  });

  it("shows physical-demand next action guidance for hard requirements", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({
      analyze_resume_for_job: {
        ...mockAnalysis,
        overall_score: 58,
        hard_constraint_risks: [
          {
            requirement: "lift 50 pounds",
            category: "PhysicalRequirement" as const,
            score_cap: 70,
            reason: "A required physical demand was not clearly found.",
            action:
              "Verify this before tailoring. If it is not true for you, do not claim it.",
          },
        ],
      },
    });
    render(<ResumeOptimizer onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^job post$/i), {
      target: {
        value: "Required: lift 50 pounds",
      },
    });
    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review match/i }));

    expect(await screen.findByText("Physical requirement")).toBeInTheDocument();
    expect(
      screen.getByText(/if this physical demand is not workable or safe for you/i),
    ).toBeInTheDocument();
  });

  it("explains strong resume words without screening-tool framing", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({ get_ats_power_words: ["Led", "Improved"] });
    render(<ResumeOptimizer onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /view action words/i }));

    expect(await screen.findByText("Action Words for Clarity")).toBeInTheDocument();
    expect(screen.getByText(/make bullet points easier to scan/i)).toBeInTheDocument();
    expect(screen.queryByText(/Strong Resume Words/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ATS systems/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/screening tools/i)).not.toBeInTheDocument();
  });

  it("shows plain suggestion category labels", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({ analyze_resume_format: mockSuggestionAnalysis });
    render(<ResumeOptimizer onBack={vi.fn()} />);

    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review format only/i }));

    expect(await screen.findByText("Suggestions (2)")).toBeInTheDocument();
    expect(screen.getByText("Add job words")).toBeInTheDocument();
    expect(screen.getByText("Rewrite bullet")).toBeInTheDocument();
    expect(screen.queryByText("AddKeyword")).not.toBeInTheDocument();
    expect(screen.queryByText("RewordBullet")).not.toBeInTheDocument();
  });

  it("shows safety suggestion labels for format-fix guidance", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({
      analyze_resume_format: {
        ...mockAnalysis,
        format_issues: [
          {
            severity: "Warning" as const,
            issue: "Instruction-like or hidden resume text detected",
            fix: "Remove instructions aimed at screening tools and keep only truthful qualifications.",
          },
        ],
        suggestions: [
          {
            category: "FormatFix" as const,
            suggestion:
              "Review the resume for prompt-injection-like instructions, hidden text, or invisible characters before using it.",
            impact:
              "Keeps the resume readable and avoids tactics that can backfire with employers or screening systems.",
          },
        ],
      },
    });
    render(<ResumeOptimizer onBack={vi.fn()} />);

    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review format only/i }));

    expect(await screen.findByText("Suggestions (1)")).toBeInTheDocument();
    expect(screen.getByText("Safety check")).toBeInTheDocument();
    expect(screen.getByText(/prompt-injection-like instructions/i)).toBeInTheDocument();
    expect(screen.queryByText("FormatFix")).not.toBeInTheDocument();
  });

  it("shows plain labels for reorder-content suggestions", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({
      analyze_resume_format: {
        ...mockAnalysis,
        suggestions: [
          {
            category: "ReorderContent" as const,
            suggestion: "Move recent patient coordination work above older roles.",
            impact: "Makes the most relevant evidence easier to find first.",
          },
        ],
      },
    });
    render(<ResumeOptimizer onBack={vi.fn()} />);

    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review format only/i }));

    expect(await screen.findByText("Suggestions (1)")).toBeInTheDocument();
    expect(screen.getByText("Reorder content")).toBeInTheDocument();
    expect(screen.queryByText("ReorderContent")).not.toBeInTheDocument();
  });

  it("uses plain labels for readability details", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({ analyze_resume_format: mockIssueAnalysis });
    render(<ResumeOptimizer onBack={vi.fn()} />);

    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review format only/i }));

    expect(await screen.findByText("Details to Check (1)")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Summary could be easier to read")).toBeInTheDocument();
    expect(screen.getByText("Possible edit to review: Use one short paragraph.")).toBeInTheDocument();
    expect(screen.getByText("Why it helps: Makes the outcome easier to understand.")).toBeInTheDocument();
    expect(screen.queryByText("Warning")).not.toBeInTheDocument();
    expect(screen.queryByText(/Fix:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/How to fix/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Impact:/)).not.toBeInTheDocument();
  });

  it("shows concrete suggestion impact copy instead of internal priority words", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({
      analyze_resume_format: {
        ...mockAnalysis,
        suggestions: [
          {
            category: "AddSection" as const,
            suggestion: "Add work experience with measurable impact",
            impact: "Makes your work evidence easier to compare in one place.",
          },
        ],
      },
    });
    render(<ResumeOptimizer onBack={vi.fn()} />);

    await openResumeAppImport(user);
    fireEvent.change(screen.getByLabelText(/copied resume details/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /review format only/i }));

    expect(await screen.findByText("Suggestions (1)")).toBeInTheDocument();
    expect(screen.getByText(/Why it helps: Makes your work evidence easier to compare/i)).toBeInTheDocument();
    expect(screen.queryByText(/^High$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Medium$/)).not.toBeInTheDocument();
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
    render(<ResumeOptimizer onBack={vi.fn()} />);

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

    expect(toastErrorText()).not.toMatch(/raw-secret|chad@example\.com|\/Users\/chad/);
  });

  it("does not show raw private details when format analysis fails", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({ analyze_resume_format: privateFailure });
    render(<ResumeOptimizer onBack={vi.fn()} />);

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

    expect(toastErrorText()).not.toMatch(/raw-secret|chad@example\.com|\/Users\/chad/);
  });

  it("does not show raw private details when bullet improvement fails", async () => {
    const user = userEvent.setup();
    mockInvokeResponses({ improve_bullet_point: privateFailure });
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
