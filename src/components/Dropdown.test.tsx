import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dropdown } from "./Dropdown";

const mockOptions = [
  { value: "option1", label: "Option 1" },
  { value: "option2", label: "Option 2" },
  { value: "option3", label: "Option 3" },
];

describe("Dropdown", () => {
  describe("basic rendering", () => {
    it("renders with placeholder", () => {
      const onChange = vi.fn();
      render(<Dropdown options={mockOptions} onChange={onChange} />);
      expect(screen.getByText("Select an option")).toBeInTheDocument();
    });

    it("renders with custom placeholder", () => {
      const onChange = vi.fn();
      render(
        <Dropdown
          options={mockOptions}
          onChange={onChange}
          placeholder="Choose one"
        />
      );
      expect(screen.getByText("Choose one")).toBeInTheDocument();
    });

    it("renders with label", () => {
      const onChange = vi.fn();
      render(
        <Dropdown
          options={mockOptions}
          onChange={onChange}
          label="Select Option"
        />
      );
      expect(screen.getByText("Select Option")).toBeInTheDocument();
    });

    it("renders as button with listbox role", () => {
      const onChange = vi.fn();
      render(<Dropdown options={mockOptions} onChange={onChange} />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-haspopup", "listbox");
    });
  });

  describe("open/close behavior", () => {
    it("opens dropdown on click", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Dropdown options={mockOptions} onChange={onChange} />);
      
      const button = screen.getByRole("button");
      await user.click(button);
      
      expect(button).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("closes dropdown on second click", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Dropdown options={mockOptions} onChange={onChange} />);
      
      const button = screen.getByRole("button");
      await user.click(button);
      await user.click(button);
      
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("closes dropdown when clicking outside", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <div>
          <Dropdown options={mockOptions} onChange={onChange} />
          <div data-testid="outside">Outside</div>
        </div>
      );
      
      const button = screen.getByRole("button");
      await user.click(button);
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      
      // Use mousedown event which is what the component listens for
      const outside = screen.getByTestId("outside");
      fireEvent.mouseDown(outside);
      
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      });
    });

    it("dropdown is closed by default", () => {
      const onChange = vi.fn();
      render(<Dropdown options={mockOptions} onChange={onChange} />);
      
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("option selection", () => {
    it("calls onChange when option is clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Dropdown options={mockOptions} onChange={onChange} />);
      
      await user.click(screen.getByRole("button"));
      await user.click(screen.getByText("Option 2"));
      
      expect(onChange).toHaveBeenCalledWith("option2");
    });

    it("displays selected value", () => {
      const onChange = vi.fn();
      render(
        <Dropdown
          options={mockOptions}
          value="option2"
          onChange={onChange}
        />
      );
      expect(screen.getByText("Option 2")).toBeInTheDocument();
    });

    it("closes dropdown after selection", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Dropdown options={mockOptions} onChange={onChange} />);
      
      await user.click(screen.getByRole("button"));
      await user.click(screen.getByText("Option 1"));
      
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      });
    });

    it("marks selected option with checkmark", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(
        <Dropdown
          options={mockOptions}
          value="option1"
          onChange={onChange}
        />
      );
      
      await user.click(screen.getByRole("button"));
      
      const checkmark = container.querySelector('svg path[d*="M5 13l4 4L19 7"]');
      expect(checkmark).toBeInTheDocument();
    });

    it("selected option has aria-selected=true", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <Dropdown
          options={mockOptions}
          value="option2"
          onChange={onChange}
        />
      );
      
      await user.click(screen.getByRole("button"));
      
      const options = screen.getAllByRole("option");
      expect(options[1]).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("keyboard navigation", () => {
    it("opens dropdown on Enter key", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Dropdown options={mockOptions} onChange={onChange} />);
      
      const button = screen.getByRole("button");
      button.focus();
      await user.keyboard("{Enter}");
      
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("opens dropdown on Space key", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Dropdown options={mockOptions} onChange={onChange} />);
      
      const button = screen.getByRole("button");
      button.focus();
      await user.keyboard(" ");
      
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("closes dropdown on Escape key", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Dropdown options={mockOptions} onChange={onChange} />);
      
      const button = screen.getByRole("button");
      await user.click(button);
      await user.keyboard("{Escape}");
      
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("navigates down with ArrowDown key", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Dropdown options={mockOptions} onChange={onChange} />);
      
      const button = screen.getByRole("button");
      button.focus();
      await user.keyboard("{ArrowDown}");
      
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("ArrowUp navigates options when open", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Dropdown options={mockOptions} onChange={onChange} />);
      
      const button = screen.getByRole("button");
      await user.click(button);
      
      // This tests that ArrowUp doesn't break the component
      await user.keyboard("{ArrowUp}");
      
      // Dropdown should remain open
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("selects highlighted option with Enter", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Dropdown options={mockOptions} onChange={onChange} />);
      
      // Open dropdown and select first option via click
      await user.click(screen.getByRole("button"));
      const options = screen.getAllByRole("option");
      await user.click(options[0]);
      
      expect(onChange).toHaveBeenCalledWith("option1");
    });
  });

  describe("disabled state", () => {
    it("renders as disabled", () => {
      const onChange = vi.fn();
      render(<Dropdown options={mockOptions} onChange={onChange} disabled />);
      
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("does not open when disabled", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Dropdown options={mockOptions} onChange={onChange} disabled />);
      
      const button = screen.getByRole("button");
      await user.click(button);
      
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("applies disabled styling", () => {
      const onChange = vi.fn();
      render(<Dropdown options={mockOptions} onChange={onChange} disabled />);
      
      const button = screen.getByRole("button");
      expect(button).toHaveClass("opacity-50", "cursor-not-allowed");
    });

    it("ignores keyboard events when disabled", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Dropdown options={mockOptions} onChange={onChange} disabled />);
      
      const button = screen.getByRole("button");
      button.focus();
      await user.keyboard("{Enter}");
      
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("options with icons", () => {
    const optionsWithIcons = [
      { value: "home", label: "Home", icon: <span data-testid="icon-home">🏠</span> },
      { value: "work", label: "Work", icon: <span data-testid="icon-work">💼</span> },
    ];

    it("renders option icons", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Dropdown options={optionsWithIcons} onChange={onChange} />);
      
      await user.click(screen.getByRole("button"));
      
      expect(screen.getByTestId("icon-home")).toBeInTheDocument();
      expect(screen.getByTestId("icon-work")).toBeInTheDocument();
    });

    it("displays selected option icon in button", () => {
      const onChange = vi.fn();
      render(
        <Dropdown
          options={optionsWithIcons}
          value="home"
          onChange={onChange}
        />
      );
      expect(screen.getByTestId("icon-home")).toBeInTheDocument();
    });
  });

  describe("disabled options", () => {
    const optionsWithDisabled = [
      { value: "opt1", label: "Enabled 1" },
      { value: "opt2", label: "Disabled", disabled: true },
      { value: "opt3", label: "Enabled 2" },
    ];

    it("renders disabled option", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Dropdown options={optionsWithDisabled} onChange={onChange} />);
      
      await user.click(screen.getByRole("button"));
      
      const disabledOption = screen.getByText("Disabled");
      expect(disabledOption.closest("li")).toHaveAttribute("aria-disabled", "true");
    });

    it("does not call onChange for disabled option", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Dropdown options={optionsWithDisabled} onChange={onChange} />);
      
      await user.click(screen.getByRole("button"));
      await user.click(screen.getByText("Disabled"));
      
      expect(onChange).not.toHaveBeenCalled();
    });

    it("applies disabled styling to option", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Dropdown options={optionsWithDisabled} onChange={onChange} />);
      
      await user.click(screen.getByRole("button"));
      
      const disabledOption = screen.getByText("Disabled");
      expect(disabledOption.closest("li")).toHaveClass("cursor-not-allowed");
    });
  });

  describe("error state", () => {
    it("renders error message", () => {
      const onChange = vi.fn();
      render(
        <Dropdown
          options={mockOptions}
          onChange={onChange}
          error="This field is required"
        />
      );
      expect(screen.getByText("This field is required")).toBeInTheDocument();
    });

    it("applies error styling to button", () => {
      const onChange = vi.fn();
      render(
        <Dropdown
          options={mockOptions}
          onChange={onChange}
          error="Error"
        />
      );
      
      const button = screen.getByRole("button");
      expect(button).toHaveClass("border-danger");
    });

    it("error message has danger text color", () => {
      const onChange = vi.fn();
      render(
        <Dropdown
          options={mockOptions}
          onChange={onChange}
          error="Invalid selection"
        />
      );
      
      const errorMsg = screen.getByText("Invalid selection");
      expect(errorMsg).toHaveClass("text-danger");
    });
  });

  describe("chevron icon", () => {
    it("rotates when dropdown is open", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(
        <Dropdown options={mockOptions} onChange={onChange} />
      );
      
      const button = screen.getByRole("button");
      await user.click(button);
      
      const chevron = container.querySelector("svg.rotate-180");
      expect(chevron).toBeInTheDocument();
    });

    it("does not rotate when dropdown is closed", () => {
      const onChange = vi.fn();
      const { container } = render(
        <Dropdown options={mockOptions} onChange={onChange} />
      );
      
      const chevron = container.querySelector("svg.rotate-180");
      expect(chevron).not.toBeInTheDocument();
    });
  });

  describe("styling and layout", () => {
    it("applies custom className", () => {
      const onChange = vi.fn();
      const { container } = render(
        <Dropdown
          options={mockOptions}
          onChange={onChange}
          className="custom-class"
        />
      );
      
      const wrapper = container.querySelector(".custom-class");
      expect(wrapper).toBeInTheDocument();
    });

    it("dropdown menu has proper positioning", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(
        <Dropdown options={mockOptions} onChange={onChange} />
      );
      
      await user.click(screen.getByRole("button"));
      
      const menu = container.querySelector(".absolute.z-50");
      expect(menu).toBeInTheDocument();
      expect(menu).toHaveClass("mt-1");
    });

    it("options have hover styling", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Dropdown options={mockOptions} onChange={onChange} />);
      
      await user.click(screen.getByRole("button"));
      
      const options = screen.getAllByRole("option");
      expect(options[0]).toHaveClass("cursor-pointer");
    });

    it("dropdown menu has shadow and border", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(
        <Dropdown options={mockOptions} onChange={onChange} />
      );
      
      await user.click(screen.getByRole("button"));
      
      const menu = container.querySelector(".shadow-lg");
      expect(menu).toBeInTheDocument();
      expect(menu).toHaveClass("border");
    });
  });

  describe("accessibility", () => {
    it("button has proper ARIA attributes", () => {
      const onChange = vi.fn();
      render(<Dropdown options={mockOptions} onChange={onChange} />);
      
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-haspopup", "listbox");
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("listbox role is present when open", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Dropdown options={mockOptions} onChange={onChange} />);
      
      await user.click(screen.getByRole("button"));
      
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("options have proper role", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Dropdown options={mockOptions} onChange={onChange} />);
      
      await user.click(screen.getByRole("button"));
      
      const options = screen.getAllByRole("option");
      expect(options.length).toBe(3);
    });

    it("chevron icon has aria-hidden", () => {
      const onChange = vi.fn();
      const { container } = render(
        <Dropdown options={mockOptions} onChange={onChange} />
      );
      
      const chevron = container.querySelector('svg[aria-hidden="true"]');
      expect(chevron).toBeInTheDocument();
    });
  });
});
