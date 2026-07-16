import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useDashboardKeyboardNavigation } from "./useDashboardKeyboardNavigation";

interface TestItem {
  id: number;
  name: string;
}

const createTestItems = (count: number): TestItem[] =>
  Array.from({ length: count }, (_, i) => ({ id: i, name: `Item ${i}` }));

describe("useDashboardKeyboardNavigation boundaries", () => {
  let items: TestItem[];

  beforeEach(() => {
    items = createTestItems(5);
  });

  it("ignores keys when focus is on input", () => {
    const { result } = renderHook(() =>
      useDashboardKeyboardNavigation({ items }),
    );

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "j",
        bubbles: true,
      });
      Object.defineProperty(event, "target", { value: input, enumerable: true });
      document.dispatchEvent(event);
    });

    expect(result.current.selectedIndex).toBe(-1);

    document.body.removeChild(input);
  });

  it("ignores keys when focus is on textarea", () => {
    const { result } = renderHook(() =>
      useDashboardKeyboardNavigation({ items }),
    );

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();

    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "k",
        bubbles: true,
      });
      Object.defineProperty(event, "target", {
        value: textarea,
        enumerable: true,
      });
      document.dispatchEvent(event);
    });

    expect(result.current.selectedIndex).toBe(-1);

    document.body.removeChild(textarea);
  });

  it("ignores keys when focus is on contenteditable", () => {
    const { result } = renderHook(() =>
      useDashboardKeyboardNavigation({ items }),
    );

    const div = document.createElement("div");
    div.contentEditable = "true";
    document.body.appendChild(div);

    Object.defineProperty(div, "isContentEditable", {
      value: true,
      writable: false,
      configurable: true,
    });

    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "j",
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "target", {
        value: div,
        enumerable: true,
        writable: false,
      });
      document.dispatchEvent(event);
    });

    expect(result.current.selectedIndex).toBe(-1);

    document.body.removeChild(div);
  });

  it("deactivates keyboard mode on mouse click", () => {
    const { result } = renderHook(() =>
      useDashboardKeyboardNavigation({ items }),
    );

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "j" }));
    });

    expect(result.current.isKeyboardActive).toBe(true);

    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(result.current.isKeyboardActive).toBe(false);
  });

  it("handles an empty items array", () => {
    const { result } = renderHook(() =>
      useDashboardKeyboardNavigation({ items: [] }),
    );

    expect(result.current.selectedIndex).toBe(-1);

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "j" }));
    });

    expect(result.current.selectedIndex).toBe(-1);
  });

  it("bounds selection when items shrink", () => {
    const { result, rerender } = renderHook(
      ({ currentItems }) =>
        useDashboardKeyboardNavigation({ items: currentItems }),
      { initialProps: { currentItems: createTestItems(5) } },
    );

    act(() => {
      result.current.setSelectedIndex(4);
    });

    expect(result.current.selectedIndex).toBe(4);

    rerender({ currentItems: createTestItems(2) });

    expect(result.current.selectedIndex).toBe(1);
  });

  it("allows manual selection", () => {
    const { result } = renderHook(() =>
      useDashboardKeyboardNavigation({ items }),
    );

    act(() => {
      result.current.setSelectedIndex(3);
    });

    expect(result.current.selectedIndex).toBe(3);
  });

  it("bounds manual selection to array length", () => {
    const { result } = renderHook(() =>
      useDashboardKeyboardNavigation({ items }),
    );

    act(() => {
      result.current.setSelectedIndex(10);
    });

    expect(result.current.selectedIndex).toBe(4);
  });

  it("allows clearing selection with -1", () => {
    const { result } = renderHook(() =>
      useDashboardKeyboardNavigation({ items }),
    );

    act(() => {
      result.current.setSelectedIndex(2);
      result.current.setSelectedIndex(-1);
    });

    expect(result.current.selectedIndex).toBe(-1);
  });
});
