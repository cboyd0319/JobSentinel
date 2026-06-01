import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SkillCategoryFilter } from "./SkillCategoryFilter";

describe("SkillCategoryFilter", () => {
  const defaultProps = {
    categories: ["Customer Support", "Operations", "Sales"],
    selected: null,
    onChange: vi.fn(),
  };

  describe("rendering", () => {
    it("renders button with default text", () => {
      render(<SkillCategoryFilter {...defaultProps} />);

      expect(screen.getByRole("button")).toHaveTextContent("All Categories");
    });

    it("shows selected category text", () => {
      render(<SkillCategoryFilter {...defaultProps} selected="Customer Support" />);

      expect(screen.getByRole("button")).toHaveTextContent("Customer Support");
    });

    it("shows skill count when provided", () => {
      render(
        <SkillCategoryFilter
          {...defaultProps}
          selected="Customer Support"
          skillCounts={{ "Customer Support": 5, Operations: 3, Sales: 2 }}
        />
      );

      expect(screen.getByRole("button")).toHaveTextContent("Customer Support (5)");
    });

    it("has aria-haspopup listbox", () => {
      render(<SkillCategoryFilter {...defaultProps} />);

      expect(screen.getByRole("button")).toHaveAttribute("aria-haspopup", "listbox");
    });

    it("has aria-expanded false when closed", () => {
      render(<SkillCategoryFilter {...defaultProps} />);

      expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("dropdown behavior", () => {
    it("opens dropdown on click", () => {
      render(<SkillCategoryFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("has aria-expanded true when open", () => {
      render(<SkillCategoryFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    });

    it("displays all categories plus 'All Categories' option", () => {
      render(<SkillCategoryFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));

      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(4); // "All Categories" + 3 categories
    });

    it("displays 'All Categories' as first option", () => {
      render(<SkillCategoryFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));

      const options = screen.getAllByRole("option");
      expect(options[0]).toHaveTextContent("All Categories");
    });

    it("displays categories in order", () => {
      render(<SkillCategoryFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));

      const options = screen.getAllByRole("option");
      expect(options[1]).toHaveTextContent("Customer Support");
      expect(options[2]).toHaveTextContent("Operations");
      expect(options[3]).toHaveTextContent("Sales");
    });

    it("shows skill counts in dropdown when provided", () => {
      render(
        <SkillCategoryFilter
          {...defaultProps}
          skillCounts={{ "Customer Support": 5, Operations: 3, Sales: 2 }}
        />
      );

      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByText("(5)")).toBeInTheDocument();
      expect(screen.getByText("(3)")).toBeInTheDocument();
      expect(screen.getByText("(2)")).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("calls onChange with null when 'All Categories' is clicked", () => {
      const onChange = vi.fn();
      render(<SkillCategoryFilter {...defaultProps} onChange={onChange} />);

      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getAllByRole("option")[0]);

      expect(onChange).toHaveBeenCalledWith(null);
    });

    it("calls onChange with category when category is clicked", () => {
      const onChange = vi.fn();
      render(<SkillCategoryFilter {...defaultProps} onChange={onChange} />);

      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByText("Operations"));

      expect(onChange).toHaveBeenCalledWith("Operations");
    });

    it("closes dropdown after selection", () => {
      render(<SkillCategoryFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Customer Support"));

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("marks selected option with aria-selected true", () => {
      render(<SkillCategoryFilter {...defaultProps} selected="Customer Support" />);

      fireEvent.click(screen.getByRole("button"));

      const options = screen.getAllByRole("option");
      const customerSupportOption = options[1]; // index 0 is "All Categories"
      expect(customerSupportOption).toHaveAttribute("aria-selected", "true");
    });

    it("marks 'All Categories' as selected when selected is null", () => {
      render(<SkillCategoryFilter {...defaultProps} selected={null} />);

      fireEvent.click(screen.getByRole("button"));

      const allOption = screen.getAllByRole("option")[0];
      expect(allOption).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("keyboard navigation", () => {
    it("opens dropdown on Enter key", () => {
      render(<SkillCategoryFilter {...defaultProps} />);

      fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });

      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("opens dropdown on Space key", () => {
      render(<SkillCategoryFilter {...defaultProps} />);

      fireEvent.keyDown(screen.getByRole("button"), { key: " " });

      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("opens dropdown on ArrowDown key", () => {
      render(<SkillCategoryFilter {...defaultProps} />);

      fireEvent.keyDown(screen.getByRole("button"), { key: "ArrowDown" });

      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("navigates down with ArrowDown", () => {
      render(<SkillCategoryFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(screen.getByRole("button"), { key: "ArrowDown" });
      fireEvent.keyDown(screen.getByRole("button"), { key: "ArrowDown" });

      // After 2 ArrowDown presses, index 1 should be highlighted
      const options = screen.getAllByRole("option");
      expect(options[1].className).toContain("bg-surface-100");
    });

    it("wraps around at the end", () => {
      // Use a non-null selection so the first option isn't selected
      render(<SkillCategoryFilter {...defaultProps} selected="Operations" />);

      fireEvent.click(screen.getByRole("button"));
      // Press down 5 times to wrap around (0 -> 1 -> 2 -> 3 -> 0)
      fireEvent.keyDown(screen.getByRole("button"), { key: "ArrowDown" });
      fireEvent.keyDown(screen.getByRole("button"), { key: "ArrowDown" });
      fireEvent.keyDown(screen.getByRole("button"), { key: "ArrowDown" });
      fireEvent.keyDown(screen.getByRole("button"), { key: "ArrowDown" });
      fireEvent.keyDown(screen.getByRole("button"), { key: "ArrowDown" });

      // Should wrap back to beginning - first option has highlight styling
      const options = screen.getAllByRole("option");
      expect(options[0].className).toContain("bg-surface-100");
    });

    it("navigates up with ArrowUp", () => {
      // Use a non-null selection so the first option isn't selected
      render(<SkillCategoryFilter {...defaultProps} selected="Operations" />);

      fireEvent.click(screen.getByRole("button"));
      // Move down twice then up once
      fireEvent.keyDown(screen.getByRole("button"), { key: "ArrowDown" });
      fireEvent.keyDown(screen.getByRole("button"), { key: "ArrowDown" });
      fireEvent.keyDown(screen.getByRole("button"), { key: "ArrowUp" });

      const options = screen.getAllByRole("option");
      expect(options[0].className).toContain("bg-surface-100");
    });

    it("wraps to end when pressing ArrowUp at start", () => {
      render(<SkillCategoryFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(screen.getByRole("button"), { key: "ArrowDown" }); // index 0
      fireEvent.keyDown(screen.getByRole("button"), { key: "ArrowUp" }); // wrap to end

      const options = screen.getAllByRole("option");
      expect(options[3].className).toContain("bg-surface-100");
    });

    it("selects highlighted option on Enter", () => {
      const onChange = vi.fn();
      render(<SkillCategoryFilter {...defaultProps} onChange={onChange} />);

      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(screen.getByRole("button"), { key: "ArrowDown" });
      fireEvent.keyDown(screen.getByRole("button"), { key: "ArrowDown" }); // index 1
      fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });

      expect(onChange).toHaveBeenCalledWith("Customer Support");
    });

    it("selects highlighted option on Space", () => {
      const onChange = vi.fn();
      render(<SkillCategoryFilter {...defaultProps} onChange={onChange} />);

      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(screen.getByRole("button"), { key: "ArrowDown" }); // index 0
      fireEvent.keyDown(screen.getByRole("button"), { key: " " });

      expect(onChange).toHaveBeenCalledWith(null);
    });

    it("closes dropdown on Escape", () => {
      render(<SkillCategoryFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      fireEvent.keyDown(screen.getByRole("button"), { key: "Escape" });

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("click outside", () => {
    it("closes dropdown when clicking outside", () => {
      render(
        <div>
          <SkillCategoryFilter {...defaultProps} />
          <button data-testid="outside">Outside</button>
        </div>
      );

      fireEvent.click(screen.getByRole("button", { name: /all categories/i }));
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId("outside"));

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("hover highlighting", () => {
    it("highlights option on mouse enter", () => {
      render(<SkillCategoryFilter {...defaultProps} />);

      fireEvent.click(screen.getByRole("button"));
      fireEvent.mouseEnter(screen.getByText("Operations").closest('[role="option"]')!);

      const operationsOption = screen.getByText("Operations").closest('[role="option"]');
      expect(operationsOption?.className).toContain("bg-surface-100");
    });
  });

  describe("empty categories", () => {
    it("renders with empty categories array", () => {
      render(<SkillCategoryFilter categories={[]} selected={null} onChange={vi.fn()} />);

      fireEvent.click(screen.getByRole("button"));

      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(1); // Only "All Categories"
    });
  });
});
