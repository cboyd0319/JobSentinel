import { useCallback, useEffect, useState, useRef } from "react";

interface UseKeyboardNavigationOptions<T> {
  items: T[];
  enabled?: boolean;
  onSelect?: (item: T, index: number) => void;
  onOpen?: (item: T, index: number) => void;
  onHide?: (item: T, index: number) => void;
  onBookmark?: (item: T, index: number) => void;
  onNotes?: (item: T, index: number) => void;
  onResearch?: (item: T, index: number) => void;
  onToggleSelect?: (item: T, index: number) => void;
  onFocusSearch?: () => void;
  onRefresh?: () => void;
  wrapAround?: boolean;
}

interface UseKeyboardNavigationResult {
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  isKeyboardActive: boolean;
}

/**
 * Hook for vim-style keyboard navigation in lists
 *
 * Navigation:
 * - j/ArrowDown: move down
 * - k/ArrowUp: move up
 * - Home: go to first item
 * - End: go to last item
 * - Escape: clear selection
 *
 * Actions:
 * - o/Enter: open/select item
 * - h/Delete: hide item
 * - b: toggle bookmark
 * - n: open notes
 * - c: research company
 * - x: toggle selection (for bulk operations)
 *
 * Global:
 * - /: focus search input
 * - r: refresh/reload jobs
 */
export function useKeyboardNavigation<T>({
  items,
  enabled = true,
  onSelect,
  onOpen,
  onHide,
  onBookmark,
  onNotes,
  onResearch,
  onToggleSelect,
  onFocusSearch,
  onRefresh,
  wrapAround = true,
}: UseKeyboardNavigationOptions<T>): UseKeyboardNavigationResult {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);

  // Store items and callbacks in refs to avoid dependency array issues
  const itemsRef = useRef(items);
  const callbacksRef = useRef({ onSelect, onOpen, onHide, onBookmark, onNotes, onResearch, onToggleSelect, onFocusSearch, onRefresh });

  // Update refs when values change
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    callbacksRef.current = { onSelect, onOpen, onHide, onBookmark, onNotes, onResearch, onToggleSelect, onFocusSearch, onRefresh };
  }, [onSelect, onOpen, onHide, onBookmark, onNotes, onResearch, onToggleSelect, onFocusSearch, onRefresh]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const currentItems = itemsRef.current;
      const {
        onSelect: selectCb,
        onOpen: openCb,
        onHide: hideCb,
        onBookmark: bookmarkCb,
        onNotes: notesCb,
        onResearch: researchCb,
        onToggleSelect: toggleSelectCb,
        onFocusSearch: focusSearchCb,
        onRefresh: refreshCb,
      } = callbacksRef.current;

      if (!enabled || currentItems.length === 0) return;

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
            if (prev >= currentItems.length - 1) {
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
            if (prev === -1) return currentItems.length - 1;
            if (prev <= 0) {
              return wrapAround ? currentItems.length - 1 : prev;
            }
            return prev - 1;
          });
          break;
        }

        case "o":
        case "Enter": {
          setSelectedIndex((currentIndex) => {
            if (currentIndex >= 0 && currentIndex < currentItems.length) {
              event.preventDefault();
              handled = true;
              const item = currentItems[currentIndex];
              if (item) {
                if (openCb) {
                  openCb(item, currentIndex);
                } else if (selectCb) {
                  selectCb(item, currentIndex);
                }
              }
            }
            return currentIndex;
          });
          break;
        }

        case "h":
        case "Delete":
        case "Backspace": {
          setSelectedIndex((currentIndex) => {
            if (currentIndex >= 0 && currentIndex < currentItems.length && hideCb) {
              event.preventDefault();
              handled = true;
              const item = currentItems[currentIndex];
              if (item) {
                hideCb(item, currentIndex);
              }
              // Move selection after hide
              if (currentIndex >= currentItems.length - 1) {
                return Math.max(0, currentItems.length - 2);
              }
            }
            return currentIndex;
          });
          break;
        }

        case "Escape": {
          setSelectedIndex((currentIndex) => {
            setIsKeyboardActive((active) => {
              if (currentIndex !== -1 || active) {
                event.preventDefault();
                handled = true;
              }
              return false;
            });
            return -1;
          });
          break;
        }

        case "Home": {
          if (currentItems.length > 0) {
            event.preventDefault();
            handled = true;
            setIsKeyboardActive(true);
            setSelectedIndex(0);
          }
          break;
        }

        case "End": {
          if (currentItems.length > 0) {
            event.preventDefault();
            handled = true;
            setIsKeyboardActive(true);
            setSelectedIndex(currentItems.length - 1);
          }
          break;
        }

        // Action shortcuts
        case "b": {
          // Toggle bookmark
          setSelectedIndex((currentIndex) => {
            if (currentIndex >= 0 && currentIndex < currentItems.length && bookmarkCb) {
              event.preventDefault();
              handled = true;
              const item = currentItems[currentIndex];
              if (item) {
                bookmarkCb(item, currentIndex);
              }
            }
            return currentIndex;
          });
          break;
        }

        case "n": {
          // Open notes
          setSelectedIndex((currentIndex) => {
            if (currentIndex >= 0 && currentIndex < currentItems.length && notesCb) {
              event.preventDefault();
              handled = true;
              const item = currentItems[currentIndex];
              if (item) {
                notesCb(item, currentIndex);
              }
            }
            return currentIndex;
          });
          break;
        }

        case "c": {
          // Research company
          setSelectedIndex((currentIndex) => {
            if (currentIndex >= 0 && currentIndex < currentItems.length && researchCb) {
              event.preventDefault();
              handled = true;
              const item = currentItems[currentIndex];
              if (item) {
                researchCb(item, currentIndex);
              }
            }
            return currentIndex;
          });
          break;
        }

        case "x": {
          // Toggle selection for bulk operations
          setSelectedIndex((currentIndex) => {
            if (currentIndex >= 0 && currentIndex < currentItems.length && toggleSelectCb) {
              event.preventDefault();
              handled = true;
              const item = currentItems[currentIndex];
              if (item) {
                toggleSelectCb(item, currentIndex);
              }
            }
            return currentIndex;
          });
          break;
        }

        case "/": {
          // Focus search input
          if (focusSearchCb) {
            event.preventDefault();
            handled = true;
            focusSearchCb();
          }
          break;
        }

        case "r": {
          // Refresh jobs
          if (refreshCb) {
            event.preventDefault();
            handled = true;
            refreshCb();
          }
          break;
        }
      }

      // Only stop propagation for keys we actually handle
      if (handled) {
        event.stopPropagation();
      }
    },
    [enabled, wrapAround]
  );

  // Mouse click deactivates keyboard mode
  const handleMouseDown = useCallback(() => {
    setIsKeyboardActive(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [enabled, handleKeyDown, handleMouseDown]);

  // Compute bounded selection index - avoids setState in effect
  const boundedSelectedIndex = items.length === 0
    ? -1
    : selectedIndex >= items.length
      ? items.length - 1
      : selectedIndex;

  return {
    selectedIndex: boundedSelectedIndex,
    setSelectedIndex,
    isKeyboardActive,
  };
}
