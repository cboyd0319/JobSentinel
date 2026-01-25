import { useState, useCallback, useRef } from "react";
import { useToast } from "../contexts";
import { getErrorMessage, logError } from "../utils/errorUtils";

interface AsyncOperationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  successMessage?: string;
  errorMessage?: string;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
}

interface AsyncOperationResult<T, TArgs extends unknown[] = unknown[]> {
  execute: (...args: TArgs) => Promise<T | undefined>;
  loading: boolean;
  error: string | null;
  data: T | null;
  reset: () => void;
}

/**
 * Custom hook for handling async operations with loading states, error handling, and toast notifications.
 * Reduces boilerplate for try-catch-finally patterns across the app.
 *
 * @example
 * const uploadResume = useAsyncOperation(
 *   async (file: string) => {
 *     const id = await invoke("upload_resume", { name: "Resume", filePath: file });
 *     return id;
 *   },
 *   {
 *     successMessage: "Resume uploaded successfully",
 *     errorMessage: "Failed to upload resume",
 *     onSuccess: (id) => console.log("Uploaded resume ID:", id),
 *   }
 * );
 *
 * // Usage
 * await uploadResume.execute(filePath);
 * if (uploadResume.loading) { ... }
 * if (uploadResume.error) { ... }
 */
export function useAsyncOperation<T, TArgs extends unknown[] = unknown[]>(
  asyncFn: (...args: TArgs) => Promise<T>,
  options: AsyncOperationOptions<T> = {}
): AsyncOperationResult<T, TArgs> {
  const {
    onSuccess,
    onError,
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

  const execute = useCallback(
    async (...args: TArgs): Promise<T | undefined> => {
      if (!isMountedRef.current) return undefined;

      try {
        setLoading(true);
        setError(null);

        const result = await asyncFn(...args);

        if (!isMountedRef.current) return undefined;

        setData(result);

        if (successMessage && showSuccessToast) {
          toast.success("Success", successMessage);
        }

        onSuccess?.(result);
        return result;
      } catch (err) {
        if (!isMountedRef.current) return undefined;

        const errMsg = getErrorMessage(err);
        setError(errMsg);

        logError(`Async operation failed:`, err);

        if (showErrorToast) {
          toast.error("Error", errorMessage || errMsg);
        }

        onError?.(err);
        return undefined;
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [asyncFn, successMessage, errorMessage, showSuccessToast, showErrorToast, onSuccess, onError, toast]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    execute,
    loading,
    error,
    data,
    reset,
  };
}
