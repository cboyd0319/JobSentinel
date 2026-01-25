import { useState, useCallback, useMemo } from "react";

interface PaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

interface PaginationResult<T> {
  // Current page data
  currentPage: number;
  pageSize: number;
  paginatedData: T[];

  // Total counts
  totalItems: number;
  totalPages: number;

  // Navigation
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;

  // Page size control
  setPageSize: (size: number) => void;

  // State checks
  hasNextPage: boolean;
  hasPrevPage: boolean;

  // Range info
  startIndex: number;
  endIndex: number;
}

/**
 * Hook for managing pagination state and navigation.
 * Handles page calculations, navigation, and slicing data.
 *
 * @example
 * const jobs = [job1, job2, job3, ...]; // 100 items
 * const pagination = usePagination(jobs, { initialPageSize: 10 });
 *
 * // Render current page
 * return (
 *   <div>
 *     {pagination.paginatedData.map(job => <JobCard key={job.id} job={job} />)}
 *
 *     <div>
 *       Page {pagination.currentPage} of {pagination.totalPages}
 *       ({pagination.startIndex}-{pagination.endIndex} of {pagination.totalItems})
 *     </div>
 *
 *     <button onClick={pagination.prevPage} disabled={!pagination.hasPrevPage}>
 *       Previous
 *     </button>
 *     <button onClick={pagination.nextPage} disabled={!pagination.hasNextPage}>
 *       Next
 *     </button>
 *   </div>
 * );
 */
export function usePagination<T>(
  data: T[],
  options: PaginationOptions = {}
): PaginationResult<T> {
  const { initialPage = 1, initialPageSize = 10 } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Ensure current page is valid when data changes
  const validCurrentPage = Math.min(currentPage, totalPages);

  // Calculate slice indices
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  // Slice data for current page
  const paginatedData = useMemo(
    () => data.slice(startIndex, endIndex),
    [data, startIndex, endIndex]
  );

  // Navigation functions
  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(validPage);
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    if (validCurrentPage < totalPages) {
      setCurrentPage(validCurrentPage + 1);
    }
  }, [validCurrentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (validCurrentPage > 1) {
      setCurrentPage(validCurrentPage - 1);
    }
  }, [validCurrentPage]);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  const updatePageSize = useCallback((size: number) => {
    const validSize = Math.max(1, size);
    setPageSize(validSize);
    // Reset to first page when page size changes
    setCurrentPage(1);
  }, []);

  const hasNextPage = validCurrentPage < totalPages;
  const hasPrevPage = validCurrentPage > 1;

  return {
    currentPage: validCurrentPage,
    pageSize,
    paginatedData,
    totalItems,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage,
    setPageSize: updatePageSize,
    hasNextPage,
    hasPrevPage,
    startIndex: startIndex + 1, // 1-based for display
    endIndex,
  };
}
