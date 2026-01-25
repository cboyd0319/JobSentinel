import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { UndoProvider, useUndo } from "./UndoContext";
import { ToastProvider } from "./ToastContext";

// Test component that uses the undo context
function TestComponent({
  onUndo = vi.fn(),
  onRedo = vi.fn(),
}: {
  onUndo?: () => Promise<void>;
  onRedo?: () => Promise<void>;
}) {
  const { pushAction, undo, redo, canUndo, canRedo, lastAction } = useUndo();

  return (
    <div>
      <span data-testid="can-undo">{String(canUndo)}</span>
      <span data-testid="can-redo">{String(canRedo)}</span>
      <span data-testid="last-action">{lastAction?.description || "none"}</span>
      <button
        data-testid="push-action"
        onClick={() =>
          pushAction({
            type: "hide",
            description: "Hid job",
            undo: onUndo,
            redo: onRedo,
          })
        }
      >
        Push Action
      </button>
      <button
        data-testid="push-bookmark"
        onClick={() =>
          pushAction({
            type: "bookmark",
            description: "Bookmarked job",
            undo: onUndo,
            redo: onRedo,
          })
        }
      >
        Push Bookmark
      </button>
      <button data-testid="undo-btn" onClick={() => undo()}>Undo Action</button>
      <button data-testid="redo-btn" onClick={() => redo()}>Redo Action</button>
    </div>
  );
}

// Wrapper component for tests
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <UndoProvider>{children}</UndoProvider>
    </ToastProvider>
  );
}

describe("UndoContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("UndoProvider", () => {
    it("renders children", () => {
      render(
        <TestWrapper>
          <div>Child content</div>
        </TestWrapper>
      );

      expect(screen.getByText("Child content")).toBeInTheDocument();
    });
  });

  describe("useUndo", () => {
    it("throws error when used outside provider", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        render(
          <ToastProvider>
            <TestComponent />
          </ToastProvider>
        );
      }).toThrow("useUndo must be used within an UndoProvider");

      consoleSpy.mockRestore();
    });
  });

  describe("initial state", () => {
    it("starts with canUndo false", () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId("can-undo")).toHaveTextContent("false");
    });

    it("starts with canRedo false", () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId("can-redo")).toHaveTextContent("false");
    });

    it("starts with no last action", () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId("last-action")).toHaveTextContent("none");
    });
  });

  describe("pushAction", () => {
    it("enables canUndo after pushing action", async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId("push-action"));

      await waitFor(() => {
        expect(screen.getByTestId("can-undo")).toHaveTextContent("true");
      });
    });

    it("updates lastAction with pushed action", async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId("push-action"));

      await waitFor(() => {
        expect(screen.getByTestId("last-action")).toHaveTextContent("Hid job");
      });
    });

    it("shows toast notification on push", async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId("push-action"));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
      // "Hid job" appears in both toast and last-action span
      const hidJobElements = screen.getAllByText("Hid job");
      expect(hidJobElements.length).toBeGreaterThanOrEqual(1);
    });

    it("clears redo stack when new action is pushed", async () => {
      const onUndo = vi.fn().mockResolvedValue(undefined);
      const onRedo = vi.fn().mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <TestComponent onUndo={onUndo} onRedo={onRedo} />
        </TestWrapper>
      );

      // Push an action
      fireEvent.click(screen.getByTestId("push-action"));

      await waitFor(() => {
        expect(screen.getByTestId("can-undo")).toHaveTextContent("true");
      });

      // Undo it (should enable redo)
      await act(async () => {
        fireEvent.click(screen.getByTestId("undo-btn"));
      });

      // Wait for undo to complete
      await waitFor(() => {
        expect(onUndo).toHaveBeenCalled();
      });

      // Push new action should clear redo
      fireEvent.click(screen.getByTestId("push-bookmark"));

      await waitFor(() => {
        expect(screen.getByTestId("can-redo")).toHaveTextContent("false");
      });
    });
  });

  describe("undo", () => {
    it("calls undo callback when undo is triggered", async () => {
      const onUndo = vi.fn().mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <TestComponent onUndo={onUndo} />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId("push-action"));

      await waitFor(() => {
        expect(screen.getByTestId("can-undo")).toHaveTextContent("true");
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId("undo-btn"));
      });

      await waitFor(() => {
        expect(onUndo).toHaveBeenCalled();
      });
    });

    it("does nothing when undo stack is empty", async () => {
      const onUndo = vi.fn().mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <TestComponent onUndo={onUndo} />
        </TestWrapper>
      );

      // Undo without pushing anything
      await act(async () => {
        fireEvent.click(screen.getByTestId("undo-btn"));
      });

      expect(onUndo).not.toHaveBeenCalled();
    });
  });

  describe("redo", () => {
    it("calls redo callback when redo is triggered after undo", async () => {
      const onUndo = vi.fn().mockResolvedValue(undefined);
      const onRedo = vi.fn().mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <TestComponent onUndo={onUndo} onRedo={onRedo} />
        </TestWrapper>
      );

      // Push action
      fireEvent.click(screen.getByTestId("push-action"));

      await waitFor(() => {
        expect(screen.getByTestId("can-undo")).toHaveTextContent("true");
      });

      // Undo
      await act(async () => {
        fireEvent.click(screen.getByTestId("undo-btn"));
      });

      await waitFor(() => {
        expect(onUndo).toHaveBeenCalled();
      });

      // Redo
      await act(async () => {
        fireEvent.click(screen.getByTestId("redo-btn"));
      });

      await waitFor(() => {
        expect(onRedo).toHaveBeenCalled();
      });
    });

    it("does nothing when redo stack is empty", async () => {
      const onRedo = vi.fn().mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <TestComponent onRedo={onRedo} />
        </TestWrapper>
      );

      // Redo without undoing anything
      await act(async () => {
        fireEvent.click(screen.getByTestId("redo-btn"));
      });

      expect(onRedo).not.toHaveBeenCalled();
    });
  });
});
