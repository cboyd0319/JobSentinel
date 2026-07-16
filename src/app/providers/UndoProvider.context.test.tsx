import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useUndo } from "../../shared/undo/useUndo";
import { ToastProvider } from "./ToastProvider";
import { UndoProvider } from "./UndoProvider";

function OutsideProviderConsumer() {
  useUndo();
  return null;
}

describe("UndoProvider context", () => {
  it("renders children", () => {
    render(
      <ToastProvider>
        <UndoProvider>
          <div>Child content</div>
        </UndoProvider>
      </ToastProvider>,
    );

    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("throws when useUndo is used outside the provider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(
        <ToastProvider>
          <OutsideProviderConsumer />
        </ToastProvider>,
      );
    }).toThrow("useUndo must be used within an UndoProvider");

    consoleSpy.mockRestore();
  });
});
