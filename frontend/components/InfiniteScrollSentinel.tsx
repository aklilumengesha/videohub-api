'use client';

import { useEffect, useRef } from 'react';

interface InfiniteScrollSentinelProps {
  onVisible: () => void;
  loading?: boolean;
}

export default function InfiniteScrollSentinel({ onVisible, loading }: InfiniteScrollSentinelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onVisible();
      },
      { rootMargin: '400px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisible]);

  return (
    <div ref={ref} className="flex justify-center py-6">
      {loading && (
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  );
}
