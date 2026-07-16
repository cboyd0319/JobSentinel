import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDashboardKeyboardNavigation } from "./useDashboardKeyboardNavigation";

interface TestItem {
  id: number;
  name: string;
}

const createTestItems = (count: number): TestItem[] =>
  Array.from({ length: count }, (_, i) => ({ id: i, name: `Item ${i}` }));

describe("useDashboardKeyboardNavigation", () => {
  let items: TestItem[];

  beforeEach(() => {
    items = createTestItems(5);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("initializes with no selection", () => {
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items })
      );

      expect(result.current.selectedIndex).toBe(-1);
      expect(result.current.isKeyboardActive).toBe(false);
    });

    it("initializes when disabled", () => {
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items, enabled: false })
      );

      expect(result.current.selectedIndex).toBe(-1);
    });
  });

  describe("navigation - j/ArrowDown", () => {
    it("selects first item on initial down", () => {
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items })
      );

      act(() => {
        const event = new KeyboardEvent("keydown", { key: "j" });
        document.dispatchEvent(event);
      });

      expect(result.current.selectedIndex).toBe(0);
      expect(result.current.isKeyboardActive).toBe(true);
    });

    it("moves down with j key", () => {
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items })
      );

      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "j" }));
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "j" }));
      });

      expect(result.current.selectedIndex).toBe(1);
    });

    it("moves down with ArrowDown key", () => {
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items })
      );

      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
      });

      expect(result.current.selectedIndex).toBe(1);
    });

    it("wraps to first item when at end (default behavior)", () => {
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items })
      );

      // Move to last item
      act(() => {
        result.current.setSelectedIndex(4);
      });

      // Move down once more
      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "j" }));
      });

      expect(result.current.selectedIndex).toBe(0);
    });

    it("does not wrap when wrapAround is false", () => {
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items, wrapAround: false })
      );

      // Move to last item
      act(() => {
        result.current.setSelectedIndex(4);
      });

      // Try to move down
      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "j" }));
      });

      expect(result.current.selectedIndex).toBe(4);
    });
  });

  describe("navigation - k/ArrowUp", () => {
    it("selects last item on initial up", () => {
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items })
      );

      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));
      });

      expect(result.current.selectedIndex).toBe(4);
      expect(result.current.isKeyboardActive).toBe(true);
    });

    it("moves up with k key", () => {
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items })
      );

      act(() => {
        result.current.setSelectedIndex(2);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));
      });

      expect(result.current.selectedIndex).toBe(1);
    });

    it("moves up with ArrowUp key", () => {
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items })
      );

      act(() => {
        result.current.setSelectedIndex(2);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      });

      expect(result.current.selectedIndex).toBe(1);
    });

    it("wraps to last item when at start (default behavior)", () => {
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items })
      );

      act(() => {
        result.current.setSelectedIndex(0);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));
      });

      expect(result.current.selectedIndex).toBe(4);
    });

    it("does not wrap when wrapAround is false", () => {
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items, wrapAround: false })
      );

      act(() => {
        result.current.setSelectedIndex(0);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));
      });

      expect(result.current.selectedIndex).toBe(0);
    });
  });

  describe("navigation - Home/End", () => {
    it("jumps to first item with Home", () => {
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items })
      );

      act(() => {
        result.current.setSelectedIndex(3);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Home" }));
      });

      expect(result.current.selectedIndex).toBe(0);
      expect(result.current.isKeyboardActive).toBe(true);
    });

    it("jumps to last item with End", () => {
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items })
      );

      act(() => {
        result.current.setSelectedIndex(1);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "End" }));
      });

      expect(result.current.selectedIndex).toBe(4);
      expect(result.current.isKeyboardActive).toBe(true);
    });
  });

  describe("navigation - Escape", () => {
    it("clears selection with Escape", () => {
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items })
      );

      act(() => {
        result.current.setSelectedIndex(2);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });

      expect(result.current.selectedIndex).toBe(-1);
      expect(result.current.isKeyboardActive).toBe(false);
    });
  });

  describe("action - open/select (o/Enter)", () => {
    it("calls onOpen when o is pressed", () => {
      const onOpen = vi.fn();
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items, onOpen })
      );

      act(() => {
        result.current.setSelectedIndex(2);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "o" }));
      });

      expect(onOpen).toHaveBeenCalledWith(items[2], 2);
    });

    it("calls onOpen when Enter is pressed", () => {
      const onOpen = vi.fn();
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items, onOpen })
      );

      act(() => {
        result.current.setSelectedIndex(1);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      });

      expect(onOpen).toHaveBeenCalledWith(items[1], 1);
    });

    it("calls onSelect if onOpen not provided", () => {
      const onSelect = vi.fn();
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items, onSelect })
      );

      act(() => {
        result.current.setSelectedIndex(0);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "o" }));
      });

      expect(onSelect).toHaveBeenCalledWith(items[0], 0);
    });

    it("does not call handlers when no item selected", () => {
      const onOpen = vi.fn();
      renderHook(() =>
        useDashboardKeyboardNavigation({ items, onOpen })
      );

      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "o" }));
      });

      expect(onOpen).not.toHaveBeenCalled();
    });
  });

  describe("action - hide (h/Delete)", () => {
    it("calls onHide when h is pressed", () => {
      const onHide = vi.fn();
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items, onHide })
      );

      act(() => {
        result.current.setSelectedIndex(2);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "h" }));
      });

      expect(onHide).toHaveBeenCalledWith(items[2], 2);
    });

    it("calls onHide when Delete is pressed", () => {
      const onHide = vi.fn();
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items, onHide })
      );

      act(() => {
        result.current.setSelectedIndex(1);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete" }));
      });

      expect(onHide).toHaveBeenCalledWith(items[1], 1);
    });

    it("does not call onHide when not provided", () => {
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items })
      );

      act(() => {
        result.current.setSelectedIndex(2);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "h" }));
      });

      // Should not throw
      expect(result.current.selectedIndex).toBe(2);
    });
  });

  describe("action - bookmark (b)", () => {
    it("calls onBookmark when b is pressed", () => {
      const onBookmark = vi.fn();
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items, onBookmark })
      );

      act(() => {
        result.current.setSelectedIndex(1);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "b" }));
      });

      expect(onBookmark).toHaveBeenCalledWith(items[1], 1);
    });
  });

  describe("action - notes (n)", () => {
    it("calls onNotes when n is pressed", () => {
      const onNotes = vi.fn();
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items, onNotes })
      );

      act(() => {
        result.current.setSelectedIndex(3);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "n" }));
      });

      expect(onNotes).toHaveBeenCalledWith(items[3], 3);
    });
  });

  describe("action - research (c)", () => {
    it("calls onResearch when c is pressed", () => {
      const onResearch = vi.fn();
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items, onResearch })
      );

      act(() => {
        result.current.setSelectedIndex(0);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "c" }));
      });

      expect(onResearch).toHaveBeenCalledWith(items[0], 0);
    });
  });

  describe("action - toggle select (x)", () => {
    it("calls onToggleSelect when x is pressed", () => {
      const onToggleSelect = vi.fn();
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items, onToggleSelect })
      );

      act(() => {
        result.current.setSelectedIndex(2);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "x" }));
      });

      expect(onToggleSelect).toHaveBeenCalledWith(items[2], 2);
    });
  });

  describe("global actions", () => {
    it("calls onFocusSearch when / is pressed", () => {
      const onFocusSearch = vi.fn();
      renderHook(() =>
        useDashboardKeyboardNavigation({ items, onFocusSearch })
      );

      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "/" }));
      });

      expect(onFocusSearch).toHaveBeenCalled();
    });

    it("calls onFocusSearch when Slash code is pressed", () => {
      const onFocusSearch = vi.fn();
      renderHook(() =>
        useDashboardKeyboardNavigation({ items, onFocusSearch })
      );

      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { code: "Slash", key: "Unidentified" }));
      });

      expect(onFocusSearch).toHaveBeenCalled();
    });

    it("does not handle shifted Slash", () => {
      const onFocusSearch = vi.fn();
      renderHook(() =>
        useDashboardKeyboardNavigation({ items, onFocusSearch })
      );

      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { code: "Slash", key: "?", shiftKey: true }));
      });

      expect(onFocusSearch).not.toHaveBeenCalled();
    });

    it("calls onRefresh when r is pressed", () => {
      const onRefresh = vi.fn();
      renderHook(() =>
        useDashboardKeyboardNavigation({ items, onRefresh })
      );

      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "r" }));
      });

      expect(onRefresh).toHaveBeenCalled();
    });
  });

  describe("enabled/disabled", () => {
    it("does not handle keys when disabled", () => {
      const onOpen = vi.fn();
      renderHook(() =>
        useDashboardKeyboardNavigation({ items, onOpen, enabled: false })
      );

      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "j" }));
      });

      expect(onOpen).not.toHaveBeenCalled();
    });

    it("handles keys when enabled", () => {
      const { result } = renderHook(() =>
        useDashboardKeyboardNavigation({ items, enabled: true })
      );

      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "j" }));
      });

      expect(result.current.selectedIndex).toBe(0);
    });
  });

});
