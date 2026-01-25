import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToggleSection } from "./ToggleSection";

describe("ToggleSection", () => {
  describe("rendering", () => {
    it("renders label text", () => {
      const onChange = vi.fn();
      render(
        <ToggleSection label="Enable Feature" checked={false} onChange={onChange} />
      );

      expect(screen.getByText("Enable Feature")).toBeInTheDocument();
    });

    it("renders help text when provided", () => {
      const onChange = vi.fn();
      render(
        <ToggleSection
          label="Enable Feature"
          helpText="This will enable the feature"
          checked={false}
          onChange={onChange}
        />
      );

      expect(screen.getByText("This will enable the feature")).toBeInTheDocument();
    });

    it("does not render help text when not provided", () => {
      const onChange = vi.fn();
      const { container } = render(
        <ToggleSection label="Enable Feature" checked={false} onChange={onChange} />
      );

      const helpText = container.querySelector(".text-xs");
      expect(helpText).not.toBeInTheDocument();
    });

    it("renders icon when provided", () => {
      const onChange = vi.fn();
      const icon = <span data-testid="test-icon">📧</span>;
      render(
        <ToggleSection
          label="Enable Feature"
          icon={icon}
          checked={false}
          onChange={onChange}
        />
      );

      expect(screen.getByTestId("test-icon")).toBeInTheDocument();
    });

    it("does not show children when unchecked", () => {
      const onChange = vi.fn();
      render(
        <ToggleSection label="Enable Feature" checked={false} onChange={onChange}>
          <div data-testid="child-content">Child Content</div>
        </ToggleSection>
      );

      expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
    });

    it("shows children when checked", () => {
      const onChange = vi.fn();
      render(
        <ToggleSection label="Enable Feature" checked={true} onChange={onChange}>
          <div data-testid="child-content">Child Content</div>
        </ToggleSection>
      );

      expect(screen.getByTestId("child-content")).toBeInTheDocument();
      expect(screen.getByText("Child Content")).toBeInTheDocument();
    });

    it("does not render children container when no children provided", () => {
      const onChange = vi.fn();
      const { container } = render(
        <ToggleSection label="Enable Feature" checked={true} onChange={onChange} />
      );

      const childrenContainer = container.querySelector(".space-y-3");
      expect(childrenContainer).not.toBeInTheDocument();
    });
  });

  describe("toggle interaction", () => {
    it("calls onChange with true when toggled on", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <ToggleSection
          label="Enable Feature"
          checked={false}
          onChange={onChange}
          testId="toggle-input"
        />
      );

      const checkbox = screen.getByTestId("toggle-input");
      await user.click(checkbox);

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it("calls onChange with false when toggled off", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <ToggleSection
          label="Enable Feature"
          checked={true}
          onChange={onChange}
          testId="toggle-input"
        />
      );

      const checkbox = screen.getByTestId("toggle-input");
      await user.click(checkbox);

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(false);
    });

    it("reflects checked state", () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <ToggleSection
          label="Enable Feature"
          checked={false}
          onChange={onChange}
          testId="toggle-input"
        />
      );

      const checkbox = screen.getByTestId("toggle-input") as HTMLInputElement;
      expect(checkbox.checked).toBe(false);

      rerender(
        <ToggleSection
          label="Enable Feature"
          checked={true}
          onChange={onChange}
          testId="toggle-input"
        />
      );

      expect(checkbox.checked).toBe(true);
    });

    it("can be toggled multiple times", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { rerender } = render(
        <ToggleSection
          label="Enable Feature"
          checked={false}
          onChange={onChange}
          testId="toggle-input"
        />
      );

      const checkbox = screen.getByTestId("toggle-input");
      await user.click(checkbox);
      expect(onChange).toHaveBeenNthCalledWith(1, true);

      // Rerender with new checked state for second click
      rerender(
        <ToggleSection
          label="Enable Feature"
          checked={true}
          onChange={onChange}
          testId="toggle-input"
        />
      );

      await user.click(checkbox);
      expect(onChange).toHaveBeenNthCalledWith(2, false);

      // Rerender with new checked state for third click
      rerender(
        <ToggleSection
          label="Enable Feature"
          checked={false}
          onChange={onChange}
          testId="toggle-input"
        />
      );

      await user.click(checkbox);
      expect(onChange).toHaveBeenCalledTimes(3);
      expect(onChange).toHaveBeenNthCalledWith(3, true);
    });
  });

  describe("keyboard interaction", () => {
    it("checkbox is keyboard accessible", () => {
      const onChange = vi.fn();
      render(
        <ToggleSection
          label="Enable Feature"
          checked={false}
          onChange={onChange}
          testId="toggle-input"
        />
      );

      const checkbox = screen.getByTestId("toggle-input");
      checkbox.focus();
      expect(document.activeElement).toBe(checkbox);
    });

    it("can be toggled via keyboard", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <ToggleSection
          label="Enable Feature"
          checked={false}
          onChange={onChange}
          testId="toggle-input"
        />
      );

      const checkbox = screen.getByTestId("toggle-input");
      checkbox.focus();

      // Use userEvent for more realistic keyboard interaction
      await user.keyboard(" "); // Space key

      expect(onChange).toHaveBeenCalledWith(true);
    });
  });

  describe("styling", () => {
    it("has border and rounded corners", () => {
      const onChange = vi.fn();
      const { container } = render(
        <ToggleSection label="Enable Feature" checked={false} onChange={onChange} />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("border", "rounded-lg");
    });

    it("applies proper padding", () => {
      const onChange = vi.fn();
      const { container } = render(
        <ToggleSection label="Enable Feature" checked={false} onChange={onChange} />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("p-4");
    });

    it("label has proper font weight", () => {
      const onChange = vi.fn();
      render(
        <ToggleSection label="Enable Feature" checked={false} onChange={onChange} />
      );

      const label = screen.getByText("Enable Feature");
      expect(label).toHaveClass("font-medium");
    });

    it("help text has smaller font size", () => {
      const onChange = vi.fn();
      render(
        <ToggleSection
          label="Enable Feature"
          helpText="This is help text"
          checked={false}
          onChange={onChange}
        />
      );

      const helpText = screen.getByText("This is help text");
      expect(helpText).toHaveClass("text-xs");
    });
  });

  describe("accessibility", () => {
    it("checkbox is accessible via screen reader", () => {
      const onChange = vi.fn();
      render(
        <ToggleSection
          label="Enable Feature"
          checked={false}
          onChange={onChange}
          testId="toggle-input"
        />
      );

      const checkbox = screen.getByTestId("toggle-input");
      expect(checkbox).toHaveAttribute("type", "checkbox");
    });

    it("checkbox has sr-only class for custom styling", () => {
      const onChange = vi.fn();
      render(
        <ToggleSection
          label="Enable Feature"
          checked={false}
          onChange={onChange}
          testId="toggle-input"
        />
      );

      const checkbox = screen.getByTestId("toggle-input");
      expect(checkbox).toHaveClass("sr-only");
    });

    it("label is clickable for accessibility", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <ToggleSection
          label="Enable Feature"
          checked={false}
          onChange={onChange}
          testId="toggle-input"
        />
      );

      const label = screen.getByTestId("toggle-input").closest("label");
      expect(label).toHaveClass("cursor-pointer");

      // Click the label element
      if (label) {
        await user.click(label);
        expect(onChange).toHaveBeenCalled();
      }
    });

    it("has focus ring styles", () => {
      const onChange = vi.fn();
      const { container } = render(
        <ToggleSection
          label="Enable Feature"
          checked={false}
          onChange={onChange}
          testId="toggle-input"
        />
      );

      const toggleDiv = container.querySelector(".peer-focus\\:ring-4");
      expect(toggleDiv).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles empty label", () => {
      const onChange = vi.fn();
      const { container } = render(<ToggleSection label="" checked={false} onChange={onChange} />);

      // Empty label still renders a container
      const labelElement = container.querySelector(".font-medium");
      expect(labelElement).toBeInTheDocument();
      expect(labelElement?.textContent).toBe("");
    });

    it("handles multiple children", () => {
      const onChange = vi.fn();
      render(
        <ToggleSection label="Enable Feature" checked={true} onChange={onChange}>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </ToggleSection>
      );

      expect(screen.getByText("Child 1")).toBeInTheDocument();
      expect(screen.getByText("Child 2")).toBeInTheDocument();
      expect(screen.getByText("Child 3")).toBeInTheDocument();
    });

    it("handles ReactNode icon with complex structure", () => {
      const onChange = vi.fn();
      const complexIcon = (
        <div data-testid="complex-icon">
          <svg>
            <path />
          </svg>
        </div>
      );
      render(
        <ToggleSection
          label="Enable Feature"
          icon={complexIcon}
          checked={false}
          onChange={onChange}
        />
      );

      expect(screen.getByTestId("complex-icon")).toBeInTheDocument();
    });

    it("maintains checked state when children change", () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <ToggleSection
          label="Enable Feature"
          checked={true}
          onChange={onChange}
          testId="toggle-input"
        >
          <div>Original Child</div>
        </ToggleSection>
      );

      const checkbox = screen.getByTestId("toggle-input") as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
      expect(screen.getByText("Original Child")).toBeInTheDocument();

      rerender(
        <ToggleSection
          label="Enable Feature"
          checked={true}
          onChange={onChange}
          testId="toggle-input"
        >
          <div>New Child</div>
        </ToggleSection>
      );

      expect(checkbox.checked).toBe(true);
      expect(screen.getByText("New Child")).toBeInTheDocument();
    });
  });

  describe("testId prop", () => {
    it("applies testId to checkbox", () => {
      const onChange = vi.fn();
      render(
        <ToggleSection
          label="Enable Feature"
          checked={false}
          onChange={onChange}
          testId="custom-test-id"
        />
      );

      expect(screen.getByTestId("custom-test-id")).toBeInTheDocument();
    });

    it("works without testId", () => {
      const onChange = vi.fn();
      const { container } = render(
        <ToggleSection label="Enable Feature" checked={false} onChange={onChange} />
      );

      const checkbox = container.querySelector('input[type="checkbox"]');
      expect(checkbox).toBeInTheDocument();
    });
  });
});
