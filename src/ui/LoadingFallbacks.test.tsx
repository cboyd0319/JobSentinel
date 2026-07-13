import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ChartSkeleton,
  ModalSkeleton,
  PanelSkeleton,
  AnalyticsSkeleton,
  WidgetSkeleton,
  SettingsSkeleton,
  FormSkeleton,
  CompactLoadingSpinner,
} from "./LoadingFallbacks";

describe("LoadingFallbacks", () => {
  describe("ChartSkeleton", () => {
    it("renders with card wrapper", () => {
      const { container } = render(<ChartSkeleton />);
      const card = container.querySelector(".dark\\:bg-surface-800");
      expect(card).toBeInTheDocument();
    });

    it("renders title placeholder", () => {
      const { container } = render(<ChartSkeleton />);
      const titlePlaceholder = container.querySelector(".h-6.w-32");
      expect(titlePlaceholder).toBeInTheDocument();
    });

    it("renders chart placeholder", () => {
      const { container } = render(<ChartSkeleton />);
      const chartPlaceholder = container.querySelector(".h-64");
      expect(chartPlaceholder).toBeInTheDocument();
    });

    it("applies pulse animation", () => {
      const { container } = render(<ChartSkeleton />);
      const animated = container.querySelector(".animate-pulse");
      expect(animated).toBeInTheDocument();
    });

    it("has proper spacing", () => {
      const { container } = render(<ChartSkeleton />);
      const spaced = container.querySelector(".space-y-4");
      expect(spaced).toBeInTheDocument();
    });
  });

  describe("ModalSkeleton", () => {
    it("renders modal overlay", () => {
      const { container } = render(<ModalSkeleton />);
      const overlay = container.querySelector(".fixed.inset-0.bg-black\\/50");
      expect(overlay).toBeInTheDocument();
    });

    it("renders centered modal", () => {
      const { container } = render(<ModalSkeleton />);
      const centered = container.querySelector(".flex.items-center.justify-center");
      expect(centered).toBeInTheDocument();
    });

    it("renders title placeholder", () => {
      const { container } = render(<ModalSkeleton />);
      const title = container.querySelector(".h-8.w-48");
      expect(title).toBeInTheDocument();
    });

    it("renders text placeholders", () => {
      const { container } = render(<ModalSkeleton />);
      const textLines = container.querySelectorAll(".h-4");
      expect(textLines.length).toBeGreaterThan(0);
    });

    it("has proper z-index for modal", () => {
      const { container } = render(<ModalSkeleton />);
      const modal = container.querySelector(".z-50");
      expect(modal).toBeInTheDocument();
    });

    it("has max width constraint", () => {
      const { container } = render(<ModalSkeleton />);
      const constrained = container.querySelector(".max-w-2xl");
      expect(constrained).toBeInTheDocument();
    });

    it("all placeholders animate", () => {
      const { container } = render(<ModalSkeleton />);
      const animated = container.querySelectorAll(".animate-pulse");
      expect(animated.length).toBeGreaterThan(0);
    });
  });

  describe("PanelSkeleton", () => {
    it("renders with card wrapper", () => {
      const { container } = render(<PanelSkeleton />);
      const card = container.querySelector(".dark\\:bg-surface-800");
      expect(card).toBeInTheDocument();
    });

    it("has padding", () => {
      const { container } = render(<PanelSkeleton />);
      const padded = container.querySelector(".p-4");
      expect(padded).toBeInTheDocument();
    });

    it("renders title placeholder", () => {
      const { container } = render(<PanelSkeleton />);
      const title = container.querySelector(".h-6.w-40");
      expect(title).toBeInTheDocument();
    });

    it("renders text lines", () => {
      const { container } = render(<PanelSkeleton />);
      const lines = container.querySelectorAll(".h-4");
      expect(lines.length).toBe(3);
    });

    it("last line is shorter", () => {
      const { container } = render(<PanelSkeleton />);
      const shortLine = container.querySelector(".w-2\\/3");
      expect(shortLine).toBeInTheDocument();
    });
  });

  describe("AnalyticsSkeleton", () => {
    it("renders modal overlay", () => {
      const { container } = render(<AnalyticsSkeleton />);
      const overlay = container.querySelector(".fixed.inset-0");
      expect(overlay).toBeInTheDocument();
    });

    it("has max height for scrolling", () => {
      const { container } = render(<AnalyticsSkeleton />);
      const scrollable = container.querySelector(".max-h-\\[90vh\\]");
      expect(scrollable).toBeInTheDocument();
    });

    it("renders three stat cards", () => {
      const { container } = render(<AnalyticsSkeleton />);
      const statCards = container.querySelectorAll(".h-24");
      expect(statCards.length).toBe(3);
    });

    it("uses grid layout for stats", () => {
      const { container } = render(<AnalyticsSkeleton />);
      const grid = container.querySelector(".grid.grid-cols-3");
      expect(grid).toBeInTheDocument();
    });

    it("renders chart placeholder", () => {
      const { container } = render(<AnalyticsSkeleton />);
      const chart = container.querySelector(".h-64");
      expect(chart).toBeInTheDocument();
    });

    it("has proper max width", () => {
      const { container } = render(<AnalyticsSkeleton />);
      const maxWidth = container.querySelector(".max-w-4xl");
      expect(maxWidth).toBeInTheDocument();
    });
  });

  describe("WidgetSkeleton", () => {
    it("uses grid layout", () => {
      const { container } = render(<WidgetSkeleton />);
      const grid = container.querySelector(".grid");
      expect(grid).toBeInTheDocument();
    });

    it("renders two widgets", () => {
      const { container } = render(<WidgetSkeleton />);
      const widgets = container.querySelectorAll(".h-80");
      expect(widgets.length).toBe(2);
    });

    it("widgets have rounded corners", () => {
      const { container } = render(<WidgetSkeleton />);
      const rounded = container.querySelectorAll(".rounded-lg");
      expect(rounded.length).toBe(2);
    });

    it("responsive grid columns", () => {
      const { container } = render(<WidgetSkeleton />);
      const responsive = container.querySelector(".grid-cols-1.md\\:grid-cols-2");
      expect(responsive).toBeInTheDocument();
    });

    it("applies pulse animation", () => {
      const { container } = render(<WidgetSkeleton />);
      const animated = container.querySelector(".animate-pulse");
      expect(animated).toBeInTheDocument();
    });
  });

  describe("SettingsSkeleton", () => {
    it("has padding", () => {
      const { container } = render(<SettingsSkeleton />);
      const padded = container.querySelector(".p-6");
      expect(padded).toBeInTheDocument();
    });

    it("renders title placeholder", () => {
      const { container } = render(<SettingsSkeleton />);
      const title = container.querySelector(".h-10.w-64");
      expect(title).toBeInTheDocument();
    });

    it("renders four setting sections", () => {
      const { container } = render(<SettingsSkeleton />);
      const sections = container.querySelectorAll(".space-y-3");
      expect(sections.length).toBe(4);
    });

    it("each section has label and input placeholder", () => {
      const { container } = render(<SettingsSkeleton />);
      const labels = container.querySelectorAll(".h-6.w-32");
      const inputs = container.querySelectorAll(".h-16");
      expect(labels.length).toBe(4);
      expect(inputs.length).toBe(4);
    });

    it("proper spacing between sections", () => {
      const { container } = render(<SettingsSkeleton />);
      const spaced = container.querySelector(".space-y-6");
      expect(spaced).toBeInTheDocument();
    });
  });

  describe("FormSkeleton", () => {
    it("renders three form fields", () => {
      const { container } = render(<FormSkeleton />);
      const fields = container.querySelectorAll(".space-y-2");
      expect(fields.length).toBe(3);
    });

    it("each field has label and input", () => {
      const { container } = render(<FormSkeleton />);
      const labels = container.querySelectorAll(".h-4.w-24");
      const inputs = container.querySelectorAll(".h-10");
      expect(labels.length).toBe(3);
      expect(inputs.length).toBe(3);
    });

    it("applies pulse animation", () => {
      const { container } = render(<FormSkeleton />);
      const animated = container.querySelector(".animate-pulse");
      expect(animated).toBeInTheDocument();
    });

    it("has proper vertical spacing", () => {
      const { container } = render(<FormSkeleton />);
      const spaced = container.querySelector(".space-y-4");
      expect(spaced).toBeInTheDocument();
    });
  });

  describe("CompactLoadingSpinner", () => {
    it("renders without message", () => {
      const { container } = render(<CompactLoadingSpinner />);
      const spinner = container.querySelector(".flex.items-center.justify-center");
      expect(spinner).toBeInTheDocument();
    });

    it("renders with custom message", () => {
      render(<CompactLoadingSpinner message="Loading data..." />);
      expect(screen.getByText("Loading data...")).toBeInTheDocument();
    });

    it("has vertical padding", () => {
      const { container } = render(<CompactLoadingSpinner />);
      const padded = container.querySelector(".py-4");
      expect(padded).toBeInTheDocument();
    });

    it("centers content", () => {
      const { container } = render(<CompactLoadingSpinner />);
      const centered = container.querySelector(".justify-center");
      expect(centered).toBeInTheDocument();
    });
  });

  describe("dark mode styling", () => {
    it("ChartSkeleton has dark mode styles", () => {
      const { container } = render(<ChartSkeleton />);
      const darkElement = container.querySelector(".dark\\:bg-surface-700");
      expect(darkElement).toBeInTheDocument();
    });

    it("ModalSkeleton has dark mode styles", () => {
      const { container } = render(<ModalSkeleton />);
      const darkElement = container.querySelector(".dark\\:bg-surface-800");
      expect(darkElement).toBeInTheDocument();
    });

    it("PanelSkeleton has dark mode styles", () => {
      const { container } = render(<PanelSkeleton />);
      const darkElement = container.querySelector(".dark\\:bg-surface-700");
      expect(darkElement).toBeInTheDocument();
    });

    it("WidgetSkeleton has dark mode styles", () => {
      const { container } = render(<WidgetSkeleton />);
      const darkElement = container.querySelector(".dark\\:bg-surface-800");
      expect(darkElement).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("CompactLoadingSpinner message is readable by screen readers", () => {
      render(<CompactLoadingSpinner message="Please wait" />);
      expect(screen.getByText("Please wait")).toBeInTheDocument();
    });

    it("skeletons use semantic HTML", () => {
      const { container } = render(<PanelSkeleton />);
      // Skeletons are divs (no interactive elements during loading)
      const divs = container.querySelectorAll("div");
      expect(divs.length).toBeGreaterThan(0);
    });
  });

  describe("component exports", () => {
    it("exports ChartSkeleton component", () => {
      expect(ChartSkeleton).toBeDefined();
      expect(typeof ChartSkeleton).toBe("object");
    });

    it("exports ModalSkeleton component", () => {
      expect(ModalSkeleton).toBeDefined();
      expect(typeof ModalSkeleton).toBe("object");
    });

    it("exports PanelSkeleton component", () => {
      expect(PanelSkeleton).toBeDefined();
      expect(typeof PanelSkeleton).toBe("object");
    });

    it("exports CompactLoadingSpinner component", () => {
      expect(CompactLoadingSpinner).toBeDefined();
      expect(typeof CompactLoadingSpinner).toBe("object");
    });

    it("all components are memoized", () => {
      // Components wrapped in memo are objects with $$typeof property
      expect(ChartSkeleton).toHaveProperty("$$typeof");
      expect(ModalSkeleton).toHaveProperty("$$typeof");
      expect(PanelSkeleton).toHaveProperty("$$typeof");
      expect(CompactLoadingSpinner).toHaveProperty("$$typeof");
    });
  });
});
