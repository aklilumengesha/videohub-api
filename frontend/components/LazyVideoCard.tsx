'use client';

import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import VideoCard from './VideoCard';
import VideoCardSkeleton from './VideoCardSkeleton';
import type { Video } from '@/lib/api';

interface LazyVideoCardProps {
  video: Video;
  showChannel?: boolean;
  progress?: number;
}

export default function LazyVideoCard({ video, showChannel, progress }: LazyVideoCardProps) {
  const { ref, isVisible } = useIntersectionObserver({ rootMargin: '300px' });

  return (
    <div ref={ref}>
      {isVisible ? (
        <VideoCard video={video} showChannel={showChannel} progress={progress} />
      ) : (
        <VideoCardSkeleton />
      )}
    </div>
  );
}
