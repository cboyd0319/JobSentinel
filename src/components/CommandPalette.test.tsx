import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommandPalette } from "./CommandPalette";

// Mock the useKeyboardShortcuts hook
const mockUseKeyboardShortcuts = vi.fn();
vi.mock("../contexts/KeyboardShortcutsContext", () => ({
  useKeyboardShortcuts: () => mockUseKeyboardShortcuts(),
  formatShortcut: (shortcut: { key: string; modifiers?: string[] }) => {
    const mods = shortcut.modifiers?.join("+") || "";
    return mods ? `${mods}+${shortcut.key}` : shortcut.key;
  },
}));

describe("CommandPalette", () => {
  const mockShortcuts = [
    {
      key: "1",
      modifiers: ["meta"],
      description: "Go to Dashboard",
      action: vi.fn(),
      category: "navigation",
    },
    {
      key: "2",
      modifiers: ["meta"],
      description: "Go to Applications",
      action: vi.fn(),
      category: "navigation",
    },
    {
      key: "k",
      modifiers: ["meta"],
      description: "Open command palette",
      action: vi.fn(),
      category: "ui",
    },
  ];

  const defaultMockReturn = {
    shortcuts: mockShortcuts,
    isCommandPaletteOpen: true,
    closeCommandPalette: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseKeyboardShortcuts.mockReturnValue(defaultMockReturn);
  });

  describe("rendering", () => {
    it("does not render when closed", () => {
      mockUseKeyboardShortcuts.mockReturnValue({
        ...defaultMockReturn,
        isCommandPaletteOpen: false,
      });

      render(<CommandPalette />);

      expect(screen.queryByTestId("command-palette")).not.toBeInTheDocument();
    });

    it("renders when open", () => {
      render(<CommandPalette />);

      expect(screen.getByTestId("command-palette")).toBeInTheDocument();
    });

    it("has dialog role", () => {
      render(<CommandPalette />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("has aria-modal true", () => {
      render(<CommandPalette />);

      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("has aria-label", () => {
      render(<CommandPalette />);

      expect(screen.getByRole("dialog")).toHaveAttribute(
        "aria-label",
        "Command palette"
      );
    });
  });

  describe("search input", () => {
    it("renders search input", () => {
      render(<CommandPalette />);

      expect(screen.getByTestId("command-palette-input")).toBeInTheDocument();
    });

    it("has placeholder text", () => {
      render(<CommandPalette />);

      expect(
        screen.getByPlaceholderText("Type a command or search...")
      ).toBeInTheDocument();
    });

    it("filters commands based on query", () => {
      render(<CommandPalette />);

      fireEvent.change(screen.getByTestId("command-palette-input"), {
        target: { value: "dashboard" },
      });

      expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
      expect(screen.queryByText("Go to Applications")).not.toBeInTheDocument();
    });

    it("shows no results message when no matches", () => {
      render(<CommandPalette />);

      fireEvent.change(screen.getByTestId("command-palette-input"), {
        target: { value: "xyz123nonexistent" },
      });

      expect(screen.getByText("No commands found")).toBeInTheDocument();
    });
  });

  describe("command list", () => {
    it("renders listbox", () => {
      render(<CommandPalette />);

      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("displays commands from shortcuts", () => {
      render(<CommandPalette />);

      expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Go to Applications")).toBeInTheDocument();
      expect(screen.getByText("Open command palette")).toBeInTheDocument();
    });

    it("displays additional commands prop", () => {
      const additionalCommands = [
        {
          id: "custom-1",
          name: "Custom Command",
          action: vi.fn(),
          category: "actions",
        },
      ];

      render(<CommandPalette commands={additionalCommands} />);

      expect(screen.getByText("Custom Command")).toBeInTheDocument();
    });

    it("displays category labels", () => {
      render(<CommandPalette />);

      expect(screen.getByText("Navigation")).toBeInTheDocument();
      expect(screen.getByText("Interface")).toBeInTheDocument();
    });

    it("displays shortcuts for commands", () => {
      render(<CommandPalette />);

      expect(screen.getByText("meta+1")).toBeInTheDocument();
      expect(screen.getByText("meta+2")).toBeInTheDocument();
    });
  });

  describe("command selection", () => {
    it("executes command on click", () => {
      const action = vi.fn();
      mockUseKeyboardShortcuts.mockReturnValue({
        ...defaultMockReturn,
        shortcuts: [
          {
            key: "1",
            description: "Test Command",
            action,
            category: "navigation",
          },
        ],
      });

      render(<CommandPalette />);

      fireEvent.click(screen.getByText("Test Command"));

      expect(action).toHaveBeenCalledTimes(1);
    });

    it("closes palette after command execution", () => {
      const closeCommandPalette = vi.fn();
      mockUseKeyboardShortcuts.mockReturnValue({
        ...defaultMockReturn,
        closeCommandPalette,
      });

      render(<CommandPalette />);

      fireEvent.click(screen.getByText("Go to Dashboard"));

      expect(closeCommandPalette).toHaveBeenCalledTimes(1);
    });

    it("highlights first command by default", () => {
      render(<CommandPalette />);

      const options = screen.getAllByRole("option");
      expect(options[0]).toHaveAttribute("aria-selected", "true");
    });

    it("highlights command on mouse enter", () => {
      render(<CommandPalette />);

      const options = screen.getAllByRole("option");
      fireEvent.mouseEnter(options[1]);

      expect(options[1]).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("keyboard navigation", () => {
    it("navigates down with ArrowDown", () => {
      render(<CommandPalette />);

      fireEvent.keyDown(window, { key: "ArrowDown" });

      const options = screen.getAllByRole("option");
      expect(options[1]).toHaveAttribute("aria-selected", "true");
    });

    it("navigates up with ArrowUp", () => {
      render(<CommandPalette />);

      // First go down
      fireEvent.keyDown(window, { key: "ArrowDown" });
      fireEvent.keyDown(window, { key: "ArrowDown" });

      // Then up
      fireEvent.keyDown(window, { key: "ArrowUp" });

      const options = screen.getAllByRole("option");
      expect(options[1]).toHaveAttribute("aria-selected", "true");
    });

    it("does not go below last item", () => {
      render(<CommandPalette />);

      // Go down many times
      for (let i = 0; i < 10; i++) {
        fireEvent.keyDown(window, { key: "ArrowDown" });
      }

      const options = screen.getAllByRole("option");
      expect(options[options.length - 1]).toHaveAttribute("aria-selected", "true");
    });

    it("does not go above first item", () => {
      render(<CommandPalette />);

      fireEvent.keyDown(window, { key: "ArrowUp" });

      const options = screen.getAllByRole("option");
      expect(options[0]).toHaveAttribute("aria-selected", "true");
    });

    it("executes command on Enter", () => {
      const action = vi.fn();
      mockUseKeyboardShortcuts.mockReturnValue({
        ...defaultMockReturn,
        shortcuts: [
          {
            key: "1",
            description: "Test Command",
            action,
            category: "navigation",
          },
        ],
      });

      render(<CommandPalette />);

      fireEvent.keyDown(window, { key: "Enter" });

      expect(action).toHaveBeenCalledTimes(1);
    });
  });

  describe("closing", () => {
    it("closes when backdrop is clicked", () => {
      const closeCommandPalette = vi.fn();
      mockUseKeyboardShortcuts.mockReturnValue({
        ...defaultMockReturn,
        closeCommandPalette,
      });

      render(<CommandPalette />);

      // Click the outer container (backdrop)
      const backdrop = screen.getByTestId("command-palette").parentElement!;
      fireEvent.click(backdrop);

      expect(closeCommandPalette).toHaveBeenCalledTimes(1);
    });

    it("does not close when palette content is clicked", () => {
      const closeCommandPalette = vi.fn();
      mockUseKeyboardShortcuts.mockReturnValue({
        ...defaultMockReturn,
        closeCommandPalette,
      });

      render(<CommandPalette />);

      fireEvent.click(screen.getByTestId("command-palette"));

      expect(closeCommandPalette).not.toHaveBeenCalled();
    });
  });

  describe("footer hints", () => {
    it("shows navigation hint", () => {
      render(<CommandPalette />);

      expect(screen.getByText("to navigate")).toBeInTheDocument();
    });

    it("shows selection hint", () => {
      render(<CommandPalette />);

      expect(screen.getByText("to select")).toBeInTheDocument();
    });

    it("shows esc hint", () => {
      render(<CommandPalette />);

      expect(screen.getByText("esc")).toBeInTheDocument();
    });
  });

  describe("query behavior", () => {
    it("clears filtered results when query is cleared", () => {
      render(<CommandPalette />);

      // Filter to show only dashboard
      fireEvent.change(screen.getByTestId("command-palette-input"), {
        target: { value: "dashboard" },
      });

      expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
      expect(screen.queryByText("Go to Applications")).not.toBeInTheDocument();

      // Clear the query
      fireEvent.change(screen.getByTestId("command-palette-input"), {
        target: { value: "" },
      });

      // All commands should be visible again
      expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Go to Applications")).toBeInTheDocument();
    });
  });

  describe("icons", () => {
    it("displays command icon when provided", () => {
      const commands = [
        {
          id: "icon-cmd",
          name: "Icon Command",
          icon: "🎯",
          action: vi.fn(),
          category: "actions",
        },
      ];

      render(<CommandPalette commands={commands} />);

      expect(screen.getByText("🎯")).toBeInTheDocument();
    });
  });
});
