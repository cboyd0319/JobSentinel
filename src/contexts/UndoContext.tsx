import { createContext, useContext, useCallback, useRef, useEffect, ReactNode } from "react";
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
  const undoStackRef = useRef<UndoableAction[]>([]);
  const redoStackRef = useRef<UndoableAction[]>([]);
  const toast = useToast();

  // Force re-render when stacks change
  const forceUpdate = useCallback(() => {
    // This is a simple way to force re-render
    undoStackRef.current = [...undoStackRef.current];
  }, []);

  const pushAction = useCallback((action: Omit<UndoableAction, "id" | "timestamp">) => {
    const newAction: UndoableAction = {
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    };

    undoStackRef.current = [newAction, ...undoStackRef.current].slice(0, MAX_UNDO_STACK);
    // Clear redo stack when new action is performed
    redoStackRef.current = [];
    forceUpdate();

    // Show toast with undo action
    toast.success(action.description, "Press Ctrl+Z or click to undo", {
      label: "Undo",
      onClick: async () => {
        try {
          await action.undo();
          // Move to redo stack
          const [undone, ...rest] = undoStackRef.current;
          if (undone) {
            redoStackRef.current = [undone, ...redoStackRef.current];
            undoStackRef.current = rest;
          }
          toast.info("Undone", action.description);
          forceUpdate();
        } catch {
          toast.error("Undo failed", "Could not undo the action");
        }
      },
    });
  }, [toast, forceUpdate]);

  const undo = useCallback(async () => {
    const [action, ...rest] = undoStackRef.current;
    if (!action) return;

    try {
      await action.undo();
      redoStackRef.current = [action, ...redoStackRef.current];
      undoStackRef.current = rest;
      toast.info("Undone", action.description);
      forceUpdate();
    } catch {
      toast.error("Undo failed", "Could not undo the action");
    }
  }, [toast, forceUpdate]);

  const redo = useCallback(async () => {
    const [action, ...rest] = redoStackRef.current;
    if (!action) return;

    try {
      await action.redo();
      undoStackRef.current = [action, ...undoStackRef.current];
      redoStackRef.current = rest;
      toast.info("Redone", action.description);
      forceUpdate();
    } catch {
      toast.error("Redo failed", "Could not redo the action");
    }
  }, [toast, forceUpdate]);

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

  const value: UndoContextType = {
    pushAction,
    undo,
    redo,
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
    lastAction: undoStackRef.current[0] || null,
  };

  return (
    <UndoContext.Provider value={value}>
      {children}
    </UndoContext.Provider>
  );
}

export function useUndo() {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error("useUndo must be used within an UndoProvider");
  }
  return context;
}
