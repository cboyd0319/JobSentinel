import type { Shortcut } from "../types/keyboardShortcuts";

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
