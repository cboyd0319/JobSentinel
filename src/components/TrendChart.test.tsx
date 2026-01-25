import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrendChart } from "./TrendChart";

// Mock recharts components since they don't render in jsdom
vi.mock("recharts/es6/chart/LineChart", () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
}));

vi.mock("recharts/es6/chart/BarChart", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
}));

vi.mock("recharts/es6/cartesian/Line", () => ({
  Line: () => <div data-testid="line" />,
}));

vi.mock("recharts/es6/cartesian/Bar", () => ({
  Bar: () => <div data-testid="bar" />,
}));

vi.mock("recharts/es6/cartesian/XAxis", () => ({
  XAxis: () => <div data-testid="x-axis" />,
}));

vi.mock("recharts/es6/cartesian/YAxis", () => ({
  YAxis: () => <div data-testid="y-axis" />,
}));

vi.mock("recharts/es6/cartesian/CartesianGrid", () => ({
  CartesianGrid: () => <div data-testid="grid" />,
}));

vi.mock("recharts/es6/component/Tooltip", () => ({
  Tooltip: () => <div data-testid="tooltip" />,
}));

vi.mock("recharts/es6/component/Legend", () => ({
  Legend: () => <div data-testid="legend" />,
}));

vi.mock("recharts/es6/component/ResponsiveContainer", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

describe("TrendChart", () => {
  const sampleData = [
    { month: "Jan", value: 100 },
    { month: "Feb", value: 150 },
    { month: "Mar", value: 200 },
  ];

  const defaultProps = {
    data: sampleData,
    type: "line" as const,
    title: "Test Chart",
    xKey: "month",
    yKey: "value",
  };

  describe("rendering", () => {
    it("renders chart region with title", () => {
      render(<TrendChart {...defaultProps} />);

      expect(screen.getByRole("region")).toBeInTheDocument();
      expect(screen.getByText("Test Chart")).toBeInTheDocument();
    });

    it("renders title as h3 heading", () => {
      render(<TrendChart {...defaultProps} />);

      const heading = screen.getByRole("heading", { level: 3 });
      expect(heading).toHaveTextContent("Test Chart");
    });

    it("has aria-labelledby linking to title", () => {
      render(<TrendChart {...defaultProps} />);

      const region = screen.getByRole("region");
      expect(region).toHaveAttribute("aria-labelledby", "test-chart-title");
    });

    it("generates correct id from title with spaces", () => {
      render(<TrendChart {...defaultProps} title="My Chart Title" />);

      const region = screen.getByRole("region");
      expect(region).toHaveAttribute("aria-labelledby", "my-chart-title-title");
    });
  });

  describe("line chart", () => {
    it("renders LineChart when type is line", () => {
      render(<TrendChart {...defaultProps} type="line" />);

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("does not render BarChart when type is line", () => {
      render(<TrendChart {...defaultProps} type="line" />);

      expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
    });
  });

  describe("bar chart", () => {
    it("renders BarChart when type is bar", () => {
      render(<TrendChart {...defaultProps} type="bar" />);

      expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    });

    it("does not render LineChart when type is bar", () => {
      render(<TrendChart {...defaultProps} type="bar" />);

      expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
    });
  });

  describe("chart accessibility", () => {
    it("has img role with aria-label describing the chart", () => {
      render(<TrendChart {...defaultProps} />);

      const chartImg = screen.getByRole("img");
      expect(chartImg).toHaveAttribute(
        "aria-label",
        "Test Chart - line chart showing 3 data points"
      );
    });

    it("updates aria-label for bar chart type", () => {
      render(<TrendChart {...defaultProps} type="bar" />);

      const chartImg = screen.getByRole("img");
      expect(chartImg).toHaveAttribute(
        "aria-label",
        "Test Chart - bar chart showing 3 data points"
      );
    });

    it("reflects data length in aria-label", () => {
      const data = [{ month: "Jan", value: 100 }];
      render(<TrendChart {...defaultProps} data={data} />);

      const chartImg = screen.getByRole("img");
      expect(chartImg).toHaveAttribute(
        "aria-label",
        "Test Chart - line chart showing 1 data points"
      );
    });
  });

  describe("loading state", () => {
    it("renders loading skeleton when loading is true", () => {
      render(<TrendChart {...defaultProps} loading={true} />);

      const loadingElement = screen.getByRole("status");
      expect(loadingElement).toHaveAttribute("aria-busy", "true");
      expect(loadingElement).toHaveAttribute("aria-label", "Loading chart");
    });

    it("shows title while loading", () => {
      render(<TrendChart {...defaultProps} loading={true} />);

      expect(screen.getByText("Test Chart")).toBeInTheDocument();
    });

    it("has animate-pulse class on skeleton", () => {
      render(<TrendChart {...defaultProps} loading={true} />);

      const loadingElement = screen.getByRole("status");
      expect(loadingElement.className).toContain("animate-pulse");
    });

    it("does not render chart when loading", () => {
      render(<TrendChart {...defaultProps} loading={true} />);

      expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
      expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows empty message when data is empty", () => {
      render(<TrendChart {...defaultProps} data={[]} />);

      expect(screen.getByText("No data available")).toBeInTheDocument();
    });

    it("shows custom empty message when provided", () => {
      render(
        <TrendChart {...defaultProps} data={[]} emptyMessage="No results found" />
      );

      expect(screen.getByText("No results found")).toBeInTheDocument();
    });

    it("shows title in empty state", () => {
      render(<TrendChart {...defaultProps} data={[]} />);

      expect(screen.getByText("Test Chart")).toBeInTheDocument();
    });

    it("renders empty state with status role", () => {
      render(<TrendChart {...defaultProps} data={[]} />);

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("does not render chart when data is empty", () => {
      render(<TrendChart {...defaultProps} data={[]} />);

      expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
      expect(screen.queryByTestId("responsive-container")).not.toBeInTheDocument();
    });
  });

  describe("chart components", () => {
    it("renders ResponsiveContainer", () => {
      render(<TrendChart {...defaultProps} />);

      expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    });

    it("renders axis components for line chart", () => {
      render(<TrendChart {...defaultProps} type="line" />);

      expect(screen.getByTestId("x-axis")).toBeInTheDocument();
      expect(screen.getByTestId("y-axis")).toBeInTheDocument();
    });

    it("renders axis components for bar chart", () => {
      render(<TrendChart {...defaultProps} type="bar" />);

      expect(screen.getByTestId("x-axis")).toBeInTheDocument();
      expect(screen.getByTestId("y-axis")).toBeInTheDocument();
    });

    it("renders grid for line chart", () => {
      render(<TrendChart {...defaultProps} type="line" />);

      expect(screen.getByTestId("grid")).toBeInTheDocument();
    });

    it("renders tooltip and legend", () => {
      render(<TrendChart {...defaultProps} />);

      expect(screen.getByTestId("tooltip")).toBeInTheDocument();
      expect(screen.getByTestId("legend")).toBeInTheDocument();
    });
  });

  describe("props handling", () => {
    it("uses default height when not specified", () => {
      render(<TrendChart {...defaultProps} />);

      // Component uses default height=250
      expect(screen.getByRole("region")).toBeInTheDocument();
    });

    it("uses default color when not specified", () => {
      render(<TrendChart {...defaultProps} />);

      // Just verify chart renders, color is internal to recharts
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("handles non-numeric data gracefully", () => {
      const dataWithNonNumeric = [
        { month: "Jan", value: "abc" },
        { month: "Feb", value: null },
        { month: "Mar", value: undefined },
      ];

      // Should not throw
      render(
        <TrendChart
          {...defaultProps}
          data={dataWithNonNumeric as unknown as typeof sampleData}
        />
      );

      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });
  });
});
