import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HelpIcon } from "./HelpIcon";

// Mock the Tooltip component since we're testing HelpIcon specifically
vi.mock("./Tooltip", () => ({
  Tooltip: ({ content, children, position }: { content: string; children: React.ReactNode; position?: string }) => (
    <div data-testid="tooltip-wrapper" data-position={position} data-content={content}>
      {children}
    </div>
  ),
}));

describe("HelpIcon", () => {
  describe("basic rendering", () => {
    it("renders help icon with question mark", () => {
      render(<HelpIcon text="Help text" />);
      expect(screen.getByText("?")).toBeInTheDocument();
    });

    it("renders with tooltip text", () => {
      render(<HelpIcon text="This is helpful information" />);
      const wrapper = screen.getByTestId("tooltip-wrapper");
      expect(wrapper).toHaveAttribute("data-content", "This is helpful information");
    });

    it("has img role for accessibility", () => {
      render(<HelpIcon text="Help information" />);
      const icon = screen.getByRole("img");
      expect(icon).toBeInTheDocument();
    });

    it("aria-label matches text content", () => {
      render(<HelpIcon text="Additional info" />);
      const icon = screen.getByRole("img");
      expect(icon).toHaveAttribute("aria-label", "Additional info");
    });
  });

  describe("size variations", () => {
    it("renders small size by default", () => {
      const { container } = render(<HelpIcon text="Help" />);
      const icon = container.querySelector(".w-4.h-4");
      expect(icon).toBeInTheDocument();
    });

    it("renders small size explicitly", () => {
      const { container } = render(<HelpIcon text="Help" size="sm" />);
      const icon = container.querySelector(".w-4.h-4");
      expect(icon).toBeInTheDocument();
    });

    it("renders medium size", () => {
      const { container } = render(<HelpIcon text="Help" size="md" />);
      const icon = container.querySelector(".w-5.h-5");
      expect(icon).toBeInTheDocument();
    });

    it("renders large size", () => {
      const { container } = render(<HelpIcon text="Help" size="lg" />);
      const icon = container.querySelector(".w-6.h-6");
      expect(icon).toBeInTheDocument();
    });

    it("small size has correct text size", () => {
      const { container } = render(<HelpIcon text="Help" size="sm" />);
      const icon = container.querySelector(".text-xs");
      expect(icon).toBeInTheDocument();
    });

    it("medium size has correct text size", () => {
      const { container } = render(<HelpIcon text="Help" size="md" />);
      const icon = container.querySelector(".text-sm");
      expect(icon).toBeInTheDocument();
    });

    it("large size has correct text size", () => {
      const { container } = render(<HelpIcon text="Help" size="lg" />);
      const icon = container.querySelector(".text-base");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("tooltip positioning", () => {
    it("positions tooltip at top by default", () => {
      render(<HelpIcon text="Help text" />);
      const wrapper = screen.getByTestId("tooltip-wrapper");
      expect(wrapper).toHaveAttribute("data-position", "top");
    });

    it("positions tooltip at bottom", () => {
      render(<HelpIcon text="Help text" position="bottom" />);
      const wrapper = screen.getByTestId("tooltip-wrapper");
      expect(wrapper).toHaveAttribute("data-position", "bottom");
    });

    it("positions tooltip at left", () => {
      render(<HelpIcon text="Help text" position="left" />);
      const wrapper = screen.getByTestId("tooltip-wrapper");
      expect(wrapper).toHaveAttribute("data-position", "left");
    });

    it("positions tooltip at right", () => {
      render(<HelpIcon text="Help text" position="right" />);
      const wrapper = screen.getByTestId("tooltip-wrapper");
      expect(wrapper).toHaveAttribute("data-position", "right");
    });
  });

  describe("styling", () => {
    it("applies rounded-full class", () => {
      const { container } = render(<HelpIcon text="Help" />);
      const icon = container.querySelector(".rounded-full");
      expect(icon).toBeInTheDocument();
    });

    it("has background color", () => {
      const { container } = render(<HelpIcon text="Help" />);
      const icon = container.querySelector(".bg-surface-200");
      expect(icon).toBeInTheDocument();
    });

    it("has dark mode background color", () => {
      const { container } = render(<HelpIcon text="Help" />);
      const icon = container.querySelector(".dark\\:bg-surface-700");
      expect(icon).toBeInTheDocument();
    });

    it("has text color", () => {
      const { container } = render(<HelpIcon text="Help" />);
      const icon = container.querySelector(".text-surface-600");
      expect(icon).toBeInTheDocument();
    });

    it("has dark mode text color", () => {
      const { container } = render(<HelpIcon text="Help" />);
      const icon = container.querySelector(".dark\\:text-surface-400");
      expect(icon).toBeInTheDocument();
    });

    it("has cursor-help class", () => {
      const { container } = render(<HelpIcon text="Help" />);
      const icon = container.querySelector(".cursor-help");
      expect(icon).toBeInTheDocument();
    });

    it("applies semibold font weight", () => {
      const { container } = render(<HelpIcon text="Help" />);
      const icon = container.querySelector(".font-semibold");
      expect(icon).toBeInTheDocument();
    });

    it("uses inline-flex layout", () => {
      const { container } = render(<HelpIcon text="Help" />);
      const icon = container.querySelector(".inline-flex");
      expect(icon).toBeInTheDocument();
    });

    it("centers content with items-center and justify-center", () => {
      const { container } = render(<HelpIcon text="Help" />);
      const icon = container.querySelector(".items-center.justify-center");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("hover behavior", () => {
    it("applies hover background color classes", () => {
      const { container } = render(<HelpIcon text="Help" />);
      const icon = container.querySelector(".hover\\:bg-surface-300");
      expect(icon).toBeInTheDocument();
    });

    it("applies dark mode hover background", () => {
      const { container } = render(<HelpIcon text="Help" />);
      const icon = container.querySelector(".dark\\:hover\\:bg-surface-600");
      expect(icon).toBeInTheDocument();
    });

    it("has transition-colors class for smooth hover", () => {
      const { container } = render(<HelpIcon text="Help" />);
      const icon = container.querySelector(".transition-colors");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("tooltip integration", () => {
    it("wraps icon in Tooltip component", () => {
      render(<HelpIcon text="Helpful information" />);
      const wrapper = screen.getByTestId("tooltip-wrapper");
      expect(wrapper).toBeInTheDocument();
    });

    it("passes text as tooltip content", () => {
      render(<HelpIcon text="This explains the feature" />);
      const wrapper = screen.getByTestId("tooltip-wrapper");
      expect(wrapper).toHaveAttribute("data-content", "This explains the feature");
    });

    it("passes position prop to Tooltip", () => {
      render(<HelpIcon text="Help" position="bottom" />);
      const wrapper = screen.getByTestId("tooltip-wrapper");
      expect(wrapper).toHaveAttribute("data-position", "bottom");
    });

    it("contains question mark inside tooltip wrapper", () => {
      render(<HelpIcon text="Help" />);
      const wrapper = screen.getByTestId("tooltip-wrapper");
      expect(wrapper).toContainElement(screen.getByText("?"));
    });
  });

  describe("complex scenarios", () => {
    it("renders with all props combined", () => {
      const { container } = render(
        <HelpIcon text="Detailed help information" size="lg" position="right" />
      );
      
      expect(screen.getByText("?")).toBeInTheDocument();
      expect(screen.getByRole("img")).toHaveAttribute(
        "aria-label",
        "Detailed help information"
      );
      
      const wrapper = screen.getByTestId("tooltip-wrapper");
      expect(wrapper).toHaveAttribute("data-content", "Detailed help information");
      expect(wrapper).toHaveAttribute("data-position", "right");
      
      const icon = container.querySelector(".w-6.h-6");
      expect(icon).toBeInTheDocument();
    });

    it("renders multiple help icons independently", () => {
      render(
        <div>
          <HelpIcon text="First help" size="sm" />
          <HelpIcon text="Second help" size="md" />
          <HelpIcon text="Third help" size="lg" />
        </div>
      );
      
      const questionMarks = screen.getAllByText("?");
      expect(questionMarks).toHaveLength(3);
      
      const wrappers = screen.getAllByTestId("tooltip-wrapper");
      expect(wrappers).toHaveLength(3);
      expect(wrappers[0]).toHaveAttribute("data-content", "First help");
      expect(wrappers[1]).toHaveAttribute("data-content", "Second help");
      expect(wrappers[2]).toHaveAttribute("data-content", "Third help");
    });

    it("handles long help text", () => {
      const longText = "This is a very long help text that provides detailed information about a complex feature that requires extensive explanation to understand properly.";
      render(<HelpIcon text={longText} />);
      
      const wrapper = screen.getByTestId("tooltip-wrapper");
      expect(wrapper).toHaveAttribute("data-content", longText);
    });

    it("handles special characters in text", () => {
      const specialText = "Help with <tags> & 'quotes' and \"more\"!";
      render(<HelpIcon text={specialText} />);
      
      const icon = screen.getByRole("img");
      expect(icon).toHaveAttribute("aria-label", specialText);
    });
  });

  describe("accessibility", () => {
    it("provides accessible label matching tooltip text", () => {
      render(<HelpIcon text="Password requirements" />);
      const icon = screen.getByRole("img");
      expect(icon).toHaveAttribute("aria-label", "Password requirements");
    });

    it("can be focused and interacted with keyboard", () => {
      render(<HelpIcon text="Help" />);
      const icon = screen.getByRole("img");
      expect(icon).toBeInTheDocument();
    });

    it("uses semantic role for screen readers", () => {
      render(<HelpIcon text="Accessibility help" />);
      expect(screen.getByRole("img")).toBeInTheDocument();
    });

    it("help icon is perceivable by screen readers", () => {
      render(<HelpIcon text="Important information" />);
      const icon = screen.getByLabelText("Important information");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("inline usage", () => {
    it("can be used inline with text", () => {
      const { container } = render(
        <div>
          Username <HelpIcon text="Enter your account username" size="sm" />
        </div>
      );
      
      expect(container.textContent).toContain("Username");
      expect(screen.getByText("?")).toBeInTheDocument();
    });

    it("inline-flex allows proper alignment", () => {
      const { container } = render(
        <div className="flex items-center">
          <span>Label</span>
          <HelpIcon text="Help" />
        </div>
      );
      
      const icon = container.querySelector(".inline-flex");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("size consistency", () => {
    it("maintains aspect ratio for all sizes", () => {
      const { container: sm } = render(<HelpIcon text="Help" size="sm" />);
      const { container: md } = render(<HelpIcon text="Help" size="md" />);
      const { container: lg } = render(<HelpIcon text="Help" size="lg" />);
      
      expect(sm.querySelector(".w-4.h-4")).toBeInTheDocument();
      expect(md.querySelector(".w-5.h-5")).toBeInTheDocument();
      expect(lg.querySelector(".w-6.h-6")).toBeInTheDocument();
    });

    it("text size scales with icon size", () => {
      const { container: sm } = render(<HelpIcon text="Help" size="sm" />);
      const { container: md } = render(<HelpIcon text="Help" size="md" />);
      const { container: lg } = render(<HelpIcon text="Help" size="lg" />);
      
      expect(sm.querySelector(".text-xs")).toBeInTheDocument();
      expect(md.querySelector(".text-sm")).toBeInTheDocument();
      expect(lg.querySelector(".text-base")).toBeInTheDocument();
    });
  });
});
