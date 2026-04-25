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
    const fetchVideos = async () => {
      setFetching(true);
      try {
        const data = await videosApi.getAll(
          activeCategory === 'All' ? undefined : activeCategory,
          sort,
        );
        setVideos(data);
      } catch {
        setError('Failed to load videos');
      } finally {
        setFetching(false);
      }
    };
    fetchVideos();
  }, [activeCategory, sort]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-6 py-6">

        {/* Category filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">
            {activeCategory === 'All' ? 'All Videos' : activeCategory}
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{videos.length} videos</span>
            <div className="flex bg-gray-100 rounded-lg p-0.5 ml-2">
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
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
        )}

        {fetching ? (
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
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🎬</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No videos yet</h2>
            <p className="text-gray-500 mb-6">
              {activeCategory === 'All' ? 'Be the first to upload a video' : `No videos in ${activeCategory} yet`}
            </p>
            {isLoggedIn ? (
              <Link href="/upload" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">
                Upload Video
              </Link>
            ) : (
              <Link href="/auth/register" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">
                Sign up to upload
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map(video => <VideoCard key={video.id} video={video} />)}
          </div>
        )}
      </main>
    </div>
  );
}
