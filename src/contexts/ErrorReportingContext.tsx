import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
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

  const captureError = useCallback((error: Error, context?: Record<string, unknown>) => {
    errorReporter.captureCustom(error.message, context);
  }, []);

  const clearErrors = useCallback(() => {
    errorReporter.clear();
  }, []);

  const clearError = useCallback((id: string) => {
    errorReporter.clearError(id);
  }, []);

  const exportErrors = useCallback(() => {
    errorReporter.downloadExport();
  }, []);

  const value = useMemo(() => ({
    errors,
    errorCount: errors.length,
    captureError,
    clearErrors,
    clearError,
    exportErrors,
  }), [errors, captureError, clearErrors, clearError, exportErrors]);

  return (
    <ErrorReportingContext.Provider value={value}>
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
