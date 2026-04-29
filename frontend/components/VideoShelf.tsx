'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import VideoCard from './VideoCard';
import type { Video } from '@/lib/api';

interface VideoShelfProps {
  title: string;
  videos: Video[];
  viewAllLink?: string;
  icon?: string;
}

export default function VideoShelf({ title, videos, viewAllLink, icon }: VideoShelfProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  if (videos.length === 0) return null;

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          {icon && <span>{icon}</span>}
          {title}
        </h2>
        {viewAllLink && (
          <Link
            href={viewAllLink}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            View all →
          </Link>
        )}
      </div>

      {/* Scrollable container */}
      <div className="relative group/shelf">
        {/* Left arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/95 hover:bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover/shelf:opacity-100 transition-opacity"
            aria-label="Scroll left"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Right arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/95 hover:bg-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover/shelf:opacity-100 transition-opacity"
            aria-label="Scroll right"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Videos */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {videos.map((video) => (
            <div key={video.id} className="flex-shrink-0 w-[280px]">
              <VideoCard video={video} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
