import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KeyboardShortcutsProvider } from "./KeyboardShortcutsProvider";

describe("KeyboardShortcutsProvider navigation callbacks", () => {
  it("calls onNavigate when navigation shortcut is triggered", async () => {
    const onNavigate = vi.fn();

    render(
      <KeyboardShortcutsProvider onNavigate={onNavigate}>
        <div />
      </KeyboardShortcutsProvider>,
    );

    await act(async () => {
      fireEvent.keyDown(window, { key: "1", metaKey: true });
    });

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith("dashboard");
    });
  });

  it("opens Search Links with the ninth navigation shortcut", async () => {
    const onNavigate = vi.fn();

    render(
      <KeyboardShortcutsProvider onNavigate={onNavigate}>
        <div />
      </KeyboardShortcutsProvider>,
    );

    await act(async () => {
      fireEvent.keyDown(window, { key: "9", metaKey: true });
    });

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith("search-links");
    });
  });

  it("calls onOpenSettings when settings shortcut is triggered", async () => {
    const onOpenSettings = vi.fn();

    render(
      <KeyboardShortcutsProvider onOpenSettings={onOpenSettings}>
        <div />
      </KeyboardShortcutsProvider>,
    );

    await act(async () => {
      fireEvent.keyDown(window, { key: ",", metaKey: true });
    });

    await waitFor(() => {
      expect(onOpenSettings).toHaveBeenCalled();
    });
  });
});
