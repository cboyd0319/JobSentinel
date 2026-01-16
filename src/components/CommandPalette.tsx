import { useState, useEffect, useRef, useCallback } from "react";
import {
  useKeyboardShortcuts,
  formatShortcut,
  type Shortcut,
} from "../contexts/KeyboardShortcutsContext";

interface Command {
  id: string;
  name: string;
  shortcut?: Shortcut;
  action: () => void;
  category: string;
  icon?: string;
}

interface CommandPaletteProps {
  commands?: Command[];
}

export function CommandPalette({ commands = [] }: CommandPaletteProps) {
  const { shortcuts, isCommandPaletteOpen, closeCommandPalette } =
    useKeyboardShortcuts();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Combine shortcuts with additional commands
  const allCommands: Command[] = [
    ...shortcuts.map((s) => ({
      id: s.key,
      name: s.description,
      shortcut: s,
      action: s.action,
      category: s.category,
    })),
    ...commands,
  ];

  // Filter commands based on query
  const filteredCommands = allCommands.filter((cmd) =>
    cmd.name.toLowerCase().includes(query.toLowerCase())
  );

  // Group by category
  const groupedCommands = filteredCommands.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) {
        acc[cmd.category] = [];
      }
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<string, Command[]>
  );

  const categoryOrder = ["navigation", "actions", "ui"];
  const sortedCategories = Object.keys(groupedCommands).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  // Flatten for keyboard navigation
  const flatCommands = sortedCategories.flatMap((cat) => groupedCommands[cat]);

  const executeCommand = useCallback(
    (command: Command) => {
      closeCommandPalette();
      setQuery("");
      setSelectedIndex(0);
      command.action();
    },
    [closeCommandPalette]
  );

  // Focus input when opened
  useEffect(() => {
    if (isCommandPaletteOpen) {
      inputRef.current?.focus();
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isCommandPaletteOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isCommandPaletteOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < flatCommands.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (flatCommands[selectedIndex]) {
          executeCommand(flatCommands[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommandPaletteOpen, flatCommands, selectedIndex, executeCommand]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      selectedEl?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isCommandPaletteOpen) return null;

  const categoryLabels: Record<string, string> = {
    navigation: "Navigation",
    actions: "Actions",
    ui: "Interface",
  };

  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={closeCommandPalette}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg bg-white dark:bg-surface-800 rounded-xl shadow-2xl border border-surface-200 dark:border-surface-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search input */}
        <div className="flex items-center border-b border-surface-200 dark:border-surface-700 px-4">
          <svg
            className="w-5 h-5 text-surface-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="w-full px-3 py-4 bg-transparent text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex px-2 py-1 text-xs font-medium text-surface-500 bg-surface-100 dark:bg-surface-700 rounded">
            esc
          </kbd>
        </div>

        {/* Command list */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto py-2"
          role="listbox"
        >
          {flatCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-surface-500">
              No commands found
            </div>
          ) : (
            sortedCategories.map((category) => (
              <div key={category}>
                <div className="px-4 py-2 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  {categoryLabels[category] || category}
                </div>
                {groupedCommands[category].map((command) => {
                  const currentIndex = flatIndex++;
                  const isSelected = currentIndex === selectedIndex;
                  return (
                    <button
                      key={command.id}
                      data-index={currentIndex}
                      role="option"
                      aria-selected={isSelected}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                        isSelected
                          ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                          : "text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700/50"
                      }`}
                      onClick={() => executeCommand(command)}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                    >
                      <span className="flex items-center gap-3">
                        {command.icon && (
                          <span className="text-lg">{command.icon}</span>
                        )}
                        <span>{command.name}</span>
                      </span>
                      {command.shortcut && (
                        <kbd
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            isSelected
                              ? "bg-primary-100 dark:bg-primary-800/50 text-primary-700 dark:text-primary-300"
                              : "bg-surface-100 dark:bg-surface-700 text-surface-500"
                          }`}
                        >
                          {formatShortcut(command.shortcut)}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-surface-200 dark:border-surface-700 text-xs text-surface-500">
          <span>
            <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 rounded mr-1">
              ↑↓
            </kbd>
            to navigate
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-700 rounded mr-1">
              ↵
            </kbd>
            to select
          </span>
        </div>
      </div>
    </div>
  );
}
