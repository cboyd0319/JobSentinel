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
  summary: "Senior engineer",
  experience: [
    {
      title: "Senior Engineer",
      company: "ExampleCo",
      location: "Remote",
      start_date: "2022-01",
      end_date: "Present",
      achievements: ["Built reliable systems"],
      current: true,
    },
  ],
  skills: [
    {
      name: "TypeScript",
      category: "Languages",
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

describe("ResumeOptimizer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(mockAnalysis);
  });

  it("validates resume JSON shape before format analysis", async () => {
    const user = userEvent.setup();
    render(<ResumeOptimizer onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/resume data in json format/i), {
      target: { value: JSON.stringify({ contact_info: { name: "Jane" } }) },
    });

    await user.click(screen.getByRole("button", { name: /format only/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Invalid resume JSON",
      "Paste resume JSON that matches the AtsResumeData schema",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith("analyze_resume_format", expect.anything());
  });

  it("validates resume JSON shape before job analysis", async () => {
    const user = userEvent.setup();
    render(<ResumeOptimizer onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/^job description$/i), {
      target: { value: "Need TypeScript and Rust" },
    });
    fireEvent.change(screen.getByLabelText(/resume data in json format/i), {
      target: { value: JSON.stringify("not a resume") },
    });

    await user.click(screen.getByRole("button", { name: /analyze with job/i }));

    expect(mockToast.error).toHaveBeenCalledWith(
      "Invalid resume JSON",
      "Paste resume JSON that matches the AtsResumeData schema",
    );
    expect(mockInvoke).not.toHaveBeenCalledWith("analyze_resume_for_job", expect.anything());
  });

  it("submits valid resume JSON for format analysis", async () => {
    const user = userEvent.setup();
    render(<ResumeOptimizer onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/resume data in json format/i), {
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
});
