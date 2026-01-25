import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useModal } from "./useModal";

describe("useModal", () => {
  it("should initialize with closed state", () => {
    const { result } = renderHook(() => useModal());
    expect(result.current.isOpen).toBe(false);
  });

  it("should open modal", () => {
    const { result } = renderHook(() => useModal());

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("should close modal", () => {
    const { result } = renderHook(() => useModal());

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("should toggle modal", () => {
    const { result } = renderHook(() => useModal());

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("should call onOpen callback", () => {
    const onOpen = vi.fn();
    const { result } = renderHook(() => useModal({ onOpen }));

    act(() => {
      result.current.open();
    });

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("should call onClose callback", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useModal({ onClose }));

    act(() => {
      result.current.open();
      result.current.close();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should close on backdrop click when enabled", () => {
    const { result } = renderHook(() => useModal({ closeOnBackdropClick: true }));

    act(() => {
      result.current.open();
    });

    const mockEvent = {
      target: document.createElement("div"),
      currentTarget: document.createElement("div"),
    } as unknown as React.MouseEvent;

    mockEvent.currentTarget = mockEvent.target;

    act(() => {
      result.current.backdropClickHandler(mockEvent);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("should not close on backdrop click when disabled", () => {
    const { result } = renderHook(() => useModal({ closeOnBackdropClick: false }));

    act(() => {
      result.current.open();
    });

    const mockEvent = {
      target: document.createElement("div"),
      currentTarget: document.createElement("div"),
    } as unknown as React.MouseEvent;

    mockEvent.currentTarget = mockEvent.target;

    act(() => {
      result.current.backdropClickHandler(mockEvent);
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("should close on Escape key when enabled", () => {
    const { result } = renderHook(() => useModal({ closeOnEscape: true }));

    act(() => {
      result.current.open();
    });

    const mockEvent = {
      key: "Escape",
    } as React.KeyboardEvent;

    act(() => {
      result.current.keyDownHandler(mockEvent);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("should not close on Escape key when disabled", () => {
    const { result } = renderHook(() => useModal({ closeOnEscape: false }));

    act(() => {
      result.current.open();
    });

    const mockEvent = {
      key: "Escape",
    } as React.KeyboardEvent;

    act(() => {
      result.current.keyDownHandler(mockEvent);
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("should not close on other keys", () => {
    const { result } = renderHook(() => useModal({ closeOnEscape: true }));

    act(() => {
      result.current.open();
    });

    const mockEvent = {
      key: "Enter",
    } as React.KeyboardEvent;

    act(() => {
      result.current.keyDownHandler(mockEvent);
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("should call onClose on unmount if modal is open", () => {
    const onClose = vi.fn();
    const { result, unmount } = renderHook(() => useModal({ onClose }));

    act(() => {
      result.current.open();
    });

    unmount();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
