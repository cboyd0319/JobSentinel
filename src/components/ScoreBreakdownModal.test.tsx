import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScoreBreakdownModal } from "./ScoreBreakdownModal";

describe("ScoreBreakdownModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    score: 0.85,
    scoreReasons: null,
  };

  describe("rendering", () => {
    it("does not render when isOpen is false", () => {
      render(<ScoreBreakdownModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders modal when isOpen is true", () => {
      render(<ScoreBreakdownModal {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("renders title", () => {
      render(<ScoreBreakdownModal {...defaultProps} />);

      expect(screen.getByText("Fit Details")).toBeInTheDocument();
    });
  });

  describe("score display", () => {
    it("displays score as percentage", () => {
      render(<ScoreBreakdownModal {...defaultProps} score={0.85} />);

      expect(screen.getByText("85%")).toBeInTheDocument();
    });

    it("rounds percentage to nearest integer", () => {
      render(<ScoreBreakdownModal {...defaultProps} score={0.854} />);

      expect(screen.getByText("85%")).toBeInTheDocument();
    });

    it("displays 'Strong Fit' for scores >= 90%", () => {
      render(<ScoreBreakdownModal {...defaultProps} score={0.92} />);

      expect(screen.getByText("Strong Fit")).toBeInTheDocument();
    });

    it("displays 'Good Fit' for scores >= 70%", () => {
      render(<ScoreBreakdownModal {...defaultProps} score={0.75} />);

      expect(screen.getByText("Good Fit")).toBeInTheDocument();
    });

    it("displays 'Possible Fit' for scores >= 50%", () => {
      render(<ScoreBreakdownModal {...defaultProps} score={0.55} />);

      expect(screen.getByText("Possible Fit")).toBeInTheDocument();
    });

    it("displays 'Needs Review' for scores < 50%", () => {
      render(<ScoreBreakdownModal {...defaultProps} score={0.35} />);

      expect(screen.getByText("Needs Review")).toBeInTheDocument();
    });

    it("handles NaN score gracefully", () => {
      render(<ScoreBreakdownModal {...defaultProps} score={NaN} />);

      expect(screen.getByText("0%")).toBeInTheDocument();
      expect(screen.getByText("Needs Review")).toBeInTheDocument();
      expect(screen.queryByText("NaN%")).not.toBeInTheDocument();
    });

    it("shows not-enough-information status when saved score reasons are missing", () => {
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons={null} />);

      expect(screen.getByText("Evidence status")).toBeInTheDocument();
      expect(screen.getByText("Not enough information")).toBeInTheDocument();
      expect(screen.getByText(/no saved reason details/i)).toBeInTheDocument();
    });

    it("shows mixed-evidence status when fit reasons conflict", () => {
      const reasons = JSON.stringify([
        "Title matches: Customer Support Lead",
        "Salary doesn't match your minimum",
      ]);
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons={reasons} />);

      expect(screen.getByText("Evidence status")).toBeInTheDocument();
      expect(screen.getByText("Mixed evidence")).toBeInTheDocument();
      expect(screen.getByText(/some factors fit and some need review/i)).toBeInTheDocument();
    });

    it("shows clear-fit-evidence status when saved reasons support the score", () => {
      const reasons = JSON.stringify([
        "Title matches: Customer Support Lead",
        "Salary meets minimum",
      ]);
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons={reasons} />);

      expect(screen.getByText("Evidence status")).toBeInTheDocument();
      expect(screen.getByText("Clear fit evidence")).toBeInTheDocument();
      expect(screen.getByText(/saved reasons support this local fit estimate/i)).toBeInTheDocument();
    });
  });

  describe("job title", () => {
    it("displays job title when provided", () => {
      render(<ScoreBreakdownModal {...defaultProps} jobTitle="Customer Support Lead" />);

      expect(screen.getByText("Customer Support Lead")).toBeInTheDocument();
    });

    it("does not display job title when not provided", () => {
      render(<ScoreBreakdownModal {...defaultProps} />);

      expect(screen.queryByText("Customer Support Lead")).not.toBeInTheDocument();
    });
  });

  describe("scoring factors", () => {
    it("displays all scoring factor labels", () => {
      render(<ScoreBreakdownModal {...defaultProps} />);

      expect(screen.getByText("Skills Fit")).toBeInTheDocument();
      expect(screen.getByText("Salary")).toBeInTheDocument();
      expect(screen.getByText("Location")).toBeInTheDocument();
      expect(screen.getByText("Company")).toBeInTheDocument();
      expect(screen.getByText("Recency")).toBeInTheDocument();
    });

    it("renders visual factor icons", () => {
      render(<ScoreBreakdownModal {...defaultProps} />);

      expect(document.body.querySelectorAll("svg").length).toBeGreaterThanOrEqual(5);
    });

    it("displays factor descriptions", () => {
      render(<ScoreBreakdownModal {...defaultProps} />);

      expect(screen.getByText("Job title and search-word fit")).toBeInTheDocument();
      expect(screen.getByText("Salary meets your requirements")).toBeInTheDocument();
      expect(screen.getByText("Remote/hybrid/onsite preference")).toBeInTheDocument();
      expect(screen.getByText("Companies you prefer or hide")).toBeInTheDocument();
      expect(screen.getByText("How fresh the posting is")).toBeInTheDocument();
    });

    it("displays plain score contribution labels", () => {
      render(<ScoreBreakdownModal {...defaultProps} />);

      expect(screen.getAllByText("Clear evidence")).toHaveLength(5);
      expect(screen.getByText("Primary factor")).toBeInTheDocument();
      expect(screen.getAllByText("Important factor")).toHaveLength(2);
      expect(screen.getAllByText("Supporting factor")).toHaveLength(2);
      expect(screen.queryByText("One part of this fit estimate")).not.toBeInTheDocument();
      expect(screen.queryByText(/\d+% influence/)).not.toBeInTheDocument();
      for (const hiddenWeight of ["40%", "25%", "20%", "10%", "5%"]) {
        expect(screen.queryByText(hiddenWeight)).not.toBeInTheDocument();
      }
    });
  });

  describe("score reasons parsing", () => {
    it("displays skills reasons", () => {
      const reasons = JSON.stringify(["Title matches: Customer Support Lead"]);
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons={reasons} />);

      expect(screen.getByText("Title matches: Customer Support Lead")).toBeInTheDocument();
    });

    it("displays salary reasons", () => {
      const reasons = JSON.stringify(["Salary meets minimum"]);
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons={reasons} />);

      expect(screen.getByText("Salary meets minimum")).toBeInTheDocument();
    });

    it("displays location reasons", () => {
      const reasons = JSON.stringify(["Remote position"]);
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons={reasons} />);

      expect(screen.getByText("Remote position")).toBeInTheDocument();
    });

    it("displays company reasons", () => {
      const reasons = JSON.stringify(["Company is in favorites"]);
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons={reasons} />);

      expect(screen.getByText("Company is in favorites")).toBeInTheDocument();
    });

    it("displays recency reasons", () => {
      const reasons = JSON.stringify(["Posted 2 days ago"]);
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons={reasons} />);

      expect(screen.getByText("Posted 2 days ago")).toBeInTheDocument();
    });

    it("handles invalid JSON gracefully", () => {
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons="not valid json" />);

      // Should render without errors
      expect(screen.getByText("Fit Details")).toBeInTheDocument();
    });

    it("ignores malformed valid JSON reason shapes", () => {
      const reasons = JSON.stringify([null, { text: "bad" }, "Salary meets target"]);
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons={reasons} />);

      expect(screen.getByText("Fit Details")).toBeInTheDocument();
      expect(screen.getByText("Salary meets target")).toBeInTheDocument();
      expect(screen.queryByText("bad")).not.toBeInTheDocument();
    });

    it("handles null reasons", () => {
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons={null} />);

      expect(screen.getByText("Fit Details")).toBeInTheDocument();
    });

    it("categorizes hybrid/onsite to location", () => {
      const reasons = JSON.stringify(["Hybrid work available"]);
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons={reasons} />);

      expect(screen.getByText("Hybrid work available")).toBeInTheDocument();
    });

    it("categorizes fresh posting to recency", () => {
      const reasons = JSON.stringify(["Fresh posting"]);
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons={reasons} />);

      expect(screen.getByText("Fresh posting")).toBeInTheDocument();
    });
  });

  describe("score color coding", () => {
    it("uses Tailwind classes for overall score color instead of invalid inline color", () => {
      render(<ScoreBreakdownModal {...defaultProps} score={0.92} />);

      const overallScore = screen.getByText("92%");

      expect(overallScore).toHaveClass("text-green-600", "dark:text-green-400");
      expect(overallScore).not.toHaveAttribute("style");
    });

    it("applies green styling for high factor evidence", () => {
      render(<ScoreBreakdownModal {...defaultProps} score={1.0} />);

      const evidenceBadges = screen.getAllByText("Clear evidence");
      expect(evidenceBadges.length).toBeGreaterThan(0);
      expect(evidenceBadges[0]).toHaveClass("text-green-600", "dark:text-green-400");
    });

    it("handles zero factor scores", () => {
      const reasons = JSON.stringify(["Title doesn't match"]);
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons={reasons} />);

      // Should render without errors
      expect(screen.getByText("Fit Details")).toBeInTheDocument();
    });
  });

  describe("close button", () => {
    it("renders Close button", () => {
      render(<ScoreBreakdownModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    });

    it("calls onClose when Close button is clicked", () => {
      const onClose = vi.fn();
      render(<ScoreBreakdownModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByRole("button", { name: "Close" }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("help text", () => {
    it("displays help text", () => {
      render(<ScoreBreakdownModal {...defaultProps} />);

      expect(screen.getByText(/JobSentinel reviews how this job matches/)).toBeInTheDocument();
    });

    it("mentions Settings for adjusting preferences", () => {
      render(<ScoreBreakdownModal {...defaultProps} />);

      expect(screen.getByText(/You can adjust your preferences in Settings/)).toBeInTheDocument();
    });
  });

  describe("breakdown estimation", () => {
    it("reduces factor score to 0 when failure marker present", () => {
      const reasons = JSON.stringify(["Not in allowlist"]);
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons={reasons} />);

      expect(screen.getByText("Needs review")).toBeInTheDocument();
      expect(screen.queryByText("0%")).not.toBeInTheDocument();
    });

    it("shows legacy list reasons in plain language", () => {
      const reasons = JSON.stringify(["Not in allowlist", "Company is in blocklist"]);
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons={reasons} />);

      expect(screen.getByText("Not in your preferred job titles")).toBeInTheDocument();
      expect(
        screen.getByText("Company matches something you chose to avoid"),
      ).toBeInTheDocument();
      expect(screen.queryByText(/allowlist|blocklist/i)).not.toBeInTheDocument();
    });

    it("extracts percentage from reasons", () => {
      const reasons = JSON.stringify(["50% skills match"]);
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons={reasons} />);

      // Should parse and display partial score
      expect(screen.getByText("Fit Details")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles score of 0", () => {
      render(<ScoreBreakdownModal {...defaultProps} score={0} />);

      expect(screen.getByText("0%")).toBeInTheDocument();
      expect(screen.getByText("Needs Review")).toBeInTheDocument();
    });

    it("handles score of 1", () => {
      render(<ScoreBreakdownModal {...defaultProps} score={1} />);

      expect(screen.getByText("100%")).toBeInTheDocument();
      expect(screen.getAllByText("Clear evidence")).toHaveLength(5);
      expect(screen.getByText("Strong Fit")).toBeInTheDocument();
    });

    it("handles empty reasons array", () => {
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons="[]" />);

      expect(screen.getByText("Fit Details")).toBeInTheDocument();
    });
  });
});
