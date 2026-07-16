import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { KeyboardShortcutsProvider } from "./KeyboardShortcutsProvider";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

// Test component that uses the keyboard shortcuts context
function TestComponent({
  onRegister,
  onUnregister: _onUnregister,
}: {
  onRegister?: () => void;
  onUnregister?: () => void;
}) {
  const {
    shortcuts,
    registerShortcut,
    unregisterShortcut,
    isCommandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
    isHelpOpen,
    openHelp,
    closeHelp,
    toggleHelp,
  } = useKeyboardShortcuts();

  return (
    <div>
      <span data-testid="shortcuts-count">{shortcuts.length}</span>
      <span data-testid="command-palette-open">{String(isCommandPaletteOpen)}</span>
      <span data-testid="help-open">{String(isHelpOpen)}</span>
      <button data-testid="open-palette" onClick={openCommandPalette}>
        Open Palette
      </button>
      <button data-testid="close-palette" onClick={closeCommandPalette}>
        Close Palette
      </button>
      <button data-testid="toggle-palette" onClick={toggleCommandPalette}>
        Toggle Palette
      </button>
      <button data-testid="open-help" onClick={openHelp}>
        Open Help
      </button>
      <button data-testid="close-help" onClick={closeHelp}>
        Close Help
      </button>
      <button data-testid="toggle-help" onClick={toggleHelp}>
        Toggle Help
      </button>
      <button
        data-testid="register"
        onClick={() => {
          registerShortcut({
            key: "t",
            modifiers: ["meta"],
            description: "Test shortcut",
            action: () => onRegister?.(),
            category: "actions",
          });
        }}
      >
        Register
      </button>
      <button data-testid="unregister" onClick={() => unregisterShortcut("t")}>
        Unregister
      </button>
    </div>
  );
}

