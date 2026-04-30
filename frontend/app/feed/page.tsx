'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { feedApi, type Video } from '@/lib/api';
import LazyVideoCard from '@/components/LazyVideoCard';
import InfiniteScrollSentinel from '@/components/InfiniteScrollSentinel';
import { VideoGridSkeleton } from '@/components/VideoCardSkeleton';

export default function FeedPage() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();

  const [videos, setVideos] = useState<Video[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push('/auth/login');
  }, [isLoggedIn, authLoading, router]);

  const loadFeed = useCallback(async (nextCursor?: string) => {
    try {
      const data: Video[] = await feedApi.getPersonalized(nextCursor);
      if (nextCursor) {
        setVideos(prev => [...prev, ...data]);
      } else {
        setVideos(data);
      }
      if (data.length < 20) setHasMore(false);
      if (data.length > 0) setCursor(data[data.length - 1].createdAt);
    } catch {
      setHasMore(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) loadFeed().finally(() => setLoading(false));
  }, [isLoggedIn, loadFeed]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadFeed(cursor);
    setLoadingMore(false);
  }, [loadingMore, hasMore, loadFeed, cursor]);

  if (authLoading || (!isLoggedIn && !authLoading)) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <main className="max-w-[1800px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Subscriptions</h1>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">Explore all →</Link>
        </div>

        {loading ? (
          <VideoGridSkeleton count={10} />
        ) : videos.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Your feed is empty</h2>
            <p className="text-gray-500 mb-6">Follow creators to see their videos here</p>
            <Link href="/"
              className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium hover:bg-blue-700 transition-colors">
              Discover creators
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
              {videos.map(video => <LazyVideoCard key={video.id} video={video} />)}
            </div>
            {hasMore && (
              <InfiniteScrollSentinel onVisible={handleLoadMore} loading={loadingMore} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
