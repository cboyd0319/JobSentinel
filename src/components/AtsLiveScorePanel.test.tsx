import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { AtsLiveScorePanel } from "./AtsLiveScorePanel";
import { mockAnalysis, mockResumeData } from "./AtsLiveScorePanel.testData";

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
        expect(screen.getAllByText("Some evidence").length).toBeGreaterThan(0);
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
        expect(screen.getAllByText("Some evidence").length).toBeGreaterThan(0);
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
        expect(screen.getByText("Details")).toBeInTheDocument();
        expect(screen.getByText("Clear evidence")).toBeInTheDocument();
        expect(screen.getAllByText("Some evidence").length).toBeGreaterThan(0);
        expect(screen.queryByText("Complete")).not.toBeInTheDocument();
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
        expect(screen.getByText("2 to review")).toBeInTheDocument();
        expect(screen.queryByText("2 missing")).not.toBeInTheDocument();
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
        expect(screen.getByText("1 details to check")).toBeInTheDocument();
        expect(screen.queryByText("1 issues")).not.toBeInTheDocument();
      });
    });
  });

  describe("score colors", () => {
    it("shows teal for excellent scores (>=80)", async () => {
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
        const scoreElement = screen.getAllByText("Clear evidence")[0];
        expect(scoreElement.className).toContain("text-sentinel");
      });
    });

    it("shows blue for fair scores (60-79)", async () => {
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
        const scoreElement = screen.getByText("Mixed evidence");
        expect(scoreElement.className).toContain("text-blue");
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
        const scoreElement = screen.getByText("Low evidence");
        expect(scoreElement.className).toContain("text-danger");
      });
    });
  });

  describe("score labels", () => {
    it("shows strong evidence for scores >=90", async () => {
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
        expect(screen.getByText("Strong evidence")).toBeInTheDocument();
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

    it("shows unavailable score labels while keeping local evidence visible", async () => {
      mockInvoke.mockResolvedValue({
        ...mockAnalysis,
        overall_score: Number.NaN,
        keyword_score: Infinity,
        format_score: -5,
        completeness_score: 125,
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
        expect(screen.getByText("--")).toBeInTheDocument();
        expect(screen.getAllByText("Score not shown").length).toBeGreaterThanOrEqual(4);
      });

      expect(screen.getByText("2 job words found")).toBeInTheDocument();
      expect(screen.getByText("2 to review")).toBeInTheDocument();
      expect(screen.queryByText(/NaN|Infinity|125/)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /review details/i }));

      expect(screen.getByText("Words Found (2)")).toBeInTheDocument();
      expect(screen.getByText("Words To Review (2)")).toBeInTheDocument();
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
        new Error("token=raw-secret private@example.test local-resume-file.pdf")
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
      expect(screen.queryByText(/raw-secret|private@example\.test|local-resume-file/)).not.toBeInTheDocument();
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
        expect(screen.getAllByText("Some evidence").length).toBeGreaterThan(0);
      });

      expect(screen.queryByText(/job words found/)).not.toBeInTheDocument();
      expect(screen.queryByText(/missing/)).not.toBeInTheDocument();
      expect(screen.queryByText(/issues/)).not.toBeInTheDocument();
    });
  });
});
