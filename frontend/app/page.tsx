'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { videosApi, feedApi } from '@/lib/api';
import LazyVideoCard from '@/components/LazyVideoCard';
import VideoShelf from '@/components/VideoShelf';
import InfiniteScrollSentinel from '@/components/InfiniteScrollSentinel';
import { VideoGridSkeleton, VideoShelfSkeleton } from '@/components/VideoCardSkeleton';
import type { Video } from '@/lib/api';

const CATEGORIES = ['All', 'Gaming', 'Music', 'Education', 'Entertainment', 'Sports', 'Technology', 'Travel', 'Food', 'Fashion', 'News'];

export default function HomePage() {
  const { isLoggedIn, loading } = useAuth();
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [loadingMoreGrid, setLoadingMoreGrid] = useState(false);
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [personalizedVideos, setPersonalizedVideos] = useState<Video[]>([]);
  const [categoryVideos, setCategoryVideos] = useState<Record<string, Video[]>>({});
  const [activeCategory, setActiveCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'shelves' | 'grid'>('shelves');
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  // Keep useCallback BEFORE any early returns — Rules of Hooks
  const handleLoadMore = useCallback(() => {
    if (loadingMoreGrid) return;
    if (visibleCount < allVideos.length) {
      setLoadingMoreGrid(true);
      setTimeout(() => {
        setVisibleCount(c => Math.min(c + 20, allVideos.length));
        setLoadingMoreGrid(false);
      }, 300);
    }
  }, [loadingMoreGrid, visibleCount, allVideos.length]);

  // Load videos on mount and when category changes
  useEffect(() => {
    setFetching(true);
    setError('');
    setVisibleCount(20);

    const loadData = async () => {
      try {
        const all = await videosApi.getAll(
          activeCategory === 'All' ? undefined : activeCategory,
          'newest'
        );
        setAllVideos(all);

        if (activeCategory === 'All') {
          const trending = await videosApi.getTrending().catch(() => []);
          setTrendingVideos(trending.slice(0, 10));

          if (isLoggedIn) {
            const personalized = await feedApi.getPersonalized().catch(() => []);
            setPersonalizedVideos(personalized.slice(0, 10));
          }

          const categories = ['Gaming', 'Music', 'Education', 'Entertainment'];
          const categoryData: Record<string, Video[]> = {};
          await Promise.all(
            categories.map(async (cat) => {
              const videos = await videosApi.getAll(cat, 'popular').catch(() => []);
              categoryData[cat] = videos.slice(0, 10);
            })
          );
          setCategoryVideos(categoryData);
        }
      } catch {
        setError('Failed to load videos');
      } finally {
        setFetching(false);
      }
    };

    loadData();
  }, [activeCategory, isLoggedIn]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      {/* Sticky category chips bar */}
      <div className="sticky top-14 z-30 border-b px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* View mode toggle */}
        {activeCategory === 'All' && (
          <button
            onClick={() => setViewMode(v => v === 'shelves' ? 'grid' : 'shelves')}
            className="flex-shrink-0 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            title={viewMode === 'shelves' ? 'Switch to grid view' : 'Switch to shelf view'}
          >
            {viewMode === 'shelves' ? (
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        )}
      </div>

      <main className="max-w-[1800px] mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
        )}

        {fetching ? (
          activeCategory === 'All' && viewMode === 'shelves'
            ? <VideoShelfSkeleton rows={3} />
            : <VideoGridSkeleton count={20} />
        ) : allVideos.length === 0 ? (
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
        ) : activeCategory === 'All' && viewMode === 'shelves' ? (
          /* Shelf view - YouTube style horizontal sections */
          <div className="space-y-8">
            {/* Personalized feed for logged-in users */}
            {isLoggedIn && personalizedVideos.length > 0 && (
              <VideoShelf
                title="Recommended for you"
                videos={personalizedVideos}
                icon="✨"
              />
            )}

            {/* Trending videos */}
            {trendingVideos.length > 0 && (
              <VideoShelf
                title="Trending"
                videos={trendingVideos}
                icon="🔥"
              />
            )}

            {/* Latest uploads */}
            {allVideos.length > 0 && (
              <VideoShelf
                title="Latest uploads"
                videos={allVideos.slice(0, 10)}
                icon="🆕"
              />
            )}

            {/* Category shelves */}
            {Object.entries(categoryVideos).map(([category, videos]) => (
              videos.length > 0 && (
                <VideoShelf
                  key={category}
                  title={category}
                  videos={videos}
                  viewAllLink={`/?category=${category}`}
                />
              )
            ))}
          </div>
        ) : (
          /* Grid view - traditional layout with lazy loading + infinite scroll */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
              {allVideos.slice(0, visibleCount).map(video => (
                <LazyVideoCard key={video.id} video={video} />
              ))}
            </div>
            {visibleCount < allVideos.length && (
              <InfiniteScrollSentinel onVisible={handleLoadMore} loading={loadingMoreGrid} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
