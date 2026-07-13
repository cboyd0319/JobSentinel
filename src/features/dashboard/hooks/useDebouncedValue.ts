import { useState, useEffect } from "react";

/**
 * Returns a debounced version of the value that only updates after the specified delay.
 * Useful for reducing re-renders on frequently changing values like search inputs.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
