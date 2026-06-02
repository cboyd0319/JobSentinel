import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { AtsLiveScorePanel, AtsAnalysisResult } from "./AtsLiveScorePanel";

// Mock Tauri invoke - use function returning promise for proper async flow
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock logError
vi.mock("../utils/errorUtils", () => ({
  logError: vi.fn(),
}));

// Helper to wait for analysis to complete
const waitForAnalysis = async () => {
  // Wait for debounce timeout and async invoke to complete
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
};

describe("AtsLiveScorePanel", () => {
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
    keyword_matches: [
      {
        keyword: "Customer service",
        importance: "Required",
        found_in: ["skills"],
        frequency: 1,
      },
      {
        keyword: "Scheduling",
        importance: "Preferred",
        found_in: ["skills"],
        frequency: 1,
      },
    ],
    missing_keywords: ["Spanish", "Zendesk"],
    format_issues: [
      {
        severity: "Warning",
        issue: "Summary could be longer",
        fix: "Add more details about your experience",
      },
    ],
    suggestions: [
      {
        category: "AddKeyword",
        suggestion: "Add Spanish to skills",
        impact: "High match improvement",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    mockInvoke.mockResolvedValue(mockAnalysis);
  });

  afterEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("shows empty state when no resume data", () => {
      render(<AtsLiveScorePanel resumeData={null} currentStep={1} />);

      expect(screen.getByText("Fill in your resume to see readability feedback")).toBeInTheDocument();
    });

    it("shows resume readability header", () => {
      render(<AtsLiveScorePanel resumeData={null} currentStep={1} />);

      expect(screen.getByText("Resume Readability")).toBeInTheDocument();
    });

    it("does not analyze when contact info is incomplete", async () => {
      const incompleteData = {
        ...mockResumeData,
        contact: { ...mockResumeData.contact, name: "", email: "" },
      };

      render(<AtsLiveScorePanel resumeData={incompleteData} currentStep={1} debounceMs={50} />);

      // Wait a bit longer than debounce time
      await new Promise((r) => setTimeout(r, 100));

      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("analyzing state", () => {
    it("shows analyzing indicator while processing", async () => {
      mockInvoke.mockImplementation(() => new Promise(() => {}));

      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={50}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("checking...")).toBeInTheDocument();
      });
    });
  });

  describe("score display", () => {
    it("displays overall score", async () => {
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByText("Some")).toBeInTheDocument();
      });
    });

    it("displays score label based on score", async () => {
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByText("Some")).toBeInTheDocument(); // 70-79 = Some
      });
    });

    it("shows score breakdown bars", async () => {
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByText("Job words")).toBeInTheDocument();
        expect(screen.getByText("Format")).toBeInTheDocument();
        expect(screen.getByText("Complete")).toBeInTheDocument();
      });
    });

    it("shows job word match count", async () => {
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByText("2 job words found")).toBeInTheDocument();
      });
    });

    it("shows missing keywords count", async () => {
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByText("2 missing")).toBeInTheDocument();
      });
    });

    it("shows format issues count", async () => {
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByText("1 issues")).toBeInTheDocument();
      });
    });
  });

  describe("score colors", () => {
    it("shows green for excellent scores (>=80)", async () => {
      mockInvoke.mockResolvedValue({ ...mockAnalysis, overall_score: 85 });

      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        const scoreElement = screen.getByText("85");
        expect(scoreElement.className).toContain("text-green");
      });
    });

    it("shows yellow for fair scores (60-79)", async () => {
      mockInvoke.mockResolvedValue({ ...mockAnalysis, overall_score: 65 });

      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        const scoreElement = screen.getByText("65");
        expect(scoreElement.className).toContain("text-yellow");
      });
    });

    it("shows red for poor scores (<40)", async () => {
      mockInvoke.mockResolvedValue({ ...mockAnalysis, overall_score: 30 });

      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        const scoreElement = screen.getByText("30");
        expect(scoreElement.className).toContain("text-red");
      });
    });
  });

  describe("score labels", () => {
    it("shows 'Strong' for scores >=90", async () => {
      mockInvoke.mockResolvedValue({ ...mockAnalysis, overall_score: 95 });

      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByText("Strong")).toBeInTheDocument();
      });
    });

    it("shows 'Low evidence' for scores <40", async () => {
      mockInvoke.mockResolvedValue({ ...mockAnalysis, overall_score: 25 });

      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByText("Low evidence")).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("shows safe error guidance on analysis failure", async () => {
      mockInvoke.mockRejectedValue(new Error("Analysis failed"));

      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByText(/safe support report/i)).toBeInTheDocument();
      });
    });

    it("does not show raw private details on analysis failure", async () => {
      mockInvoke.mockRejectedValue(
        new Error("token=raw-secret chad@example.com /Users/chad/private/resume.pdf")
      );

      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByText(/safe support report/i)).toBeInTheDocument();
      });
      expect(screen.queryByText(/raw-secret|chad@example\.com|\/Users\/chad/)).not.toBeInTheDocument();
    });

    it("shows close-message button on error", async () => {
      mockInvoke.mockRejectedValue(new Error("Network error"));

      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /close message/i })).toBeInTheDocument();
      });
    });

    it("shows try-again button on error", async () => {
      mockInvoke.mockRejectedValue(new Error("Network error"));

      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
      });
    });

    it("retries analysis when try-again button is clicked", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Network error"));
      mockInvoke.mockResolvedValueOnce(mockAnalysis);

      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /try again/i }));

      await waitForAnalysis();

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledTimes(2);
      });
    });

    it("clears error when close-message is clicked", async () => {
      mockInvoke.mockRejectedValue(new Error("Network error"));

      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /close message/i }));

      expect(screen.queryByText(/check your internet connection/i)).not.toBeInTheDocument();
    });
  });

  describe("tips section", () => {
    it("shows tips for contact step", () => {
      render(<AtsLiveScorePanel resumeData={null} currentStep={1} />);

      expect(screen.getByText("Quick Tips")).toBeInTheDocument();
      expect(screen.getByText("Include a professional email address")).toBeInTheDocument();
    });

    it("shows tips for summary step", () => {
      render(<AtsLiveScorePanel resumeData={null} currentStep={2} />);

      expect(screen.getByText("Keep summary to 2-3 sentences")).toBeInTheDocument();
    });

    it("shows tips for experience step", () => {
      render(<AtsLiveScorePanel resumeData={null} currentStep={3} />);

      expect(screen.getByText("Use action verbs to start bullet points")).toBeInTheDocument();
    });

    it("shows tips for education step", () => {
      render(<AtsLiveScorePanel resumeData={null} currentStep={4} />);

      expect(screen.getByText("Include degree, institution, and graduation date")).toBeInTheDocument();
    });

    it("shows tips for skills step", () => {
      render(<AtsLiveScorePanel resumeData={null} currentStep={5} />);

      expect(screen.getByText("Match skills to job requirements")).toBeInTheDocument();
      expect(screen.getByText("Include tools, workplace, and role-specific skills")).toBeInTheDocument();
      expect(screen.queryByText("Include technical, workplace, and role-specific skills")).not.toBeInTheDocument();
    });

    it("shows analysis-based tips when format score is low", async () => {
      mockInvoke.mockResolvedValue({ ...mockAnalysis, format_score: 50 });

      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByText("Use a simpler format so hiring systems can read it")).toBeInTheDocument();
      });
    });

    it("frames missing job words as truthful review", async () => {
      mockInvoke.mockResolvedValue({
        ...mockAnalysis,
        missing_keywords: ["Spanish", "Zendesk", "Scheduling", "Inventory"],
      });

      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByText(/Review job-post words for truthful fit:/)).toBeInTheDocument();
      });
      expect(screen.queryByText(/Add words from the job post/)).not.toBeInTheDocument();
    });
  });

  describe("details modal", () => {
    it("shows view details button", async () => {
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
          showFullAnalysis={true}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /view details/i })).toBeInTheDocument();
      });
    });

    it("hides view details button when showFullAnalysis is false", async () => {
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
          showFullAnalysis={false}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByText("Some")).toBeInTheDocument();
      });

      expect(screen.queryByRole("button", { name: /view details/i })).not.toBeInTheDocument();
    });

    it("opens modal when view details is clicked", async () => {
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /view details/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /view details/i }));

      expect(screen.getByText("Full Resume Readability Review")).toBeInTheDocument();
    });

    it("displays job words found in modal", async () => {
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /view details/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /view details/i }));

      expect(screen.getByText("Words Found (2)")).toBeInTheDocument();
    });

    it("displays words to review in modal", async () => {
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /view details/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /view details/i }));

      expect(screen.getByText("Words To Review (2)")).toBeInTheDocument();
      expect(screen.queryByText(/Words To Add/i)).not.toBeInTheDocument();
      expect(screen.getByText("Spanish")).toBeInTheDocument();
      expect(screen.getByText("Zendesk")).toBeInTheDocument();
    });

    it("displays format issues in modal", async () => {
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /view details/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /view details/i }));

      expect(screen.getByText("Details to Check (1)")).toBeInTheDocument();
      expect(screen.getByText("Review")).toBeInTheDocument();
      expect(screen.getByText("Summary could be longer")).toBeInTheDocument();
      expect(screen.getByText(/How to fix: Add more details/i)).toBeInTheDocument();
    });

    it("displays suggestions in modal", async () => {
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /view details/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /view details/i }));

      expect(screen.getByText("Suggestions (1)")).toBeInTheDocument();
      expect(screen.getByText("Add job words")).toBeInTheDocument();
      expect(screen.getByText("Add Spanish to skills")).toBeInTheDocument();
      expect(screen.queryByText("AddKeyword")).not.toBeInTheDocument();
      expect(screen.getByText(/Why it helps: High match improvement/i)).toBeInTheDocument();
    });
  });

  describe("debouncing", () => {
    it("uses format-only analysis when no job description", async () => {
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          "analyze_resume_format",
          expect.any(Object)
        );
      });
    });

    it("respects custom debounce time", async () => {
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      // Should not have called immediately
      expect(mockInvoke).not.toHaveBeenCalled();

      await waitForAnalysis();

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalled();
      });
    });
  });

  describe("job context", () => {
    it("does not show Saved Job badge without job description", () => {
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      expect(screen.queryByText("Saved Job")).not.toBeInTheDocument();
    });

    it("uses valid stored job context for full analysis", async () => {
      window.sessionStorage.setItem(
        "jobContext",
        JSON.stringify({
          timestamp: Date.now(),
          description: "Bilingual customer support role",
        }),
      );

      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Saved Job")).toBeInTheDocument();
      });
      await waitForAnalysis();

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          "analyze_resume_for_job",
          expect.objectContaining({ jobDescription: "Bilingual customer support role" }),
        );
      });
    });

    it("ignores malformed stored job context", async () => {
      window.sessionStorage.setItem(
        "jobContext",
        JSON.stringify({
          timestamp: Date.now(),
          description: { text: "not a string" },
        }),
      );

      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      expect(screen.queryByText("Saved Job")).not.toBeInTheDocument();
      await waitForAnalysis();

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          "analyze_resume_format",
          expect.any(Object),
        );
      });
    });

    it("ignores expired job context (>24 hours old)", () => {
      window.sessionStorage.setItem(
        "jobContext",
        JSON.stringify({
          timestamp: Date.now() - 25 * 60 * 60 * 1000,
          description: "Expired context",
        }),
      );

      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      expect(screen.queryByText("Saved Job")).not.toBeInTheDocument();
    });
  });

  describe("empty analysis sections", () => {
    it("hides keyword matches when empty", async () => {
      mockInvoke.mockResolvedValue({
        ...mockAnalysis,
        keyword_matches: [],
        missing_keywords: [],
        format_issues: [],
      });

      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByText("Some")).toBeInTheDocument();
      });

      expect(screen.queryByText(/job words found/)).not.toBeInTheDocument();
      expect(screen.queryByText(/missing/)).not.toBeInTheDocument();
      expect(screen.queryByText(/issues/)).not.toBeInTheDocument();
    });
  });
});
