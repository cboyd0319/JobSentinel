import { afterEach, describe, expect, it } from "vitest";
import type { Shortcut } from "./shortcut";
import { formatShortcut } from "./shortcut";

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
