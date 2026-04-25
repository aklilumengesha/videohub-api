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
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🔥</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trending</h1>
            <p className="text-sm text-gray-500">Most viewed videos in the last 7 days</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-32 bg-gray-200 rounded-lg mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No trending videos yet</h2>
            <p className="text-gray-500">Videos uploaded in the last 7 days will appear here as they get views</p>
          </div>
        ) : (
          <>
            {/* Top 3 featured */}
            {videos.length >= 3 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {videos.slice(0, 3).map((video, i) => (
                  <div key={video.id} className="relative">
                    <div className="absolute top-2 left-2 z-10 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded-full">
                      #{i + 1}
                    </div>
                    <VideoCard video={video} />
                  </div>
                ))}
              </div>
            )}

            {/* Rest of the list */}
            {videos.length > 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {videos.slice(3).map((video, i) => (
                  <div key={video.id} className="relative">
                    <div className="absolute top-2 left-2 z-10 bg-black/60 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                      #{i + 4}
                    </div>
                    <VideoCard video={video} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
