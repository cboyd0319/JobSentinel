import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface Shortcut {
  key: string;
  modifiers: ("meta" | "ctrl" | "alt" | "shift")[];
  description: string;
  action: () => void;
  category: "navigation" | "actions" | "ui";
}

interface KeyboardShortcutsContextType {
  shortcuts: Shortcut[];
  registerShortcut: (shortcut: Shortcut) => void;
  unregisterShortcut: (key: string) => void;
  isCommandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  isHelpOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
  toggleHelp: () => void;
}

const KeyboardShortcutsContext =
  createContext<KeyboardShortcutsContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error(
      "useKeyboardShortcuts must be used within a KeyboardShortcutsProvider"
    );
  }
  return context;
}

interface KeyboardShortcutsProviderProps {
  children: ReactNode;
  onNavigate?: (page: string) => void;
  onOpenSettings?: () => void;
}

export function KeyboardShortcutsProvider({
  children,
  onNavigate,
  onOpenSettings,
}: KeyboardShortcutsProviderProps) {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const openCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
  }, []);

  const toggleCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen((prev) => !prev);
  }, []);

  const openHelp = useCallback(() => {
    setIsHelpOpen(true);
  }, []);

  const closeHelp = useCallback(() => {
    setIsHelpOpen(false);
  }, []);

  const toggleHelp = useCallback(() => {
    setIsHelpOpen((prev) => !prev);
  }, []);

  const registerShortcut = useCallback((shortcut: Shortcut) => {
    setShortcuts((prev) => {
      // Replace if exists, otherwise add
      const existing = prev.findIndex((s) => s.key === shortcut.key);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = shortcut;
        return updated;
      }
      return [...prev, shortcut];
    });
  }, []);

  const unregisterShortcut = useCallback((key: string) => {
    setShortcuts((prev) => prev.filter((s) => s.key !== key));
  }, []);

  // Register default shortcuts
  useEffect(() => {
    const defaultShortcuts: Shortcut[] = [
      {
        key: "k",
        modifiers: ["meta"],
        description: "Open command palette",
        action: toggleCommandPalette,
        category: "ui",
      },
      {
        key: ",",
        modifiers: ["meta"],
        description: "Open settings",
        action: () => onOpenSettings?.(),
        category: "ui",
      },
      {
        key: "1",
        modifiers: ["meta"],
        description: "Go to Dashboard",
        action: () => onNavigate?.("dashboard"),
        category: "navigation",
      },
      {
        key: "2",
        modifiers: ["meta"],
        description: "Go to Applications",
        action: () => onNavigate?.("applications"),
        category: "navigation",
      },
      {
        key: "3",
        modifiers: ["meta"],
        description: "Go to Resume",
        action: () => onNavigate?.("resume"),
        category: "navigation",
      },
      {
        key: "4",
        modifiers: ["meta"],
        description: "Go to Salary",
        action: () => onNavigate?.("salary"),
        category: "navigation",
      },
      {
        key: "5",
        modifiers: ["meta"],
        description: "Go to Market",
        action: () => onNavigate?.("market"),
        category: "navigation",
      },
      {
        key: "6",
        modifiers: ["meta"],
        description: "Go to One-Click Apply",
        action: () => onNavigate?.("automation"),
        category: "navigation",
      },
      {
        key: "7",
        modifiers: ["meta"],
        description: "Go to Resume Builder",
        action: () => onNavigate?.("resume-builder"),
        category: "navigation",
      },
      {
        key: "8",
        modifiers: ["meta"],
        description: "Go to ATS Optimizer",
        action: () => onNavigate?.("ats-optimizer"),
        category: "navigation",
      },
      {
        key: "Escape",
        modifiers: [],
        description: "Close dialog / command palette",
        action: closeCommandPalette,
        category: "ui",
      },
      {
        key: "?",
        modifiers: ["shift"],
        description: "Show keyboard shortcuts help",
        action: toggleHelp,
        category: "ui",
      },
      {
        key: "r",
        modifiers: [],
        description: "Refresh current view",
        action: () => window.dispatchEvent(new CustomEvent('keyboard-refresh')),
        category: "actions",
      },
      {
        key: "f",
        modifiers: ["meta"],
        description: "Focus search / filter",
        action: () => window.dispatchEvent(new CustomEvent('keyboard-focus-search')),
        category: "ui",
      },
      {
        key: "Enter",
        modifiers: ["meta"],
        description: "Submit current form",
        action: () => window.dispatchEvent(new CustomEvent('keyboard-submit-form')),
        category: "actions",
      },
      {
        key: "z",
        modifiers: ["meta"],
        description: "Undo last action",
        action: () => window.dispatchEvent(new CustomEvent('keyboard-undo')),
        category: "actions",
      },
      {
        key: "z",
        modifiers: ["meta", "shift"],
        description: "Redo last action",
        action: () => window.dispatchEvent(new CustomEvent('keyboard-redo')),
        category: "actions",
      },
      {
        key: "n",
        modifiers: ["meta"],
        description: "Create new item",
        action: () => window.dispatchEvent(new CustomEvent('keyboard-new-item')),
        category: "actions",
      },
      {
        key: "s",
        modifiers: ["meta"],
        description: "Save current changes",
        action: () => window.dispatchEvent(new CustomEvent('keyboard-save')),
        category: "actions",
      },
      {
        key: "/",
        modifiers: [],
        description: "Focus search",
        action: () => window.dispatchEvent(new CustomEvent('keyboard-focus-search')),
        category: "ui",
      },
    ];

    defaultShortcuts.forEach(registerShortcut);

    return () => {
      defaultShortcuts.forEach((s) => unregisterShortcut(s.key));
    };
  }, [
    registerShortcut,
    unregisterShortcut,
    toggleCommandPalette,
    closeCommandPalette,
    toggleHelp,
    onNavigate,
    onOpenSettings,
  ]);

  // Global keyboard listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Only allow Escape in inputs
        if (event.key !== "Escape") {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        const modifiersMatch =
          shortcut.modifiers.every((mod) => {
            if (mod === "meta") return event.metaKey || event.ctrlKey;
            if (mod === "ctrl") return event.ctrlKey;
            if (mod === "alt") return event.altKey;
            if (mod === "shift") return event.shiftKey;
            return false;
          }) &&
          // Make sure no extra modifiers are pressed
          (shortcut.modifiers.includes("meta") ||
            (!event.metaKey && !event.ctrlKey)) &&
          (shortcut.modifiers.includes("alt") || !event.altKey) &&
          (shortcut.modifiers.includes("shift") || !event.shiftKey);

        if (
          modifiersMatch &&
          event.key.toLowerCase() === shortcut.key.toLowerCase()
        ) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);

  const value = useMemo(() => ({
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
  }), [
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
  ]);

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

// Helper to format shortcut for display
// eslint-disable-next-line react-refresh/only-export-components
export function formatShortcut(shortcut: Shortcut): string {
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
  const modSymbols: Record<string, string> = {
    meta: isMac ? "⌘" : "Ctrl",
    ctrl: "Ctrl",
    alt: isMac ? "⌥" : "Alt",
    shift: "⇧",
  };

  const mods = shortcut.modifiers.map((m) => modSymbols[m]).join("");
  const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
  return mods ? `${mods}${key}` : key;
}
