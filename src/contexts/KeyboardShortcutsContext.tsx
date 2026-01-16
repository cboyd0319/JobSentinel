import {
  createContext,
  useContext,
  useCallback,
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
}

const KeyboardShortcutsContext =
  createContext<KeyboardShortcutsContextType | null>(null);

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

  const openCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
  }, []);

  const toggleCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen((prev) => !prev);
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
        key: "Escape",
        modifiers: [],
        description: "Close dialog / command palette",
        action: closeCommandPalette,
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

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        shortcuts,
        registerShortcut,
        unregisterShortcut,
        isCommandPaletteOpen,
        openCommandPalette,
        closeCommandPalette,
        toggleCommandPalette,
      }}
    >
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

// Helper to format shortcut for display
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
