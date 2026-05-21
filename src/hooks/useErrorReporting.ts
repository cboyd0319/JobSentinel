import { useContext } from "react";
import {
  ErrorReportingContext,
  type ErrorReportingContextType,
} from "../contexts/errorReportingContextDef";

export function useErrorReporting(): ErrorReportingContextType {
  const context = useContext(ErrorReportingContext);
  if (!context) {
    throw new Error("useErrorReporting must be used within ErrorReportingProvider");
  }
  return context;
}
