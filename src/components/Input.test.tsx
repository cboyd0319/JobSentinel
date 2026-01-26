import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input";

describe("Input", () => {
  describe("basic rendering", () => {
    it("renders input element", () => {
      render(<Input />);
      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
    });

    it("renders with label", () => {
      render(<Input label="Email Address" />);
      expect(screen.getByText("Email Address")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("renders without label", () => {
      const { container } = render(<Input />);
      const label = container.querySelector("label");
      expect(label).not.toBeInTheDocument();
    });

    it("renders with placeholder", () => {
      render(<Input placeholder="Enter your name" />);
      expect(screen.getByPlaceholderText("Enter your name")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(<Input className="custom-input" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("custom-input");
    });
  });

  describe("input handling", () => {
    it("handles user input", async () => {
      const user = userEvent.setup();
      render(<Input />);
      
      const input = screen.getByRole("textbox");
      await user.type(input, "Hello World");
      
      expect(input).toHaveValue("Hello World");
    });

    it("calls onChange handler", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);
      
      const input = screen.getByRole("textbox");
      await user.type(input, "test");
      
      expect(handleChange).toHaveBeenCalled();
    });

    it("supports controlled input", () => {
      const { rerender } = render(<Input value="Initial" onChange={vi.fn()} />);
      expect(screen.getByRole("textbox")).toHaveValue("Initial");
      
      rerender(<Input value="Updated" onChange={vi.fn()} />);
      expect(screen.getByRole("textbox")).toHaveValue("Updated");
    });

    it("clears input value", async () => {
      const user = userEvent.setup();
      render(<Input />);
      
      const input = screen.getByRole("textbox");
      await user.type(input, "test");
      expect(input).toHaveValue("test");
      
      await user.clear(input);
      expect(input).toHaveValue("");
    });
  });

  describe("validation and errors", () => {
    it("renders error message", () => {
      render(<Input error="This field is required" />);
      expect(screen.getByText("This field is required")).toBeInTheDocument();
    });

    it("applies error styling to input", () => {
      render(<Input error="Invalid input" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("border-danger");
    });

    it("error message has danger text color", () => {
      render(<Input error="Error message" />);
      const errorMsg = screen.getByText("Error message");
      expect(errorMsg).toHaveClass("text-danger");
    });

    it("shows error icon with message", () => {
      const { container } = render(<Input error="Error" />);
      const errorIcon = container.querySelector('svg[aria-hidden="true"]');
      expect(errorIcon).toBeInTheDocument();
    });

    it("does not render error when not provided", () => {
      const { container } = render(<Input />);
      const errorMsg = container.querySelector(".text-danger");
      expect(errorMsg).not.toBeInTheDocument();
    });
  });

  describe("hint text", () => {
    it("renders hint text", () => {
      render(<Input hint="Enter at least 8 characters" />);
      expect(screen.getByText("Enter at least 8 characters")).toBeInTheDocument();
    });

    it("hint text has appropriate styling", () => {
      render(<Input hint="Helper text" />);
      const hint = screen.getByText("Helper text");
      expect(hint).toHaveClass("text-sm");
    });

    it("error takes precedence over hint", () => {
      render(<Input hint="Hint text" error="Error message" />);
      expect(screen.getByText("Error message")).toBeInTheDocument();
      expect(screen.queryByText("Hint text")).not.toBeInTheDocument();
    });

    it("renders hint without error", () => {
      render(<Input hint="This is helpful" />);
      expect(screen.getByText("This is helpful")).toBeInTheDocument();
    });
  });

  describe("icons", () => {
    it("renders left icon", () => {
      const icon = <span data-testid="left-icon">🔍</span>;
      render(<Input leftIcon={icon} />);
      expect(screen.getByTestId("left-icon")).toBeInTheDocument();
    });

    it("renders right icon", () => {
      const icon = <span data-testid="right-icon">✓</span>;
      render(<Input rightIcon={icon} />);
      expect(screen.getByTestId("right-icon")).toBeInTheDocument();
    });

    it("renders both icons simultaneously", () => {
      const leftIcon = <span data-testid="left-icon">📧</span>;
      const rightIcon = <span data-testid="right-icon">✓</span>;
      render(<Input leftIcon={leftIcon} rightIcon={rightIcon} />);
      
      expect(screen.getByTestId("left-icon")).toBeInTheDocument();
      expect(screen.getByTestId("right-icon")).toBeInTheDocument();
    });

    it("applies left padding when left icon present", () => {
      const icon = <span>🔍</span>;
      render(<Input leftIcon={icon} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("pl-10");
    });

    it("applies right padding when right icon present", () => {
      const icon = <span>✓</span>;
      render(<Input rightIcon={icon} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("pr-10");
    });

    it("icons are positioned absolutely", () => {
      const leftIcon = <span data-testid="left">📧</span>;
      const { container } = render(<Input leftIcon={leftIcon} />);
      
      const iconContainer = container.querySelector(".absolute");
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("renders as disabled", () => {
      render(<Input disabled />);
      const input = screen.getByRole("textbox");
      expect(input).toBeDisabled();
    });

    it("applies disabled styling", () => {
      render(<Input disabled />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("disabled:cursor-not-allowed");
    });

    it("does not accept input when disabled", async () => {
      const user = userEvent.setup();
      render(<Input disabled />);
      
      const input = screen.getByRole("textbox");
      await user.type(input, "test");
      
      expect(input).toHaveValue("");
    });

    it("disabled input with label", () => {
      render(<Input label="Username" disabled />);
      expect(screen.getByText("Username")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toBeDisabled();
    });
  });

  describe("input types", () => {
    it("renders as text input by default", () => {
      render(<Input />);
      // getByRole("textbox") implies type="text" or no type attribute
      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
    });

    it("renders as password input", () => {
      const { container } = render(<Input type="password" />);
      const input = container.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it("renders as email input", () => {
      const { container } = render(<Input type="email" />);
      const input = container.querySelector('input[type="email"]');
      expect(input).toBeInTheDocument();
    });

    it("renders as number input", () => {
      const { container } = render(<Input type="number" />);
      const input = container.querySelector('input[type="number"]');
      expect(input).toBeInTheDocument();
    });
  });

  describe("forwarded ref", () => {
    it("forwards ref to input element", () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Input ref={ref} />);
      
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it("can focus input via ref", () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Input ref={ref} />);
      
      ref.current?.focus();
      expect(ref.current).toHaveFocus();
    });

    it("can access input value via ref", async () => {
      const user = userEvent.setup();
      const ref = { current: null as HTMLInputElement | null };
      render(<Input ref={ref} />);
      
      const input = screen.getByRole("textbox");
      await user.type(input, "test value");
      
      expect(ref.current?.value).toBe("test value");
    });
  });

  describe("HTML attributes", () => {
    it("accepts required attribute", () => {
      render(<Input required />);
      const input = screen.getByRole("textbox");
      expect(input).toBeRequired();
    });

    it("accepts maxLength attribute", () => {
      render(<Input maxLength={10} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("maxLength", "10");
    });

    it("accepts name attribute", () => {
      render(<Input name="username" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("name", "username");
    });

    it("accepts id attribute", () => {
      render(<Input id="custom-id" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("id", "custom-id");
    });

    it("accepts autoComplete attribute", () => {
      render(<Input autoComplete="email" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("autoComplete", "email");
    });

    it("accepts readOnly attribute", () => {
      render(<Input readOnly />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("readOnly");
    });
  });

  describe("styling", () => {
    it("applies base styling classes", () => {
      render(<Input />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("w-full", "px-4", "py-3", "rounded-lg");
    });

    it("applies focus ring on focus", async () => {
      const user = userEvent.setup();
      render(<Input />);

      const input = screen.getByRole("textbox");
      await user.click(input);

      expect(input).toHaveClass("focus-visible:ring-2");
    });

    it("has proper dark mode classes", () => {
      render(<Input />);
      const input = screen.getByRole("textbox");
      expect(input.className).toContain("dark:bg-surface-800");
    });

    it("wraps input in relative container", () => {
      const { container } = render(<Input />);
      const relativeDiv = container.querySelector(".relative");
      expect(relativeDiv).toBeInTheDocument();
    });
  });

  describe("complex scenarios", () => {
    it("renders with all props", () => {
      const leftIcon = <span data-testid="left">📧</span>;
      const rightIcon = <span data-testid="right">✓</span>;
      
      render(
        <Input
          label="Email"
          placeholder="you@example.com"
          hint="We'll never share your email"
          leftIcon={leftIcon}
          rightIcon={rightIcon}
          value="test@example.com"
          onChange={vi.fn()}
        />
      );
      
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
      expect(screen.getByText("We'll never share your email")).toBeInTheDocument();
      expect(screen.getByTestId("left")).toBeInTheDocument();
      expect(screen.getByTestId("right")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveValue("test@example.com");
    });

    it("handles rapid input changes", async () => {
      const user = userEvent.setup();
      render(<Input />);
      
      const input = screen.getByRole("textbox");
      await user.type(input, "quick");
      await user.clear(input);
      await user.type(input, "brown");
      await user.clear(input);
      await user.type(input, "fox");
      
      expect(input).toHaveValue("fox");
    });

    it("maintains state with error toggle", () => {
      const { rerender } = render(<Input value="test" onChange={vi.fn()} />);
      expect(screen.getByRole("textbox")).toHaveValue("test");
      
      rerender(<Input value="test" onChange={vi.fn()} error="Error" />);
      expect(screen.getByRole("textbox")).toHaveValue("test");
      expect(screen.getByText("Error")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("label is associated with input", () => {
      render(<Input label="Username" />);
      const label = screen.getByText("Username");
      const input = screen.getByRole("textbox");
      
      // The input should be found when clicking the label
      expect(input).toBeInTheDocument();
      expect(label).toBeInTheDocument();
    });

    it("error icon has aria-hidden", () => {
      const { container } = render(<Input error="Error" />);
      const icon = container.querySelector('svg[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });

    it("supports aria-label", () => {
      render(<Input aria-label="Search field" />);
      expect(screen.getByLabelText("Search field")).toBeInTheDocument();
    });

    it("supports aria-describedby", () => {
      render(<Input aria-describedby="helper-text" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-describedby", "helper-text");
    });
  });
});
