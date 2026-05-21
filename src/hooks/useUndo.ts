import { useContext } from "react";
import { UndoContext, type UndoContextType } from "../contexts/undoContextDef";

export function useUndo(): UndoContextType {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error("useUndo must be used within an UndoProvider");
  }
  return context;
}
