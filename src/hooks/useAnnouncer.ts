import { useContext } from "react";
import {
  AnnouncerContext,
  type AnnouncerContextType,
} from "../contexts/announcerContextDef";

export function useAnnouncer(): AnnouncerContextType {
  const context = useContext(AnnouncerContext);
  if (!context) {
    throw new Error("useAnnouncer must be used within an AnnouncerProvider");
  }
  return context;
}
