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
vi.mock("../../../shared/errorReporting/logger", () => ({
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

});
