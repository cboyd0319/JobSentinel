import { useCallback, useEffect, useState } from "react";

interface UseKeyboardNavigationOptions<T> {
  items: T[];
  enabled?: boolean;
  onSelect?: (item: T, index: number) => void;
  onOpen?: (item: T, index: number) => void;
  onHide?: (item: T, index: number) => void;
  wrapAround?: boolean;
}

interface UseKeyboardNavigationResult {
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  isKeyboardActive: boolean;
}

/**
 * Hook for vim-style keyboard navigation in lists
 * - j/ArrowDown: move down
 * - k/ArrowUp: move up
 * - o/Enter: open/select item
 * - h/Delete: hide item
 * - Escape: clear selection
 * - Home: go to first item
 * - End: go to last item
 */
export function useKeyboardNavigation<T>({
  items,
  enabled = true,
  onSelect,
  onOpen,
  onHide,
  wrapAround = true,
}: UseKeyboardNavigationOptions<T>): UseKeyboardNavigationResult {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || items.length === 0) return;

      // Ignore if focus is on an input element
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      let handled = false;

      switch (event.key) {
        case "j":
        case "ArrowDown": {
          event.preventDefault();
          handled = true;
          setIsKeyboardActive(true);
          setSelectedIndex((prev) => {
            if (prev === -1) return 0;
            if (prev >= items.length - 1) {
              return wrapAround ? 0 : prev;
            }
            return prev + 1;
          });
          break;
        }

        case "k":
        case "ArrowUp": {
          event.preventDefault();
          handled = true;
          setIsKeyboardActive(true);
          setSelectedIndex((prev) => {
            if (prev === -1) return items.length - 1;
            if (prev <= 0) {
              return wrapAround ? items.length - 1 : prev;
            }
            return prev - 1;
          });
          break;
        }

        case "o":
        case "Enter": {
          if (selectedIndex >= 0 && selectedIndex < items.length) {
            event.preventDefault();
            handled = true;
            const item = items[selectedIndex];
            if (onOpen) {
              onOpen(item, selectedIndex);
            } else if (onSelect) {
              onSelect(item, selectedIndex);
            }
          }
          break;
        }

        case "h":
        case "Delete":
        case "Backspace": {
          if (selectedIndex >= 0 && selectedIndex < items.length && onHide) {
            event.preventDefault();
            handled = true;
            const item = items[selectedIndex];
            onHide(item, selectedIndex);
            // Move selection after hide
            if (selectedIndex >= items.length - 1) {
              setSelectedIndex(Math.max(0, items.length - 2));
            }
          }
          break;
        }

        case "Escape": {
          if (selectedIndex !== -1 || isKeyboardActive) {
            event.preventDefault();
            handled = true;
            setSelectedIndex(-1);
            setIsKeyboardActive(false);
          }
          break;
        }

        case "Home": {
          if (items.length > 0) {
            event.preventDefault();
            handled = true;
            setIsKeyboardActive(true);
            setSelectedIndex(0);
          }
          break;
        }

        case "End": {
          if (items.length > 0) {
            event.preventDefault();
            handled = true;
            setIsKeyboardActive(true);
            setSelectedIndex(items.length - 1);
          }
          break;
        }
      }

      // Only stop propagation for keys we actually handle
      if (handled) {
        event.stopPropagation();
      }
    },
    [enabled, items, selectedIndex, onSelect, onOpen, onHide, wrapAround, isKeyboardActive]
  );

  // Mouse click deactivates keyboard mode
  const handleMouseDown = useCallback(() => {
    if (isKeyboardActive) {
      setIsKeyboardActive(false);
    }
  }, [isKeyboardActive]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [enabled, handleKeyDown, handleMouseDown]);

  // Reset selection when items change significantly
  useEffect(() => {
    if (selectedIndex >= items.length) {
      setSelectedIndex(items.length > 0 ? items.length - 1 : -1);
    }
  }, [items.length, selectedIndex]);

  return {
    selectedIndex,
    setSelectedIndex,
    isKeyboardActive,
  };
}
