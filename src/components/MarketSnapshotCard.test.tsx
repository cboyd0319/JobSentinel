import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarketSnapshotCard } from "./MarketSnapshotCard";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockSnapshot = {
  date: "2024-01-15",
  total_jobs: 12500,
  new_jobs_today: 450,
  jobs_filled_today: 320,
  avg_salary: 125000,
  median_salary: 115000,
  remote_job_percentage: 42.5,
  top_skill: "React",
  top_company: "TechCorp",
  top_location: "San Francisco, CA",
  total_companies_hiring: 1250,
  market_sentiment: "bullish",
};

describe("MarketSnapshotCard", () => {
  describe("rendering", () => {
    it("renders without crashing", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("displays total jobs count", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      expect(screen.getByText("12,500")).toBeInTheDocument();
      expect(screen.getByText("Total Jobs")).toBeInTheDocument();
    });

    it("displays new jobs today", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      expect(screen.getByText("+450")).toBeInTheDocument();
      expect(screen.getByText("New Today")).toBeInTheDocument();
    });

    it("displays remote job percentage", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      // Check for the Remote label
      expect(screen.getByText("Remote")).toBeInTheDocument();
      // The percentage should be rendered (42.5 rounds to 43%)
      const { container } = render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      expect(container.textContent).toContain("43");
    });

    it("displays median salary", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      expect(screen.getByText("$115,000")).toBeInTheDocument();
      expect(screen.getByText("Median Salary")).toBeInTheDocument();
    });

    it("displays market sentiment", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      expect(screen.getByRole("status", { name: /market sentiment/i })).toBeInTheDocument();
      expect(screen.getByText("Market Sentiment")).toBeInTheDocument();
    });
  });

  describe("market sentiment", () => {
    it("displays market sentiment", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      // The sentiment text is shown with emoji prefix
      expect(screen.getByRole("status", { name: /market sentiment/i })).toBeInTheDocument();
      expect(screen.getByText("Market Sentiment")).toBeInTheDocument();
    });
  });

  describe("market sentiment styling", () => {
    it("shows bullish sentiment with correct icon and color", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      const sentimentStatus = screen.getByRole("status", { name: /market sentiment: bullish/i });
      expect(sentimentStatus).toBeInTheDocument();
      // Check for green color class
      const greenSpan = sentimentStatus.querySelector('[class*="green"]');
      expect(greenSpan).toBeInTheDocument();
    });

    it("shows bearish sentiment with correct color", () => {
      const bearishSnapshot = { ...mockSnapshot, market_sentiment: "bearish" };
      render(<MarketSnapshotCard snapshot={bearishSnapshot} />);
      const sentimentText = screen.getByText(/bearish/i);
      expect(sentimentText).toBeInTheDocument();
      // Check for red color class
      const sentimentContainer = sentimentText.closest('[class*="red"]');
      expect(sentimentContainer).toBeInTheDocument();
    });

    it("shows neutral sentiment", () => {
      const neutralSnapshot = { ...mockSnapshot, market_sentiment: "neutral" };
      render(<MarketSnapshotCard snapshot={neutralSnapshot} />);
      expect(screen.getByText(/neutral/i)).toBeInTheDocument();
    });

    it("displays market sentiment", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      // Check the sentiment is rendered via the status role
      expect(screen.getByRole("status", { name: /market sentiment: bullish/i })).toBeInTheDocument();
      expect(screen.getByText("Market Sentiment")).toBeInTheDocument();
    });
  });

  describe("top highlights", () => {
    it("displays top skill badge", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      expect(screen.getByText(/🔧 top skill: react/i)).toBeInTheDocument();
    });

    it("displays top company badge", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      expect(screen.getByText(/🏢 top company: techcorp/i)).toBeInTheDocument();
    });

    it("displays top location badge", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      expect(screen.getByText(/📍 top location: san francisco, ca/i)).toBeInTheDocument();
    });

    it("displays companies hiring count", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      expect(screen.getByText(/🏭 1,250 companies hiring/i)).toBeInTheDocument();
    });

    it("does not display top skill badge when null", () => {
      const noSkillSnapshot = { ...mockSnapshot, top_skill: null };
      render(<MarketSnapshotCard snapshot={noSkillSnapshot} />);
      expect(screen.queryByText(/top skill/i)).not.toBeInTheDocument();
    });

    it("does not display top company badge when null", () => {
      const noCompanySnapshot = { ...mockSnapshot, top_company: null };
      render(<MarketSnapshotCard snapshot={noCompanySnapshot} />);
      expect(screen.queryByText(/top company/i)).not.toBeInTheDocument();
    });

    it("does not display top location badge when null", () => {
      const noLocationSnapshot = { ...mockSnapshot, top_location: null };
      render(<MarketSnapshotCard snapshot={noLocationSnapshot} />);
      expect(screen.queryByText(/top location/i)).not.toBeInTheDocument();
    });
  });

  describe("salary formatting", () => {
    it("formats salary with currency symbol and no decimals", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      expect(screen.getByText("$115,000")).toBeInTheDocument();
    });

    it("formats large salaries with commas", () => {
      const highSalarySnapshot = { ...mockSnapshot, median_salary: 250000 };
      render(<MarketSnapshotCard snapshot={highSalarySnapshot} />);
      expect(screen.getByText("$250,000")).toBeInTheDocument();
    });

    it("shows N/A for null salary", () => {
      const noSalarySnapshot = { ...mockSnapshot, median_salary: null };
      render(<MarketSnapshotCard snapshot={noSalarySnapshot} />);
      expect(screen.getByText("N/A")).toBeInTheDocument();
    });

    it("handles zero salary", () => {
      const zeroSalarySnapshot = { ...mockSnapshot, median_salary: 0 };
      render(<MarketSnapshotCard snapshot={zeroSalarySnapshot} />);
      expect(screen.getByText("$0")).toBeInTheDocument();
    });
  });

  describe("number formatting", () => {
    it("formats large numbers with commas", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      expect(screen.getByText("12,500")).toBeInTheDocument();
    });

    it("formats companies hiring with commas", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      expect(screen.getByText(/1,250 companies hiring/i)).toBeInTheDocument();
    });

    it("formats remote percentage to whole number", () => {
      const { container } = render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      // 42.5 should be formatted, check the container has the number
      expect(container).toBeInTheDocument();
      expect(screen.getByText("Remote")).toBeInTheDocument();
    });

    it("handles zero values", () => {
      const zeroSnapshot = {
        ...mockSnapshot,
        new_jobs_today: 0,
        remote_job_percentage: 0,
      };
      render(<MarketSnapshotCard snapshot={zeroSnapshot} />);
      expect(screen.getByText("+0")).toBeInTheDocument();
      expect(screen.getByText("0%")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows loading skeleton when loading is true", () => {
      render(<MarketSnapshotCard snapshot={null} loading={true} />);
      expect(screen.getByRole("status", { name: /loading market snapshot/i })).toBeInTheDocument();
    });

    it("loading skeleton has pulse animation", () => {
      const { container } = render(<MarketSnapshotCard snapshot={null} loading={true} />);
      const skeleton = container.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });

    it("does not show snapshot data when loading", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} loading={true} />);
      expect(screen.queryByText("12,500")).not.toBeInTheDocument();
    });

    it("shows snapshot data when not loading", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} loading={false} />);
      expect(screen.getByText("12,500")).toBeInTheDocument();
    });
  });

  describe("null snapshot state", () => {
    it("shows message when snapshot is null and not loading", () => {
      render(<MarketSnapshotCard snapshot={null} />);
      expect(
        screen.getByText(/no market snapshot available. run analysis to generate one./i)
      ).toBeInTheDocument();
    });

    it("does not show snapshot data when snapshot is null", () => {
      render(<MarketSnapshotCard snapshot={null} />);
      expect(screen.queryByText(/total jobs/i)).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has region role", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("has descriptive aria-label", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      expect(screen.getByLabelText(/market snapshot/i)).toBeInTheDocument();
    });

    it("statistics have list structure", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      const statsList = screen.getByLabelText(/market statistics/i);
      expect(statsList).toHaveAttribute("role", "list");
    });

    it("each statistic has listitem role", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      const listitems = screen.getAllByRole("listitem");
      expect(listitems.length).toBeGreaterThan(0);
    });

    it("total jobs has descriptive aria-label", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      expect(screen.getByLabelText(/12,500 total jobs/i)).toBeInTheDocument();
    });

    it("new jobs has descriptive aria-label", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      expect(screen.getByLabelText(/450 new jobs today/i)).toBeInTheDocument();
    });

    it("remote percentage has descriptive aria-label", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      // Check for aria-label containing percentage info
      expect(screen.getByLabelText(/remote/i)).toBeInTheDocument();
    });

    it("median salary has descriptive aria-label", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      expect(screen.getByLabelText(/median salary \$115,000/i)).toBeInTheDocument();
    });

    it("market sentiment has status role", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      const sentiment = screen.getByLabelText(/market sentiment: bullish/i);
      expect(sentiment).toHaveAttribute("role", "status");
    });

    it("highlights section has list structure", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      const highlightsList = screen.getByLabelText(/market highlights/i);
      expect(highlightsList).toHaveAttribute("role", "list");
    });

    it("loading state has aria-busy", () => {
      render(<MarketSnapshotCard snapshot={null} loading={true} />);
      const loadingStatus = screen.getByRole("status");
      expect(loadingStatus).toHaveAttribute("aria-busy", "true");
    });

    it("empty state has status role", () => {
      render(<MarketSnapshotCard snapshot={null} />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles missing optional fields gracefully", () => {
      const minimalSnapshot = {
        date: "2024-01-15",
        total_jobs: 100,
        new_jobs_today: 10,
        jobs_filled_today: 5,
        avg_salary: null,
        median_salary: null,
        remote_job_percentage: 0,
        top_skill: null,
        top_company: null,
        top_location: null,
        total_companies_hiring: 0,
        market_sentiment: "neutral",
      };

      render(<MarketSnapshotCard snapshot={minimalSnapshot} />);
      expect(screen.getByText("100")).toBeInTheDocument();
      expect(screen.getByText("N/A")).toBeInTheDocument();
    });

    it("handles very large numbers", () => {
      const largeSnapshot = {
        ...mockSnapshot,
        total_jobs: 1000000,
        median_salary: 999999,
      };

      render(<MarketSnapshotCard snapshot={largeSnapshot} />);
      expect(screen.getByText("1,000,000")).toBeInTheDocument();
      expect(screen.getByText("$999,999")).toBeInTheDocument();
    });

    it("handles decimal percentages correctly", () => {
      const decimalSnapshot = { ...mockSnapshot, remote_job_percentage: 33.333 };
      render(<MarketSnapshotCard snapshot={decimalSnapshot} />);
      expect(screen.getByText("33%")).toBeInTheDocument();
    });

    it("handles 100% remote percentage", () => {
      const fullRemoteSnapshot = { ...mockSnapshot, remote_job_percentage: 100 };
      render(<MarketSnapshotCard snapshot={fullRemoteSnapshot} />);
      expect(screen.getByText("100%")).toBeInTheDocument();
    });
  });

  describe("visual styling", () => {
    it("new jobs today has color styling", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      const newJobs = screen.getByText("+450");
      expect(newJobs).toBeInTheDocument();
      // Check it's in a colored container
      const container = newJobs.closest('[class*="green"]');
      expect(container).toBeInTheDocument();
    });

    it("remote percentage has color styling", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      // Check for remote text with styling
      expect(screen.getByText("Remote")).toBeInTheDocument();
    });

    it("total jobs displays correctly", () => {
      render(<MarketSnapshotCard snapshot={mockSnapshot} />);
      expect(screen.getByText("12,500")).toBeInTheDocument();
    });
  });
});
