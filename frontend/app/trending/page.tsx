'use client';

import { useState, useEffect } from 'react';
import { videosApi, type Video } from '@/lib/api';
import VideoCard from '@/components/VideoCard';

export default function TrendingPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    videosApi.getTrending()
      .then(setVideos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      {/* Sticky header bar */}
      <div className="sticky top-14 z-30 border-b px-6 py-3 flex items-center gap-3"
        style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
        <span className="text-2xl">🔥</span>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Trending</h1>
          <p className="text-xs text-gray-500">Most viewed in the last 7 days</p>
        </div>
      </div>

      <main className="max-w-[1800px] mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video rounded-xl bg-gray-200 mb-3" />
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-200 rounded w-full" />
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No trending videos yet</h2>
            <p className="text-gray-500">Videos uploaded in the last 7 days will appear here as they get views</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
            {videos.map((video, i) => (
              <div key={video.id} className="relative">
                {/* Rank badge */}
                <div className={`absolute top-2 left-2 z-10 text-white text-xs font-bold px-2 py-0.5 rounded-full ${
                  i < 3 ? 'bg-red-600' : 'bg-black/70'
                }`}>
                  #{i + 1}
                </div>
                <VideoCard video={video} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
