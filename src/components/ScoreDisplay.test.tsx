import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScoreDisplay, ScoreBar } from "./ScoreDisplay";

describe("ScoreDisplay", () => {
  describe("rendering", () => {
    it("renders score as percentage", () => {
      render(<ScoreDisplay score={0.85} />);
      expect(screen.getByText("85%")).toBeInTheDocument();
    });

    it("rounds percentage correctly", () => {
      render(<ScoreDisplay score={0.856} />);
      expect(screen.getByText("86%")).toBeInTheDocument();
    });

    it("shows 0% for zero score", () => {
      render(<ScoreDisplay score={0} />);
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("shows 100% for perfect score", () => {
      render(<ScoreDisplay score={1} />);
      expect(screen.getByText("100%")).toBeInTheDocument();
    });
  });

  describe("color styling", () => {
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

    it("applies partial match styling for scores >= 0.5", () => {
      const { container } = render(<ScoreDisplay score={0.5} />);
      // Partial match scores use surface-400 styling
      expect(container.querySelector(".stroke-surface-400")).toBeInTheDocument();
    });

    it("applies low match styling for scores < 0.5", () => {
      const { container } = render(<ScoreDisplay score={0.3} />);
      // Low scores use surface-300 styling
      expect(container.querySelector(".stroke-surface-300")).toBeInTheDocument();
    });

    it("applies glow effect for excellent scores", () => {
      const { container } = render(<ScoreDisplay score={0.95} />);
      expect(container.querySelector(".shadow-alert-glow")).toBeInTheDocument();
    });

    it("does not apply glow for lower scores", () => {
      const { container } = render(<ScoreDisplay score={0.85} />);
      expect(container.querySelector(".shadow-alert-glow")).not.toBeInTheDocument();
    });
  });

  describe("size prop", () => {
    it("renders small size", () => {
      const { container } = render(<ScoreDisplay score={0.8} size="sm" />);
      expect(container.querySelector(".w-12")).toBeInTheDocument();
      expect(container.querySelector(".h-12")).toBeInTheDocument();
    });

    it("renders medium size by default", () => {
      const { container } = render(<ScoreDisplay score={0.8} />);
      expect(container.querySelector(".w-16")).toBeInTheDocument();
      expect(container.querySelector(".h-16")).toBeInTheDocument();
    });

    it("renders large size", () => {
      const { container } = render(<ScoreDisplay score={0.8} size="lg" />);
      expect(container.querySelector(".w-20")).toBeInTheDocument();
      expect(container.querySelector(".h-20")).toBeInTheDocument();
    });
  });

  describe("labels", () => {
    it("shows 'Great Match!' for scores >= 0.9", () => {
      render(<ScoreDisplay score={0.9} showLabel={true} />);
      expect(screen.getByText("Great Match!")).toBeInTheDocument();
    });

    it("shows 'Good Match' for scores >= 0.7", () => {
      render(<ScoreDisplay score={0.75} showLabel={true} />);
      expect(screen.getByText("Good Match")).toBeInTheDocument();
    });

    it("shows 'Partial Match' for scores >= 0.5", () => {
      render(<ScoreDisplay score={0.55} showLabel={true} />);
      expect(screen.getByText("Partial Match")).toBeInTheDocument();
    });

    it("shows 'Low Match' for scores < 0.5", () => {
      render(<ScoreDisplay score={0.3} showLabel={true} />);
      expect(screen.getByText("Low Match")).toBeInTheDocument();
    });

    it("hides label when showLabel is false", () => {
      render(<ScoreDisplay score={0.9} showLabel={false} />);
      expect(screen.queryByText("Great Match!")).not.toBeInTheDocument();
    });

    it("shows label by default", () => {
      render(<ScoreDisplay score={0.9} />);
      expect(screen.getByText("Great Match!")).toBeInTheDocument();
    });
  });

  describe("click handler", () => {
    it("calls onClick when clicked", () => {
      const onClick = vi.fn();
      render(<ScoreDisplay score={0.8} onClick={onClick} />);

      fireEvent.click(screen.getByText("80%"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("applies cursor-pointer when onClick is provided", () => {
      const { container } = render(<ScoreDisplay score={0.8} onClick={() => {}} />);
      expect(container.querySelector(".cursor-pointer")).toBeInTheDocument();
    });

    it("applies cursor-help when no onClick", () => {
      const { container } = render(<ScoreDisplay score={0.8} />);
      expect(container.querySelector(".cursor-help")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles NaN score gracefully", () => {
      render(<ScoreDisplay score={NaN} />);
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("handles negative scores", () => {
      render(<ScoreDisplay score={-0.5} />);
      // Should treat as low score
      expect(screen.getByText("-50%")).toBeInTheDocument();
    });

    it("handles scores > 1", () => {
      render(<ScoreDisplay score={1.5} />);
      expect(screen.getByText("150%")).toBeInTheDocument();
    });
  });

  describe("SVG rendering", () => {
    it("renders SVG with aria-hidden", () => {
      const { container } = render(<ScoreDisplay score={0.8} />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });

    it("renders two circles for background and score", () => {
      const { container } = render(<ScoreDisplay score={0.8} />);
      const circles = container.querySelectorAll("circle");
      expect(circles).toHaveLength(2);
    });
  });
});

describe("ScoreBar", () => {
  describe("rendering", () => {
    it("renders a progress bar", () => {
      const { container } = render(<ScoreBar score={0.8} />);
      expect(container.querySelector(".h-2")).toBeInTheDocument();
    });

    it("sets width based on score", () => {
      const { container } = render(<ScoreBar score={0.75} />);
      const bar = container.querySelector(".absolute");
      expect(bar).toHaveStyle({ width: "75%" });
    });

    it("sets 100% width for perfect score", () => {
      const { container } = render(<ScoreBar score={1} />);
      const bar = container.querySelector(".absolute");
      expect(bar).toHaveStyle({ width: "100%" });
    });

    it("sets 0% width for zero score", () => {
      const { container } = render(<ScoreBar score={0} />);
      const bar = container.querySelector(".absolute");
      expect(bar).toHaveStyle({ width: "0%" });
    });
  });

  describe("color styling", () => {
    it("uses alert color for scores >= 0.9", () => {
      const { container } = render(<ScoreBar score={0.95} />);
      expect(container.querySelector(".bg-alert-500")).toBeInTheDocument();
    });

    it("uses sentinel color for scores >= 0.7", () => {
      const { container } = render(<ScoreBar score={0.75} />);
      expect(container.querySelector(".bg-sentinel-500")).toBeInTheDocument();
    });

    it("uses surface-400 for scores >= 0.5", () => {
      const { container } = render(<ScoreBar score={0.55} />);
      expect(container.querySelector(".bg-surface-400")).toBeInTheDocument();
    });

    it("uses surface-300 for scores < 0.5", () => {
      const { container } = render(<ScoreBar score={0.3} />);
      expect(container.querySelector(".bg-surface-300")).toBeInTheDocument();
    });
  });

  describe("className prop", () => {
    it("applies custom className", () => {
      const { container } = render(<ScoreBar score={0.8} className="custom-class" />);
      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("preserves default classes with custom className", () => {
      const { container } = render(<ScoreBar score={0.8} className="my-class" />);
      expect(container.firstChild).toHaveClass("h-2");
      expect(container.firstChild).toHaveClass("my-class");
    });
  });

  describe("edge cases", () => {
    it("handles zero score", () => {
      const { container } = render(<ScoreBar score={0} />);
      const bar = container.querySelector(".absolute");
      expect(bar).toHaveStyle({ width: "0%" });
    });

    it("rounds percentage", () => {
      const { container } = render(<ScoreBar score={0.333} />);
      const bar = container.querySelector(".absolute");
      expect(bar).toHaveStyle({ width: "33%" });
    });
  });
});
