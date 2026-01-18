import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  describe("basic rendering", () => {
    it("renders with label and string value", () => {
      render(<StatCard label="Total Applications" value="42" />);
      expect(screen.getByText("Total Applications")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("renders with label and number value", () => {
      render(<StatCard label="Active Jobs" value={128} />);
      expect(screen.getByText("Active Jobs")).toBeInTheDocument();
      expect(screen.getByText("128")).toBeInTheDocument();
    });

    it("formats large numbers with commas", () => {
      render(<StatCard label="Total Views" value={1234567} />);
      expect(screen.getByText("1,234,567")).toBeInTheDocument();
    });

    it("renders article role for accessibility", () => {
      render(<StatCard label="Test Stat" value="100" />);
      const article = screen.getByRole("article");
      expect(article).toBeInTheDocument();
      expect(article).toHaveAttribute("aria-label", "Test Stat statistic");
    });
  });

  describe("icon rendering", () => {
    it("renders without icon when not provided", () => {
      const { container } = render(<StatCard label="Test" value="100" />);
      const iconContainer = container.querySelector(".w-12.h-12");
      expect(iconContainer).not.toBeInTheDocument();
    });

    it("renders with custom icon", () => {
      const icon = <span data-testid="custom-icon">📊</span>;
      render(<StatCard label="Stats" value="50" icon={icon} />);
      expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    });

    it("icon container has aria-hidden", () => {
      const icon = <span data-testid="icon">💼</span>;
      const { container } = render(<StatCard label="Jobs" value="10" icon={icon} />);
      const iconContainer = container.querySelector('[aria-hidden="true"]');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe("trend rendering", () => {
    it("renders positive trend", () => {
      render(
        <StatCard
          label="Growth"
          value="100"
          trend={{ value: 15, isPositive: true }}
        />
      );
      expect(screen.getByText("+15%")).toBeInTheDocument();
    });

    it("renders negative trend", () => {
      render(
        <StatCard
          label="Decline"
          value="80"
          trend={{ value: 10, isPositive: false }}
        />
      );
      expect(screen.getByText("-10%")).toBeInTheDocument();
    });

    it("applies success color to positive trend", () => {
      render(
        <StatCard
          label="Test"
          value="100"
          trend={{ value: 5, isPositive: true }}
        />
      );
      const trend = screen.getByText("+5%");
      expect(trend).toHaveClass("text-success");
    });

    it("applies danger color to negative trend", () => {
      render(
        <StatCard
          label="Test"
          value="100"
          trend={{ value: 5, isPositive: false }}
        />
      );
      const trend = screen.getByText("-5%");
      expect(trend).toHaveClass("text-danger");
    });

    it("renders without trend when not provided", () => {
      const { container } = render(<StatCard label="Test" value="100" />);
      const trendElements = container.querySelectorAll(".text-success, .text-danger");
      expect(trendElements.length).toBe(0);
    });

    it("trend has accessible label for positive change", () => {
      render(
        <StatCard
          label="Revenue"
          value="1000"
          trend={{ value: 12, isPositive: true }}
        />
      );
      const trend = screen.getByLabelText("increased by 12 percent");
      expect(trend).toBeInTheDocument();
    });

    it("trend has accessible label for negative change", () => {
      render(
        <StatCard
          label="Users"
          value="500"
          trend={{ value: 8, isPositive: false }}
        />
      );
      const trend = screen.getByLabelText("decreased by 8 percent");
      expect(trend).toBeInTheDocument();
    });

    it("handles trend with absolute value correctly", () => {
      render(
        <StatCard
          label="Test"
          value="100"
          trend={{ value: -15, isPositive: false }}
        />
      );
      // Math.abs should handle negative values
      expect(screen.getByText("-15%")).toBeInTheDocument();
    });
  });

  describe("accent colors", () => {
    it("applies sentinel accent by default", () => {
      const { container } = render(<StatCard label="Test" value="100" />);
      const valueElement = container.querySelector(".text-surface-900");
      expect(valueElement).toBeInTheDocument();
    });

    it("applies alert accent color", () => {
      const { container } = render(
        <StatCard label="Alerts" value="5" accentColor="alert" />
      );
      const valueElement = container.querySelector(".text-alert-600");
      expect(valueElement).toBeInTheDocument();
    });

    it("applies surface accent color", () => {
      const { container } = render(
        <StatCard label="General" value="10" accentColor="surface" />
      );
      const valueElement = container.querySelector(".text-surface-900");
      expect(valueElement).toBeInTheDocument();
    });

    it("sentinel accent includes gradient bar", () => {
      const { container } = render(
        <StatCard label="Test" value="100" accentColor="sentinel" />
      );
      const bar = container.querySelector(".from-sentinel-400");
      expect(bar).toBeInTheDocument();
    });

    it("alert accent includes gradient bar", () => {
      const { container } = render(
        <StatCard label="Test" value="100" accentColor="alert" />
      );
      const bar = container.querySelector(".from-alert-400");
      expect(bar).toBeInTheDocument();
    });

    it("surface accent has no gradient bar", () => {
      const { container } = render(
        <StatCard label="Test" value="100" accentColor="surface" />
      );
      const bars = container.querySelectorAll(".from-sentinel-400, .from-alert-400");
      expect(bars.length).toBe(0);
    });

    it("icon container uses accent color styling for sentinel", () => {
      const icon = <span data-testid="icon">📊</span>;
      const { container } = render(
        <StatCard label="Test" value="100" icon={icon} accentColor="sentinel" />
      );
      const iconContainer = container.querySelector(".bg-sentinel-50");
      expect(iconContainer).toBeInTheDocument();
    });

    it("icon container uses accent color styling for alert", () => {
      const icon = <span data-testid="icon">⚠️</span>;
      const { container } = render(
        <StatCard label="Test" value="100" icon={icon} accentColor="alert" />
      );
      const iconContainer = container.querySelector(".bg-alert-50");
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe("value formatting", () => {
    it("formats numeric value with aria-label", () => {
      render(<StatCard label="Count" value={1234} />);
      const value = screen.getByLabelText("Count value: 1,234");
      expect(value).toBeInTheDocument();
    });

    it("formats string value with aria-label", () => {
      render(<StatCard label="Status" value="Active" />);
      const value = screen.getByLabelText("Status value: Active");
      expect(value).toBeInTheDocument();
    });

    it("displays string value as-is without formatting", () => {
      render(<StatCard label="Name" value="John Doe" />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
  });

  describe("complex scenarios", () => {
    it("renders all props together", () => {
      const icon = <span data-testid="icon">💰</span>;
      render(
        <StatCard
          label="Revenue"
          value={50000}
          icon={icon}
          trend={{ value: 25, isPositive: true }}
          accentColor="sentinel"
        />
      );

      expect(screen.getByText("Revenue")).toBeInTheDocument();
      expect(screen.getByText("50,000")).toBeInTheDocument();
      expect(screen.getByTestId("icon")).toBeInTheDocument();
      expect(screen.getByText("+25%")).toBeInTheDocument();
    });

    it("handles zero value correctly", () => {
      render(<StatCard label="Count" value={0} />);
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("handles empty string value", () => {
      render(<StatCard label="Status" value="" />);
      expect(screen.getByText("Status")).toBeInTheDocument();
    });

    it("handles zero trend value", () => {
      render(
        <StatCard
          label="Stable"
          value="100"
          trend={{ value: 0, isPositive: true }}
        />
      );
      expect(screen.getByText("+0%")).toBeInTheDocument();
    });
  });

  describe("styling and layout", () => {
    it("applies card styling with borders and shadows", () => {
      const { container } = render(<StatCard label="Test" value="100" />);
      const card = container.querySelector(".rounded-card");
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass("border", "shadow-soft");
    });

    it("uses flex layout for content", () => {
      const { container } = render(<StatCard label="Test" value="100" />);
      const flexContainer = container.querySelector(".flex.items-center.justify-between");
      expect(flexContainer).toBeInTheDocument();
    });

    it("gradient bar is positioned at bottom", () => {
      const { container } = render(<StatCard label="Test" value="100" />);
      const bar = container.querySelector(".absolute.bottom-0");
      expect(bar).toBeInTheDocument();
    });

    it("gradient bar has aria-hidden", () => {
      const { container } = render(<StatCard label="Test" value="100" />);
      const bar = container.querySelector('.h-1[aria-hidden="true"]');
      expect(bar).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has semantic article role", () => {
      render(<StatCard label="Users" value="150" />);
      expect(screen.getByRole("article")).toBeInTheDocument();
    });

    it("provides descriptive aria-label for the card", () => {
      render(<StatCard label="Active Sessions" value="42" />);
      const article = screen.getByRole("article");
      expect(article).toHaveAttribute("aria-label", "Active Sessions statistic");
    });

    it("decorative elements are marked as aria-hidden", () => {
      const icon = <span>📈</span>;
      const { container } = render(
        <StatCard label="Test" value="100" icon={icon} />
      );
      const hiddenElements = container.querySelectorAll('[aria-hidden="true"]');
      expect(hiddenElements.length).toBeGreaterThan(0);
    });
  });
});
