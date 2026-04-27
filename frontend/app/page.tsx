'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { videosApi } from '@/lib/api';
import VideoCard from '@/components/VideoCard';
import type { Video } from '@/lib/api';

const CATEGORIES = ['All', 'Gaming', 'Music', 'Education', 'Entertainment', 'Sports', 'Technology', 'Travel', 'Food', 'Fashion', 'News'];

export default function HomePage() {
  const { isLoggedIn, loading } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [sort, setSort] = useState<'newest' | 'popular'>('newest');
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setFetching(true);
    videosApi.getAll(
      activeCategory === 'All' ? undefined : activeCategory,
      sort,
    )
      .then(setVideos)
      .catch(() => setError('Failed to load videos'))
      .finally(() => setFetching(false));
  }, [activeCategory, sort]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      {/* Sticky category chips bar */}
      <div className="sticky top-14 z-30 border-b px-4 py-2 flex items-center gap-2"
        style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Sort toggle */}
        <div className="flex-shrink-0 flex bg-gray-100 rounded-lg p-0.5 ml-2">
          <button onClick={() => setSort('newest')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${sort === 'newest' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            New
          </button>
          <button onClick={() => setSort('popular')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${sort === 'popular' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            Popular
          </button>
        </div>
      </div>

      <main className="max-w-[1800px] mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
        )}

        {fetching ? (
          /* Skeleton grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
            {Array.from({ length: 15 }).map((_, i) => (
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
            <div className="text-6xl mb-4">🎬</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No videos yet</h2>
            <p className="text-gray-500 mb-6">
              {activeCategory === 'All' ? 'Be the first to upload a video' : `No videos in ${activeCategory} yet`}
            </p>
            {isLoggedIn ? (
              <Link href="/upload" className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium hover:bg-blue-700 transition-colors">
                Upload Video
              </Link>
            ) : (
              <Link href="/auth/register" className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium hover:bg-blue-700 transition-colors">
                Sign up to upload
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
            {videos.map(video => <VideoCard key={video.id} video={video} />)}
          </div>
        )}
      </main>
    </div>
  );
}
