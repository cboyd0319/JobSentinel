import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import {
  KeyboardShortcutsProvider,
  useKeyboardShortcuts,
  formatShortcut,
  type Shortcut,
} from "./KeyboardShortcutsContext";

// Test component that uses the keyboard shortcuts context
function TestComponent({
  onRegister,
  onUnregister,
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

      // Open command palette
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

  describe("navigation callbacks", () => {
    it("calls onNavigate when navigation shortcut is triggered", async () => {
      const onNavigate = vi.fn();

      render(
        <KeyboardShortcutsProvider onNavigate={onNavigate}>
          <TestComponent />
        </KeyboardShortcutsProvider>
      );

      // Trigger meta+1 for dashboard
      await act(async () => {
        fireEvent.keyDown(window, { key: "1", metaKey: true });
      });

      await waitFor(() => {
        expect(onNavigate).toHaveBeenCalledWith("dashboard");
      });
    });

    it("calls onOpenSettings when settings shortcut is triggered", async () => {
      const onOpenSettings = vi.fn();

      render(
        <KeyboardShortcutsProvider onOpenSettings={onOpenSettings}>
          <TestComponent />
        </KeyboardShortcutsProvider>
      );

      // Trigger meta+, for settings
      await act(async () => {
        fireEvent.keyDown(window, { key: ",", metaKey: true });
      });

      await waitFor(() => {
        expect(onOpenSettings).toHaveBeenCalled();
      });
    });
  });
});

describe("formatShortcut", () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
    });
  });

  it("formats single key shortcut", () => {
    const shortcut: Shortcut = {
      key: "Escape",
      modifiers: [],
      description: "Close",
      action: () => {},
      category: "ui",
    };

    expect(formatShortcut(shortcut)).toBe("Escape");
  });

  it("formats shortcut with modifiers on Mac", () => {
    Object.defineProperty(global, "navigator", {
      value: { userAgent: "Mozilla/5.0 (Macintosh)" },
      writable: true,
    });

    const shortcut: Shortcut = {
      key: "k",
      modifiers: ["meta"],
      description: "Command palette",
      action: () => {},
      category: "ui",
    };

    expect(formatShortcut(shortcut)).toBe("⌘K");
  });

  it("formats shortcut with multiple modifiers", () => {
    Object.defineProperty(global, "navigator", {
      value: { userAgent: "Mozilla/5.0 (Macintosh)" },
      writable: true,
    });

    const shortcut: Shortcut = {
      key: "z",
      modifiers: ["meta", "shift"],
      description: "Redo",
      action: () => {},
      category: "actions",
    };

    expect(formatShortcut(shortcut)).toBe("⌘⇧Z");
  });

  it("formats shortcut with ctrl on non-Mac", () => {
    Object.defineProperty(global, "navigator", {
      value: { userAgent: "Mozilla/5.0 (Windows)" },
      writable: true,
    });

    const shortcut: Shortcut = {
      key: "k",
      modifiers: ["meta"],
      description: "Command palette",
      action: () => {},
      category: "ui",
    };

    expect(formatShortcut(shortcut)).toBe("CtrlK");
  });

  it("formats shortcut with alt modifier", () => {
    Object.defineProperty(global, "navigator", {
      value: { userAgent: "Mozilla/5.0 (Macintosh)" },
      writable: true,
    });

    const shortcut: Shortcut = {
      key: "n",
      modifiers: ["alt"],
      description: "New",
      action: () => {},
      category: "actions",
    };

    expect(formatShortcut(shortcut)).toBe("⌥N");
  });
});
