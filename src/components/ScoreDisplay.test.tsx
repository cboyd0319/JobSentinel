import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreDisplay } from "./ScoreDisplay";

describe("ScoreDisplay", () => {
  it("renders score as percentage", () => {
    render(<ScoreDisplay score={0.85} />);
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("applies high match styling for scores >= 0.9", () => {
    const { container } = render(<ScoreDisplay score={0.95} />);
    // High match scores use alert (red/orange) styling
    expect(container.querySelector(".stroke-alert-500")).toBeInTheDocument();
  });

  it("applies good match styling for scores >= 0.7", () => {
    const { container } = render(<ScoreDisplay score={0.75} />);
    // Good match scores use sentinel (brand) styling
    expect(container.querySelector(".stroke-sentinel-500")).toBeInTheDocument();
  });

  it("applies default styling for lower scores", () => {
    const { container } = render(<ScoreDisplay score={0.5} />);
    // Lower scores use surface (gray) styling
    expect(container.querySelector(".stroke-surface-400")).toBeInTheDocument();
  });

  it("respects size prop", () => {
    const { rerender, container } = render(<ScoreDisplay score={0.8} size="sm" />);
    expect(container.querySelector(".w-12")).toBeInTheDocument();

    rerender(<ScoreDisplay score={0.8} size="lg" />);
    expect(container.querySelector(".w-20")).toBeInTheDocument();
  });

  it("shows label for high scores when showLabel is true", () => {
    render(<ScoreDisplay score={0.9} showLabel={true} />);
    // High scores show "Great Match!" label
    expect(screen.getByText("Great Match!")).toBeInTheDocument();
  });

  it("hides label when showLabel is false", () => {
    render(<ScoreDisplay score={0.9} showLabel={false} />);
    expect(screen.queryByText("Great Match!")).not.toBeInTheDocument();
  });
});
