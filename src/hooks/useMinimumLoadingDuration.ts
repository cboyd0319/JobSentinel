import { useState, useEffect, useRef } from "react";

/**
 * Hook that ensures loading states persist for at least a minimum duration.
 * This prevents the "flash of loading" when operations complete very quickly,
 * which can feel jarring to users.
 *
 * @param isLoading - The actual loading state from async operation
 * @param minDurationMs - Minimum time to show loading state (default: 300ms)
 * @returns A loading state that respects the minimum duration
 *
 * @example
 * const [actualLoading, setActualLoading] = useState(false);
 * const showLoading = useMinimumLoadingDuration(actualLoading, 300);
 *
 * // showLoading will stay true for at least 300ms even if actualLoading
 * // becomes false sooner
 */
export function useMinimumLoadingDuration(
  isLoading: boolean,
  minDurationMs: number = 300
): boolean {
  const [showLoading, setShowLoading] = useState(isLoading);
  const loadingStartTime = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Loading started - record the time and show loading immediately
      loadingStartTime.current = Date.now();
      setShowLoading(true);

      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } else if (loadingStartTime.current !== null) {
      // Loading finished - check if we need to delay hiding
      const elapsed = Date.now() - loadingStartTime.current;
      const remaining = minDurationMs - elapsed;

      if (remaining > 0) {
        // Not enough time passed - delay hiding
        timeoutRef.current = setTimeout(() => {
          setShowLoading(false);
          loadingStartTime.current = null;
        }, remaining);
      } else {
        // Enough time passed - hide immediately
        setShowLoading(false);
        loadingStartTime.current = null;
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, minDurationMs]);

  return showLoading;
}
