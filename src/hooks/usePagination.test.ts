import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePagination } from "./usePagination";

describe("usePagination", () => {
  const createTestData = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ id: i, name: `Item ${i}` }));

  it("initializes with correct default values", () => {
    const data = createTestData(50);
    const { result } = renderHook(() => usePagination(data));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.totalItems).toBe(50);
    expect(result.current.totalPages).toBe(5);
    expect(result.current.paginatedData.length).toBe(10);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.hasPrevPage).toBe(false);
  });

  it("accepts custom initial page and page size", () => {
    const data = createTestData(100);
    const { result } = renderHook(() =>
      usePagination(data, { initialPage: 3, initialPageSize: 20 })
    );

    expect(result.current.currentPage).toBe(3);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.totalPages).toBe(5);
    expect(result.current.paginatedData.length).toBe(20);
  });

  it("returns correct paginated data for first page", () => {
    const data = createTestData(25);
    const { result } = renderHook(() => usePagination(data, { initialPageSize: 10 }));

    expect(result.current.paginatedData).toEqual(data.slice(0, 10));
    expect(result.current.startIndex).toBe(1);
    expect(result.current.endIndex).toBe(10);
  });

  it("returns correct paginated data for middle page", () => {
    const data = createTestData(30);
    const { result } = renderHook(() =>
      usePagination(data, { initialPage: 2, initialPageSize: 10 })
    );

    expect(result.current.paginatedData).toEqual(data.slice(10, 20));
    expect(result.current.startIndex).toBe(11);
    expect(result.current.endIndex).toBe(20);
  });

  it("returns correct paginated data for last page (partial)", () => {
    const data = createTestData(25);
    const { result } = renderHook(() =>
      usePagination(data, { initialPage: 3, initialPageSize: 10 })
    );

    expect(result.current.paginatedData).toEqual(data.slice(20, 25));
    expect(result.current.startIndex).toBe(21);
    expect(result.current.endIndex).toBe(25);
  });

  it("navigates to next page", () => {
    const data = createTestData(30);
    const { result } = renderHook(() => usePagination(data, { initialPageSize: 10 }));

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedData).toEqual(data.slice(10, 20));
  });

  it("navigates to previous page", () => {
    const data = createTestData(30);
    const { result } = renderHook(() =>
      usePagination(data, { initialPage: 2, initialPageSize: 10 })
    );

    act(() => {
      result.current.prevPage();
    });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.paginatedData).toEqual(data.slice(0, 10));
  });

  it("does not navigate beyond first page", () => {
    const data = createTestData(30);
    const { result } = renderHook(() => usePagination(data));

    act(() => {
      result.current.prevPage();
    });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.hasPrevPage).toBe(false);
  });

  it("does not navigate beyond last page", () => {
    const data = createTestData(30);
    const { result } = renderHook(() =>
      usePagination(data, { initialPage: 3, initialPageSize: 10 })
    );

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.currentPage).toBe(3);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("goes to specific page", () => {
    const data = createTestData(50);
    const { result } = renderHook(() => usePagination(data, { initialPageSize: 10 }));

    act(() => {
      result.current.goToPage(4);
    });

    expect(result.current.currentPage).toBe(4);
    expect(result.current.paginatedData).toEqual(data.slice(30, 40));
  });

  it("goes to first page", () => {
    const data = createTestData(50);
    const { result } = renderHook(() =>
      usePagination(data, { initialPage: 3, initialPageSize: 10 })
    );

    act(() => {
      result.current.goToFirstPage();
    });

    expect(result.current.currentPage).toBe(1);
  });

  it("goes to last page", () => {
    const data = createTestData(50);
    const { result } = renderHook(() => usePagination(data, { initialPageSize: 10 }));

    act(() => {
      result.current.goToLastPage();
    });

    expect(result.current.currentPage).toBe(5);
    expect(result.current.paginatedData).toEqual(data.slice(40, 50));
  });

  it("clamps page number to valid range", () => {
    const data = createTestData(30);
    const { result } = renderHook(() => usePagination(data, { initialPageSize: 10 }));

    act(() => {
      result.current.goToPage(-5);
    });
    expect(result.current.currentPage).toBe(1);

    act(() => {
      result.current.goToPage(999);
    });
    expect(result.current.currentPage).toBe(3);
  });

  it("changes page size and resets to first page", () => {
    const data = createTestData(50);
    const { result } = renderHook(() =>
      usePagination(data, { initialPage: 3, initialPageSize: 10 })
    );

    act(() => {
      result.current.setPageSize(25);
    });

    expect(result.current.pageSize).toBe(25);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.paginatedData.length).toBe(25);
  });

  it("handles empty data", () => {
    const { result } = renderHook(() => usePagination([]));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.paginatedData).toEqual([]);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.hasPrevPage).toBe(false);
  });

  it("handles single page of data", () => {
    const data = createTestData(5);
    const { result } = renderHook(() => usePagination(data, { initialPageSize: 10 }));

    expect(result.current.totalPages).toBe(1);
    expect(result.current.paginatedData).toEqual(data);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.hasPrevPage).toBe(false);
  });

  it("adjusts current page when data shrinks", () => {
    let data = createTestData(50);
    const { result, rerender } = renderHook(
      ({ items }) => usePagination(items, { initialPage: 5, initialPageSize: 10 }),
      { initialProps: { items: data } }
    );

    expect(result.current.currentPage).toBe(5);

    // Shrink data so page 5 no longer exists
    data = createTestData(15);
    rerender({ items: data });

    expect(result.current.currentPage).toBe(2); // Should clamp to last valid page
  });

  it("correctly indicates navigation availability", () => {
    const data = createTestData(30);

    // First page
    const { result: first } = renderHook(() =>
      usePagination(data, { initialPage: 1, initialPageSize: 10 })
    );
    expect(first.current.hasPrevPage).toBe(false);
    expect(first.current.hasNextPage).toBe(true);

    // Middle page
    const { result: middle } = renderHook(() =>
      usePagination(data, { initialPage: 2, initialPageSize: 10 })
    );
    expect(middle.current.hasPrevPage).toBe(true);
    expect(middle.current.hasNextPage).toBe(true);

    // Last page
    const { result: last } = renderHook(() =>
      usePagination(data, { initialPage: 3, initialPageSize: 10 })
    );
    expect(last.current.hasPrevPage).toBe(true);
    expect(last.current.hasNextPage).toBe(false);
  });
});
