import { createContext, useContext, useCallback, useMemo, useState, useEffect, ReactNode } from "react";
import { useToast } from "./index";

type ActionType = "hide" | "bookmark" | "notes" | "status";

interface UndoableAction {
  id: string;
  type: ActionType;
  description: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  timestamp: number;
}

interface UndoContextType {
  pushAction: (action: Omit<UndoableAction, "id" | "timestamp">) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  lastAction: UndoableAction | null;
}

const UndoContext = createContext<UndoContextType | undefined>(undefined);

const MAX_UNDO_STACK = 50;

export function UndoProvider({ children }: { children: ReactNode }) {
  // Use state instead of refs to properly trigger re-renders
  const [undoStack, setUndoStack] = useState<UndoableAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoableAction[]>([]);
  const toast = useToast();

  const pushAction = useCallback((action: Omit<UndoableAction, "id" | "timestamp">) => {
    const newAction: UndoableAction = {
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    };

    setUndoStack(prev => [newAction, ...prev].slice(0, MAX_UNDO_STACK));
    // Clear redo stack when new action is performed
    setRedoStack([]);

    // Show toast with undo action
    toast.success(action.description, "Press Ctrl+Z or click to undo", {
      label: "Undo",
      onClick: async () => {
        try {
          await action.undo();
          // Move to redo stack
          setUndoStack(prev => {
            const [undone, ...rest] = prev;
            if (undone) {
              setRedoStack(redoPrev => [undone, ...redoPrev]);
            }
            return rest;
          });
          toast.info("Undone", action.description);
        } catch {
          toast.error("Undo failed", "Could not undo the action");
        }
      },
    });
  }, [toast]);

  const undo = useCallback(async () => {
    setUndoStack(prev => {
      const [action, ...rest] = prev;
      if (!action) return prev;

      // Perform undo asynchronously
      (async () => {
        try {
          await action.undo();
          setRedoStack(redoPrev => [action, ...redoPrev]);
          toast.info("Undone", action.description);
        } catch {
          toast.error("Undo failed", "Could not undo the action");
          // Restore the action to undo stack on failure
          setUndoStack(p => [action, ...p]);
        }
      })();

      return rest;
    });
  }, [toast]);

  const redo = useCallback(async () => {
    setRedoStack(prev => {
      const [action, ...rest] = prev;
      if (!action) return prev;

      // Perform redo asynchronously
      (async () => {
        try {
          await action.redo();
          setUndoStack(undoPrev => [action, ...undoPrev]);
          toast.info("Redone", action.description);
        } catch {
          toast.error("Redo failed", "Could not redo the action");
          // Restore the action to redo stack on failure
          setRedoStack(p => [action, ...p]);
        }
      })();

      return rest;
    });
  }, [toast]);

  // Global keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (modifier && e.key === "z" && e.shiftKey) || // Cmd+Shift+Z (Mac)
        (modifier && e.key === "y") // Ctrl+Y (Windows)
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const value = useMemo<UndoContextType>(() => ({
    pushAction,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    lastAction: undoStack[0] || null,
  }), [pushAction, undo, redo, undoStack, redoStack]);

  return (
    <UndoContext.Provider value={value}>
      {children}
    </UndoContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUndo() {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error("useUndo must be used within an UndoProvider");
  }
  return context;
}
