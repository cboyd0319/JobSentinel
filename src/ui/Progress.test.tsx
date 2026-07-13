import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Progress, ProgressIndeterminate } from "./Progress";

describe("Progress", () => {
  describe("basic rendering", () => {
    it("renders progressbar role", () => {
      render(<Progress value={50} />);

      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("sets aria-valuenow correctly", () => {
      render(<Progress value={75} />);

      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toHaveAttribute("aria-valuenow", "75");
    });

    it("sets aria-valuemin and aria-valuemax", () => {
      render(<Progress value={50} max={200} />);

      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toHaveAttribute("aria-valuemin", "0");
      expect(progressbar).toHaveAttribute("aria-valuemax", "200");
    });
  });

  describe("percentage calculation", () => {
    it("calculates percentage based on value and max", () => {
      render(<Progress value={50} max={100} />);

      const progressbar = screen.getByRole("progressbar");
      const innerBar = progressbar.firstChild;
      expect(innerBar).toHaveStyle({ width: "50%" });
    });

    it("clamps percentage to 0 for negative values", () => {
      render(<Progress value={-10} max={100} />);

      const progressbar = screen.getByRole("progressbar");
      const innerBar = progressbar.firstChild;
      expect(innerBar).toHaveStyle({ width: "0%" });
    });

    it("clamps percentage to 100 for values exceeding max", () => {
      render(<Progress value={150} max={100} />);

      const progressbar = screen.getByRole("progressbar");
      const innerBar = progressbar.firstChild;
      expect(innerBar).toHaveStyle({ width: "100%" });
    });

    it("handles custom max values", () => {
      render(<Progress value={25} max={50} />);

      const progressbar = screen.getByRole("progressbar");
      const innerBar = progressbar.firstChild;
      expect(innerBar).toHaveStyle({ width: "50%" });
    });
  });

  describe("showLabel", () => {
    it("does not show label by default", () => {
      render(<Progress value={50} />);

      expect(screen.queryByText("Progress")).not.toBeInTheDocument();
    });

    it("shows label when showLabel is true", () => {
      render(<Progress value={50} showLabel />);

      expect(screen.getByText("Progress")).toBeInTheDocument();
    });

    it("displays rounded percentage", () => {
      render(<Progress value={33} showLabel />);

      expect(screen.getByText("33%")).toBeInTheDocument();
    });

    it("rounds percentage to nearest integer", () => {
      render(<Progress value={66.7} showLabel />);

      expect(screen.getByText("67%")).toBeInTheDocument();
    });
  });

  describe("sizes", () => {
    it("applies sm size class", () => {
      render(<Progress value={50} size="sm" />);

      const progressbar = screen.getByRole("progressbar");
      expect(progressbar.className).toContain("h-1");
    });

    it("applies md size class (default)", () => {
      render(<Progress value={50} />);

      const progressbar = screen.getByRole("progressbar");
      expect(progressbar.className).toContain("h-2");
    });

    it("applies lg size class", () => {
      render(<Progress value={50} size="lg" />);

      const progressbar = screen.getByRole("progressbar");
      expect(progressbar.className).toContain("h-3");
    });
  });

  describe("variants", () => {
    it("applies sentinel variant by default", () => {
      render(<Progress value={50} />);

      const progressbar = screen.getByRole("progressbar");
      const innerBar = progressbar.firstChild as HTMLElement;
      expect(innerBar.className).toContain("bg-sentinel-500");
    });

    it("applies alert variant", () => {
      render(<Progress value={50} variant="alert" />);

      const progressbar = screen.getByRole("progressbar");
      const innerBar = progressbar.firstChild as HTMLElement;
      expect(innerBar.className).toContain("bg-alert-500");
    });

    it("applies success variant", () => {
      render(<Progress value={50} variant="success" />);

      const progressbar = screen.getByRole("progressbar");
      const innerBar = progressbar.firstChild as HTMLElement;
      expect(innerBar.className).toContain("bg-success");
    });

    it("applies danger variant", () => {
      render(<Progress value={50} variant="danger" />);

      const progressbar = screen.getByRole("progressbar");
      const innerBar = progressbar.firstChild as HTMLElement;
      expect(innerBar.className).toContain("bg-danger");
    });
  });

  describe("animation", () => {
    it("applies transition classes by default", () => {
      render(<Progress value={50} />);

      const progressbar = screen.getByRole("progressbar");
      const innerBar = progressbar.firstChild as HTMLElement;
      expect(innerBar.className).toContain("transition-all");
    });

    it("removes transition classes when animated is false", () => {
      render(<Progress value={50} animated={false} />);

      const progressbar = screen.getByRole("progressbar");
      const innerBar = progressbar.firstChild as HTMLElement;
      expect(innerBar.className).not.toContain("transition-all");
    });
  });

  describe("custom className", () => {
    it("applies custom className to wrapper", () => {
      render(<Progress value={50} className="custom-class" />);

      // The wrapper div contains the custom class
      const wrapper = screen.getByRole("progressbar").parentElement;
      expect(wrapper?.className).toContain("custom-class");
    });
  });
});

describe("ProgressIndeterminate", () => {
  it("renders progressbar role", () => {
    render(<ProgressIndeterminate />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("has aria-busy attribute", () => {
    render(<ProgressIndeterminate />);

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-busy", "true");
  });

  it("applies size class", () => {
    render(<ProgressIndeterminate size="lg" />);

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.className).toContain("h-3");
  });

  it("applies variant class", () => {
    render(<ProgressIndeterminate variant="alert" />);

    const progressbar = screen.getByRole("progressbar");
    const innerBar = progressbar.firstChild as HTMLElement;
    expect(innerBar.className).toContain("bg-alert-500");
  });

  it("applies custom className", () => {
    render(<ProgressIndeterminate className="my-custom-class" />);

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.className).toContain("my-custom-class");
  });

  it("has animation class for indeterminate state", () => {
    render(<ProgressIndeterminate />);

    const progressbar = screen.getByRole("progressbar");
    const innerBar = progressbar.firstChild as HTMLElement;
    expect(innerBar.className).toContain("animate-progress-indeterminate");
  });
});
