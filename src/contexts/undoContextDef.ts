import { createContext } from "react";

export type ActionType = "hide" | "bookmark" | "notes" | "status";

export interface UndoableAction {
  id: string;
  type: ActionType;
  description: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  timestamp: number;
}

export interface UndoContextType {
  pushAction: (action: Omit<UndoableAction, "id" | "timestamp">) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  lastAction: UndoableAction | null;
}

export const UndoContext = createContext<UndoContextType | undefined>(undefined);
