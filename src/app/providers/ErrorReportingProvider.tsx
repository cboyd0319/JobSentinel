import { useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import {
  errorReporter,
  type ErrorReport,
} from '../../shared/errorReporting/errorReporter';
import { ErrorReportingContext } from '../../shared/errorReporting/errorReportingContext';

export function ErrorReportingProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<ErrorReport[]>(() => {
    errorReporter.init();
    return errorReporter.getErrors();
  });

  useEffect(() => {
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
