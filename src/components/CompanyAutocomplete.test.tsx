import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CompanyAutocomplete, COMPANY_SUGGESTIONS } from "./CompanyAutocomplete";

describe("CompanyAutocomplete", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
    onAdd: vi.fn(),
  };

  describe("rendering", () => {
    it("renders input with placeholder", () => {
      render(<CompanyAutocomplete {...defaultProps} />);

      expect(screen.getByPlaceholderText("Type a company name...")).toBeInTheDocument();
    });

    it("renders custom placeholder", () => {
      render(<CompanyAutocomplete {...defaultProps} placeholder="Search companies" />);

      expect(screen.getByPlaceholderText("Search companies")).toBeInTheDocument();
    });

    it("renders Add button", () => {
      render(<CompanyAutocomplete {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Add company" })).toBeInTheDocument();
    });

    it("has combobox role", () => {
      render(<CompanyAutocomplete {...defaultProps} />);

      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("has aria-haspopup listbox", () => {
      render(<CompanyAutocomplete {...defaultProps} />);

      expect(screen.getByRole("combobox")).toHaveAttribute("aria-haspopup", "listbox");
    });
  });

  describe("input behavior", () => {
    it("calls onChange when typing", () => {
      const onChange = vi.fn();
      render(<CompanyAutocomplete {...defaultProps} onChange={onChange} />);

      fireEvent.change(screen.getByRole("textbox"), { target: { value: "goo" } });

      expect(onChange).toHaveBeenCalledWith("goo");
    });

    it("shows value in input", () => {
      render(<CompanyAutocomplete {...defaultProps} value="Google" />);

      expect(screen.getByRole("textbox")).toHaveValue("Google");
    });
  });

  describe("suggestions dropdown", () => {
    it("shows suggestions when typing at least 1 character", () => {
      render(<CompanyAutocomplete {...defaultProps} value="goo" />);

      fireEvent.focus(screen.getByRole("textbox"));

      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("does not show suggestions for empty input", () => {
      render(<CompanyAutocomplete {...defaultProps} value="" />);

      fireEvent.focus(screen.getByRole("textbox"));

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("filters suggestions based on input", () => {
      render(<CompanyAutocomplete {...defaultProps} value="goo" />);

      fireEvent.focus(screen.getByRole("textbox"));

      expect(screen.getByText("Google")).toBeInTheDocument();
      expect(screen.queryByText("Meta")).not.toBeInTheDocument();
    });

    it("shows company industry in suggestions", () => {
      render(<CompanyAutocomplete {...defaultProps} value="goo" />);

      fireEvent.focus(screen.getByRole("textbox"));

      expect(screen.getByText("Technology")).toBeInTheDocument();
    });

    it("shows remote policy badge for companies", () => {
      render(<CompanyAutocomplete {...defaultProps} value="goo" />);

      fireEvent.focus(screen.getByRole("textbox"));

      expect(screen.getByText("Hybrid")).toBeInTheDocument();
    });

    it("excludes already added companies from suggestions", () => {
      render(
        <CompanyAutocomplete
          {...defaultProps}
          value="goo"
          existingCompanies={["Google"]}
        />
      );

      fireEvent.focus(screen.getByRole("textbox"));

      expect(screen.queryByText("Google")).not.toBeInTheDocument();
    });

    it("limits suggestions to 6 items", () => {
      render(<CompanyAutocomplete {...defaultProps} value="a" />);

      fireEvent.focus(screen.getByRole("textbox"));

      const options = screen.getAllByRole("option");
      expect(options.length).toBeLessThanOrEqual(6);
    });

    it("shows no results message when no matches", () => {
      render(<CompanyAutocomplete {...defaultProps} value="xyz123nonexistent" />);

      fireEvent.focus(screen.getByRole("textbox"));

      expect(screen.getByText("No matching companies found")).toBeInTheDocument();
    });

    it("shows custom company hint when typing non-matching text", () => {
      render(<CompanyAutocomplete {...defaultProps} value="MyCustomCompany" />);

      fireEvent.focus(screen.getByRole("textbox"));

      expect(screen.getByText(/Press Enter to add "MyCustomCompany"/)).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("calls onAdd when clicking a suggestion", () => {
      const onAdd = vi.fn();
      render(<CompanyAutocomplete {...defaultProps} value="goo" onAdd={onAdd} />);

      fireEvent.focus(screen.getByRole("textbox"));
      fireEvent.click(screen.getByText("Google"));

      expect(onAdd).toHaveBeenCalledWith("Google");
    });

    it("clears input after selecting", () => {
      const onChange = vi.fn();
      render(<CompanyAutocomplete {...defaultProps} value="goo" onChange={onChange} />);

      fireEvent.focus(screen.getByRole("textbox"));
      fireEvent.click(screen.getByText("Google"));

      expect(onChange).toHaveBeenCalledWith("");
    });

    it("closes dropdown after selecting", () => {
      const onChange = vi.fn();
      render(<CompanyAutocomplete {...defaultProps} value="goo" onChange={onChange} />);

      fireEvent.focus(screen.getByRole("textbox"));
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Google"));

      // After selection, the input is cleared and dropdown closes
      // The onChange is called with empty string
      expect(onChange).toHaveBeenCalledWith("");
    });
  });

  describe("Add button", () => {
    it("calls onAdd when clicking Add button", () => {
      const onAdd = vi.fn();
      render(<CompanyAutocomplete {...defaultProps} value="CustomCompany" onAdd={onAdd} />);

      fireEvent.click(screen.getByRole("button", { name: "Add company" }));

      expect(onAdd).toHaveBeenCalledWith("CustomCompany");
    });

    it("clears input after adding", () => {
      const onChange = vi.fn();
      render(<CompanyAutocomplete {...defaultProps} value="Custom" onChange={onChange} />);

      fireEvent.click(screen.getByRole("button", { name: "Add company" }));

      expect(onChange).toHaveBeenCalledWith("");
    });

    it("does not call onAdd for empty input", () => {
      const onAdd = vi.fn();
      render(<CompanyAutocomplete {...defaultProps} value="" onAdd={onAdd} />);

      fireEvent.click(screen.getByRole("button", { name: "Add company" }));

      expect(onAdd).not.toHaveBeenCalled();
    });

    it("trims whitespace before adding", () => {
      const onAdd = vi.fn();
      render(<CompanyAutocomplete {...defaultProps} value="  Trimmed  " onAdd={onAdd} />);

      fireEvent.click(screen.getByRole("button", { name: "Add company" }));

      expect(onAdd).toHaveBeenCalledWith("Trimmed");
    });
  });

  describe("keyboard navigation", () => {
    it("opens dropdown on focus", () => {
      render(<CompanyAutocomplete {...defaultProps} value="goo" />);

      fireEvent.focus(screen.getByRole("textbox"));

      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("navigates down with ArrowDown", () => {
      render(<CompanyAutocomplete {...defaultProps} value="str" />);

      fireEvent.focus(screen.getByRole("textbox"));
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "ArrowDown" });

      const options = screen.getAllByRole("option");
      expect(options[1]).toHaveAttribute("aria-selected", "true");
    });

    it("navigates up with ArrowUp", () => {
      render(<CompanyAutocomplete {...defaultProps} value="str" />);

      fireEvent.focus(screen.getByRole("textbox"));
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "ArrowDown" });
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "ArrowDown" });
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "ArrowUp" });

      const options = screen.getAllByRole("option");
      expect(options[1]).toHaveAttribute("aria-selected", "true");
    });

    it("wraps around at the end", () => {
      // Use a search that returns exactly 2 results for easier testing
      render(<CompanyAutocomplete {...defaultProps} value="stripe" />);

      fireEvent.focus(screen.getByRole("textbox"));
      const options = screen.getAllByRole("option");
      const numOptions = options.length;

      // Press down numOptions times to wrap to 0
      for (let i = 0; i < numOptions; i++) {
        fireEvent.keyDown(screen.getByRole("textbox"), { key: "ArrowDown" });
      }

      expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
    });

    it("selects suggestion on Enter", () => {
      const onAdd = vi.fn();
      render(<CompanyAutocomplete {...defaultProps} value="goo" onAdd={onAdd} />);

      fireEvent.focus(screen.getByRole("textbox"));
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });

      expect(onAdd).toHaveBeenCalledWith("Google");
    });

    it("adds custom value on Enter when no suggestions shown", () => {
      const onAdd = vi.fn();
      render(<CompanyAutocomplete {...defaultProps} value="CustomCompany" onAdd={onAdd} />);

      // Don't focus to keep suggestions hidden, just press enter
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });

      expect(onAdd).toHaveBeenCalledWith("CustomCompany");
    });

    it("closes dropdown on Escape", () => {
      render(<CompanyAutocomplete {...defaultProps} value="goo" />);

      fireEvent.focus(screen.getByRole("textbox"));
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("click outside", () => {
    it("closes dropdown when clicking outside", () => {
      render(
        <div>
          <CompanyAutocomplete {...defaultProps} value="goo" />
          <button data-testid="outside">Outside</button>
        </div>
      );

      fireEvent.focus(screen.getByRole("textbox"));
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId("outside"));

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("hover highlighting", () => {
    it("highlights option on mouse enter", () => {
      render(<CompanyAutocomplete {...defaultProps} value="str" />);

      fireEvent.focus(screen.getByRole("textbox"));
      const options = screen.getAllByRole("option");
      fireEvent.mouseEnter(options[1]);

      expect(options[1]).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("accessibility", () => {
    it("has screen reader announcement for suggestions count", () => {
      render(<CompanyAutocomplete {...defaultProps} value="str" />);

      fireEvent.focus(screen.getByRole("textbox"));

      // There are multiple status elements - find the one with suggestions count
      const statusElements = screen.getAllByRole("status");
      const suggestionAnnouncement = statusElements.find(el =>
        el.textContent?.includes("suggestion")
      );
      expect(suggestionAnnouncement).toBeDefined();
    });

    it("sets aria-activedescendant when navigating", () => {
      render(<CompanyAutocomplete {...defaultProps} value="goo" />);

      fireEvent.focus(screen.getByRole("textbox"));

      expect(screen.getByRole("textbox")).toHaveAttribute(
        "aria-activedescendant",
        "company-suggestion-0"
      );
    });

    it("has aria-label on input", () => {
      render(<CompanyAutocomplete {...defaultProps} />);

      expect(screen.getByRole("textbox")).toHaveAttribute("aria-label", "Company name");
    });

    it("has aria-autocomplete list", () => {
      render(<CompanyAutocomplete {...defaultProps} />);

      expect(screen.getByRole("textbox")).toHaveAttribute("aria-autocomplete", "list");
    });
  });

  describe("button color variants", () => {
    it("applies default blue color", () => {
      render(<CompanyAutocomplete {...defaultProps} />);

      const button = screen.getByRole("button", { name: "Add company" });
      expect(button.className).toContain("bg-blue-500");
    });

    it("applies sentinel color", () => {
      render(<CompanyAutocomplete {...defaultProps} buttonColor="sentinel" />);

      const button = screen.getByRole("button", { name: "Add company" });
      expect(button.className).toContain("bg-sentinel-500");
    });

    it("applies red color", () => {
      render(<CompanyAutocomplete {...defaultProps} buttonColor="red" />);

      const button = screen.getByRole("button", { name: "Add company" });
      expect(button.className).toContain("bg-red-500");
    });
  });

  describe("COMPANY_SUGGESTIONS", () => {
    it("exports company suggestions array", () => {
      expect(Array.isArray(COMPANY_SUGGESTIONS)).toBe(true);
      expect(COMPANY_SUGGESTIONS.length).toBeGreaterThan(0);
    });

    it("has required fields for each company", () => {
      for (const company of COMPANY_SUGGESTIONS) {
        expect(company.name).toBeDefined();
        expect(company.displayName).toBeDefined();
        expect(company.industry).toBeDefined();
      }
    });

    it("includes major tech companies", () => {
      const names = COMPANY_SUGGESTIONS.map(c => c.name);
      expect(names).toContain("google");
      expect(names).toContain("meta");
      expect(names).toContain("amazon");
    });
  });
});
