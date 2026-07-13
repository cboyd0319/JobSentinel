import { createContext } from "react";
import type { ErrorReport } from "./errorReporter";

export interface ErrorReportingContextType {
  errors: ErrorReport[];
  errorCount: number;
  captureError: (error: Error, context?: Record<string, unknown>) => void;
  clearErrors: () => void;
  clearError: (id: string) => void;
  exportErrors: () => void;
}

export const ErrorReportingContext =
  createContext<ErrorReportingContextType | null>(null);
