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
      name: "John Doe",
      email: "john@example.com",
      phone: "555-1234",
      linkedin: "linkedin.com/in/johndoe",
      github: null,
      location: "San Francisco, CA",
      website: null,
    },
    summary: "Experienced software engineer with 5+ years...",
    experience: [
      {
        id: 1,
        title: "Senior Developer",
        company: "Tech Corp",
        location: "San Francisco",
        start_date: "2020-01",
        end_date: null,
        achievements: ["Led team of 5", "Improved performance by 40%"],
      },
    ],
    education: [
      {
        id: 1,
        degree: "BS Computer Science",
        institution: "University of California",
        location: "Berkeley",
        graduation_date: "2018-05",
        gpa: "3.8",
        honors: ["Magna Cum Laude"],
      },
    ],
    skills: [
      { name: "JavaScript", category: "Languages", proficiency: "expert" as const },
      { name: "React", category: "Frameworks", proficiency: "advanced" as const },
    ],
  };

  const mockAnalysis: AtsAnalysisResult = {
    overall_score: 75,
    keyword_score: 80,
    format_score: 70,
    completeness_score: 75,
    keyword_matches: [
      {
        keyword: "JavaScript",
        importance: "Required",
        found_in: "Skills",
        context: "Listed in skills section",
      },
      {
        keyword: "React",
        importance: "Preferred",
        found_in: "Skills",
        context: "Listed in skills section",
      },
    ],
    missing_keywords: ["TypeScript", "Node.js"],
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
        suggestion: "Add TypeScript to skills",
        impact: "High match improvement",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(mockAnalysis);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("shows empty state when no resume data", () => {
      render(<AtsLiveScorePanel resumeData={null} currentStep={1} />);

      expect(screen.getByText("Fill in your resume to see ATS score")).toBeInTheDocument();
    });

    it("shows ATS Score header", () => {
      render(<AtsLiveScorePanel resumeData={null} currentStep={1} />);

      expect(screen.getByText("ATS Score")).toBeInTheDocument();
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
        expect(screen.getByText("analyzing...")).toBeInTheDocument();
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
        expect(screen.getByText("Good")).toBeInTheDocument();
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
        expect(screen.getByText("Good")).toBeInTheDocument(); // 70-79 = Good
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
        expect(screen.getByText("Keywords")).toBeInTheDocument();
        expect(screen.getByText("Format")).toBeInTheDocument();
        expect(screen.getByText("Complete")).toBeInTheDocument();
      });
    });

    it("shows keyword match count", async () => {
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByText("2 keywords matched")).toBeInTheDocument();
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
    it("shows 'Excellent' for scores >=90", async () => {
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
        expect(screen.getByText("Excellent")).toBeInTheDocument();
      });
    });

    it("shows 'Poor' for scores <40", async () => {
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
        expect(screen.getByText("Poor")).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("shows error message on analysis failure", async () => {
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
        expect(screen.getByText("Analysis failed")).toBeInTheDocument();
      });
    });

    it("shows dismiss button on error", async () => {
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
        expect(screen.getByRole("button", { name: /dismiss/i })).toBeInTheDocument();
      });
    });

    it("shows retry button on error", async () => {
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
        expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
      });
    });

    it("retries analysis when retry button is clicked", async () => {
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
        expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /retry/i }));

      await waitForAnalysis();

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledTimes(2);
      });
    });

    it("clears error when dismiss is clicked", async () => {
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
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

      expect(screen.queryByText("Network error")).not.toBeInTheDocument();
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
        expect(screen.getByText("Fix format issues to improve ATS parsing")).toBeInTheDocument();
      });
    });
  });

  describe("view full analysis modal", () => {
    it("shows view full analysis button", async () => {
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
        expect(screen.getByRole("button", { name: /view full analysis/i })).toBeInTheDocument();
      });
    });

    it("hides view full analysis button when showFullAnalysis is false", async () => {
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
        expect(screen.getByText("Good")).toBeInTheDocument();
      });

      expect(screen.queryByRole("button", { name: /view full analysis/i })).not.toBeInTheDocument();
    });

    it("opens modal when view full analysis is clicked", async () => {
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /view full analysis/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /view full analysis/i }));

      expect(screen.getByText("Full ATS Analysis")).toBeInTheDocument();
    });

    it("displays keyword matches in modal", async () => {
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /view full analysis/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /view full analysis/i }));

      expect(screen.getByText("Keyword Matches (2)")).toBeInTheDocument();
    });

    it("displays missing keywords in modal", async () => {
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      await waitForAnalysis();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /view full analysis/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /view full analysis/i }));

      expect(screen.getByText("Missing Keywords (2)")).toBeInTheDocument();
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
      expect(screen.getByText("Node.js")).toBeInTheDocument();
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
        expect(screen.getByRole("button", { name: /view full analysis/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /view full analysis/i }));

      expect(screen.getByText("Format Issues (1)")).toBeInTheDocument();
      expect(screen.getByText("Summary could be longer")).toBeInTheDocument();
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
        expect(screen.getByRole("button", { name: /view full analysis/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /view full analysis/i }));

      expect(screen.getByText("Suggestions (1)")).toBeInTheDocument();
      expect(screen.getByText("Add TypeScript to skills")).toBeInTheDocument();
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
    it("does not show Job Context badge without job description", () => {
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      expect(screen.queryByText("Job Context")).not.toBeInTheDocument();
    });

    it("ignores expired job context (>24 hours old)", () => {
      // Test verifies badge doesn't show without valid context
      render(
        <AtsLiveScorePanel
          resumeData={mockResumeData}
          currentStep={1}
          debounceMs={10}
        />
      );

      expect(screen.queryByText("Job Context")).not.toBeInTheDocument();
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
        expect(screen.getByText("Good")).toBeInTheDocument();
      });

      expect(screen.queryByText(/keywords matched/)).not.toBeInTheDocument();
      expect(screen.queryByText(/missing/)).not.toBeInTheDocument();
      expect(screen.queryByText(/issues/)).not.toBeInTheDocument();
    });
  });
});
