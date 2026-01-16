import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { errorReporter, ErrorReport } from '../utils/errorReporting';

interface ErrorReportingContextType {
  errors: ErrorReport[];
  errorCount: number;
  captureError: (error: Error, context?: Record<string, unknown>) => void;
  clearErrors: () => void;
  clearError: (id: string) => void;
  exportErrors: () => void;
}

const ErrorReportingContext = createContext<ErrorReportingContextType | null>(null);

export function ErrorReportingProvider({ children }: { children: ReactNode }) {
  // Use lazy initialization to avoid setState in effect
  const [errors, setErrors] = useState<ErrorReport[]>(() => {
    errorReporter.init();
    return errorReporter.getErrors();
  });

  useEffect(() => {
    // Subscribe to updates from error reporter
    const unsubscribe = errorReporter.subscribe(setErrors);
    return unsubscribe;
  }, []);

  const captureError = (error: Error, context?: Record<string, unknown>) => {
    errorReporter.captureCustom(error.message, context);
  };

  const clearErrors = () => {
    errorReporter.clear();
  };

  const clearError = (id: string) => {
    errorReporter.clearError(id);
  };

  const exportErrors = () => {
    errorReporter.downloadExport();
  };

  return (
    <ErrorReportingContext.Provider
      value={{
        errors,
        errorCount: errors.length,
        captureError,
        clearErrors,
        clearError,
        exportErrors,
      }}
    >
      {children}
    </ErrorReportingContext.Provider>
  );
}

export function useErrorReporting() {
  const context = useContext(ErrorReportingContext);
  if (!context) {
    throw new Error('useErrorReporting must be used within ErrorReportingProvider');
  }
  return context;
}
