import { useEffect, useCallback, useState } from "react";
import { useToast } from "../contexts";
import { getErrorMessage, logError } from "../utils/errorUtils";

interface UseFetchOnMountOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  showErrorToast?: boolean;
  errorMessage?: string;
  skip?: boolean; // Skip initial fetch if true
}

interface UseFetchOnMountResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching data on component mount with AbortController cleanup.
 * Handles loading state, error handling, and proper cleanup to prevent memory leaks.
 *
 * @example
 * const { data, loading, error, refetch } = useFetchOnMount(
 *   async (signal) => {
 *     const [skills, companies] = await Promise.all([
 *       invoke("get_trending_skills", { limit: 15 }),
 *       invoke("get_active_companies", { limit: 15 }),
 *     ]);
 *     if (signal.aborted) return null;
 *     return { skills, companies };
 *   },
 *   {
 *     onSuccess: (data) => console.log("Fetched:", data),
 *     errorMessage: "Failed to load market data",
 *   }
 * );
 *
 * // Usage
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorState error={error} />;
 * return <DataDisplay data={data} />;
 */
export function useFetchOnMount<T>(
  fetchFn: (signal: AbortSignal) => Promise<T | null>,
  options: UseFetchOnMountOptions<T> = {}
): UseFetchOnMountResult<T> {
  const {
    onSuccess,
    onError,
    showErrorToast = true,
    errorMessage,
    skip = false,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoading(true);
        setError(null);

        const result = await fetchFn(signal || new AbortController().signal);

        if (signal?.aborted) return;

        if (result !== null) {
          setData(result);
          onSuccess?.(result);
        }
      } catch (err) {
        if (signal?.aborted) return;

        const errMsg = getErrorMessage(err);
        setError(errMsg);
        logError("Fetch failed:", err);

        if (showErrorToast) {
          toast.error("Error", errorMessage || errMsg);
        }

        onError?.(err);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [fetchFn, onSuccess, onError, showErrorToast, errorMessage, toast]
  );

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (skip) return;

    const controller = new AbortController();

    fetchData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchData, skip]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}
