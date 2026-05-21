import { createContext } from "react";

export interface AnnouncerContextType {
  announce: (message: string, priority?: "polite" | "assertive") => void;
}

export const AnnouncerContext = createContext<AnnouncerContextType | undefined>(
  undefined,
);
