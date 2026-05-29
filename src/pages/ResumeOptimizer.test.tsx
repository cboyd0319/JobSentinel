import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import ResumeOptimizer from "./ResumeOptimizer";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
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
    name: "Jane Doe",
    email: "jane@example.com",
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
      degree: "BS Computer Science",
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

describe("ResumeOptimizer", () => {
  const privateFailure = new Error(
    "token=raw-secret chad@example.com /Users/chad/private/resume.pdf"
  );

  const toastErrorText = () => mockToast.error.mock.calls.flat().join(" ");

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(mockAnalysis);
  });

  it("validates resume JSON shape before format analysis", async () => {
    const user = userEvent.setup();
    render(<ResumeOptimizer onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/structured resume data/i), {
      target: { value: JSON.stringify({ contact_info: { name: "Jane" } }) },
    });

    await user.click(screen.getByRole("button", { name: /format only/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Resume data not recognized",
      "Paste structured resume data exported from JobSentinel or another supported tool.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith("analyze_resume_format", expect.anything());
  });

  it("validates resume JSON shape before job analysis", async () => {
    const user = userEvent.setup();
    render(<ResumeOptimizer onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^job description$/i), {
      target: { value: "Need onboarding and retention experience" },
    });
    fireEvent.change(screen.getByLabelText(/structured resume data/i), {
      target: { value: JSON.stringify("not a resume") },
    });

    await user.click(screen.getByRole("button", { name: /analyze with job/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Resume data not recognized",
      "Paste structured resume data exported from JobSentinel or another supported tool.",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith("analyze_resume_for_job", expect.anything());
  });

  it("submits valid resume JSON for format analysis", async () => {
    const user = userEvent.setup();
    render(<ResumeOptimizer onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/structured resume data/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /format only/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("analyze_resume_format", {
        resume: validResume,
      });
    });
    expect(mockToast.success).toHaveBeenCalledWith("Format analysis complete", "Format score: 84%");
  });

  it("uses plain job-word copy for job match results", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce(mockJobAnalysis);
    render(<ResumeOptimizer onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^job description$/i), {
      target: { value: "Need onboarding, retention, and account management experience" },
    });
    fireEvent.change(screen.getByLabelText(/structured resume data/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /analyze with job/i }));

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

  it("does not show raw private details when job analysis fails", async () => {
    const user = userEvent.setup();
    mockInvoke.mockRejectedValueOnce(privateFailure);
    render(<ResumeOptimizer onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^job description$/i), {
      target: { value: "Need onboarding and retention experience" },
    });
    fireEvent.change(screen.getByLabelText(/structured resume data/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /analyze with job/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Analysis could not run",
        expect.stringContaining("safe debug report")
      );
    });

    expect(toastErrorText()).not.toMatch(/raw-secret|chad@example\.com|\/Users\/chad/);
  });

  it("does not show raw private details when format analysis fails", async () => {
    const user = userEvent.setup();
    mockInvoke.mockRejectedValueOnce(privateFailure);
    render(<ResumeOptimizer onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/structured resume data/i), {
      target: { value: JSON.stringify(validResume) },
    });

    await user.click(screen.getByRole("button", { name: /format only/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Analysis could not run",
        expect.stringContaining("safe debug report")
      );
    });

    expect(toastErrorText()).not.toMatch(/raw-secret|chad@example\.com|\/Users\/chad/);
  });

  it("does not show raw private details when bullet improvement fails", async () => {
    const user = userEvent.setup();
    mockInvoke.mockRejectedValueOnce(privateFailure);
    render(<ResumeOptimizer onBack={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /improve bullet point/i }));
    fireEvent.change(screen.getByPlaceholderText(/reduce missed appointments/i), {
      target: { value: "Improved customer onboarding." },
    });
    await user.click(screen.getByRole("button", { name: "Improve" }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Could not improve bullet",
        expect.stringContaining("safe debug report")
      );
    });

    expect(toastErrorText()).not.toMatch(/raw-secret|chad@example\.com|\/Users\/chad/);
  });
});
