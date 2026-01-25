import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResumeMatchScoreBreakdown } from "./ResumeMatchScoreBreakdown";

describe("ResumeMatchScoreBreakdown", () => {
  const defaultProps = {
    skillsScore: 0.85,
    experienceScore: 0.7,
    educationScore: 0.9,
    overallScore: 0.82,
  };

  describe("rendering", () => {
    it("renders title", () => {
      render(<ResumeMatchScoreBreakdown {...defaultProps} />);

      expect(screen.getByText("Resume Match Breakdown")).toBeInTheDocument();
    });

    it("renders overall score", () => {
      render(<ResumeMatchScoreBreakdown {...defaultProps} />);

      expect(screen.getByText("82%")).toBeInTheDocument();
    });

    it("renders all three score categories", () => {
      render(<ResumeMatchScoreBreakdown {...defaultProps} />);

      expect(screen.getByText("Skills Match")).toBeInTheDocument();
      expect(screen.getByText("Experience Match")).toBeInTheDocument();
      expect(screen.getByText("Education Match")).toBeInTheDocument();
    });

    it("renders score percentages", () => {
      render(<ResumeMatchScoreBreakdown {...defaultProps} />);

      expect(screen.getByText("85%")).toBeInTheDocument(); // skills
      expect(screen.getByText("70%")).toBeInTheDocument(); // experience
      expect(screen.getByText("90%")).toBeInTheDocument(); // education
    });

    it("renders progress bars", () => {
      render(<ResumeMatchScoreBreakdown {...defaultProps} />);

      const progressBars = screen.getAllByRole("progressbar");
      expect(progressBars).toHaveLength(3);
    });
  });

  describe("progress bars", () => {
    it("sets correct aria-valuenow for skills", () => {
      render(<ResumeMatchScoreBreakdown {...defaultProps} />);

      const skillsBar = screen.getByRole("progressbar", {
        name: /Skills Match score: 85%/i,
      });
      expect(skillsBar).toHaveAttribute("aria-valuenow", "85");
    });

    it("sets correct aria-valuenow for experience", () => {
      render(<ResumeMatchScoreBreakdown {...defaultProps} />);

      const experienceBar = screen.getByRole("progressbar", {
        name: /Experience Match score: 70%/i,
      });
      expect(experienceBar).toHaveAttribute("aria-valuenow", "70");
    });

    it("sets correct aria-valuenow for education", () => {
      render(<ResumeMatchScoreBreakdown {...defaultProps} />);

      const educationBar = screen.getByRole("progressbar", {
        name: /Education Match score: 90%/i,
      });
      expect(educationBar).toHaveAttribute("aria-valuenow", "90");
    });

    it("has aria-valuemin of 0", () => {
      render(<ResumeMatchScoreBreakdown {...defaultProps} />);

      const progressBars = screen.getAllByRole("progressbar");
      progressBars.forEach((bar) => {
        expect(bar).toHaveAttribute("aria-valuemin", "0");
      });
    });

    it("has aria-valuemax of 100", () => {
      render(<ResumeMatchScoreBreakdown {...defaultProps} />);

      const progressBars = screen.getAllByRole("progressbar");
      progressBars.forEach((bar) => {
        expect(bar).toHaveAttribute("aria-valuemax", "100");
      });
    });

    it("sets correct width style for progress bars", () => {
      render(<ResumeMatchScoreBreakdown {...defaultProps} />);

      const skillsBar = screen.getByRole("progressbar", {
        name: /Skills Match score/i,
      });
      expect(skillsBar).toHaveStyle({ width: "85%" });
    });
  });

  describe("weights display", () => {
    it("shows weights by default", () => {
      render(<ResumeMatchScoreBreakdown {...defaultProps} />);

      expect(screen.getByText("(50% weight)")).toBeInTheDocument(); // skills
      expect(screen.getByText("(30% weight)")).toBeInTheDocument(); // experience
      expect(screen.getByText("(20% weight)")).toBeInTheDocument(); // education
    });

    it("hides weights when showWeights is false", () => {
      render(<ResumeMatchScoreBreakdown {...defaultProps} showWeights={false} />);

      expect(screen.queryByText("(50% weight)")).not.toBeInTheDocument();
      expect(screen.queryByText("(30% weight)")).not.toBeInTheDocument();
      expect(screen.queryByText("(20% weight)")).not.toBeInTheDocument();
    });

    it("shows weighted average explanation when showWeights is true", () => {
      render(<ResumeMatchScoreBreakdown {...defaultProps} />);

      expect(
        screen.getByText(/weighted averages based on component importance/i)
      ).toBeInTheDocument();
    });

    it("hides weighted average explanation when showWeights is false", () => {
      render(<ResumeMatchScoreBreakdown {...defaultProps} showWeights={false} />);

      expect(
        screen.queryByText(/weighted averages based on component importance/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("null scores", () => {
    it("shows N/A for null skills score", () => {
      render(
        <ResumeMatchScoreBreakdown
          skillsScore={null}
          experienceScore={0.7}
          educationScore={0.9}
          overallScore={0.5}
        />
      );

      // There should be one N/A
      expect(screen.getByText("N/A")).toBeInTheDocument();
    });

    it("shows upload prompt when all scores are null", () => {
      render(
        <ResumeMatchScoreBreakdown
          skillsScore={null}
          experienceScore={null}
          educationScore={null}
          overallScore={0}
        />
      );

      expect(
        screen.getByText("Upload a resume to see detailed scoring breakdown")
      ).toBeInTheDocument();
    });

    it("does not show upload prompt when any score exists", () => {
      render(
        <ResumeMatchScoreBreakdown
          skillsScore={0.5}
          experienceScore={null}
          educationScore={null}
          overallScore={0.25}
        />
      );

      expect(
        screen.queryByText("Upload a resume to see detailed scoring breakdown")
      ).not.toBeInTheDocument();
    });

    it("sets progressbar aria-valuenow to 0 for null score", () => {
      render(
        <ResumeMatchScoreBreakdown
          skillsScore={null}
          experienceScore={0.7}
          educationScore={0.9}
          overallScore={0.5}
        />
      );

      const skillsBar = screen.getByRole("progressbar", {
        name: /Skills Match score: N\/A/i,
      });
      expect(skillsBar).toHaveAttribute("aria-valuenow", "0");
    });

    it("applies opacity class for null score bars", () => {
      render(
        <ResumeMatchScoreBreakdown
          skillsScore={null}
          experienceScore={0.7}
          educationScore={0.9}
          overallScore={0.5}
        />
      );

      const skillsBar = screen.getByRole("progressbar", {
        name: /Skills Match score: N\/A/i,
      });
      expect(skillsBar.className).toContain("opacity-30");
    });

    it("shows N/A for all null scores", () => {
      render(
        <ResumeMatchScoreBreakdown
          skillsScore={null}
          experienceScore={null}
          educationScore={null}
          overallScore={0}
        />
      );

      const naTexts = screen.getAllByText("N/A");
      expect(naTexts).toHaveLength(3);
    });
  });

  describe("tooltip", () => {
    it("has help button with aria-label", () => {
      render(<ResumeMatchScoreBreakdown {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: "Learn more about scoring" })
      ).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles 0% scores", () => {
      render(
        <ResumeMatchScoreBreakdown
          skillsScore={0}
          experienceScore={0}
          educationScore={0}
          overallScore={0}
        />
      );

      // All should show 0%
      const zeroScores = screen.getAllByText("0%");
      expect(zeroScores).toHaveLength(4); // 3 categories + overall
    });

    it("handles 100% scores", () => {
      render(
        <ResumeMatchScoreBreakdown
          skillsScore={1}
          experienceScore={1}
          educationScore={1}
          overallScore={1}
        />
      );

      const perfectScores = screen.getAllByText("100%");
      expect(perfectScores).toHaveLength(4);
    });

    it("rounds scores to nearest percentage", () => {
      render(
        <ResumeMatchScoreBreakdown
          skillsScore={0.855}
          experienceScore={0.704}
          educationScore={0.895}
          overallScore={0.818}
        />
      );

      expect(screen.getByText("86%")).toBeInTheDocument(); // 85.5% rounds to 86%
      expect(screen.getByText("70%")).toBeInTheDocument(); // 70.4% rounds to 70%
      expect(screen.getByText("90%")).toBeInTheDocument(); // 89.5% rounds to 90% (math)
      expect(screen.getByText("82%")).toBeInTheDocument(); // 81.8% rounds to 82%
    });

    it("handles mixed null and non-null scores", () => {
      render(
        <ResumeMatchScoreBreakdown
          skillsScore={0.8}
          experienceScore={null}
          educationScore={0.75}
          overallScore={0.77}
        />
      );

      expect(screen.getByText("80%")).toBeInTheDocument();
      expect(screen.getByText("N/A")).toBeInTheDocument();
      expect(screen.getByText("75%")).toBeInTheDocument();
    });
  });

  describe("category colors", () => {
    it("applies sentinel colors to skills bar", () => {
      render(<ResumeMatchScoreBreakdown {...defaultProps} />);

      const skillsBar = screen.getByRole("progressbar", {
        name: /Skills Match score/i,
      });
      expect(skillsBar.className).toContain("bg-sentinel-500");
    });

    it("applies orange colors to experience bar", () => {
      render(<ResumeMatchScoreBreakdown {...defaultProps} />);

      const experienceBar = screen.getByRole("progressbar", {
        name: /Experience Match score/i,
      });
      expect(experienceBar.className).toContain("bg-orange-500");
    });

    it("applies blue colors to education bar", () => {
      render(<ResumeMatchScoreBreakdown {...defaultProps} />);

      const educationBar = screen.getByRole("progressbar", {
        name: /Education Match score/i,
      });
      expect(educationBar.className).toContain("bg-blue-500");
    });
  });

  describe("overall score display", () => {
    it("displays overall score in sentinel color", () => {
      const { container } = render(<ResumeMatchScoreBreakdown {...defaultProps} />);

      const overallScoreSpan = container.querySelector(
        ".text-sentinel-600.dark\\:text-sentinel-400"
      );
      expect(overallScoreSpan).toBeInTheDocument();
      expect(overallScoreSpan?.textContent).toBe("82%");
    });
  });
});

describe("formatPercentage", () => {
  // Testing through component since function is not exported
  it("formats decimal as percentage", () => {
    render(
      <ResumeMatchScoreBreakdown
        skillsScore={0.5}
        experienceScore={null}
        educationScore={null}
        overallScore={0.5}
      />
    );

    // Both overall and skills show 50%
    const fiftyPercent = screen.getAllByText("50%");
    expect(fiftyPercent).toHaveLength(2);
  });

  it("returns N/A for null", () => {
    render(
      <ResumeMatchScoreBreakdown
        skillsScore={null}
        experienceScore={null}
        educationScore={null}
        overallScore={0}
      />
    );

    expect(screen.getAllByText("N/A")).toHaveLength(3);
  });
});
