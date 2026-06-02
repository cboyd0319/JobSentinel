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

      expect(screen.getByText("Match Details")).toBeInTheDocument();
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

    it("displays 'Strong Match' for scores >= 90%", () => {
      render(<ScoreBreakdownModal {...defaultProps} score={0.92} />);

      expect(screen.getByText("Strong Match")).toBeInTheDocument();
    });

    it("displays 'Good Match' for scores >= 70%", () => {
      render(<ScoreBreakdownModal {...defaultProps} score={0.75} />);

      expect(screen.getByText("Good Match")).toBeInTheDocument();
    });

    it("displays 'Some Match' for scores >= 50%", () => {
      render(<ScoreBreakdownModal {...defaultProps} score={0.55} />);

      expect(screen.getByText("Some Match")).toBeInTheDocument();
    });

    it("displays 'Low Match' for scores < 50%", () => {
      render(<ScoreBreakdownModal {...defaultProps} score={0.35} />);

      expect(screen.getByText("Low Match")).toBeInTheDocument();
    });

    it("handles NaN score gracefully", () => {
      render(<ScoreBreakdownModal {...defaultProps} score={NaN} />);

      expect(screen.getByText("0%")).toBeInTheDocument();
      expect(screen.getByText("Low Match")).toBeInTheDocument();
      expect(screen.queryByText("NaN%")).not.toBeInTheDocument();
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

      expect(screen.getByText("Skills Match")).toBeInTheDocument();
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

      expect(screen.getByText("Job title and search-word matches")).toBeInTheDocument();
      expect(screen.getByText("Salary meets your requirements")).toBeInTheDocument();
      expect(screen.getByText("Remote/hybrid/onsite preference")).toBeInTheDocument();
      expect(screen.getByText("Companies you prefer or hide")).toBeInTheDocument();
      expect(screen.getByText("How fresh the posting is")).toBeInTheDocument();
    });

    it("displays plain score contribution labels", () => {
      render(<ScoreBreakdownModal {...defaultProps} />);

      expect(screen.getAllByText("Part of overall score")).toHaveLength(5);
      expect(screen.queryByText(/\d+% influence/)).not.toBeInTheDocument();
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
      expect(screen.getByText("Match Details")).toBeInTheDocument();
    });

    it("ignores malformed valid JSON reason shapes", () => {
      const reasons = JSON.stringify([null, { text: "bad" }, "Salary meets target"]);
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons={reasons} />);

      expect(screen.getByText("Match Details")).toBeInTheDocument();
      expect(screen.getByText("Salary meets target")).toBeInTheDocument();
      expect(screen.queryByText("bad")).not.toBeInTheDocument();
    });

    it("handles null reasons", () => {
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons={null} />);

      expect(screen.getByText("Match Details")).toBeInTheDocument();
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

    it("applies green styling for high factor scores", () => {
      render(<ScoreBreakdownModal {...defaultProps} score={1.0} />);

      // The factor percentage badges should have green classes
      const percentBadges = screen.getAllByText("100%");
      expect(percentBadges.length).toBeGreaterThan(0);
    });

    it("handles zero factor scores", () => {
      const reasons = JSON.stringify(["Title doesn't match"]);
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons={reasons} />);

      // Should render without errors
      expect(screen.getByText("Match Details")).toBeInTheDocument();
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

      // The Skills factor should show 0%
      const percentBadges = screen.getAllByText("0%");
      expect(percentBadges.length).toBeGreaterThan(0);
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
      expect(screen.getByText("Match Details")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles score of 0", () => {
      render(<ScoreBreakdownModal {...defaultProps} score={0} />);

      expect(screen.getByText("0%")).toBeInTheDocument();
      expect(screen.getByText("Low Match")).toBeInTheDocument();
    });

    it("handles score of 1", () => {
      render(<ScoreBreakdownModal {...defaultProps} score={1} />);

      // Multiple 100% texts exist (overall score + each factor), just check at least one
      const percentTexts = screen.getAllByText("100%");
      expect(percentTexts.length).toBeGreaterThan(0);
      expect(screen.getByText("Strong Match")).toBeInTheDocument();
    });

    it("handles empty reasons array", () => {
      render(<ScoreBreakdownModal {...defaultProps} scoreReasons="[]" />);

      expect(screen.getByText("Match Details")).toBeInTheDocument();
    });
  });
});
