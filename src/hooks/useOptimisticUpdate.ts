import { useState, useCallback, useRef, useEffect } from "react";
import { useToast } from "../contexts";
import { getErrorMessage, logError } from "../utils/errorUtils";

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  onRollback?: () => void;
  successMessage?: string;
  errorMessage?: string;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
}

interface OptimisticUpdateResult<T, TArgs extends unknown[] = unknown[]> {
  execute: (optimisticValue: T, ...args: TArgs) => Promise<T | undefined>;
  loading: boolean;
  error: string | null;
  data: T | null;
  reset: () => void;
}

/**
 * Hook for optimistic UI updates with automatic rollback on failure.
 * Immediately applies the optimistic value, then runs the async operation.
 * If the operation fails, rolls back to the previous state.
 *
 * @example
 * const [status, setStatus] = useState("applied");
 * const updateStatus = useOptimisticUpdate(
 *   async (newStatus: string, appId: number) => {
 *     await invoke("update_application_status", { id: appId, status: newStatus });
 *     return newStatus;
 *   },
 *   {
 *     successMessage: "Status updated",
 *     errorMessage: "Failed to update status",
 *     onRollback: () => console.log("Update failed, rolled back"),
 *   }
 * );
 *
 * // Usage
 * const handleStatusChange = async (newStatus: string) => {
 *   const previousStatus = status;
 *   setStatus(newStatus); // Apply immediately
 *   const result = await updateStatus.execute(newStatus, applicationId);
 *   if (!result) {
 *     setStatus(previousStatus); // Rollback handled by caller
 *   }
 * };
 */
export function useOptimisticUpdate<T, TArgs extends unknown[] = unknown[]>(
  asyncFn: (...args: TArgs) => Promise<T>,
  options: OptimisticUpdateOptions<T> = {}
): OptimisticUpdateResult<T, TArgs> {
  const {
    onSuccess,
    onError,
    onRollback,
    successMessage,
    errorMessage,
    showSuccessToast = true,
    showErrorToast = true,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);
  const toast = useToast();

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const previousValueRef = useRef<T | null>(null);
  const currentDataRef = useRef<T | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Keep currentDataRef in sync with data state
  useEffect(() => {
    currentDataRef.current = data;
  }, [data]);

  const execute = useCallback(
    async (optimisticValue: T, ...args: TArgs): Promise<T | undefined> => {
      if (!isMountedRef.current) return undefined;

      // Capture current value before async operation starts
      previousValueRef.current = currentDataRef.current;

      // Apply optimistic update immediately
      setData(optimisticValue);
      setLoading(true);
      setError(null);

      try {
        // Execute async operation
        const result = await asyncFn(...args);

        if (!isMountedRef.current) return undefined;

        // Confirm with server result
        setData(result);

        if (successMessage && showSuccessToast) {
          toast.success("Success", successMessage);
        }

        onSuccess?.(result);
        return result;
      } catch (err: unknown) {
        if (!isMountedRef.current) return undefined;

        const errMsg = getErrorMessage(err);
        setError(errMsg);

        // Rollback to previous value
        setData(previousValueRef.current);

        logError(`Optimistic update failed:`, err);

        if (showErrorToast) {
          toast.error("Error", errorMessage || errMsg);
        }

        onError?.(err);
        onRollback?.();
        return undefined;
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [asyncFn, successMessage, errorMessage, showSuccessToast, showErrorToast, onSuccess, onError, onRollback, toast]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
    previousValueRef.current = null;
  }, []);

  return {
    execute,
    loading,
    error,
    data,
    reset,
  };
}
