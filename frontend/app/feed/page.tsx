'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { feedApi, type Video } from '@/lib/api';
import VideoCard from '@/components/VideoCard';

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

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadFeed(cursor);
    setLoadingMore(false);
  };

  if (authLoading || (!isLoggedIn && !authLoading)) return null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <main className="max-w-[1800px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Subscriptions</h1>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">Explore all →</Link>
        </div>

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
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Your feed is empty</h2>
            <p className="text-gray-500 mb-6">Follow creators to see their videos here</p>
            <Link href="/" className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium hover:bg-blue-700 transition-colors">
              Discover creators
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
              {videos.map(video => <VideoCard key={video.id} video={video} />)}
            </div>
            {hasMore && (
              <div className="text-center mt-10">
                <button onClick={loadMore} disabled={loadingMore}
                  className="px-6 py-2.5 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors">
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
