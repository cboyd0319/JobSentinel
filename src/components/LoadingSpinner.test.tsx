import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingSpinner, LoadingDots } from "./LoadingSpinner";

describe("LoadingSpinner", () => {
  describe("basic rendering", () => {
    it("renders with default message", () => {
      render(<LoadingSpinner />);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("renders with custom message", () => {
      render(<LoadingSpinner message="Please wait" />);
      expect(screen.getByText("Please wait")).toBeInTheDocument();
    });

    it("renders spinner animation", () => {
      const { container } = render(<LoadingSpinner />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("centers content on screen", () => {
      const { container } = render(<LoadingSpinner />);
      const flexContainer = container.querySelector(".flex.items-center.justify-center");
      expect(flexContainer).toBeInTheDocument();
      expect(flexContainer).toHaveClass("h-screen");
    });
  });

  describe("size variations", () => {
    it("renders small size", () => {
      const { container } = render(<LoadingSpinner size="sm" />);
      const spinner = container.querySelector(".w-8.h-8");
      expect(spinner).toBeInTheDocument();
    });

    it("renders medium size by default", () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector(".w-12.h-12");
      expect(spinner).toBeInTheDocument();
    });

    it("renders large size", () => {
      const { container } = render(<LoadingSpinner size="lg" />);
      const spinner = container.querySelector(".w-16.h-16");
      expect(spinner).toBeInTheDocument();
    });

    it("small size with custom message", () => {
      const { container } = render(
        <LoadingSpinner size="sm" message="Fetching data..." />
      );
      expect(screen.getByText("Fetching data...")).toBeInTheDocument();
      const spinner = container.querySelector(".w-8.h-8");
      expect(spinner).toBeInTheDocument();
    });

    it("large size with custom message", () => {
      const { container } = render(
        <LoadingSpinner size="lg" message="Processing..." />
      );
      expect(screen.getByText("Processing...")).toBeInTheDocument();
      const spinner = container.querySelector(".w-16.h-16");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("animations", () => {
    it("applies fade-in animation to container", () => {
      const { container } = render(<LoadingSpinner />);
      const animatedContainer = container.querySelector(".animate-fade-in");
      expect(animatedContainer).toBeInTheDocument();
    });

    it("applies spin animation to scanning arc", () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("applies pulse animation to center icon", () => {
      const { container } = render(<LoadingSpinner />);
      const icon = container.querySelector(".animate-pulse-slow");
      expect(icon).toBeInTheDocument();
    });

    it("spinner has custom animation duration", () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toHaveStyle({ animationDuration: "1.5s" });
    });
  });

  describe("sentinel-themed elements", () => {
    it("renders outer ring circle", () => {
      const { container } = render(<LoadingSpinner />);
      const circles = container.querySelectorAll("circle");
      expect(circles.length).toBeGreaterThanOrEqual(2);
    });

    it("renders scanning arc with sentinel color", () => {
      const { container } = render(<LoadingSpinner />);
      const sentinelArc = container.querySelector(".text-sentinel-500");
      expect(sentinelArc).toBeInTheDocument();
    });

    it("renders center sentinel eye icon", () => {
      const { container } = render(<LoadingSpinner />);
      const eyeIcon = container.querySelector('svg path[d*="M15 12a3 3 0 11-6 0"]');
      expect(eyeIcon).toBeInTheDocument();
    });

    it("center icon is positioned absolutely", () => {
      const { container } = render(<LoadingSpinner />);
      const iconContainer = container.querySelector(".absolute.inset-0");
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("applies background color to screen", () => {
      const { container } = render(<LoadingSpinner />);
      const background = container.querySelector(".bg-surface-50");
      expect(background).toBeInTheDocument();
    });

    it("applies dark mode background", () => {
      const { container } = render(<LoadingSpinner />);
      const darkBg = container.querySelector(".dark\\:bg-surface-900");
      expect(darkBg).toBeInTheDocument();
    });

    it("message has proper text styling", () => {
      render(<LoadingSpinner message="Test" />);
      const message = screen.getByText("Test");
      expect(message).toHaveClass("font-medium");
      expect(message).toHaveClass("text-surface-600");
    });

    it("centers message text", () => {
      const { container } = render(<LoadingSpinner />);
      const textCenter = container.querySelector(".text-center");
      expect(textCenter).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("SVG elements have aria-hidden", () => {
      const { container } = render(<LoadingSpinner />);
      const svgs = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it("message is readable by screen readers", () => {
      render(<LoadingSpinner message="Loading your dashboard" />);
      expect(screen.getByText("Loading your dashboard")).toBeInTheDocument();
    });
  });

  describe("SVG structure", () => {
    it("SVG has correct viewBox", () => {
      const { container } = render(<LoadingSpinner />);
      const svg = container.querySelector('svg[viewBox="0 0 48 48"]');
      expect(svg).toBeInTheDocument();
    });

    it("outer circle uses surface color", () => {
      const { container } = render(<LoadingSpinner />);
      const outerCircle = container.querySelector(".text-surface-200");
      expect(outerCircle).toBeInTheDocument();
    });

    it("scanning arc has stroke properties", () => {
      const { container } = render(<LoadingSpinner />);
      const circles = container.querySelectorAll("circle");
      const scanningArc = Array.from(circles).find(
        (circle) => circle.getAttribute("stroke-dasharray") === "31.4 94.2"
      );
      expect(scanningArc).toBeInTheDocument();
    });
  });
});

describe("LoadingDots", () => {
  describe("basic rendering", () => {
    it("renders three dots", () => {
      const { container } = render(<LoadingDots />);
      const dots = container.querySelectorAll("span.w-1\\.5");
      expect(dots.length).toBe(3);
    });

    it("uses inline-flex layout", () => {
      const { container } = render(<LoadingDots />);
      const dotsContainer = container.querySelector(".inline-flex");
      expect(dotsContainer).toBeInTheDocument();
    });

    it("has gap between dots", () => {
      const { container } = render(<LoadingDots />);
      const dotsContainer = container.querySelector(".gap-1");
      expect(dotsContainer).toBeInTheDocument();
    });
  });

  describe("dot styling", () => {
    it("dots are rounded", () => {
      const { container } = render(<LoadingDots />);
      const dots = container.querySelectorAll(".rounded-full");
      expect(dots.length).toBe(3);
    });

    it("dots have current color background", () => {
      const { container } = render(<LoadingDots />);
      const dots = container.querySelectorAll(".bg-current");
      expect(dots.length).toBe(3);
    });

    it("dots have correct size", () => {
      const { container } = render(<LoadingDots />);
      const dots = container.querySelectorAll("span.w-1\\.5.h-1\\.5");
      expect(dots.length).toBe(3);
    });
  });

  describe("animations", () => {
    it("all dots have bounce animation", () => {
      const { container } = render(<LoadingDots />);
      const dots = container.querySelectorAll(".animate-bounce");
      expect(dots.length).toBe(3);
    });

    it("first dot has no delay", () => {
      const { container } = render(<LoadingDots />);
      const dots = container.querySelectorAll("span.w-1\\.5");
      expect(dots[0]).toHaveStyle({ animationDelay: "0ms" });
    });

    it("second dot has 150ms delay", () => {
      const { container } = render(<LoadingDots />);
      const dots = container.querySelectorAll("span.w-1\\.5");
      expect(dots[1]).toHaveStyle({ animationDelay: "150ms" });
    });

    it("third dot has 300ms delay", () => {
      const { container } = render(<LoadingDots />);
      const dots = container.querySelectorAll("span.w-1\\.5");
      expect(dots[2]).toHaveStyle({ animationDelay: "300ms" });
    });

    it("animation delays create wave effect", () => {
      const { container } = render(<LoadingDots />);
      const dots = container.querySelectorAll("span.w-1\\.5");
      
      const delay1 = (dots[0] as HTMLElement).style.animationDelay;
      const delay2 = (dots[1] as HTMLElement).style.animationDelay;
      const delay3 = (dots[2] as HTMLElement).style.animationDelay;

      expect(delay1).toBe("0ms");
      expect(delay2).toBe("150ms");
      expect(delay3).toBe("300ms");
    });
  });

  describe("integration with other components", () => {
    it("can be used inline with text", () => {
      const { container } = render(
        <div>
          Loading <LoadingDots />
        </div>
      );
      expect(container.textContent).toContain("Loading");
      const dots = container.querySelectorAll(".inline-flex");
      expect(dots.length).toBe(1);
    });

    it("inherits text color from parent", () => {
      const { container } = render(
        <div className="text-blue-500">
          <LoadingDots />
        </div>
      );
      const dots = container.querySelectorAll(".bg-current");
      expect(dots.length).toBe(3);
    });
  });

  describe("structure", () => {
    it("outer span contains all dots", () => {
      const { container } = render(<LoadingDots />);
      const outerSpan = container.querySelector(".inline-flex.gap-1");
      const innerSpans = outerSpan?.querySelectorAll("span.w-1\\.5");
      expect(innerSpans?.length).toBe(3);
    });

    it("maintains proper nesting", () => {
      const { container } = render(<LoadingDots />);
      const outerSpan = container.firstChild;
      expect(outerSpan?.childNodes.length).toBe(3);
    });
  });
});
