import { createContext } from "react";
import type { Shortcut } from "./shortcut";

export interface KeyboardShortcutsContextType {
  shortcuts: Shortcut[];
  registerShortcut: (shortcut: Shortcut) => void;
  unregisterShortcut: (key: string, modifiers?: Shortcut["modifiers"]) => void;
  isCommandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  isHelpOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
  toggleHelp: () => void;
}

export const KeyboardShortcutsContext =
  createContext<KeyboardShortcutsContextType | null>(null);
