import { useState, useCallback, useRef } from 'react';

interface UseVirtualScrollOptions<T> {
  items: T[];
  pageSize?: number;
  loadMore?: () => Promise<void>;
}

export function useVirtualScroll<T>({
  items,
  pageSize = 20,
  loadMore,
}: UseVirtualScrollOptions<T>) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length || !!loadMore;

  const handleSentinelVisible = useCallback(async () => {
    if (loadingMore) return;

    if (visibleCount < items.length) {
      setVisibleCount(c => Math.min(c + pageSize, items.length));
      return;
    }

    if (loadMore) {
      setLoadingMore(true);
      try {
        await loadMore();
      } finally {
        setLoadingMore(false);
      }
    }
  }, [loadingMore, visibleCount, items.length, pageSize, loadMore]);

  return { visibleItems, hasMore, loadingMore, sentinelRef, handleSentinelVisible };
}
