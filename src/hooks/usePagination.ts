/**
 * Custom hook for handling pagination with infinite scroll
 * Provides efficient loading of large datasets
 */

import { useState, useCallback, useRef } from 'react';

export interface PaginationConfig {
  pageSize?: number;
  initialPage?: number;
}

export interface PaginationResult<T> {
  // Data
  items: T[];
  totalCount: number;

  // State
  currentPage: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  loadMore: () => Promise<void>;
  reset: () => void;
  refresh: () => Promise<void>;

  // For infinite scroll
  lastElementRef: (node: HTMLElement | null) => void;
}

export function usePagination<T>(
  fetchFunction: (
    page: number,
    pageSize: number
  ) => Promise<{ data: T[]; totalCount: number }>,
  config: PaginationConfig = {}
): PaginationResult<T> {
  const { pageSize = 20, initialPage = 1 } = config;

  const [items, setItems] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const observer = useRef<IntersectionObserver>();
  const hasMore = items.length < totalCount;

  /**
   * Load a specific page
   */
  const loadPage = useCallback(
    async (page: number, append: boolean = false) => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchFunction(page, pageSize);

        setItems((prev) => (append ? [...prev, ...result.data] : result.data));
        setTotalCount(result.totalCount);
        setCurrentPage(page);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    },
    [fetchFunction, pageSize]
  );

  /**
   * Load more items (for infinite scroll)
   */
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    await loadPage(currentPage + 1, true);
  }, [loading, hasMore, currentPage, loadPage]);

  /**
   * Reset pagination to initial state
   */
  const reset = useCallback(() => {
    setItems([]);
    setTotalCount(0);
    setCurrentPage(initialPage);
    setError(null);
  }, [initialPage]);

  /**
   * Refresh current data
   */
  const refresh = useCallback(async () => {
    reset();
    await loadPage(initialPage, false);
  }, [reset, loadPage, initialPage]);

  /**
   * Ref callback for infinite scroll intersection observer
   */
  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (loading) return;

      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            loadMore();
          }
        },
        {
          threshold: 0.1,
          rootMargin: '100px',
        }
      );

      if (node) observer.current.observe(node);
    },
    [loading, hasMore, loadMore]
  );

  return {
    items,
    totalCount,
    currentPage,
    hasMore,
    loading,
    error,
    loadMore,
    reset,
    refresh,
    lastElementRef,
  };
}
