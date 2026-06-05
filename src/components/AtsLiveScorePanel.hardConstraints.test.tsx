import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AtsLiveScorePanel, AtsAnalysisResult } from "./AtsLiveScorePanel";

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

vi.mock("../utils/errorUtils", () => ({
  logError: vi.fn(),
}));

const waitForAnalysis = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
};

const mockResumeData = {
  contact: {
    name: "Jordan Lee",
    email: "jordan@example.com",
    phone: "555-1234",
    linkedin: "linkedin.com/in/jordanlee",
    github: null,
    location: "Chicago, IL",
    website: null,
  },
  summary: "Customer support lead with 5+ years helping clients...",
  experience: [
    {
      id: 1,
      title: "Customer Support Lead",
      company: "CareBridge Services",
      location: "Chicago",
      start_date: "2020-01",
      end_date: null,
      achievements: ["Coached team of 5", "Improved response time by 40%"],
    },
  ],
  education: [
    {
      id: 1,
      degree: "BA Communications",
      institution: "State University",
      location: "Chicago",
      graduation_date: "2018-05",
      gpa: "3.8",
      honors: ["Magna Cum Laude"],
    },
  ],
  skills: [
    { name: "Customer service", category: "Service", proficiency: "expert" as const },
    { name: "Scheduling tools", category: "Tools", proficiency: "advanced" as const },
  ],
};

const mockAnalysis: AtsAnalysisResult = {
  overall_score: 75,
  keyword_score: 80,
  format_score: 70,
  completeness_score: 75,
  keyword_matches: [],
  missing_keywords: [],
  missing_keyword_details: [],
  format_issues: [],
  suggestions: [],
};

describe("AtsLiveScorePanel hard constraints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    mockInvoke.mockResolvedValue(mockAnalysis);
  });

  afterEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows hard must-haves to check in plain language", async () => {
    mockInvoke.mockResolvedValue({
      ...mockAnalysis,
      hard_constraint_risks: [
        {
          requirement: "work authorization",
          category: "WorkAuthorization",
          score_cap: 60,
          reason: "A required hard constraint was not clearly found in the resume.",
          action: "Check work authorization before tailoring. If it is not true for you, do not claim it.",
        },
      ],
    } satisfies AtsAnalysisResult);

    render(
      <AtsLiveScorePanel
        resumeData={mockResumeData}
        currentStep={1}
        debounceMs={10}
      />
    );

    await waitForAnalysis();

    expect(screen.getByText("1 must-have to check")).toBeInTheDocument();
    expect(screen.getByText("Must-haves need review before tailoring")).toBeInTheDocument();
    expect(
      screen.getByText(/Check work authorization before editing this resume/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /review details/i }));

    expect(screen.getByText("Must-Haves To Check (1)")).toBeInTheDocument();
    expect(screen.getByText("Work authorization")).toBeInTheDocument();
    expect(screen.getByText("Check work authorization")).toBeInTheDocument();
    expect(screen.getByText(/If it is not true for you, do not claim it/i)).toBeInTheDocument();
    expect(screen.queryByText("WorkAuthorization")).not.toBeInTheDocument();
    expect(screen.queryByText(/score cap/i)).not.toBeInTheDocument();
  });

  it("labels citizenship must-haves as citizenship instead of work authorization", async () => {
    mockInvoke.mockResolvedValue({
      ...mockAnalysis,
      hard_constraint_risks: [
        {
          requirement: "us citizenship",
          category: "WorkAuthorization",
          score_cap: 50,
          reason: "A required hard constraint was not clearly found in the resume.",
          action:
            "Check citizenship before tailoring. If it is not true for you, do not claim it.",
        },
      ],
    } satisfies AtsAnalysisResult);

    render(
      <AtsLiveScorePanel
        resumeData={mockResumeData}
        currentStep={1}
        debounceMs={10}
      />
    );

    await waitForAnalysis();

    expect(screen.getByText("1 must-have to check")).toBeInTheDocument();
    expect(screen.getByText(/Citizenship:/i)).toBeInTheDocument();
    expect(screen.queryByText(/Work authorization:/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /review details/i }));

    expect(screen.getByText("Citizenship")).toBeInTheDocument();
    expect(screen.queryByText("Work authorization")).not.toBeInTheDocument();
  });

  it("shows age must-haves with an age requirement label", async () => {
    mockInvoke.mockResolvedValue({
      ...mockAnalysis,
      hard_constraint_risks: [
        {
          requirement: "18 years of age",
          category: "Age",
          score_cap: 70,
          reason: "A required hard constraint was not clearly found in the resume.",
          action:
            "Check the minimum-age or legal work-age requirement before tailoring. If it is not true for you, do not claim it.",
        },
      ],
    } satisfies AtsAnalysisResult);

    render(
      <AtsLiveScorePanel
        resumeData={mockResumeData}
        currentStep={1}
        debounceMs={10}
      />
    );

    await waitForAnalysis();

    expect(screen.getByText("1 must-have to check")).toBeInTheDocument();
    expect(screen.getByText(/Age requirement:/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /review details/i }));

    expect(screen.getByText("Age requirement")).toBeInTheDocument();
    expect(screen.getByText(/minimum-age or legal work-age/i)).toBeInTheDocument();
    expect(screen.queryByText("Age")).not.toBeInTheDocument();
  });

  it("shows hard must-haves from required review rows when risk list is absent", async () => {
    mockInvoke.mockResolvedValue({
      ...mockAnalysis,
      hard_constraint_risks: [],
      requirement_reviews: [
        {
          keyword: "work authorization",
          importance: "Required",
          match_state: "Partial",
          evidence_sections: ["summary"],
          hard_constraint: true,
          recommendation: "Only rely on it if it is true and supported by evidence.",
        },
      ],
    } satisfies AtsAnalysisResult);

    render(
      <AtsLiveScorePanel
        resumeData={mockResumeData}
        currentStep={1}
        debounceMs={10}
      />
    );

    await waitForAnalysis();

    expect(screen.getByText("1 must-have to check")).toBeInTheDocument();
    expect(
      screen.getByText(/Check work authorization before editing this resume/i),
    ).toBeInTheDocument();
  });
});
