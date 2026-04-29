'use client';

import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import VideoCard from './VideoCard';
import VideoCardSkeleton from './VideoCardSkeleton';
import type { Video } from '@/lib/api';

interface LazyVideoCardProps {
  video: Video;
  showChannel?: boolean;
}

export default function LazyVideoCard({ video, showChannel }: LazyVideoCardProps) {
  const { ref, isVisible } = useIntersectionObserver({ rootMargin: '300px' });

  return (
    <div ref={ref}>
      {isVisible ? (
        <VideoCard video={video} showChannel={showChannel} />
      ) : (
        <VideoCardSkeleton />
      )}
    </div>
  );
}