describe("KeyboardShortcutsContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("useKeyboardShortcuts", () => {
    it("throws error when used outside provider", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow("useKeyboardShortcuts must be used within a KeyboardShortcutsProvider");

      consoleSpy.mockRestore();
    });
  });

  describe("KeyboardShortcutsProvider", () => {
    it("renders children", () => {
      render(
        <KeyboardShortcutsProvider>
          <div>Child content</div>
        </KeyboardShortcutsProvider>
      );

      expect(screen.getByText("Child content")).toBeInTheDocument();
    });

    it("registers default shortcuts on mount", async () => {
      render(
        <KeyboardShortcutsProvider>
          <TestComponent />
        </KeyboardShortcutsProvider>
      );

      await waitFor(() => {
        // Default shortcuts include: k, comma, 1-8, Escape, ?
        const count = parseInt(screen.getByTestId("shortcuts-count").textContent || "0");
        expect(count).toBeGreaterThan(0);
      });
    });
  });

  describe("command palette state", () => {
    it("starts with command palette closed", () => {
      render(
        <KeyboardShortcutsProvider>
          <TestComponent />
        </KeyboardShortcutsProvider>
      );

      expect(screen.getByTestId("command-palette-open")).toHaveTextContent("false");
    });

    it("opens command palette", async () => {
      render(
        <KeyboardShortcutsProvider>
          <TestComponent />
        </KeyboardShortcutsProvider>
      );

      fireEvent.click(screen.getByTestId("open-palette"));

      await waitFor(() => {
        expect(screen.getByTestId("command-palette-open")).toHaveTextContent("true");
      });
    });

    it("closes command palette", async () => {
      render(
        <KeyboardShortcutsProvider>
          <TestComponent />
        </KeyboardShortcutsProvider>
      );

      fireEvent.click(screen.getByTestId("open-palette"));
      await waitFor(() => {
        expect(screen.getByTestId("command-palette-open")).toHaveTextContent("true");
      });

      fireEvent.click(screen.getByTestId("close-palette"));

      await waitFor(() => {
        expect(screen.getByTestId("command-palette-open")).toHaveTextContent("false");
      });
    });

    it("toggles command palette", async () => {
      render(
        <KeyboardShortcutsProvider>
          <TestComponent />
        </KeyboardShortcutsProvider>
      );

      fireEvent.click(screen.getByTestId("toggle-palette"));
      await waitFor(() => {
        expect(screen.getByTestId("command-palette-open")).toHaveTextContent("true");
      });

      fireEvent.click(screen.getByTestId("toggle-palette"));
      await waitFor(() => {
        expect(screen.getByTestId("command-palette-open")).toHaveTextContent("false");
      });
    });
  });

  describe("help state", () => {
    it("starts with help closed", () => {
      render(
        <KeyboardShortcutsProvider>
          <TestComponent />
        </KeyboardShortcutsProvider>
      );

      expect(screen.getByTestId("help-open")).toHaveTextContent("false");
    });

    it("opens help", async () => {
      render(
        <KeyboardShortcutsProvider>
          <TestComponent />
        </KeyboardShortcutsProvider>
      );

      fireEvent.click(screen.getByTestId("open-help"));

      await waitFor(() => {
        expect(screen.getByTestId("help-open")).toHaveTextContent("true");
      });
    });

    it("closes help", async () => {
      render(
        <KeyboardShortcutsProvider>
          <TestComponent />
        </KeyboardShortcutsProvider>
      );

      fireEvent.click(screen.getByTestId("open-help"));
      await waitFor(() => {
        expect(screen.getByTestId("help-open")).toHaveTextContent("true");
      });

      fireEvent.click(screen.getByTestId("close-help"));

      await waitFor(() => {
        expect(screen.getByTestId("help-open")).toHaveTextContent("false");
      });
    });

    it("toggles help", async () => {
      render(
        <KeyboardShortcutsProvider>
          <TestComponent />
        </KeyboardShortcutsProvider>
      );

      fireEvent.click(screen.getByTestId("toggle-help"));
      await waitFor(() => {
        expect(screen.getByTestId("help-open")).toHaveTextContent("true");
      });

      fireEvent.click(screen.getByTestId("toggle-help"));
      await waitFor(() => {
        expect(screen.getByTestId("help-open")).toHaveTextContent("false");
      });
    });

    it("closes help with Escape", async () => {
      render(
        <KeyboardShortcutsProvider>
          <TestComponent />
        </KeyboardShortcutsProvider>
      );

      fireEvent.click(screen.getByTestId("open-help"));
      await waitFor(() => {
        expect(screen.getByTestId("help-open")).toHaveTextContent("true");
      });

      await act(async () => {
        fireEvent.keyDown(window, { key: "Escape" });
      });

      await waitFor(() => {
        expect(screen.getByTestId("help-open")).toHaveTextContent("false");
      });
    });
  });

  describe("registerShortcut", () => {
    it("adds a new shortcut", async () => {
      render(
        <KeyboardShortcutsProvider>
          <TestComponent />
        </KeyboardShortcutsProvider>
      );

      const initialCount = parseInt(
        screen.getByTestId("shortcuts-count").textContent || "0"
      );

      fireEvent.click(screen.getByTestId("register"));

      await waitFor(() => {
        const newCount = parseInt(
          screen.getByTestId("shortcuts-count").textContent || "0"
        );
        expect(newCount).toBe(initialCount + 1);
      });
    });

    it("replaces existing shortcut with same key", async () => {
      render(
        <KeyboardShortcutsProvider>
          <TestComponent />
        </KeyboardShortcutsProvider>
      );

      fireEvent.click(screen.getByTestId("register"));

      await waitFor(() => {
        const count1 = parseInt(
          screen.getByTestId("shortcuts-count").textContent || "0"
        );
        expect(count1).toBeGreaterThan(0);
      });

      const countAfterFirst = parseInt(
        screen.getByTestId("shortcuts-count").textContent || "0"
      );

      // Register same key again
      fireEvent.click(screen.getByTestId("register"));

      await waitFor(() => {
        const countAfterSecond = parseInt(
          screen.getByTestId("shortcuts-count").textContent || "0"
        );
        // Should not increase - replaces existing
        expect(countAfterSecond).toBe(countAfterFirst);
      });
    });

  });

  describe("unregisterShortcut", () => {
    it("removes a shortcut", async () => {
      render(
        <KeyboardShortcutsProvider>
          <TestComponent />
        </KeyboardShortcutsProvider>
      );

      fireEvent.click(screen.getByTestId("register"));

      await waitFor(() => {
        const count = parseInt(
          screen.getByTestId("shortcuts-count").textContent || "0"
        );
        expect(count).toBeGreaterThan(0);
      });

      const countBeforeUnregister = parseInt(
        screen.getByTestId("shortcuts-count").textContent || "0"
      );

      fireEvent.click(screen.getByTestId("unregister"));

      await waitFor(() => {
        const countAfterUnregister = parseInt(
          screen.getByTestId("shortcuts-count").textContent || "0"
        );
        expect(countAfterUnregister).toBe(countBeforeUnregister - 1);
      });
    });
  });

  describe("keyboard events", () => {
    it("triggers shortcut action on keypress", async () => {
      const onRegister = vi.fn();

      render(
        <KeyboardShortcutsProvider>
          <TestComponent onRegister={onRegister} />
        </KeyboardShortcutsProvider>
      );

      // Register a custom shortcut
      fireEvent.click(screen.getByTestId("register"));

      // Trigger the shortcut (meta+t)
      await act(async () => {
        fireEvent.keyDown(window, { key: "t", metaKey: true });
      });

      await waitFor(() => {
        expect(onRegister).toHaveBeenCalled();
      });
    });

    it("keeps both undo and redo shortcuts registered", async () => {
      function ShortcutDescriptions() {
        const { shortcuts } = useKeyboardShortcuts();
        return (
          <ul>
            {shortcuts.map((shortcut) => (
              <li key={`${shortcut.key}-${shortcut.modifiers.join("-")}`}>
                {shortcut.description}
              </li>
            ))}
          </ul>
        );
      }

      render(
        <KeyboardShortcutsProvider>
          <ShortcutDescriptions />
        </KeyboardShortcutsProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Undo last action")).toBeInTheDocument();
        expect(screen.getByText("Redo last action")).toBeInTheDocument();
        expect(screen.getByText("Go to Resume Match")).toBeInTheDocument();
        expect(screen.getByText("Open Hiring Trends")).toBeInTheDocument();
        expect(screen.getByText("Show keyboard help")).toBeInTheDocument();
        expect(screen.getByText("Focus job search")).toBeInTheDocument();
        expect(screen.getByText("Save current form changes")).toBeInTheDocument();
        expect(screen.getByText("Add new item")).toBeInTheDocument();
        expect(screen.queryByText("Go to ATS Optimizer")).not.toBeInTheDocument();
        expect(screen.queryByText("Go to Market")).not.toBeInTheDocument();
        expect(screen.queryByText("Show keyboard shortcuts help")).not.toBeInTheDocument();
        expect(screen.queryByText("Focus search / filter")).not.toBeInTheDocument();
        expect(screen.queryByText("Submit current form")).not.toBeInTheDocument();
        expect(screen.queryByText("Create new item")).not.toBeInTheDocument();
      });
    });

    it("opens help when question mark key is reported as shifted slash", async () => {
      render(
        <KeyboardShortcutsProvider>
          <TestComponent />
        </KeyboardShortcutsProvider>
      );

      await act(async () => {
        fireEvent.keyDown(window, { key: "/", shiftKey: true });
      });

      await waitFor(() => {
        expect(screen.getByTestId("help-open")).toHaveTextContent("true");
      });
    });

    it("does not trigger shortcut when typing in input", async () => {
      const onRegister = vi.fn();

      render(
        <KeyboardShortcutsProvider>
          <TestComponent onRegister={onRegister} />
          <input data-testid="test-input" />
        </KeyboardShortcutsProvider>
      );

      fireEvent.click(screen.getByTestId("register"));

      // Focus the input and try shortcut
      const input = screen.getByTestId("test-input");
      input.focus();

      await act(async () => {
        fireEvent.keyDown(input, { key: "t", metaKey: true });
      });

      // Should not trigger because input is focused
      expect(onRegister).not.toHaveBeenCalled();
    });

    it("allows Escape key in inputs", async () => {
      render(
        <KeyboardShortcutsProvider>
          <TestComponent />
          <input data-testid="test-input" />
        </KeyboardShortcutsProvider>
      );

      // Open quick actions
      fireEvent.click(screen.getByTestId("open-palette"));
      await waitFor(() => {
        expect(screen.getByTestId("command-palette-open")).toHaveTextContent("true");
      });

      // Focus input and press Escape
      const input = screen.getByTestId("test-input");
      input.focus();

      await act(async () => {
        fireEvent.keyDown(input, { key: "Escape" });
      });

      // Escape should still work to close palette
      await waitFor(() => {
        expect(screen.getByTestId("command-palette-open")).toHaveTextContent("false");
      });
    });
  });

});
