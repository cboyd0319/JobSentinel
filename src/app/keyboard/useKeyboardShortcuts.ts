import { useContext } from "react";
import {
  KeyboardShortcutsContext,
  type KeyboardShortcutsContextType,
} from "./keyboardShortcutsContext";

export function useKeyboardShortcuts(): KeyboardShortcutsContextType {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error(
      "useKeyboardShortcuts must be used within a KeyboardShortcutsProvider",
    );
  }
  return context;
}
