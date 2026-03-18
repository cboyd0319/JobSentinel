import { useCallback } from "react";
import { useListRef } from "react-window";

/**
 * Hook for auto-scrolling to a specific job
 */
export function useVirtualListScroll() {
  const listRef = useListRef(null);

  const scrollToJob = useCallback(
    (index: number, align: "start" | "center" | "end" | "auto" = "center") => {
      listRef.current?.scrollToRow({ index, align });
    },
    [listRef],
  );

  return { listRef, scrollToJob };
}
