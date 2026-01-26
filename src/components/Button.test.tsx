import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  describe("rendering", () => {
    it("renders with children text", () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
    });

    it("renders with default variant (primary)", () => {
      render(<Button>Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-sentinel-500");
    });

    it("renders with secondary variant", () => {
      render(<Button variant="secondary">Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-surface-100");
    });

    it("renders with ghost variant", () => {
      render(<Button variant="ghost">Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("text-surface-600");
    });

    it("renders with success variant", () => {
      render(<Button variant="success">Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-success");
    });

    it("renders with danger variant", () => {
      render(<Button variant="danger">Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-danger");
    });

    it("renders with default size (md)", () => {
      render(<Button>Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-4", "py-2.5", "text-sm");
    });

    it("renders with small size", () => {
      render(<Button size="sm">Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-3", "py-1.5", "text-sm");
    });

    it("renders with large size", () => {
      render(<Button size="lg">Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-6", "py-3", "text-base");
    });

    it("renders with custom className", () => {
      render(<Button className="custom-class">Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });
  });

  describe("icon rendering", () => {
    const testIcon = <span data-testid="test-icon">Icon</span>;

    it("renders icon on left by default", () => {
      render(
        <Button icon={testIcon}>
          Test
        </Button>
      );
      const button = screen.getByRole("button");
      const icon = screen.getByTestId("test-icon");

      expect(button).toContainElement(icon);
      // Icon should come before text
      expect(button.textContent).toBe("IconTest");
    });

    it("renders icon on right when iconPosition is right", () => {
      render(
        <Button icon={testIcon} iconPosition="right">
          Test
        </Button>
      );
      const button = screen.getByRole("button");
      const icon = screen.getByTestId("test-icon");

      expect(button).toContainElement(icon);
      // Icon should come after text
      expect(button.textContent).toBe("TestIcon");
    });

    it("does not render icon when loading", () => {
      render(
        <Button icon={testIcon} loading>
          Test
        </Button>
      );
      expect(screen.queryByTestId("test-icon")).not.toBeInTheDocument();
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows loading spinner and text when loading", () => {
      render(<Button loading>Submit</Button>);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
      expect(screen.queryByText("Submit")).not.toBeInTheDocument();
    });

    it("is disabled when loading", () => {
      render(<Button loading>Submit</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("renders loading spinner with animation class", () => {
      const { container } = render(<Button loading>Submit</Button>);
      const spinner = container.querySelector(".motion-safe\\:animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("is disabled when disabled prop is true", () => {
      render(<Button disabled>Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("has disabled opacity class", () => {
      render(<Button disabled>Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("disabled:opacity-50");
    });

    it("does not call onClick when disabled", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Test
        </Button>
      );

      const button = screen.getByRole("button");
      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("click handling", () => {
    it("calls onClick handler when clicked", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByRole("button");
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("calls onClick with event", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByRole("button");
      await user.click(button);

      expect(handleClick).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "click",
        })
      );
    });

    it("does not call onClick when loading", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(
        <Button loading onClick={handleClick}>
          Test
        </Button>
      );

      const button = screen.getByRole("button");
      await user.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("ref forwarding", () => {
    it("forwards ref to button element", () => {
      const ref = vi.fn();
      render(<Button ref={ref}>Test</Button>);

      expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
    });
  });

  describe("accessibility", () => {
    it("has button role", () => {
      render(<Button>Test</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("supports aria-label", () => {
      render(<Button aria-label="Custom label">Test</Button>);
      expect(screen.getByRole("button", { name: "Custom label" })).toBeInTheDocument();
    });

    it("has focus-visible styles", () => {
      render(<Button>Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("focus-visible:outline-none", "focus-visible:ring-2");
    });

    it("loading spinner has aria-hidden", () => {
      const { container } = render(<Button loading>Test</Button>);
      const spinner = container.querySelector('svg[aria-hidden="true"]');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("button type", () => {
    it("supports explicit button type", () => {
      render(<Button type="button">Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "button");
    });

    it("supports submit type", () => {
      render(<Button type="submit">Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "submit");
    });

    it("supports reset type", () => {
      render(<Button type="reset">Test</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "reset");
    });
  });
});
